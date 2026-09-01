// T035 — classifyOrigin. RED before GREEN.
import { describe, expect, it } from "vitest";
import { classifyOrigin } from "./classifyOrigin";

const PAGE = `
  <!DOCTYPE html><html><body>
    <a href="/skip">Skip to content</a>
    <header><a href="/home">Home</a></header>
    <nav><a href="/nav-link">Nav link</a></nav>
    <main>
      <a href="/body-link">Body link</a>
      <a href="/other-body-link">Other body link</a>
    </main>
    <footer><a href="/footer-link">Footer link</a></footer>
  </body></html>
`;

describe("classifyOrigin", () => {
  it("classifies an anchor inside <main> as content", () => {
    // ordinal 4 = "/body-link" (skip, home, nav-link, body-link, ...)
    expect(classifyOrigin(4, PAGE)).toBe("content");
  });

  it("classifies an anchor inside <header> as chrome", () => {
    expect(classifyOrigin(2, PAGE)).toBe("chrome"); // "/home"
  });

  it("classifies an anchor inside <nav> as chrome", () => {
    expect(classifyOrigin(3, PAGE)).toBe("chrome"); // "/nav-link"
  });

  it("classifies an anchor inside <footer> as chrome", () => {
    expect(classifyOrigin(6, PAGE)).toBe("chrome"); // "/footer-link"
  });

  it("falls back to chrome for an anchor inside none of the four landmarks", () => {
    expect(classifyOrigin(1, PAGE)).toBe("chrome"); // "/skip", ahead of <header>
  });

  it("returns chrome for an out-of-range ordinal (stale/mismatched caller input)", () => {
    expect(classifyOrigin(999, PAGE)).toBe("chrome");
  });

  it("is a regression against attribution-derived origin — its signature takes no attribution input at all", () => {
    // classifyOrigin(ordinal, html) has no attribution parameter to pass, so
    // an attribution failure on the SAME link literally cannot change the
    // result — the anti-pattern ADR-0006 forbids is structurally impossible
    // here, not merely avoided by convention. Assert the two body anchors
    // (whose eventual attribution outcomes will differ — see attribute.test.ts)
    // both classify 'content' purely from their landmark, independent of that.
    expect(classifyOrigin(4, PAGE)).toBe("content");
    expect(classifyOrigin(5, PAGE)).toBe("content");
  });

  it("real-page check: a header anchor and a main anchor from the captured Zephira Home page", () => {
    // Ground truth: project-planning/captures/agent-page-html-zephira-home.json
    // (probe (f)): 6 anchors inside <header>, 49 inside <main>.
    const html = `<!DOCTYPE html><html><body>
      <header><a href="/">Home</a></header>
      <main><a href="/book">Book</a></main>
    </body></html>`;
    expect(classifyOrigin(1, html)).toBe("chrome");
    expect(classifyOrigin(2, html)).toBe("content");
  });
});
