// T039 — M3 instrumentation. Measures the share of STRUCTURALLY-`content`
// links carrying a WORKING owner-and-open control. Target >= 50% (A3).
//
// The denominator is structural (every `origin === 'content'` finding),
// never attribution-derived — that is the whole point (ADR-0006 § M3): an
// attribution-derived denominator would make this metric 100% by
// construction and unfailable, which is exactly the defect the ADR exists
// to remove.
//
// AMENDED 2026-09-02 (ADR-0010 amendment): "working" now means what
// `OriginAffordance` actually renders a button for — a resolved TARGET PAGE
// id (`finding.targetItemId`, from TR-4's `resolveInternal`) — NOT whether
// `attribute()` produced an owning-datasource attribution. The two are
// independent signals since the fix; measuring the wrong one here would
// silently drift the metric from the UI it is supposed to describe (rule
// 88). Requires this to run over TR-4-resolved findings (post
// `resolveInternalFindings`), same call site as before.
import type { LinkFinding } from "@/lib/model/types";

export interface AttributionRate {
  numerator: number;
  denominator: number;
  /** 0 when denominator is 0 — an all-chrome page has no rate to report,
   * not a divide-by-zero NaN a caller has to guard against. */
  rate: number;
}

export function computeAttributionRate(findings: LinkFinding[]): AttributionRate {
  const contentFindings = findings.filter((f) => f.origin === "content");
  const denominator = contentFindings.length;
  const numerator = contentFindings.filter((f) => f.targetItemId !== null).length;

  return { numerator, denominator, rate: denominator === 0 ? 0 : numerator / denominator };
}

export function logAttributionRate(pageName: string, result: AttributionRate): void {
  const pct = (result.rate * 100).toFixed(1);
  console.info(
    `[link-health-lens] M3 attribution rate: ${pageName} — ${result.numerator}/${result.denominator} (${pct}%)`,
  );
}
