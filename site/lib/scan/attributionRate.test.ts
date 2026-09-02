// T039 — computeAttributionRate. RED before GREEN.
import { describe, expect, it } from "vitest";
import type { LinkFinding } from "@/lib/model/types";
import { computeAttributionRate } from "./attributionRate";

function seed(overrides: Partial<LinkFinding>): LinkFinding {
  return {
    href: "/x",
    ordinal: 1,
    text: "x",
    statuses: new Set(),
    attribution: null,
    targetLabel: null,
    targetItemId: null,
    ...overrides,
  };
}

describe("computeAttributionRate", () => {
  it("counts only structurally-content findings in the denominator", () => {
    const findings = [
      seed({ origin: "chrome" }),
      seed({ origin: "chrome" }),
      seed({ origin: "content", targetItemId: "page-1" }),
    ];
    const result = computeAttributionRate(findings);
    expect(result.denominator).toBe(1);
    expect(result.numerator).toBe(1);
    expect(result.rate).toBe(1);
  });

  it("does NOT shrink the denominator when a link has no resolved target — the metric can genuinely fail", () => {
    const findings = [
      seed({ origin: "content", targetItemId: null }),
      seed({ origin: "content", targetItemId: null }),
      seed({ origin: "content", targetItemId: "page-1" }),
    ];
    const result = computeAttributionRate(findings);
    expect(result.denominator).toBe(3);
    expect(result.numerator).toBe(1);
    expect(result.rate).toBeCloseTo(1 / 3);
  });

  it("a chrome-only page reports rate 0, not NaN", () => {
    const findings = [seed({ origin: "chrome" }), seed({ origin: "chrome" })];
    const result = computeAttributionRate(findings);
    expect(result).toEqual({ numerator: 0, denominator: 0, rate: 0 });
  });

  it("counts a resolved target page as working even when the owning field/rendering was never attributed (defect fixed 2026-09-02 — the two signals are independent)", () => {
    const findings = [seed({ origin: "content", attribution: null, targetItemId: "page-1" })];
    const result = computeAttributionRate(findings);
    expect(result.numerator).toBe(1);
    expect(result.denominator).toBe(1);
  });

  it("an attributed field with no resolved target page does NOT count as working — attribution alone cannot be navigated to", () => {
    const findings = [
      seed({ origin: "content", attribution: { fieldPath: "a", target: { itemId: "datasource-1" } }, targetItemId: null }),
    ];
    const result = computeAttributionRate(findings);
    expect(result.numerator).toBe(0);
    expect(result.denominator).toBe(1);
  });
});
