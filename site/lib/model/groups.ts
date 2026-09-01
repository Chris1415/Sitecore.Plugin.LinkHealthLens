// T041 — grouping by headline (UI spec § 3.1). A PRESENTATION layer over
// `PRECEDENCE`/`headlineOf` (precedence.ts) — this file must never re-rank
// anything, only bucket. Reference implementation ported from
// project-planning/design-prototypes/poc-v1-prd000/panel.js § GROUPS/groupOf.
//
// The one declared exception: a row whose headline is `ok` but which also
// carries the standing `reachability-not-checked` note goes to `external`,
// not `no-findings`. Consequence, stated openly: an external `http://` row
// headlines as `insecure-scheme` (a real finding always outranks the
// standing note per PRECEDENCE), so it lands in `insecure` carrying BOTH
// chips — `external` holds only rows whose sole member is the standing note.
import type { LinkFinding, StatusMember } from "./types";
import { headlineOf } from "./precedence";

export type GroupTier = "act" | "check" | "note" | "standing" | "clear";

export interface GroupDef {
  id: string;
  name: string;
  tone: GroupTier;
  tier: GroupTier;
  /** Headline members routed to this group. Empty for `external`, which is
   * reached only through the `ok` + standing-note exception below. */
  heads: StatusMember[];
}

export const GROUPS: GroupDef[] = [
  { id: "not-found", name: "Target not found", tone: "act", tier: "act", heads: ["not-found", "not-found-or-unpublished"] },
  { id: "unpublished", name: "Not published yet", tone: "check", tier: "check", heads: ["unpublished"] },
  { id: "malformed", name: "Malformed link", tone: "check", tier: "check", heads: ["malformed"] },
  { id: "missing-anchor", name: "Anchor has no target here", tone: "check", tier: "check", heads: ["missing-anchor"] },
  { id: "insecure", name: "Insecure scheme (http://)", tone: "note", tier: "note", heads: ["insecure-scheme"] },
  { id: "could-not-check", name: "Could not check", tone: "note", tier: "note", heads: ["could-not-check"] },
  { id: "external", name: "External — reachability not checked", tone: "clear", tier: "standing", heads: [] },
  { id: "no-findings", name: "No findings", tone: "clear", tier: "clear", heads: ["ok"] },
];

export function groupOf(finding: LinkFinding): string {
  const head = headlineOf(finding.statuses);
  if (head === "ok" && finding.statuses.has("reachability-not-checked")) return "external";
  for (const g of GROUPS) {
    if (g.heads.includes(head)) return g.id;
  }
  return "no-findings";
}

// T045 — default-open rule: expand groups from the top (worst-first, the
// `GROUPS` display order) until roughly 10 rows are exposed, then stop. A
// zero-count group renders no section at all (a "group with zero findings
// is omitted, not greyed" — T041) so it is never added to the open set
// either. At least the first non-empty group always opens, even alone, if
// it already exceeds the target on its own.
const DEFAULT_OPEN_ROW_TARGET = 10;

export function defaultOpenGroupIds(buckets: Map<string, LinkFinding[]>): Set<string> {
  const open = new Set<string>();
  let exposed = 0;
  for (const g of GROUPS) {
    if (exposed >= DEFAULT_OPEN_ROW_TARGET) break;
    const rows = buckets.get(g.id) ?? [];
    if (rows.length === 0) continue;
    open.add(g.id);
    exposed += rows.length;
  }
  return open;
}

/** Buckets every finding into exactly one group, in `GROUPS` display order.
 * Every finding lands in exactly one bucket by construction (`groupOf`
 * always returns exactly one id), which is what makes "group counts sum to
 * the total" true without a separate reconciliation step. */
export function groupBuckets(findings: LinkFinding[]): Map<string, LinkFinding[]> {
  const buckets = new Map<string, LinkFinding[]>();
  for (const g of GROUPS) buckets.set(g.id, []);
  for (const f of findings) {
    const id = groupOf(f);
    buckets.get(id)!.push(f);
  }
  return buckets;
}
