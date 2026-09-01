// T016 — typed wrapper for the page-HTML surface. Part of the "one typed
// wrapper per SDK call" boundary (§ 4c-5) — no component calls client.query
// directly. DOUBLE unwrap (result.data.data), per § 4c-6 #3 and the .d.ts:
// node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-agent/
//   types.gen.d.ts → Agent.PagesGetPageHtmlData / PagesGetPageHtmlResponses
//   { path: { pageId: string }; query: { language: string; ... } }
//   → PagesGetPageHtmlResponses[200] = PageHtmlResponse = { pageId; html }
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";

export type PageHtmlResult =
  | { ok: true; pageId: string; html: string }
  | { ok: false };

export async function fetchPageHtml(
  client: ClientSDK,
  params: { pageId: string; language: string },
): Promise<PageHtmlResult> {
  try {
    const res = await client.query("xmc.agent.pagesGetPageHtml", {
      params: { path: { pageId: params.pageId }, query: { language: params.language } },
    });
    // The client.d.ts QueryResult['data'] is the envelope from the openapi-ts
    // client; the real payload sits one level deeper — hence double unwrap.
    const inner = (res.data as { data?: { pageId?: string; html?: string } } | undefined)?.data;
    if (!inner || typeof inner.html !== "string") {
      return { ok: false };
    }
    return { ok: true, pageId: inner.pageId ?? params.pageId, html: inner.html };
  } catch {
    // Never blank/silent — the caller sets health.pageHtml = false and renders
    // the error state (NFR-2/T016). A generic try/catch is correct here because
    // (unlike T030's getLivePageState) there is no data-bearing error to branch
    // on: pagesGetPageHtml has no declared "the failure IS the answer" status.
    return { ok: false };
  }
}
