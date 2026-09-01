// T036 — best-effort field attribution (FR-14), RENDERING-level not
// field-level (OQ-3). Order-correlates <main>'s top-level children against
// `pageInfo.presentationDetails` entries and refuses (returns null) on any
// count mismatch rather than guess a misaligned mapping. Full reasoning +
// granularity decision: docs/build-decisions.md § T036.
import type { LinkFinding } from "@/lib/model/types";

interface PresentationDetailEntry {
  id?: string;
  instanceId?: string;
  placeholderKey?: string;
  dataSource?: string;
  parameters?: string;
}

export type Attribution = NonNullable<LinkFinding["attribution"]>;

function parsePresentationDetails(raw: string | undefined): PresentationDetailEntry[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
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
  const renderings = parsePresentationDetails(presentationDetailsRaw);
  if (!renderings || renderings.length === 0) return null;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const main = doc.querySelector("main");
  if (!main) return null;

  const sections = Array.from(main.children);
  if (sections.length === 0) return null;

  // Give up rather than guess a misaligned mapping (see the module note).
  if (sections.length !== renderings.length) return null;

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
