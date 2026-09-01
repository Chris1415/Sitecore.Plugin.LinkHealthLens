// T041 — GROUPS / groupOf. RED before GREEN.
import { describe, expect, it } from "vitest";
import type { LinkFinding, StatusMember } from "./types";
import { GROUPS, defaultOpenGroupIds, groupBuckets, groupOf } from "./groups";

function seed(overrides: Partial<LinkFinding>): LinkFinding {
  return {
    href: "/x",
    ordinal: 1,
    text: "x",
    statuses: new Set<StatusMember>(),
    attribution: null,
    targetLabel: null,
    ...overrides,
  };
}

describe("groupOf", () => {
  it("an external row whose only member is the standing note lands in External", () => {
    const f = seed({ scope: "external", statuses: new Set<StatusMember>(["ok", "reachability-not-checked"]) });
    expect(groupOf(f)).toBe("external");
  });

  it("an external http:// row headlines insecure-scheme and lands in Insecure scheme, not External", () => {
    const f = seed({
      scope: "external",
      statuses: new Set<StatusMember>(["insecure-scheme", "reachability-not-checked"]),
    });
    expect(groupOf(f)).toBe("insecure");
  });

  it("not-found-or-unpublished routes to the same group as not-found", () => {
    expect(groupOf(seed({ statuses: new Set<StatusMember>(["not-found-or-unpublished"]) }))).toBe("not-found");
  });

  it("a plain ok row with no reachability note lands in No findings", () => {
    expect(groupOf(seed({ statuses: new Set<StatusMember>(["ok"]) }))).toBe("no-findings");
  });

  it("an empty status set (never resolved) falls through to No findings", () => {
    expect(groupOf(seed({ statuses: new Set<StatusMember>() }))).toBe("no-findings");
  });
});

describe("groupBuckets", () => {
  it("group counts sum to the total anchor count", () => {
    const findings = [
      seed({ ordinal: 1, statuses: new Set<StatusMember>(["not-found"]) }),
      seed({ ordinal: 2, statuses: new Set<StatusMember>(["unpublished"]) }),
      seed({ ordinal: 3, statuses: new Set<StatusMember>(["ok", "reachability-not-checked"]) }),
      seed({ ordinal: 4, statuses: new Set<StatusMember>(["ok"]) }),
      seed({ ordinal: 5, statuses: new Set<StatusMember>(["insecure-scheme", "reachability-not-checked"]) }),
    ];
    const buckets = groupBuckets(findings);
    const sum = Array.from(buckets.values()).reduce((acc, rows) => acc + rows.length, 0);
    expect(sum).toBe(findings.length);
  });

  it("every declared group id appears as a bucket key, even at zero count", () => {
    const buckets = groupBuckets([]);
    for (const g of GROUPS) expect(buckets.has(g.id)).toBe(true);
  });
});

describe("defaultOpenGroupIds", () => {
  function findingsFor(counts: Record<StatusMember, number>): LinkFinding[] {
    const out: LinkFinding[] = [];
    let ordinal = 1;
    for (const [status, n] of Object.entries(counts) as [StatusMember, number][]) {
      for (let i = 0; i < n; i++) {
        out.push(seed({ ordinal: ordinal++, statuses: new Set<StatusMember>([status]) }));
      }
    }
    return out;
  }

  it("busy dataset (4 not-found, 7 unpublished, 2 malformed): exactly 2 groups open, exposing 11 rows", () => {
    const findings = findingsFor({
      "not-found": 4,
      unpublished: 7,
      malformed: 2,
    } as Record<StatusMember, number>);
    const open = defaultOpenGroupIds(groupBuckets(findings));
    expect(open).toEqual(new Set(["not-found", "unpublished"]));
  });

  it("a single group already over the target opens alone", () => {
    const findings = findingsFor({ "not-found": 15 } as Record<StatusMember, number>);
    const open = defaultOpenGroupIds(groupBuckets(findings));
    expect(open).toEqual(new Set(["not-found"]));
  });

  it("a zero-count leading group is never added to the open set", () => {
    const findings = findingsFor({ unpublished: 3 } as Record<StatusMember, number>);
    const open = defaultOpenGroupIds(groupBuckets(findings));
    expect(open.has("not-found")).toBe(false);
    expect(open).toEqual(new Set(["unpublished"]));
  });
});
