# ADR-0009: Resolve internal links by content-tree PATH, not by live URL

## Status

Accepted — **supersedes the resolution mechanism of ADR-0008.** ADR-0008's *shape* (two steps:
resolve, then ask if live) stands; its **first call** does not.

## Context

ADR-0008 built internal-link classification on `xmc.agent.pagesGetPagePathByLiveUrl`. The T0 probe
ran it against the real devex tenant on 2026-09-01 and it failed for **two independent reasons**,
either of which alone is disqualifying:

**1. It resolves by hostname → site, and no site has a hostname.**

```
GET /api/v1/pages/path-by-url?live_url=https://zephira.example/destinations
→ 404  {"detail":"No matching site found for hostname: zephira.example"}
```

`GET /api/v1/sites` returns 7 sites on this tenant and **`targetHostname` is empty on all 7**. There
is nothing for the endpoint to match against.

**2. It requires an absolute URL, and the app's input is relative.**

```
GET /api/v1/pages/path-by-url?live_url=/-/media/foo.pdf
→ 400  {"errors":{"('query','live_url')":"Input should be a valid URL, relative URL without a base"}}
```

Measured on the real captured page (Zephira Home, 57 anchors): **56 are relative**
(`/book`, `/destinations/Accra`, `/book?to=Lisbon`), 1 is anchor-only (`#content`), **0 are absolute**.

So the endpoint cannot be called with what the page actually contains, on a tenant where nothing
would match even if it could.

## Decision

**Resolve a site-relative href against the site's own content tree, by path, via Authoring GraphQL.**

```
site root      ← sites[].rootPath          (Zephira: d3c70fca-…, the Home item)
href  /destinations
      ↓  strip query + fragment, join to the site root's path
/sitecore/content/Zephira-Brand/Zephira/Home/destinations
      ↓  item(where:{ path })
HIT → the item exists        MISS → target not found
```

Proven at probe time, both directions:

```
/sitecore/content/Zephira-Brand/Zephira/Home/destinations  → HIT   e5ecb5f7ad3d489d8a48b9d9148e410b (Page)
/sitecore/content/Zephira-Brand/Zephira/Home/no-such-page  → MISS
```

**In-app this is `xmc.authoring.graphql`** — a declared SDK key, portal-brokered like every other
call. **ADR-0002 is untouched:** still Mode A, still no backing route, still no outbound request to
any link target.

**Step 2 is unchanged from ADR-0008**: `xmc.pages.getLivePageState` for publish state, where a `404`
is the not-live signal and must be handled as **data, not an error**.

## Consequences

**The hostname dependency disappears entirely**, which is the point. Classification no longer rests on
tenant configuration nobody has set, and a tenant admin adding or changing a `targetHostname` cannot
silently change what this app reports.

**Relative hrefs are now the natural input** rather than the awkward one. No URL reconstruction, no
guessing a base.

**Two normalisation steps become explicit, load-bearing work** — and they are exactly the cases the
critical review raised as G4:
- **strip the query string and fragment before lookup** — `/book?to=Lisbon` and `/book#top` both
  resolve to `/book`, and the captured page contains seven `?to=` variants of one page;
- **media and non-page paths** (`/-/media/…`) resolve to a MISS by construction. They must be
  **excluded before lookup**, not reported as *target not found* — flagging every PDF link as broken
  is precisely the false-positive class M4 exists to catch.

**Internal-vs-external classification loses its intended source.** FR-5 planned to use the tenant host
list, which is empty. The workable substitute is the shape of the href itself: **relative ⇒ internal,
absolute ⇒ external**, which on the measured page classifies 56 of 57 correctly and costs nothing. An
absolute URL pointing back at the site's own host would be misclassified as external — acceptable,
since the app only ever *lists* external links and never claims to have checked them.

**GraphQL calls are not free.** One lookup per distinct internal href against a ≤3s p50 budget at 150
anchors makes **de-duplication by resolved path** (not merely by `itemId`, since dedup now happens
before resolution) a planned task rather than an optimisation. The captured page's 57 anchors reduce
to **20 distinct** — a 65% saving before a single call is made.

**ADR-0008 is superseded in mechanism, not deleted.** Its analysis of why one call cannot answer both
questions remains correct and is why this ADR keeps the two-step shape.

## Date

2026-09-01
