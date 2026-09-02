"use client";

// T015/T016 — subscribes to pages.context and recomputes on every payload.
// On each new payload: discard all prior findings (FR-4/AC-1.3), enter
// loading, fetch the page HTML, extract anchors. Unsubscribes on unmount.
import type { PagesContext } from "@sitecore-marketplace-sdk/client";
import { useEffect, useRef, useState } from "react";
import { useAppContext, useMarketplaceClient } from "@/components/providers/marketplace";
import { extractAnchors } from "@/lib/scan/extractAnchors";
import { classifyFindings } from "@/lib/scan/classifyFindings";
import { resolveInternalFindings } from "@/lib/scan/resolveFindings";
import { fetchPageHtml } from "@/lib/sdk/pagesGetPageHtml";
import { computeAttributionRate, logAttributionRate } from "@/lib/scan/attributionRate";
import { freshHealth, type PageScan } from "@/lib/model/types";

export type ScanStatus = "loading" | "error" | "ready";

export interface UsePageScanResult {
  status: ScanStatus;
  scan: PageScan | null;
}

// A field edit is how an author FIXES a broken link — the panel not noticing
// was the reported defect. `fieldsUpdated` fires as the editor types, so a
// re-scan (page-HTML fetch + up to two SDK calls per internal anchor) is
// debounced to the last event in a burst, never fired per keystroke. Operator
// chose debounce-and-coalesce over field-filtering (any rich-text field can
// carry an anchor, so a filter would eventually go silently stale) and over a
// manual button (pushes the work back onto the author).
const CONTENT_CHANGE_DEBOUNCE_MS = 600;

function pagePartsOf(ctx: PagesContext) {
  return {
    id: ctx.pageInfo?.id ?? "",
    path: ctx.pageInfo?.path ?? ctx.pageInfo?.url ?? "",
    name: ctx.pageInfo?.name ?? "",
    // Required by both pagesGetPageHtml and getLivePageState, and "published" is
    // per language — a defaulted 'en' would misreport a page live in one
    // language and absent in another (T015).
    language: ctx.pageInfo?.language ?? ctx.siteInfo?.language,
  };
}

