// T042 — verdict/sub-line/rail derivation. RED before GREEN.
import { describe, expect, it } from "vitest";
import type { LinkFinding, StatusMember } from "@/lib/model/types";
import { computeCounts, computeVerdict } from "./verdict";

function seed(overrides: Partial<LinkFinding>): LinkFinding {
  return {
    href: "/x",
    ordinal: 1,
    text: "x",
    statuses: new Set<StatusMember>(),
    attribution: null,
    targetLabel: null,
    targetItemId: null,
    origin: "content",
    ...overrides,
  };
}

describe("computeVerdict", () => {
  it("act > 0: 'N links need attention before publishing'", () => {
    const v = computeVerdict({ total: 5, act: 2, check: 0, note: 0, external: 0, chrome: 0 });
    expect(v.tone).toBe("act");
    expect(v.sentence).toBe("2 links need attention before publishing");
  });

  it("singular act phrasing", () => {
    const v = computeVerdict({ total: 1, act: 1, check: 0, note: 0, external: 0, chrome: 0 });
    expect(v.sentence).toBe("1 link needs attention before publishing");
  });

  it("check > 0, act 0: 'N links to check before publishing'", () => {
    const v = computeVerdict({ total: 3, act: 0, check: 3, note: 0, external: 0, chrome: 0 });
    expect(v.tone).toBe("check");
    expect(v.sentence).toBe("3 links to check before publishing");
  });

  it("note > 0 only: 'Nothing to fix before publishing'", () => {
    const v = computeVerdict({ total: 4, act: 0, check: 0, note: 4, external: 0, chrome: 0 });
    expect(v.tone).toBe("clear");
    expect(v.sentence).toBe("Nothing to fix before publishing");
  });

  it("zero total: 'No links on this page'", () => {
    const v = computeVerdict({ total: 0, act: 0, check: 0, note: 0, external: 0, chrome: 0 });
    expect(v.sentence).toBe("No links on this page");
  });

  it("total > 0 but every tier 0: 'No findings on this page'", () => {
    const v = computeVerdict({ total: 12, act: 0, check: 0, note: 0, external: 6, chrome: 0 });
    expect(v.sentence).toBe("No findings on this page");
  });

  it("sub-line: chrome-heavy REGRESSION — counts survive on the sub-line, not dropped as decoration", () => {
    const v = computeVerdict({ total: 4, act: 4, check: 0, note: 0, external: 0, chrome: 4 });
    expect(v.subline).toBe("Every one of them is site chrome — not editable from this page.");
  });

  it("sub-line: partial chrome names the count", () => {
    const v = computeVerdict({ total: 5, act: 2, check: 0, note: 0, external: 0, chrome: 1 });
    expect(v.subline).toBe("1 of them are site chrome — not editable from this page.");
  });

  it("sub-line: zero actionable but externals present names the external count", () => {
    const v = computeVerdict({ total: 10, act: 0, check: 0, note: 0, external: 10, chrome: 0 });
    expect(v.subline).toBe("10 links checked. 10 are external and carry the standing note below.");
  });
});

describe("computeCounts", () => {
  it("an external ok-only row counts toward external, not act/check/note", () => {
    const counts = computeCounts([
      seed({ ordinal: 1, scope: "external", statuses: new Set<StatusMember>(["ok", "reachability-not-checked"]) }),
    ]);
    expect(counts).toEqual({ total: 1, act: 0, check: 0, note: 0, external: 1, chrome: 0 });
  });

  it("an external http:// row counts toward note (insecure-scheme headline) AND external (standing note)", () => {
    const counts = computeCounts([
      seed({
        ordinal: 1,
        scope: "external",
        statuses: new Set<StatusMember>(["insecure-scheme", "reachability-not-checked"]),
      }),
    ]);
    expect(counts.note).toBe(1);
    expect(counts.external).toBe(1);
  });

  it("chrome count only tallies act/check/note tier rows, never no-findings/external", () => {
    const counts = computeCounts([
      seed({ ordinal: 1, origin: "chrome", statuses: new Set<StatusMember>(["not-found"]) }),
      seed({ ordinal: 2, origin: "chrome", statuses: new Set<StatusMember>(["ok"]) }),
      seed({
        ordinal: 3,
        origin: "chrome",
        scope: "external",
        statuses: new Set<StatusMember>(["ok", "reachability-not-checked"]),
      }),
    ]);
    expect(counts.chrome).toBe(1);
  });
});
