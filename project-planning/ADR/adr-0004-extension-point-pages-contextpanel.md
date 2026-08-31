# ADR-0004: Ship to the Page Builder context panel, single route

## Status

Accepted

## Context

Five extension points are available (`.claude/skills/marketplace-sdk-extension-routes`): Standalone,
Full screen, Dashboard widget, Page context panel, Custom field. Sitecore's own guidance puts
"a section of your app that extends page-level settings or displays real-time page insights" on the
**Page Builder context panel**, and that is exactly the shape of this app: a read-only report about
*the page currently open in the canvas*.

The context panel is also the only extension point whose SDK contract exposes **`pages.context` as a
subscribable value**. Every other surface gets `application.context` instead and would have to
navigate to a page rather than observe the one being edited — which for this product would invert
the interaction entirely.

## Decision

**Extension point: `xmc:pages:contextpanel`. One route, no others.**

The panel subscribes to `pages.context` and recomputes its findings on every page-selection event.
No Standalone route, no Full-screen route, no Dashboard widget.

## Consequences

**The app is bound to one tenant per install.** Every extension point except `standalone` is scoped
to the single tenant the editor is working in — one `resourceAccess[]` entry is the whole world.
That is correct here: a link report is about *this* page in *this* environment. It also means no
cross-tenant or org-wide view is possible without adding a second extension point, which is out of
scope.

**Findings are per-selection and ephemeral.** Because the trigger is a `pages.context` subscription
rather than a user-initiated scan, the panel must be cheap enough to run on every selection — which
is where the PRD's ≤3s p50 / ≤6s p95 budget for a ≤150-anchor page comes from. There is no
persistence and no cache surviving a reload; recomputing is the design, not a limitation.

**The viewport is narrow and fixed.** A left-hand panel beside the canvas is not a dashboard. The
two `/design` variants must both work at panel width, and the POC clickdummy is the contract for
that — a layout that only reads well at full width would pass every structural test and be unusable
in the actual surface.

**Untested-surface risk is low.** Three sibling products (`quickcopy`, `component-usage-atlas`,
`pageshot`) already ship to this extension point, so the surface itself is proven here and the
`external_reference: cite-required` dial permits borrowing their panel-shell patterns with logging.

## Date

2026-08-31
