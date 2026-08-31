# ADR-0007: Blok is the UI framework

## Status

Accepted

## Context

The `platform:marketplace` pack declares Blok as a **required ADR** — *"Blok (shadcn registry) is the
DEFAULT UI layer for Marketplace apps. The architecture must name it as the UI framework and capture
it as an ADR unless the operator explicitly opts out, and the opt-out is itself recorded."*

Nothing in PRD-000 named a UI framework. That is not the same as choosing one: an unnamed default is
a decision nobody made, and `/implement` would have picked whatever the scaffold emitted. This ADR
exists because the pack's `required_adrs` gate caught the omission at `/architect`, which is what
that gate is for.

The app is a **narrow panel inside the Page Builder canvas** (ADR-0004), not a full-width surface.
Whatever the framework, it has to look native to Sitecore's own chrome at panel width, in an iframe,
under the host's theme.

## Decision

**Blok is the UI framework.** Components come from the Blok shadcn registry via `@blok/*` aliases,
with Blok's theme tokens rather than hand-rolled CSS. The operator did **not** opt out, so the
platform default stands.

The scaffold command already resolved for this run
(`quickstart-with-client-side-xmc.json`, ADR-0002) is a Blok registry quickstart, so this decision
is consistent with the scaffold rather than layered on top of it.

## Consequences

**The app looks like Sitecore without anyone designing that.** Blok's tokens are the host's tokens,
so the panel inherits the portal's light/dark theme and spacing scale instead of approximating them.
For a panel that sits *inside* another product's UI, that is most of the visual work.

**`/design` is constrained, and that is deliberate.** The two variants (`ui_variants: 2`) diverge on
layout, information hierarchy and how a finding row is presented — **not** on typography, colour
system or component vocabulary, which Blok fixes. A variant that proposes its own design system is
out of contract, and the POC clickdummy must be reproducible in Blok components or it is not a
contract the build can honour.

**Iframe constraints are inherited, not solved.** Blok's Marketplace integration guidance covers
theming inside an iframe and the viewport limits per extension point; those still apply and are
`/design`'s to enforce at panel width.

**Rejected: hand-rolled CSS or a general component library.** Either would have to re-derive
Sitecore's visual language from screenshots and would drift from it on every portal update. The cost
of Blok is a registry dependency and less freedom in `/design`; both are worth paying for a panel
whose whole job is to feel like part of the product hosting it.

**Not recorded as an opt-out, because there was none.** If a later run wants to leave Blok, the pack
requires that opt-out to be its own recorded decision — silence would reinstate the undocumented
default this ADR closes.

## Date

2026-08-31
