// T035 — structural origin classifier (ADR-0006). Decided by WHERE the anchor
// sits in the rendered page — computed BEFORE and INDEPENDENTLY of
// attribution (T036) — using the signal probe (f) actually found: semantic
// HTML landmarks. This head app's markup carries no data-component /
// data-placeholder / data-sc-* attributes (probe-findings-t008, § f), so the
// landmark element is the only structural signal available.
//
// <header>/<nav>/<footer> => chrome. <main> => content. An attribution
// failure on the SAME link never changes this — the function does not take
// attribution as an input at all, which is what makes that regression
// impossible to reintroduce by construction (see classifyOrigin.test.ts).
import type { LinkOrigin } from "@/lib/model/types";

const CHROME_LANDMARKS = "header, nav, footer";
const CONTENT_LANDMARK = "main";

/**
 * `ordinal` is 1-based document position, matching extractAnchors' row
 * identity — the same convention every other TR-3..5 classifier uses so a
 * caller never has to re-derive an anchor's position from a DOM reference.
 */
export function classifyOrigin(ordinal: number, html: string): LinkOrigin {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const anchor = doc.querySelectorAll("a")[ordinal - 1];

  // No anchor at that ordinal — a caller passed a stale/out-of-range index
  // against a different HTML string. Fail toward the label with the SAFER
  // consequence: 'chrome' renders a plain, static string; 'content' would
  // either attempt attribution against nothing or claim
  // "field not identified" about a link this classifier never actually saw.
  if (!anchor) return "chrome";

  if (anchor.closest(CHROME_LANDMARKS)) return "chrome";
  if (anchor.closest(CONTENT_LANDMARK)) return "content";

  // Fallback for an anchor inside NONE of the four landmarks. Probe (f)
  // found only header/nav/footer/main in this head app's rendered markup
  // (project-planning/plans/probe-findings-t008-20260901T090000Z.md § f) —
  // Content SDK's Layout.tsx always wraps rendered placeholders in <main>
  // (reference_content_sdk_layout_already_emits_landmarks), so an anchor
  // reachable by NONE of the four landmarks is page-shell scaffolding
  // (e.g. a skip link ahead of <header>), never authored content. The
  // fallback is therefore 'chrome', not 'content' — documented as a real
  // decision in docs/build-decisions.md, not a silent default.
  return "chrome";
}
