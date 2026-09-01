// T024 — the standing reachability-not-checked member. RED before GREEN.
// FR-11. Every external row carries it as a policy note, never removable,
// never a headline, and never suppressing (or suppressed by) another finding.
import { describe, expect, it } from "vitest";
import { attachReachabilityNote } from "./reachabilityNote";

describe("attachReachabilityNote", () => {
  it("adds reachability-not-checked to an external row with no other findings", () => {
    const statuses = new Set<import("@/lib/model/types").StatusMember>();
    attachReachabilityNote("external", statuses);
    expect(statuses.has("reachability-not-checked")).toBe(true);
  });

  it("AC-4.4: an external http:// row carries BOTH insecure-scheme and reachability-not-checked, neither suppressing the other", () => {
    const statuses = new Set<import("@/lib/model/types").StatusMember>(["insecure-scheme"]);
    attachReachabilityNote("external", statuses);
    expect(statuses.has("insecure-scheme")).toBe(true);
    expect(statuses.has("reachability-not-checked")).toBe(true);
    expect(statuses.size).toBe(2);
  });

  it("does not add the note to an internal row", () => {
    const statuses = new Set<import("@/lib/model/types").StatusMember>();
    attachReachabilityNote("internal", statuses);
    expect(statuses.has("reachability-not-checked")).toBe(false);
  });

  it("does not add the note to a non-navigational row (mailto:/tel:/javascript: are exempt)", () => {
    const statuses = new Set<import("@/lib/model/types").StatusMember>();
    attachReachabilityNote("non-navigational", statuses);
    expect(statuses.has("reachability-not-checked")).toBe(false);
  });
});
