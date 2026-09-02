// T036 — best-effort field attribution (FR-14), RENDERING-level not
// field-level (OQ-3). Order-correlates a correlation root's top-level
// children against `pageInfo.presentationDetails` entries and refuses
// (returns null) on any count mismatch rather than guess a misaligned
// mapping. Full reasoning + granularity decision, + the T041 depth-bug
// correction (correlation root is found by bounded descent, not assumed
// to be <main> itself): docs/build-decisions.md § T036 / § T041.
import type { LinkFinding } from "@/lib/model/types";

interface PresentationDetailEntry {
  id?: string;
  instanceId?: string;
  placeholderKey?: string;
  dataSource?: string;
  parameters?: string;
}

interface PresentationDetailsDevice {
  renderings?: PresentationDetailEntry[];
}

export type Attribution = NonNullable<LinkFinding["attribution"]>;

// Real-tenant captures (project-planning/captures/velaro-home-presentation-
// details.DEVREL.json) deliver `{ devices: [{ renderings: [...] }] }`, not a
// bare array — a shape the .d.ts's `presentationDetails?: string` leaves
// unstated. The flat-array shape is kept too (attribute.test.ts's fixtures
// and any tenant that DOES deliver it flat) so this is additive, not a
// behaviour change for either shape.
export function parsePresentationDetails(raw: string | undefined): PresentationDetailEntry[] | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (Array.isArray(parsed)) return parsed as PresentationDetailEntry[];
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { devices?: unknown }).devices)) {
    const devices = (parsed as { devices: PresentationDetailsDevice[] }).devices;
    const withRenderings = devices.find((device) => Array.isArray(device.renderings));
    if (withRenderings?.renderings) return withRenderings.renderings;
  }
  return null;
}

// T041: <main> is not always the correlation root — this head app wraps its
// body renderings in a single shell element (`<main id="main"><div
// id="content">...5 sections...</div></main>` on the real Velaro Home
// capture), so `main.children.length` was 1 against 5 real renderings and
// M3 measured 0/10 even though the underlying section-to-rendering pairing
// is exact one level down. Descend ONLY while a node has exactly one
// element child — a page-shell wrapper is definitionally single-child; a
// node with more than one child that still isn't a count match is refused,
// never treated as a candidate to walk past. Bounded to 3 levels: deep
// enough for shell wrapping (`main > div#content` needs 1) plus headroom,
// shallow enough that an unbounded walk can never wander INSIDE one
// individual rendering's own markup and land on a coincidental child-count
// match, which would silently mis-attribute an anchor to the wrong
// rendering — the exact guess this function's refusal rule exists to rule
// out (docs/build-decisions.md § T041).
const MAX_CORRELATION_DESCENT = 3;

function findCorrelationRoot(main: Element, targetCount: number): Element | null {
  let node: Element = main;
  for (let depth = 0; depth <= MAX_CORRELATION_DESCENT; depth++) {
    const children = node.children;
    if (children.length === targetCount) return node;
    if (children.length !== 1) return null;
    node = children[0];
  }
  return null;
}

function readableLabel(placeholderKey: string | undefined, position: number): string {
  // No component display name is available without an extra CM lookup
  // (out of this tranche's architecture_budget: mindful — no new SDK
  // surface). "Body" names the region (this app only ever attributes
  // content-origin links, which are inside <main> by construction — T035
  // runs first); the ordinal names which section within it.
  const region = placeholderKey && placeholderKey.trim() ? placeholderKey : "Body";
  return `${region} > Section ${position}`;
}

/**
 * `ordinal` is the finding's 1-based document position (same convention as
 * classifyOrigin). Only called for origin === 'content' findings — chrome
 * findings never attempt attribution (T038 renders the chrome label
 * unconditionally for those).
 */
export function attribute(
  ordinal: number,
  html: string,
  presentationDetailsRaw: string | undefined,
): Attribution | null {
  return attributeIn(
    new DOMParser().parseFromString(html, "text/html"),
    ordinal,
    parsePresentationDetails(presentationDetailsRaw),
  );
}

/** Same correlation against an ALREADY-PARSED document and ALREADY-PARSED
 * rendering list — see classifyOriginIn's note and
 * docs/build-decisions.md#parse-the-page-once-per-scan. */
export function attributeIn(
  doc: Document,
  ordinal: number,
  renderings: PresentationDetailEntry[] | null,
): Attribution | null {
  if (!renderings || renderings.length === 0) return null;

  const main = doc.querySelector("main");
  if (!main) return null;

  // T041: the correlation root may be <main> itself or a single-child
  // wrapper some bounded number of levels inside it — see
  // findCorrelationRoot's module note. Still refuses (returns null) when no
  // level in the bounded descent matches the rendering count.
  const root = findCorrelationRoot(main, renderings.length);
  if (!root) return null;

  const sections = Array.from(root.children);
  if (sections.length === 0) return null;

  const anchor = doc.querySelectorAll("a")[ordinal - 1];
  if (!anchor) return null;

  const sectionIndex = sections.findIndex((section) => section === anchor || section.contains(anchor));
  if (sectionIndex === -1) return null;

  const rendering = renderings[sectionIndex];
  const itemId = typeof rendering.dataSource === "string" ? rendering.dataSource.trim() : "";
  if (!itemId) return null;

  return {
    fieldPath: readableLabel(rendering.placeholderKey, sectionIndex + 1),
    target: { itemId },
  };
}
