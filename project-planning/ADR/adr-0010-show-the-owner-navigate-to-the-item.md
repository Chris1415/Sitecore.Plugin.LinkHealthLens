# ADR-0010: Show the owner and navigate to the item — there is no jump to a field

## Status

Accepted — **narrows ADR-0003's jump-action clause.** The rendered-page scope, the best-effort
attribution posture and the three-way label are all unchanged. **Amended 2026-09-02 — see
"Correction" below: the Decision as originally written named the wrong navigation TARGET.**

## Correction (2026-09-02) — the Decision navigated to the wrong item

**Live defect, operator-reported, CRITICAL.** The shipped control called
`client.mutate('pages.context', { itemId })` with `attribute()`'s `target.itemId` — the **owning
datasource's** id (`presentationDetails[].dataSource`). A datasource is not a page. `pages.context`
opens pages; asked to open a datasource it produced an error page in the live portal.

**Root cause: the probe evidence above never actually tested this.** It confirmed
`client.mutate('pages.context', { itemId: <current> })` succeeds — but `<current>` was the *page
already open*, itself a page. The Decision then generalized to "navigate to the owning item" and
implemented it with a **datasource** id, a generalization the probe never covered. `presentationDetails`
*also* gives the panel something that IS a page-navigable id, sitting one hop away: TR-4's
`resolveInternal` (ADR-0009 call 1) already resolves every internal link's **target page**, and that
id was sitting unused in `LinkFinding.targetItemId`.

**The Decision is corrected, not the mechanism named above:**

1. **Names the owner** — unchanged, still rendering + datasource, from `presentationDetails`. Now
   rendered as **text only**, never as, or attached to, the navigation control.
2. **Offers navigation to the link's resolved TARGET PAGE** (`LinkFinding.targetItemId`) via
   `client.mutate('pages.context', { itemId })` — the id ADR-0009's `resolveInternal` already produces
   for every internal link, and the only id in this app that is provably a page (Authoring GraphQL's
   `item.itemId` for a path lookup that HIT).
3. **The two are independent signals.** A content link with a resolved target page gets the control
   **even when its owning rendering could not be attributed** — "this points at an unpublished page,
   go look at it" needs no owner. Conversely an attributed link whose target could not be resolved
   (external, in-page anchor, unresolved) gets **no** control — attribution alone is not navigable.

**M3 is corrected to match:** the numerator now counts content-origin findings with a non-null
`targetItemId` — what the control actually renders for — not structural attribution. Measuring
attribution success (the pre-correction definition) would report a rate for a control that, per this
correction, does not gate on attribution at all.

**Consequence for the "one honest limit" below:** unchanged in spirit, sharper in practice — the
editor is now taken to the actual page the link points at (which may differ from the rendering's OWN
datasource entirely, e.g. a nav link inside one rendering pointing at an unrelated page), and still has
to locate the field within it.

Full mechanism + tests: `docs/build-decisions.md` § JumpAction navigation target /
§ OriginAffordance owner/navigate split. PRD-000 Amendment 2 and `prd-minimal-000.md`'s
non-negotiables carry the same correction.

## Context

PRD-000's AC-7.1 says the panel *"selects that field in the canvas"*, and AC-7.4 forbids *"a jump
action that does not resolve to a selectable field"*. Both assume field-level selection exists.

**The T0 probe refuted that at runtime, not merely from the types** (2026-09-01, devex, in-portal):

```
runtime mutate keys : ["pages.reloadCanvas", "pages.context"]     ← nothing else
availableModules    : ["xmc"]
client.getValue()   : CoreError: [client SDK] getValue method is not implemented.
client.mutate('pages.context', { itemId: <current> })  →  succeeded
```

`PagesContextParams` is `{ itemId?, language?, itemVersion? }`. **Item-level navigation works;
field-level selection does not exist.** The runtime agrees with the declared types.

The same probe, however, returned something the plan did not know it had. `pages.context` delivers
`pageInfo.presentationDetails` — the full rendering list, each entry carrying:

```json
{ "id": "...", "instanceId": "...", "placeholderKey": "/headless-main",
  "dataSource": "{D2E186FD-3C4A-4704-B535-55912941FD53}", "parameters": { ... } }
```

That maps a **region of the page to the item backing it**. It is not anchor→field, but it is a far
stronger signal than inferring ownership from rendered HTML, and it is delivered free with the
context on every page selection.

## Decision

**The affordance changes shape rather than disappearing.**

For a finding on a `content` link, the panel:

1. **Names the owner** — the rendering and the datasource item that backs the region the link sits
   in, derived from `presentationDetails`;
2. **Offers navigation to that ITEM** via `client.mutate('pages.context', { itemId })`, labelled for
   what it actually does — *open the item*, never *"jump to field"*;
3. **Says nothing it cannot deliver.** Where the owner cannot be determined, the finding keeps the
   `in your content — field not identified` label from ADR-0006 and offers no control at all.

**AC-7.1 and AC-7.4 are superseded by this ADR** and are amended in PRD-000 accordingly. The
prohibition inside AC-7.4 survives in stronger form: **no control may promise a resolution the
platform cannot perform.**

## Consequences

**No dead affordance, which was the whole point.** ADR-0003 introduced the chrome label precisely
because a jump that goes nowhere is worse than no jump. Shipping item-level navigation *labelled* as
field selection would have been that same defect wearing the right words — and it would have
inflated M3, since every attributed link would have counted as carrying a "working jump".

**M3's definition tightens rather than loosens.** It counts links carrying a **working owner-and-open
control**, not links carrying a *field* jump. The ≥50% threshold and its "below this it reads as
broken" escalation are unchanged; what changed is that the metric now measures something achievable,
so a green M3 means the feature works rather than that the bar was lowered to meet it.

**Attribution gets a better source and a new dependency.** `presentationDetails` is authoritative
about renderings and datasources, so attribution stops being HTML inference for the region half. The
cost: attribution now depends on a `pages.context` field, and mapping an *anchor* to a *rendering*
still requires relating rendered HTML position to `placeholderKey` — which is real work, not free,
and belongs in TR-5.

**One honest limit, stated rather than discovered later:** a rendering may back several fields, and a
link inside it cannot be narrowed further. The editor is taken to the right item and still has to
find the field within it. That is a smaller gap than the original promise implied, and naming it is
what keeps the panel truthful.

**Reversible if the platform adds field selection.** If a future SDK exposes a field-level parameter
on `pages.context`, this ADR is superseded and AC-7.1 returns in its original form. The probe
evidence above is dated and version-pinned (`client@0.3.6`) so the re-test is cheap.

## Date

2026-09-01
