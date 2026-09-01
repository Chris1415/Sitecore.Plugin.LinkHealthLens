// T042 — verdict sentence, sub-line and count-rail derivation. UI spec § 3.2.
// Pure functions over a scan's findings; counts are DERIVED, never stored.
// Ported from panel.js § renderHead's counting/verdict/sub-line logic.
import type { LinkFinding } from "@/lib/model/types";
import { GROUPS, groupBuckets, groupOf } from "@/lib/model/groups";

export interface GroupCounts {
  total: number;
  act: number;
  check: number;
  note: number;
  external: number;
  /** Rows inside the act/check/note tiers whose origin is chrome — the
   * load-bearing mitigation counts on the sub-line and group headers. */
  chrome: number;
}

const FIXABLE_TIERS = new Set(["act", "check", "note"]);

export function computeCounts(findings: LinkFinding[]): GroupCounts {
  const buckets = groupBuckets(findings);
  let act = 0;
  let check = 0;
  let note = 0;
  let external = 0;
  let chrome = 0;

  for (const g of GROUPS) {
    const rows = buckets.get(g.id) ?? [];
    const n = rows.length;
    if (g.tier === "act") act += n;
    if (g.tier === "check") check += n;
    if (g.tier === "note") note += n;
    if (g.tier === "standing") external += n;
    if (FIXABLE_TIERS.has(g.tier)) chrome += rows.filter((r) => r.origin === "chrome").length;
  }

  // Externals headlining as something else (e.g. insecure-scheme) still
  // carry the standing note, so "external" is the honest total, not just
  // the External group's own size (panel.js § renderReady).
  const externalGroupIds = new Set(GROUPS.filter((g) => g.tier === "standing").map((g) => g.id));
  external += findings.filter(
    (f) => f.statuses.has("reachability-not-checked") && !externalGroupIds.has(groupOf(f)),
  ).length;

  return { total: findings.length, act, check, note, external, chrome };
}

export type VerdictTone = "act" | "check" | "clear";

export interface Verdict {
  tone: VerdictTone;
  sentence: string;
  subline: string;
}

export function computeVerdict(counts: GroupCounts): Verdict {
  let tone: VerdictTone;
  let sentence: string;

  if (counts.act > 0) {
    tone = "act";
    sentence = `${counts.act} ${counts.act === 1 ? "link needs" : "links need"} attention before publishing`;
  } else if (counts.check > 0) {
    tone = "check";
    sentence = `${counts.check} ${counts.check === 1 ? "link to check" : "links to check"} before publishing`;
  } else if (counts.note > 0) {
    tone = "clear";
    sentence = "Nothing to fix before publishing";
  } else {
    tone = "clear";
    sentence = counts.total === 0 ? "No links on this page" : "No findings on this page";
  }

  const actionable = counts.act + counts.check + counts.note;
  let subline = "";
  if (actionable > 0 && counts.chrome === actionable) {
    subline = "Every one of them is site chrome — not editable from this page.";
  } else if (counts.chrome > 0) {
    subline = `${counts.chrome} of them are site chrome — not editable from this page.`;
  } else if (counts.total > 0 && actionable === 0) {
    subline = `${counts.total} links checked. ${counts.external} are external and carry the standing note below.`;
  }

  return { tone, sentence, subline };
}
