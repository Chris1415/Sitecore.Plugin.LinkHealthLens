// T023 — the two string checks, on EVERY link regardless of scope. RED before GREEN.
//
// FR-7/FR-8. The failure mode this task exists to prevent: short-circuiting on
// scope === 'external' and skipping both checks (§ 4c-1). The two tests
// tagged REGRESSION below are the ones that would fail against that bug.
import { describe, expect, it } from "vitest";
import { isInsecureScheme, isMalformed } from "./stringChecks";

describe("isInsecureScheme", () => {
  it("flags a plain http:// href", () => {
    expect(isInsecureScheme("http://example.com")).toBe(true);
  });

  it("REGRESSION: flags http:// even though the link is external — no scope short-circuit", () => {
    // This is the assertion that catches the named failure mode: a classifier
    // that only runs string checks on internal links drops this on 30-60% of
    // a typical page's rows (§ 4c-1).
    expect(isInsecureScheme("http://external-example.com/path")).toBe(true);
  });

  it("does not flag https://", () => {
    expect(isInsecureScheme("https://example.com")).toBe(false);
  });

  it("does not flag a protocol-relative href", () => {
    expect(isInsecureScheme("//example.com")).toBe(false);
  });

  it("does not flag a relative href", () => {
    expect(isInsecureScheme("/book")).toBe(false);
  });

  it("does not flag mailto:, tel: or a bare #", () => {
    expect(isInsecureScheme("mailto:hello@example.com")).toBe(false);
    expect(isInsecureScheme("tel:+15551234567")).toBe(false);
    expect(isInsecureScheme("#")).toBe(false);
  });
});

describe("isMalformed", () => {
  it("flags an empty href", () => {
    expect(isMalformed("")).toBe(true);
  });

  it("flags a whitespace-only href", () => {
    expect(isMalformed("   ")).toBe(true);
  });

  it("flags the literal placeholder 'undefined'", () => {
    expect(isMalformed("undefined")).toBe(true);
  });

  it("flags the literal placeholder 'null'", () => {
    expect(isMalformed("null")).toBe(true);
  });

  it("REGRESSION: flags the same malformed values on an EXTERNAL-shaped href too — no scope short-circuit", () => {
    // isMalformed is called on the raw href alone; scope plays no part. This
    // guards against a caller wiring it up conditionally on scope instead.
    expect(isMalformed("")).toBe(true);
    expect(isMalformed("undefined")).toBe(true);
  });

  it("does NOT flag a bare '#' — the conventional JS-toggle idiom (AC-5.2)", () => {
    expect(isMalformed("#")).toBe(false);
  });

  it("does NOT flag the '(no href)' sentinel — same conventional-idiom treatment as a bare '#'", () => {
    expect(isMalformed("(no href)")).toBe(false);
  });

  it("does not flag a real relative or absolute href", () => {
    expect(isMalformed("/book")).toBe(false);
    expect(isMalformed("https://example.com")).toBe(false);
  });
});
