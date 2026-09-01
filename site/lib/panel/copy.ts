// Verbatim panel copy for the loading / error / no-links states (T013).
// Exported as constants so a "fixed string" cannot quietly diverge between a
// component and its test (rule: verbatim strings live in one place).
// Source: project-planning/design-prototypes/poc-v1-prd000/panel.js § renderLoading/renderError/renderReady.

export const LOADING_VERDICT = "Checking links…";
export const LOADING_SUBVERDICT = "No result yet — this is not a clean page.";
export const LOADING_LABEL = "Reading this page and resolving its links";
export const LOADING_FOOT = "recomputed on every page selection · nothing is stored";

export const ERROR_VERDICT = "Could not read this page";
export const ERROR_TITLE = "This page's markup did not come back";
export const ERROR_BODY =
  "Nothing is being reported for it. That is a failure of this panel, not a verdict about the page or its links.";
export const ERROR_RETRY = "Try again";
export const ERROR_FOOT = "nothing is stored · selecting another page also retries";

export const NO_LINKS_TITLE = "No links on this page";
export const NO_LINKS_BODY =
  "Nothing to report. This panel updates on its own when you select another page.";

export const SCOPE_STATEMENT = "Internal link integrity — reachability is never checked.";
export const SCOPE_TOGGLE_OPEN = "What is checked?";
export const SCOPE_TOGGLE_CLOSE = "Hide what is checked";
export const SCOPE_TIER_EVERY_TITLE = "Checked on every link";
export const SCOPE_TIER_EVERY_BODY = "href format · scheme (http:// vs https://)";
export const SCOPE_TIER_INTERNAL_TITLE = "Checked on internal links";
export const SCOPE_TIER_INTERNAL_BODY =
  "does the target exist in the CM · is it published · does an in-page anchor have a target here";
export const SCOPE_TIER_NEVER_TITLE = "Never checked, on any link";
export const SCOPE_TIER_NEVER_BODY =
  "whether the destination responds. This app makes no request to any link target, internal or external.";

// Status labels + headline detail copy (T024/T026, source: POC panel.js §
// STATUS/DETAIL). Only the members TR-3 introduces are defined here; TR-4/5
// amend this file with the rest as their checks land — one source of truth
// so a "fixed string" cannot quietly diverge between a component and its test.
export const STATUS_LABEL = {
  ok: "No findings",
  "not-found": "Target not found",
  unpublished: "Not published yet",
  "not-found-or-unpublished": "Not found or not published",
  malformed: "Malformed link",
  "insecure-scheme": "Insecure scheme (http://)",
  "missing-anchor": "No matching anchor on this page",
  "could-not-check": "Could not check",
  "reachability-not-checked": "Reachability not checked",
} as const;

// T038 (ADR-0006) — the three-way origin affordance. Two of the three are
// FIXED, verbatim constants (never reworded, never softened): the em-dash is
// load-bearing.
export const ORIGIN_CHROME_LABEL = "site chrome — not editable from this page";
export const ORIGIN_UNATTRIBUTED_LABEL = "in your content — field not identified";

// T037 (ADR-0010, superseding AC-7.1/AC-7.4) — there is no field-level
// selection on this platform (probe (g), REFUTED). The declared mutation
// surface navigates to an ITEM (`client.mutate('pages.context', { itemId })`)
// and nothing finer. "Open in canvas" is chosen deliberately over the POC's
// "Jump to field" wording, which this build must never ship — it would
// promise a resolution the platform cannot perform (ADR-0003's dead-
// affordance principle, restated by ADR-0010). Deviation from the POC's
// literal copy is recorded in docs/build-decisions.md.
export const ORIGIN_OPEN_LABEL = "Open in canvas";
export const ORIGIN_OPENED_CONFIRMATION = "Opened in the canvas";

// T040 — the chrome-only sub-line (verbatim, source: panel.js § renderReady).
// The PARTIAL-chrome form ("N of them are site chrome...") is T042's
// (VerdictHead / TR-6) territory, which also needs the full precedence-
// headline group counts this tranche does not build; scoping this file to
// the ALL-chrome case keeps TR-5 from preempting that contract.
export const CHROME_ONLY_SUBLINE = "Every one of them is site chrome — not editable from this page.";

export const STATUS_DETAIL = {
  "not-found": "No item in the CM matches this path.",
  unpublished: "The target exists but is not published.",
  "not-found-or-unpublished":
    "The CM did not distinguish a missing item from an unpublished one.",
  malformed: "The href is empty or cannot be parsed.",
  "insecure-scheme": "The href text starts with http://. The destination was not contacted.",
  "missing-anchor": "No element on this page carries that id or name.",
  "could-not-check": "A check failed for this link. That is not a verdict about the link.",
  "reachability-not-checked":
    "This app never contacts a destination. Its format and scheme were checked; whether it responds was not.",
} as const;
