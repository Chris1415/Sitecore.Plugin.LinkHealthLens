// T017 — extractAnchors. RED before GREEN (task_breakdown_style: tdd).
import { describe, expect, it } from "vitest";
import { extractAnchors } from "./extractAnchors";

describe("extractAnchors", () => {
  it("reports an anchor with no href attribute as its own row, identity '(no href)' + ordinal", () => {
    const html = `<body><a href="/a">A</a><a aria-label="node only">no href here</a></body>`;
    const findings = extractAnchors(html);
    expect(findings).toHaveLength(2);
    expect(findings[1]).toMatchObject({ href: "(no href)", ordinal: 2, text: "no href here" });
  });

  it("extracts text from nested markup (AC coverage: <a><span>text</span></a>)", () => {
    const html = `<body><a href="/x"><span>Wrapped</span> text</a></body>`;
    const findings = extractAnchors(html);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ href: "/x", ordinal: 1, text: "Wrapped text" });
  });

  it("keeps duplicate hrefs as separate rows, each with its own ordinal (no collapsing at extraction)", () => {
    const html = `<body><a href="/book">Book</a><a href="/book">Book again</a></body>`;
    const findings = extractAnchors(html);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.href)).toEqual(["/book", "/book"]);
    expect(findings.map((f) => f.ordinal)).toEqual([1, 2]);
  });

  it("ordinals are 1..N, contiguous, in document order", () => {
    const html = `<body><a href="/a">A</a><nav><a href="/b">B</a></nav><footer><a href="/c">C</a></footer></body>`;
    const findings = extractAnchors(html);
    expect(findings.map((f) => f.ordinal)).toEqual([1, 2, 3]);
  });

  it("preserves an empty href verbatim — distinct from the missing-attribute case", () => {
    const html = `<body><a href="">Empty</a></body>`;
    const findings = extractAnchors(html);
    expect(findings[0].href).toBe("");
  });

  it("every seed finding starts with an empty statuses Set, null attribution/targetLabel, no scope/origin", () => {
    const html = `<body><a href="/a">A</a></body>`;
    const [f] = extractAnchors(html);
    expect(f.statuses.size).toBe(0);
    expect(f.attribution).toBeNull();
    expect(f.targetLabel).toBeNull();
    expect(f.scope).toBeUndefined();
    expect(f.origin).toBeUndefined();
  });

  it("returns an empty array for a page with no anchors", () => {
    expect(extractAnchors("<body><p>no links</p></body>")).toEqual([]);
  });
});
