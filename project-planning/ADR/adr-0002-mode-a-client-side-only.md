# ADR-0002: Mode A (plain client-side) only — no backing route, ever

## Status

Accepted — **refined by ADR-0005**, which fixes what *not checked* means (reachability only) and
keeps the two string-based checks running on external links. The decision itself is unchanged.

## Context

The product was conceived as a broken-link checker: for every link on the page, report OK /
redirect (1 hop) / redirect-chain (2+) / broken (4xx-5xx) / mixed-content / dead-on-arrival. Every
one of those classifications except the last two requires **issuing a request to the link target**.

A Marketplace app runs inside a sandboxed iframe whose calls are portal-brokered. It cannot issue a
`HEAD` or `GET` against an arbitrary origin — the sandbox and CORS both stop it. The original design
therefore assumed the **client-side + server-side OAuth proxy** variant: a Next.js route of our own
that performs the outbound requests on the app's behalf. That route would have been the app's only
server-side surface, and would have carried its own concurrency policy, timeout policy, and
per-origin rate limiting.

At discovery the operator selected **plain client-side (Mode A)** instead, with the consequence
stated in the question and pushed back on once (ledger Q4 → Q5).

## Decision

**`variables.mode = client-side`.** The app ships with no backing route, no server-side surface and
no OAuth proxy — **not now and not as a later phase**.

The scaffold command resolves from the pack brief to
`npx shadcn@latest add https://blok.sitecore.com/r/marketplace/next/quickstart-with-client-side-xmc.json`.

Every check the app performs is therefore either **CM data read through the portal-brokered SDK** or
**static analysis of the href string**. A `fetch` or `HEAD` against a link target is an automatic
Critical at code review.

## Consequences

**Harder — and this is the whole cost of the decision.** External reachability is gone. The app
cannot detect a 404, a redirect chain, a DNS failure, or mixed content by response. Those are three
of the six classifications the idea was built around, and they are the ones the original problem
statement ("editors learn from angry visitors") was actually about. **This is permanent scope
removal, not a deferral** — recording it as "phase 2" would be dishonest, because no phase can
restore it without reversing this ADR.

**The product is therefore a different product**, and § 2 of PRD-000 says so: internal-link
integrity, not broken-link detection. The UI is forbidden from calling any link "broken", "dead",
"404" or "unreachable" (FR + metric M5, grep-able at every `/code-review`). A panel that reports
"all clear" while a page is full of dead external links would be worse than no panel, so external
links are listed and explicitly labelled *not checked*.

**Easier.** No server surface at all: no proxy route, no concurrency or rate-limit policy, no
timeout tuning, no second deployment concern, no origin allow-list, and no SSRF exposure. The
original probe tranche had four unknowns; this decision **deletes one of them outright** (whether
the sandboxed iframe may fetch our own backing route). The app is a single client-side bundle whose
only I/O is the portal bridge — which is also the smallest possible surface for a first end-to-end
exercise of the `platform:marketplace` pack.

**Reversal cost.** Reversing this means changing `variables.mode`, adding the route, and re-opening
the problem statement. It is a spec-level reversal, not an implementation detail — which is exactly
why it is an ADR rather than a note in the task breakdown.

## Date

2026-08-31
