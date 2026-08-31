# Architecture Decision Records

This directory holds ADRs for this product workspace.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| ADR-0001 | Use ADRs as architecture backbone | Accepted |
| ADR-0002 | Mode A (plain client-side) only — no backing route, ever | Accepted |
| ADR-0003 | Report the whole rendered page, with best-effort field attribution | Accepted |
| ADR-0004 | Ship to the Page Builder context panel, single route | Accepted |

> **This run is `track: minimal`** — there is no separate architecture blueprint, so these ADRs plus
> PRD-000 § 9 carry the architecture. ADR-0002 is the load-bearing one: it is what removes external
> link checking from the product, and reversing it re-opens the problem statement.

## Next number

Use the next free four-digit id after the highest existing `adr-*.md`.
