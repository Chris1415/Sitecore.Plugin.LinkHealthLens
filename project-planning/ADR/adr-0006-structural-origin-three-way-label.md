# ADR-0006: `origin` is structural, and unattributed content gets its own label

## Status

Accepted

## Context

ADR-0003 fixed the scope at the whole rendered page and made field attribution best-effort, with a
single fallback label for anything that could not be attributed:

```
site chrome — not editable from this page
```

PRD-000 then carried two mutually exclusive readings of what `origin` means, one in the prose and one
in the data model, and neither section noticed the other:

- **Attribution-derived** (§ 5, FR-13, AC-7.2): *chrome is whatever failed attribution.*
- **Structural** (§ 10's `origin` field, Assumption A3, metric M3): *chrome is where the anchor sits.*

Both readings fail, in different ways.

**Attribution-derived origin makes M3 a check that cannot fail.** If *non-chrome* is defined as
*attributed*, then the attribution rate over non-chrome links is 100% by construction. M3's ≥ 50%
gate at the T3 exit passes even when attribution resolves for three links in two hundred, and
Assumption A3's *"below ~50% the feature reads as broken"* escalation can never fire. The metric, the
assumption and the phase exit gate would all be decorative.

**Structural origin with only two labels puts a false statement in the product.** A link sitting in
the page body whose owning field the app failed to identify would render
`site chrome — not editable from this page` — which is untrue about where the link lives, and sends
the editor away from a field that is in fact right there. PRD-000 § 2's whole premise is that a
misleading panel is worse than no panel.

Put to the operator at `/challenge-prd` (ledger Q2).

## Decision

**`origin` is determined structurally, and there are three labels rather than two.**

- `origin` (`content` | `chrome`) is decided by **where the anchor sits in the page**, computed
  before and independently of attribution. An attribution failure **never** changes `origin`.
- Three affordances, one per link:
  1. attributed `content` link → a jump action that selects the owning field;
  2. `content` link whose owning field could not be identified → the exact string
     `in your content — field not identified`, no jump action;
  3. `chrome` link → the exact string `site chrome — not editable from this page`, no jump action.
- The chrome string is **never** applied to a `content` link. Doing so is a false statement about the
  product's own subject matter and an automatic Critical at code review.
- Both label strings are fixed, not copy suggestions.
- M3's denominator is *structurally-`content`* links, so the metric can genuinely fail.

**Rejected: attribution-derived `origin`.** It is cheaper — it needs no structural signal at all, and
it was the reading three sections of the PRD already assumed. It was rejected because it makes M3
unfailable, and a gate that cannot fail is worse than no gate: it would have reported a healthy
attribution rate through the T3 exit on a build where attribution barely worked, and A3's escalation
path would have been unreachable for the life of the project.

## Consequences

**This decision now rests on an unverified assumption, and that is the real cost.** Structural
`origin` requires the page-HTML payload to expose a signal that separates chrome from page content —
a template/partial boundary, a placeholder key, a datasource-bearing wrapper, something. Nothing has
verified that such a signal exists. It is recorded as **Assumption A4** and probed as **T0 question
(f)**, before any T3 work depends on it. A refutation does not have a silent fallback: reverting to
attribution-derived `origin` would reinstate the unfailable metric, so a refutation goes back to the
operator as a re-decision on the chrome/content split (PRD-000 R8).

**A third label is more UI, and the third case is the vaguest one.** `in your content — field not
identified` has to read as an honest admission rather than an error state, and it must be visually
distinguishable at a glance from the chrome label (AC-7.5) — the two mean different things and imply
different next steps. Both `/design` variants have to solve this at panel width.

**Attribution stays best-effort.** This ADR does **not** reverse ADR-0003 on that point. It changes
what an attribution *failure* is **called**, and nothing about how hard the app tries. ADR-0003's
fallback-label clause — *"where it cannot [be mapped], the finding renders with the exact label
`site chrome — not editable from this page`"* — is the one part narrowed here: that clause now applies
only where `origin` is structurally `chrome`.

**The failure mode moves, and improves.** Under the old reading, weak attribution was invisible
(reported as 100%). Under this one, weak attribution shows up as a page full of
`in your content — field not identified` and a failing M3 — visible to both the editor and the exit
gate, which is what makes the below-50% escalation in A3 a real mechanism.

## Date

2026-08-31

## Amendment (2026-09-01, T0 probe (f) — A4 CONFIRMED, with a dependency)

A4 holds: chrome and content **are** separable from the page HTML. But the signal is **semantic HTML
landmarks**, not `data-*` attributes — the captured page contains no `data-component` /
`data-placeholder` / `data-sc-*` at all. Measured on Zephira Home: `header` 6 anchors, `nav` 4,
`footer` 4, `main` 49.

**So this ADR survives and M3 stays failable** — the outcome this decision existed to secure.

**The dependency is worth stating, because it is not what it appears to be:** landmarks are emitted by
the **rendering app**, not by the SDK or the platform. This works because Content SDK's `Layout.tsx`
emits them. A head app rendering plain `div`s would return the structural signal to *absent*, and on
that site the three-way label would lose its basis — which is R8's operator re-decision, not an
implementation fallback.
