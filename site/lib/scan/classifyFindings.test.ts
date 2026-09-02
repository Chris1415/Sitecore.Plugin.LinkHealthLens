// TR-3 wiring — classifyFindings composes classifyScope + the two string
// checks + the reachability note + the in-page anchor check over a whole
// PageScan's findings. This is the seam usePageScan calls; a suite that only
// tested the five pure functions in isolation would leave this wiring
// unverified (memory: "test the wiring, not just the pure function").
import { describe, expect, it } from "vitest";
import { classifyFindings } from "./classifyFindings";
import type { LinkFinding } from "@/lib/model/types";

function seed(href: string, ordinal = 1): LinkFinding {
  return { href, ordinal, text: "", statuses: new Set(), attribution: null, targetLabel: null, targetItemId: null };
}

describe("classifyFindings", () => {
  it("classifies scope and populates statuses on every finding", () => {
    const html = `<body><a href="/book">Book</a></body>`;
    const [f] = classifyFindings([seed("/book")], html);
    expect(f.scope).toBe("internal");
    expect(f.statuses.size).toBe(0);
  });

  it("REGRESSION: an external http:// finding carries BOTH insecure-scheme and reachability-not-checked (AC-4.4), wired end to end", () => {
    const html = `<body></body>`;
    const [f] = classifyFindings([seed("http://external-example.com")], html);
    expect(f.scope).toBe("external");
    expect(f.statuses.has("insecure-scheme")).toBe(true);
    expect(f.statuses.has("reachability-not-checked")).toBe(true);
  });

  it("wires the in-page anchor check against the SAME html passed in", () => {
    const html = `<body><a href="#present">A</a><div id="present"></div><a href="#absent">B</a></body>`;
    const [present, absent] = classifyFindings([seed("#present", 1), seed("#absent", 2)], html);
    expect(present.statuses.has("missing-anchor")).toBe(false);
    expect(absent.statuses.has("missing-anchor")).toBe(true);
  });

  it("flags malformed on an empty href but exempts a bare '#'", () => {
    const html = `<body></body>`;
    const [empty, hash] = classifyFindings([seed("", 1), seed("#", 2)], html);
    expect(empty.statuses.has("malformed")).toBe(true);
    expect(hash.statuses.has("malformed")).toBe(false);
  });

  it("preserves document order and does not mutate the input findings array", () => {
    const html = `<body></body>`;
    const input = [seed("/a", 1), seed("/b", 2)];
    const result = classifyFindings(input, html);
    expect(result.map((f) => f.href)).toEqual(["/a", "/b"]);
    expect(input[0].statuses.size).toBe(0); // original untouched
  });

  // T035/T036 wiring — classifyOrigin/attribute are pure functions with
  // their own test files; this asserts the SEAM usePageScan actually calls
  // populates both fields on the finding (rule 88: a check nothing invokes
  // is worse than no check).
  it("wires structural origin: a footer anchor classifies chrome, a main anchor classifies content", () => {
    const html = `<body><footer><a href="/footer-link">F</a></footer><main><a href="/body-link">B</a></main></body>`;
    const [footerFinding, mainFinding] = classifyFindings(
      [seed("/footer-link", 1), seed("/body-link", 2)],
      html,
    );
    expect(footerFinding.origin).toBe("chrome");
    expect(mainFinding.origin).toBe("content");
  });

  it("wires attribution: a content-origin link with a matching presentationDetails entry attributes; a chrome-origin link never attempts to", () => {
    const html = `<body><footer><a href="/footer-link">F</a></footer><main><section><a href="/body-link">B</a></section></main></body>`;
    const presentationDetails = JSON.stringify([
      { id: "r1", instanceId: "i1", placeholderKey: "headless-main", dataSource: "11111111-1111-1111-1111-111111111111" },
    ]);
    const [footerFinding, mainFinding] = classifyFindings(
      [seed("/footer-link", 1), seed("/body-link", 2)],
      html,
      presentationDetails,
    );
    expect(footerFinding.attribution).toBeNull();
    expect(mainFinding.attribution).toEqual({
      fieldPath: "headless-main > Section 1",
      target: { itemId: "11111111-1111-1111-1111-111111111111" },
    });
  });
});
