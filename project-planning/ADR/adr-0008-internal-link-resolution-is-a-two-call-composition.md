# ADR-0008: Internal-link resolution is a two-call composition, not one lookup

## Status

Accepted

## Context

PRD-000 assumed a single endpoint — *"resolve each internal link via `path-by-url` and classify as
exists / not found / exists-but-unpublished"* — and recorded that as **Assumption A2**, load-bearing
on US-3 and flagged at `/challenge-prd` as the headline feature resting on an unverified
distinction.

The SDK was installed at `/architect` purely to read its types (`@sitecore-marketplace-sdk/client@0.3.6`,
`@sitecore-marketplace-sdk/xmc@0.4.2`), which is what the SDK contract verification gate asks for.
The declared types **refute the single-call assumption**.

**The real key is `xmc.agent.pagesGetPagePathByLiveUrl`, and it is keyed on a LIVE url:**

```ts
// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-agent/types.gen.d.ts → Agent.PagesGetPagePathByLiveUrlData
type PagesGetPagePathByLiveUrlData = {
  query: { live_url: string; sitecoreContextId?: string };
  url: '/api/v1/pages/path-by-url';
};

// source: …/client-agent/types.gen.d.ts → Agent.PagePathByLiveUrlResponse
type PagePathByLiveUrlResponse = {
  itemId: string;
  name: string;
  hasPresentation: boolean;
  template: PagePathTemplateModel;
  insertOptions: Array<PagePathInsertOptionModel>;
};
```

**There is no publish-state field on that response.** It answers *"which CM item backs this URL"* and
nothing about whether the page is live. A single call cannot separate *missing* from *unpublished*.

The signal exists on a different call:

```ts
// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-pages/types.gen.d.ts → Pages.GetLivePageStateData
type GetLivePageStateData = {
  path:  { pageId: string };
  query: { language: string; environmentId?: string; sitecoreContextId?: string };
  url:   '/api/v1/pages/{pageId}/live';
};
type GetLivePageStateErrors    = { 404: ProblemDetails };   // not live
type GetLivePageStateResponses = { 200: unknown };          // live — shape UNDECLARED
```

## Decision

**Internal-link classification composes two calls:**

1. `xmc.agent.pagesGetPagePathByLiveUrl({ live_url })` — resolve the href to a CM item.
   - No result ⇒ **target not found**. Terminal; no second call.
   - A result ⇒ carry `itemId` forward.
2. `xmc.pages.getLivePageState({ pageId: itemId, language })` — ask whether that item is live.
   - **`404` ⇒ exists but not published.** The absence is the signal.
   - `200` ⇒ published.

**`language` comes from `pages.context`**, not from a default. It is a **required** query parameter
on both `getLivePageState` and `pagesGetPageHtml`, and "published" is per language — a page live in
`en` and absent in `de` is a real state this app must not misreport.

**Unwrap level:** both are `xmc.*` queries in Mode A ⇒ **double unwrap** (`result.data.data`), per the
`marketplace-sdk-xmc` skill's Mode A/B matrix. Not single — that is the documented regression class.

## Consequences

**A2 is now half-resolved and half-sharpened.** The distinction *is* obtainable, so US-3 survives and
AC-3.3's pre-committed merged label does **not** need to fire. But it costs **two calls per internal
link**, not one — which lands directly on the ≤3s p50 / ≤6s p95 budget for a 150-anchor page. Call
volume becomes an architectural concern the task breakdown must plan for: de-duplicate by resolved
`itemId`, and only make call 2 for links that resolved in call 1.

**A 404 is a legitimate answer, not an error.** The client must treat `GetLivePageStateErrors.404` as
data. A generic "retry or report the call failed" error handler would convert the app's headline
finding into an infrastructure warning — the single most likely way to implement this wrong.

**The 200 shape is `unknown` in the SDK, so rule `40` cannot be satisfied for it by type alone.**
That is a genuine gap in the declared contract, not an omission here. **T0 probe (b) is narrowed
rather than removed:** it no longer asks *"can the endpoint distinguish missing from unpublished"* —
the types answer that — it asks *"what does the 200 body actually contain, and does 404 reliably mean
not-live rather than not-found-at-all"*. Capture the real body as a fixture before any test asserts
on it.

**Rejected: infer publish state from `hasPresentation`.** It is on the response we already have, so it
is tempting. It means *"this item has a layout"*, which is a different question — an unpublished page
has presentation, and a published one without presentation is possible. Using it would produce a
confident wrong answer, which is exactly the class of defect PRD-000 § 2 forbids.

## Date

2026-08-31
