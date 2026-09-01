// T039 — M3 instrumentation. Measures the share of STRUCTURALLY-`content`
// links carrying a WORKING owner-and-open control. Target >= 50% (A3).
//
// The denominator is structural (every `origin === 'content'` finding),
// never attribution-derived — that is the whole point (ADR-0006 § M3): an
// attribution-derived denominator would make this metric 100% by
// construction and unfailable, which is exactly the defect the ADR exists
// to remove. A "working" control additionally requires a non-empty
// `target.itemId` — an attribution object whose target the jump control
// itself would refuse to render (JumpAction returns null with no itemId)
// does not count as working.
import type { LinkFinding } from "@/lib/model/types";

export interface AttributionRate {
  numerator: number;
  denominator: number;
  /** 0 when denominator is 0 — an all-chrome page has no rate to report,
   * not a divide-by-zero NaN a caller has to guard against. */
  rate: number;
}

function hasWorkingItemId(target: unknown): boolean {
  return (
    typeof target === "object" &&
    target !== null &&
    "itemId" in target &&
    typeof (target as { itemId: unknown }).itemId === "string" &&
    (target as { itemId: string }).itemId.length > 0
  );
}

export function computeAttributionRate(findings: LinkFinding[]): AttributionRate {
  const contentFindings = findings.filter((f) => f.origin === "content");
  const denominator = contentFindings.length;
  const numerator = contentFindings.filter(
    (f) => f.attribution !== null && hasWorkingItemId(f.attribution.target),
  ).length;

  return { numerator, denominator, rate: denominator === 0 ? 0 : numerator / denominator };
}

export function logAttributionRate(pageName: string, result: AttributionRate): void {
  const pct = (result.rate * 100).toFixed(1);
  console.info(
    `[link-health-lens] M3 attribution rate: ${pageName} — ${result.numerator}/${result.denominator} (${pct}%)`,
  );
}
