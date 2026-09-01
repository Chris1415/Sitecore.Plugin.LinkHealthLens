"use client";

// T015/T016 — subscribes to pages.context and recomputes on every payload.
// On each new payload: discard all prior findings (FR-4/AC-1.3), enter
// loading, fetch the page HTML, extract anchors. Unsubscribes on unmount.
import type { PagesContext } from "@sitecore-marketplace-sdk/client";
import { useEffect, useRef, useState } from "react";
import { useMarketplaceClient } from "@/components/providers/marketplace";
import { extractAnchors } from "@/lib/scan/extractAnchors";
import { classifyFindings } from "@/lib/scan/classifyFindings";
import { fetchPageHtml } from "@/lib/sdk/pagesGetPageHtml";
import { freshHealth, type PageScan } from "@/lib/model/types";

export type ScanStatus = "loading" | "error" | "ready";

export interface UsePageScanResult {
  status: ScanStatus;
  scan: PageScan | null;
}

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
  const [status, setStatus] = useState<ScanStatus>("loading");
  const [scan, setScan] = useState<PageScan | null>(null);
  // Guards a slow HTML fetch resolving after a newer selection already reset
  // state — the reset in runScan is synchronous; this stops a stale response
  // from clobbering it (belt-and-braces for FR-4).
  const scanIdRef = useRef(0);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const runScan = async (ctx: PagesContext) => {
      const thisScanId = ++scanIdRef.current;
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

      const result = await fetchPageHtml(client, { pageId: page.id, language: page.language });
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

      // TR-3: scope + string checks + in-page anchor check run over every
      // seed finding as soon as the page HTML is in hand — the same html
      // that answered extraction also answers the anchor check.
      const findings = classifyFindings(extractAnchors(result.html), result.html);
      setScan({
        page: { ...page, language: page.language },
        findings,
        health: freshHealth(),
        completedAt: Date.now(),
      });
      setStatus("ready");
    };

    client
      .query("pages.context", {
        subscribe: true,
        onSuccess: (ctx) => {
          void runScan(ctx);
        },
      })
      .then((res) => {
        unsubscribe = res.unsubscribe;
        if (res.data) void runScan(res.data);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [client]);

  return { status, scan };
}