export function usePageScan(): UsePageScanResult {
  const client = useMarketplaceClient();
  const appContext = useAppContext();
  // TR-4 fix: `.preview`, not `.live` — this panel reads the page as it
  // currently is in the editor, which may be unpublished; `.live` would fail
  // or return stale markup for an unpublished page (docs/build-decisions.md).
  const contextId = appContext.resourceAccess?.[0]?.context?.preview;
  // TR-4 (T030): the live-Edge lead genuinely reads the Delivery surface —
  // the one call in this app that needs `.live` rather than `.preview`.
  const liveContextId = appContext.resourceAccess?.[0]?.context?.live;
  const [status, setStatus] = useState<ScanStatus>("loading");
  const [scan, setScan] = useState<PageScan | null>(null);
  // Guards a slow HTML fetch resolving after a newer selection already reset
  // state — the reset in runScan is synchronous; this stops a stale response
  // from clobbering it (belt-and-braces for FR-4). Also covers a debounced
  // content re-scan racing a newer page selection — every trigger funnels
  // through the same runScan/scanIdRef pair.
  const scanIdRef = useRef(0);
  // Most recent pages.context payload — content-change events carry no page
  // context of their own, so a debounced re-scan re-runs against this.
  const latestCtxRef = useRef<PagesContext | undefined>(undefined);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let unsubscribeFields: (() => void) | undefined;
    let unsubscribeLayout: (() => void) | undefined;
    let cancelled = false;

    const clearPendingDebounce = () => {
      if (debounceTimerRef.current !== undefined) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = undefined;
      }
    };

    // Coalesces a burst of content-change events into one re-scan, fired
    // CONTENT_CHANGE_DEBOUNCE_MS after the LAST event — ten events in quick
    // succession reset this timer nine times and fire once.
    const scheduleContentRescan = () => {
      clearPendingDebounce();
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = undefined;
        if (cancelled) return;
        const ctx = latestCtxRef.current;
        if (ctx) void runScan(ctx);
      }, CONTENT_CHANGE_DEBOUNCE_MS);
    };

    const runScan = async (ctx: PagesContext) => {
      const thisScanId = ++scanIdRef.current;
      // Diagnostic only (2026-09-02, operator report investigation) — proves
      // in the live portal console whether `pages.context`'s subscribe
      // callback actually re-fires on a page-selection change. Console-only,
      // never persisted (NFR-3); safe to leave in, same discipline as the
      // existing M1/M3 console logs below.
      console.debug("[link-health-lens] pages.context callback fired", {
        scanId: thisScanId,
        pageId: ctx.pageInfo?.id,
        at: Date.now(),
      });
      // FR-4/AC-1.3: every prior finding is gone before the new scan starts —
      // synchronous with entering loading, not eventually consistent.
      setScan(null);
      setStatus("loading");

      const page = pagePartsOf(ctx);

      if (!page.id || !page.language) {
        if (cancelled || thisScanId !== scanIdRef.current) return;
        setScan({
          page: { ...page, language: "" },
          findings: [],
          health: { ...freshHealth(), pageHtml: false },
          completedAt: Date.now(),
        });
        setStatus("error");
        return;
      }

      const result = await fetchPageHtml(client, {
        pageId: page.id,
        language: page.language,
        contextId,
      });
      if (cancelled || thisScanId !== scanIdRef.current) return;

      if (!result.ok) {
        setScan({
          page: { ...page, language: page.language },
          findings: [],
          health: { ...freshHealth(), pageHtml: false },
          completedAt: Date.now(),
        });
        setStatus("error");
        return;
      }

      // TR-3/TR-5: scope + string checks + in-page anchor check + structural
      // origin + best-effort attribution run over every seed finding as soon
      // as the page HTML is in hand. `presentationDetails` (T036) comes off
      // the SAME pages.context payload that seeded this scan, not a
      // separate fetch — it is a JSON string on pageInfo (§ 4c-6).
      const stringChecked = classifyFindings(
        extractAnchors(result.html),
        result.html,
        ctx.pageInfo?.presentationDetails,
      );

      // TR-4 (ADR-0009): two-call CM resolution over every internal-scope
      // finding, de-duplicated by resolved path. Never blanks the panel on
      // failure (NFR-2) — a systemic failure degrades the health flag, a
      // partial one only marks the findings it actually touched.
      const { findings, health: resolutionHealth } = await resolveInternalFindings(stringChecked, {
        // siteInfo.rootPath is real at runtime (probe (d) addendum) but sits
        // outside PagesContextSiteInfo's declared fields — the interface's
        // own `[key: string]: any` index signature is what makes this a
        // type-safe read rather than a cast.
        siteRootPath: ctx.siteInfo?.rootPath,
        language: page.language,
        client,
        authoringContextId: contextId,
        liveContextId,
        pageName: page.name,
      });
      if (cancelled || thisScanId !== scanIdRef.current) return;

      // T039 (M3): developer-console only, same discipline as M1's
      // logScanTiming — no telemetry, no persistence (NFR-3).
      logAttributionRate(page.name || page.path || page.id, computeAttributionRate(findings));

      setScan({
        page: { ...page, language: page.language },
        findings,
        health: { ...freshHealth(), ...resolutionHealth },
        completedAt: Date.now(),
      });
      setStatus("ready");
    };

    client
      .query("pages.context", {
        subscribe: true,
        onSuccess: (ctx) => {
          latestCtxRef.current = ctx;
          // A page-selection change is not the same class of event as a
          // content edit and must not sit behind the content debounce — it
          // re-scans immediately, and drops any pending debounced re-scan
          // rather than letting a stale one fire moments later.
          clearPendingDebounce();
          void runScan(ctx);
        },
      })
      .then((res) => {
        unsubscribe = res.unsubscribe;
        if (res.data) {
          latestCtxRef.current = res.data;
          void runScan(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    // Fail-soft (NFR-2 discipline extended to this trigger): either
    // subscription failing to establish must leave the page-change path
    // fully intact, never blank the panel. `client.subscribe` per the SDK
    // returns a teardown synchronously; guard the call itself in case a
    // given host/module combination throws instead of rejecting.
    try {
      unsubscribeFields = client.subscribe("pages.content.fieldsUpdated", {
        onData: () => scheduleContentRescan(),
        onError: (err) => {
          console.error("[link-health-lens] pages.content.fieldsUpdated subscription error", err);
        },
      });
    } catch (err) {
      console.error("[link-health-lens] failed to subscribe to pages.content.fieldsUpdated", err);
    }

    try {
      unsubscribeLayout = client.subscribe("pages.content.layoutUpdated", {
        onData: () => scheduleContentRescan(),
        onError: (err) => {
          console.error("[link-health-lens] pages.content.layoutUpdated subscription error", err);
        },
      });
    } catch (err) {
      console.error("[link-health-lens] failed to subscribe to pages.content.layoutUpdated", err);
    }

    return () => {
      cancelled = true;
      clearPendingDebounce();
      unsubscribe?.();
      unsubscribeFields?.();
      unsubscribeLayout?.();
    };
  }, [client, contextId, liveContextId]);

  return { status, scan };
}
