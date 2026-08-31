# ADR-0003: Report the whole rendered page, with best-effort field attribution

## Status

Accepted — **the fallback-label clause is narrowed by ADR-0006** (see Amendment below). The scope
decision, the best-effort posture, the accepted duplicate reporting and the rejected
full-attribution option all stand unchanged.

## Context

Two defensible scopes for what the panel reports, and they produce different products:

- **Authored links on this page only** — links living in this page's own fields and datasources.
  Every finding is actionable by the person looking at it, and "jump to the field" works for all of
  them. A broken footer link is invisible.
- **Everything in the rendered page** — nav, footer and template-driven links included. The honest
  "what would a visitor hit" answer. But many findings are not fixable from the page being viewed,
  the same chrome link is reported on every page of the site, and jump-to-field cannot work for it.

The operator chose the rendered page (ledger Q2). That answer removed a feature the original prompt
had promised, so it was pushed back on immediately (ledger Q3) rather than absorbed silently.

## Decision

**Scope is the rendered page, including chrome.** Attribution back to an owning editable field is
**best-effort**: where an anchor can be mapped to a field, the finding carries a jump action; where
it cannot, the finding renders with the exact label

```
site chrome — not editable from this page
```

The string is fixed, not a copy suggestion. A dead affordance — a jump button that goes nowhere — is
worse than no button, and an unlabelled unattributable finding sends the editor hunting through a
page that does not contain the link.

## Consequences

**The label is load-bearing.** It is the entire mechanism by which the rendered-scope decision stays
honest: it tells the editor *this is real, and it is not yours to fix here*. Dropping it, or
softening it into something vaguer, converts a useful finding into a confusing one.

**Attribution rate becomes a product metric, not an implementation detail.** PRD-000 records
Assumption A3 with a threshold: below roughly **50%** of non-chrome links carrying a working jump
action, "best-effort" reads as broken rather than partial. That is measured as M3 at the phase 4
exit, and falling below it is a UX re-decision for the operator — not something implementation
should paper over.

**Duplicate reporting is accepted.** The same chrome link will be reported on every page of the
site. That is a true statement about the site and a repetitive one about the panel; grouping or
deduplicating across pages would require site-wide state, which ADR-0002 has no surface for.

**Rejected: full attribution for every chrome link.** It was offered and declined. It turns a
one-endpoint read into a layout-resolution problem, and it depends entirely on what the page-HTML
endpoint returns — which Assumption A1 says is unverified. It stays in § 15 Future Opportunities.

## Amendment (2026-08-31, `/challenge-prd` ledger Q2 → ADR-0006)

The Decision above says: *"where it cannot [be mapped to a field], the finding renders with the exact
label `site chrome — not editable from this page`."* Read literally, that defines **chrome as
whatever failed attribution** — which makes the attribution-rate metric M3 100% by construction and
its exit gate unfailable.

**ADR-0006 narrows that one clause.** `origin` is now decided **structurally**, and the chrome label
applies only where `origin` is structurally `chrome`. A **content** link whose owning field could not
be identified gets its own label, `in your content — field not identified`, because calling it site
chrome would be false.

**What is unchanged:** attribution remains **best-effort** — ADR-0006 changes what an attribution
*failure* is called, not how hard the app tries, and not the A3 / M3 ≥ 50% threshold recorded above.
The rendered-page scope, the accepted duplicate reporting and the rejection of full chrome
attribution are all untouched.

## Date

2026-08-31
