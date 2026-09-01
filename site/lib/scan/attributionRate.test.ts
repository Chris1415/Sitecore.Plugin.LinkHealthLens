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
    ...overrides,
  };
}

describe("computeAttributionRate", () => {
  it("counts only structurally-content findings in the denominator", () => {
    const findings = [
      seed({ origin: "chrome" }),
      seed({ origin: "chrome" }),
      seed({ origin: "content", attribution: { fieldPath: "a", target: { itemId: "1" } } }),
    ];
    const result = computeAttributionRate(findings);
    expect(result.denominator).toBe(1);
    expect(result.numerator).toBe(1);
    expect(result.rate).toBe(1);
  });

  it("does NOT shrink the denominator when attribution fails — the metric can genuinely fail", () => {
    const findings = [
      seed({ origin: "content", attribution: null }),
      seed({ origin: "content", attribution: null }),
      seed({ origin: "content", attribution: { fieldPath: "a", target: { itemId: "1" } } }),
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

  it("an attribution object with no working itemId does not count as a working control", () => {
    const findings = [seed({ origin: "content", attribution: { fieldPath: "a", target: {} } })];
    const result = computeAttributionRate(findings);
    expect(result.numerator).toBe(0);
    expect(result.denominator).toBe(1);
  });
});
