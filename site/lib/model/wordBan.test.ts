// T027 — M5 word-ban test, ported from verify-poc.mjs's own pattern. Zero
// occurrences of the banned words in shipped UI copy, WITH a control
// assertion proving the detector can fail (a check that cannot fail is
// worse than no check).
import { describe, expect, it } from "vitest";
import * as panelCopy from "@/lib/panel/copy";

const BANNED_WORDS = /\b(broken|dead|404|unreachable)\b/i;

function allShippedStrings(): string[] {
  // Copy is exported either as a bare string constant (LOADING_VERDICT, …)
  // or as a lookup object keyed by StatusMember (STATUS_LABEL, STATUS_DETAIL)
  // — flatten both shapes so neither escapes the sweep.
  return Object.values(panelCopy).flatMap((value) =>
    typeof value === "string" ? [value] : Object.values(value as Record<string, string>),
  );
}

describe("M5 word-ban", () => {
  it("zero banned words across every exported panel copy string", () => {
    const offenders = allShippedStrings().filter((s) => BANNED_WORDS.test(s));
    expect(offenders).toEqual([]);
  });

  it("CONTROL: the detector fires on a planted violation — proves it can fail", () => {
    expect(BANNED_WORDS.test("This link is broken.")).toBe(true);
    expect(BANNED_WORDS.test("The destination is unreachable.")).toBe(true);
    expect(BANNED_WORDS.test("Returned a 404.")).toBe(true);
    expect(BANNED_WORDS.test("This page is dead.")).toBe(true);
  });
});
