# ADR-0005: A link's status is a set, and "not checked" means reachability only

## Status

Accepted

## Context

ADR-0002 removed external reachability from the product, and PRD-000 recorded the consequence as
*"external links are listed and labelled **not checked**"*. That phrasing was carried over from the
pre-reframe design, where "not checked" meant literally *no check of any kind was possible*.

The reframe did not preserve that meaning. Two of the five surviving checks — `http:` scheme and
malformed/empty `href` — are **pure string inspection**. They need no network, no CM read and no
knowledge of the target, so they apply to an external link exactly as they apply to an internal one.
FR-11 (*"list external links without checking them"*) and AC-4.1 (*"any href whose scheme is `http:`
is flagged, **internal or external**"*) were therefore in direct contradiction, and the data model
made the contradiction unresolvable: `LinkFinding.status` was single-valued, so `not-checked` and
`insecure-scheme` could not coexist on one row.

The failure this sets up is not a debate — it is silent. An implementer reading FR-11 literally
short-circuits on `scope === 'external'` and drops both string checks on 30–60% of a typical page's
rows, and every test written from the same document agrees with them.

Put to the operator at `/challenge-prd` (ledger Q1).

## Decision

**Separate the two kinds of check, and make `status` a set.**

- *Not checked* means **reachability** not checked. It never means unexamined.
- The string checks (`insecure-scheme`, `malformed`) run on **every** link regardless of `scope`.
- `LinkFinding.statuses` is a **set**, not a single value. Every external row carries a standing
  `reachability-not-checked` member alongside whatever the string checks found.
- `reachability-not-checked` (**policy**) and `could-not-check` (**a check that failed**) are
  distinct members with distinct copy. Conflating them would hide a real failure behind a
  by-design note.
- **Display precedence**, headline first: `not-found` → `not-found-or-unpublished` → `unpublished` →
  `malformed` → `missing-anchor` → `insecure-scheme` → `could-not-check` → `ok`.
  `reachability-not-checked` is never a headline and is never suppressed.
- Precedence governs **the headline and the sort only**. Every member of the set stays visible on the
  row, which is what keeps `could-not-check` from disappearing behind a louder finding (AC-2.3).
- **One anchor is always exactly one row.** A multi-status link is never split, so AC-1.2's
  `href` + ordinal identity and M2's pairwise anchor reconciliation both survive unchanged.

## Consequences

**Harder — the panel is noisier on link-heavy pages.** A page whose footer carries twenty external
`http://` links now shows twenty rows with two statuses each rather than twenty inert "not checked"
rows. That is the accepted cost: the alternative is a panel that quietly declines to apply a check it
is perfectly capable of performing. NFR-4 inherits the pressure — a multi-status row has to stay
scannable at context-panel width, and the `/design` variants must both handle it.

**Harder — presentation now needs an ordering rule, and the rule is a product decision.** Which
finding is the headline on a row that is both `unpublished` and `insecure-scheme` changes what the
editor fixes first. It is written down here rather than left to the component.

**Easier — the honesty claim gets stronger, not weaker.** The app can now say "we checked everything
we can check on every link, and we checked reachability on none of them", which is both true and
narrower than the old wording. The global word ban (M5) does the rest.

**Easier — one testable rule replaces a contradiction.** FR-7, FR-8 and FR-11 now agree, and
AC-4.4 pins the coexistence case explicitly, so the short-circuit-on-external defect has a test that
fails when it appears.

**Related.** Refines ADR-0002, which established *that* reachability is gone; this ADR establishes
*what the app says about it and what it still checks anyway*.

## Date

2026-08-31
