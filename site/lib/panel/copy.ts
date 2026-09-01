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
  malformed: "Malformed link",
  "insecure-scheme": "Insecure scheme (http://)",
  "missing-anchor": "No matching anchor on this page",
  "reachability-not-checked": "Reachability not checked",
} as const;

export const STATUS_DETAIL = {
  malformed: "The href is empty or cannot be parsed.",
  "insecure-scheme": "The href text starts with http://. The destination was not contacted.",
  "missing-anchor": "No element on this page carries that id or name.",
  "reachability-not-checked":
    "This app never contacts a destination. Its format and scheme were checked; whether it responds was not.",
} as const;
