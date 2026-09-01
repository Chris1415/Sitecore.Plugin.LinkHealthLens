// T026 — status-set model, display precedence and headline selection. RED before GREEN.
// ADR-0005. `statuses` is a Set; precedence decides the headline and sort ONLY —
// every member stays visible on the row (tested at the rendering layer, TR-6).
import { describe, expect, it } from "vitest";
import { headlineOf, PRECEDENCE } from "./precedence";
import type { StatusMember } from "./types";

describe("headlineOf", () => {
  it("a two-status row: not-found outranks insecure-scheme as headline", () => {
    const statuses = new Set<StatusMember>(["insecure-scheme", "not-found"]);
    expect(headlineOf(statuses)).toBe("not-found");
    // both members stay in the set — precedence governs headline/sort only
    expect(statuses.size).toBe(2);
  });

  it("malformed outranks insecure-scheme", () => {
    expect(headlineOf(new Set<StatusMember>(["insecure-scheme", "malformed"]))).toBe("malformed");
  });

  it("missing-anchor outranks insecure-scheme", () => {
    expect(headlineOf(new Set<StatusMember>(["insecure-scheme", "missing-anchor"]))).toBe(
      "missing-anchor",
    );
  });

  it("could-not-check outranks ok but loses to every finding above it", () => {
    expect(headlineOf(new Set<StatusMember>(["could-not-check"]))).toBe("could-not-check");
    expect(headlineOf(new Set<StatusMember>(["could-not-check", "malformed"]))).toBe("malformed");
  });

  it("reachability-not-checked NEVER becomes a headline, even as the only member", () => {
    expect(headlineOf(new Set<StatusMember>(["reachability-not-checked"]))).toBe("ok");
  });

  it("reachability-not-checked never outranks a real finding sitting alongside it", () => {
    expect(
      headlineOf(new Set<StatusMember>(["reachability-not-checked", "insecure-scheme"])),
    ).toBe("insecure-scheme");
  });

  it("an empty set (or explicit 'ok') headlines as ok", () => {
    expect(headlineOf(new Set<StatusMember>())).toBe("ok");
    expect(headlineOf(new Set<StatusMember>(["ok"]))).toBe("ok");
  });

  it("PRECEDENCE lists ok last and excludes reachability-not-checked entirely (never a headline candidate)", () => {
    expect(PRECEDENCE[PRECEDENCE.length - 1]).toBe("ok");
    expect(PRECEDENCE).not.toContain("reachability-not-checked");
  });
});
