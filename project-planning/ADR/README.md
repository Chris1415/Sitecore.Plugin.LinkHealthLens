# Architecture Decision Records

This directory holds ADRs for this product workspace.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| ADR-0001 | Use ADRs as architecture backbone | Accepted |
| ADR-0002 | Mode A (plain client-side) only — no backing route, ever | Accepted — refined by ADR-0005 |
| ADR-0003 | Report the whole rendered page, with best-effort field attribution | Accepted — narrowed by ADR-0006 (label) and ADR-0010 (jump) |
| ADR-0004 | Ship to the Page Builder context panel, single route | Accepted |
| ADR-0005 | A link's status is a set, and "not checked" means reachability only | Accepted |
| ADR-0006 | `origin` is structural, and unattributed content gets its own label | Accepted — A4 confirmed via landmarks (see Amendment) |
| ADR-0007 | Blok is the UI framework | Accepted |
| ADR-0008 | Internal-link resolution is a two-call composition, not one lookup | Accepted — first call superseded by ADR-0009 |
| ADR-0009 | Resolve internal links by content-tree PATH, not by live URL | Accepted |
| ADR-0010 | Show the owner and navigate to the item — there is no jump to a field | Accepted |

> **This run is `track: minimal`** — there is no separate architecture blueprint, so these ADRs plus
> PRD-000 § 9 carry the architecture. ADR-0002 is the load-bearing one: it is what removes external
> link checking from the product, and reversing it re-opens the problem statement.
>
> ADR-0005 and ADR-0006 came out of `/challenge-prd` (ledger Q1 and Q2). Both resolve a
> contradiction the PRD carried in two places at once; ADR-0006 in particular exists because the
> rejected alternative made metric M3 unfailable. Neither reverses an earlier ADR — each narrows one
> clause, and the narrowing is recorded in the earlier file rather than applied silently.

## Next number

Use the next free four-digit id after the highest existing `adr-*.md`.
