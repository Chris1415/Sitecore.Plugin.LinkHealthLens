// T016 — typed wrapper for the page-HTML surface. Part of the "one typed
// wrapper per SDK call" boundary (§ 4c-5) — no component calls client.query
// directly. DOUBLE unwrap (result.data.data), per § 4c-6 #3 and the .d.ts:
// node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-agent/
//   types.gen.d.ts → Agent.PagesGetPageHtmlData / PagesGetPageHtmlResponses
//   { path: { pageId: string }; query: { language: string; sitecoreContextId?: string } }
//   → PagesGetPageHtmlResponses[200] = PageHtmlResponse = { pageId; html }
//
// TR-4 fix: sitecoreContextId is required in Mode A for XMC agent calls
// (marketplace-sdk-xmc skill § 6a) — omitting it produced a real-portal 401/403
// that the panel correctly rendered as its error state, but silently, with no
// way to tell "no context" apart from "the call threw" apart from "bad envelope".
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";

export type PageHtmlFailureReason = "no-context" | "request-failed" | "bad-envelope";

export type PageHtmlResult =
  | { ok: true; pageId: string; html: string }
  | { ok: false; reason: PageHtmlFailureReason };

export async function fetchPageHtml(
  client: ClientSDK,
  params: { pageId: string; language: string; contextId: string | undefined },
): Promise<PageHtmlResult> {
  // Guard, not a cast (§ 6a names `as string` on an undefined context as the
  // anti-pattern: it ships `sitecoreContextId=undefined` on the wire and hides
  // the real cause at compile time). Absent context is its own reported cause.
  if (!params.contextId) {
    console.error("fetchPageHtml: no sitecoreContextId available", { pageId: params.pageId });
    return { ok: false, reason: "no-context" };
  }

  try {
    const res = await client.query("xmc.agent.pagesGetPageHtml", {
      params: {
        path: { pageId: params.pageId },
        query: { language: params.language, sitecoreContextId: params.contextId },
      },
    });
    // The client.d.ts QueryResult['data'] is the envelope from the openapi-ts
    // client; the real payload sits one level deeper — hence double unwrap.
    const inner = (res.data as { data?: { pageId?: string; html?: string } } | undefined)?.data;
    if (!inner || typeof inner.html !== "string") {
      console.error("fetchPageHtml: envelope missing html", { pageId: params.pageId });
      return { ok: false, reason: "bad-envelope" };
    }
    return { ok: true, pageId: inner.pageId ?? params.pageId, html: inner.html };
  } catch (err) {
    // Never blank/silent — the caller sets health.pageHtml = false and renders
    // the error state (NFR-2/T016), but the cause is now logged and returned
    // (no token/credential is ever in this error shape).
    console.error("fetchPageHtml: request threw", {
      pageId: params.pageId,
      message: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "request-failed" };
  }
}
