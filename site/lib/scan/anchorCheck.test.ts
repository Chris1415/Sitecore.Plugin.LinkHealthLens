// T025 — in-page anchor check. RED before GREEN.
// FR-9/US-6. Probe (a) CONFIRMED (project-planning/plans/probe-findings-
// t008-20260901T090000Z.md) — pagesGetPageHtml returns real rendered HTML, so
// this task proceeds rather than the AC-6.4 withdrawal path.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkInPageAnchor } from "./anchorCheck";

describe("checkInPageAnchor", () => {
  it("is satisfied when the target id exists in the page", () => {
    const html = `<body><a href="#section">Jump</a><div id="section">Target</div></body>`;
    expect(checkInPageAnchor("#section", html)).toBe(false);
  });

  it("is satisfied by a matching name attribute", () => {
    const html = `<body><a href="#legacy">Jump</a><a name="legacy">Target</a></body>`;
    expect(checkInPageAnchor("#legacy", html)).toBe(false);
  });

  it("is satisfied by a match anywhere in the page, including chrome", () => {
    const html = `<body><main><a href="#footer-note">Jump</a></main><footer><p id="footer-note">Note</p></footer></body>`;
    expect(checkInPageAnchor("#footer-note", html)).toBe(false);
  });

  it("flags missing-anchor when no element carries the id or name", () => {
    const html = `<body><a href="#nowhere">Jump</a></body>`;
    expect(checkInPageAnchor("#nowhere", html)).toBe(true);
  });

  it("ignores a fragment on a link to a DIFFERENT page (not evaluated)", () => {
    const html = `<body><a href="/other-page#nowhere">Jump</a></body>`;
    expect(checkInPageAnchor("/other-page#nowhere", html)).toBe(false);
  });

  it("ignores a bare '#' (no fragment name to match, AC-5.2's exemption extends here)", () => {
    const html = `<body><a href="#">Toggle</a></body>`;
    expect(checkInPageAnchor("#", html)).toBe(false);
  });

  it("real-page check: the captured Zephira Home page's #content anchor resolves against its own id", () => {
    // Ground truth: project-planning/captures/agent-page-html-zephira-home.json
    const raw = readFileSync(
      resolve(__dirname, "../../../project-planning/captures/agent-page-html-zephira-home.json"),
      "utf8",
    ).replace(/^(\/\/.*\n)+/, "");
    const { html } = JSON.parse(raw) as { html: string };
    expect(checkInPageAnchor("#content", html)).toBe(false);
  });
});
