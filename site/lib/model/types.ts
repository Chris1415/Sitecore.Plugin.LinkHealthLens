// Data model (§ 4c-6). Defined in full at T017 even though scope/origin/statuses/
// attribution are populated by later tranches (TR-3..TR-5) — TR-2 emits the seed:
// href, ordinal, text only. The classification fields are optional/empty here so a
// `LinkFinding` is a complete, valid object at every tranche, never a partial cast.

export type StatusMember =
  | "ok"
  | "not-found"
  | "unpublished"
  | "not-found-or-unpublished"
  | "malformed"
  | "insecure-scheme"
  | "missing-anchor"
  | "could-not-check"
  | "reachability-not-checked";

export type LinkScope = "internal" | "external" | "non-navigational";
export type LinkOrigin = "content" | "chrome";

export interface LinkFinding {
  /** Raw as authored, exactly as the `href` attribute reads. `'(no href)'` when the
   * attribute is absent entirely (AC-5.3) — never used for an empty string, which is
   * a distinct, real, malformed value (TR-3). */
  href: string;
  /** 1-based document position. `href + ordinal` IS the row identity. */
  ordinal: number;
  text: string;
  /** TR-3 (T022). Absent until classified. */
  scope?: LinkScope;
  /** TR-5 (T035). Structural — absent until classified, never derived from attribution. */
  origin?: LinkOrigin;
  /** TR-3/TR-4 populate members; empty at extraction (T017). Always a Set — one anchor
   * is always exactly one row, never split across multiple. */
  statuses: Set<StatusMember>;
  /** TR-5 (T036). `null` until attribution runs or when it fails. */
  attribution: { fieldPath: string; target: unknown } | null;
  /** TR-4 (AC-3.2). Resolved page name, when known. */
  targetLabel: string | null;
  /** TR-4 — the CM item id of the link's resolved TARGET PAGE (call 1 of
   * ADR-0009), null until resolution runs or when it fails/excludes. This is
   * the ONLY id the owner-and-open control may navigate to — never
   * `attribution.target`, which names the *owning datasource*, not a page
   * (defect fixed 2026-09-02: ADR-0010 amended, see docs/build-decisions.md). */
  targetItemId: string | null;
}

export interface PageScan {
  page: { id: string; path: string; language: string; name: string };
  /** Document order — extraction order, never re-sorted. */
  findings: LinkFinding[];
  health: { pageHtml: boolean; hosts: boolean; resolution: boolean; liveState: boolean };
  completedAt: number;
}

/** A fresh, all-true health block — the starting point before any source fails. */
export function freshHealth(): PageScan["health"] {
  return { pageHtml: true, hosts: true, resolution: true, liveState: true };
}
