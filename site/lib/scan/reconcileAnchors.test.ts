// T019 — M2 anchor-coverage reconciliation. Pairwise match by href + document
// ordinal, against an INDEPENDENT query — never the extractor comparing
// itself to itself, which proves nothing (M2's own contract). RED before GREEN.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractAnchors } from "./extractAnchors";
import { reconcileAnchors } from "./reconcileAnchors";

describe("reconcileAnchors", () => {
  it("reports a full match when both sides agree", () => {
    const extracted = [{ href: "/a", ordinal: 1 }, { href: "/b", ordinal: 2 }];
    const independent = [{ href: "/a", ordinal: 1 }, { href: "/b", ordinal: 2 }];
    const report = reconcileAnchors(extracted, independent);
    expect(report.isFullMatch).toBe(true);
    expect(report.matched).toBe(2);
    expect(report.unmatchedExtracted).toEqual([]);
    expect(report.unmatchedIndependent).toEqual([]);
  });

  it("catches a deliberately-mismatched fixture — the harness's own self-test (M4 discipline: a control that must fail)", () => {
    const extracted = [{ href: "/a", ordinal: 1 }, { href: "/b", ordinal: 2 }];
    const independent = [{ href: "/a", ordinal: 1 }, { href: "/c", ordinal: 2 }];
    const report = reconcileAnchors(extracted, independent);
    expect(report.isFullMatch).toBe(false);
    expect(report.matched).toBe(1);
    expect(report.unmatchedExtracted).toEqual([{ href: "/b", ordinal: 2 }]);
    expect(report.unmatchedIndependent).toEqual([{ href: "/c", ordinal: 2 }]);
  });

  it("treats the same href at two different ordinals as two distinct rows (identity is href+ordinal, not href alone)", () => {
    const extracted = [{ href: "/x", ordinal: 1 }, { href: "/x", ordinal: 5 }];
    const independent = [{ href: "/x", ordinal: 1 }, { href: "/x", ordinal: 5 }];
    expect(reconcileAnchors(extracted, independent).isFullMatch).toBe(true);
  });

  it("100% pairwise match against the real captured Zephira Home page, extractor vs an independent raw DOM query", () => {
    // Ground truth: project-planning/captures/agent-page-html-zephira-home.json
    // (Tier-1 tracked, captured T007). The independent side re-queries the
    // SAME parsed document with a bare querySelectorAll('a') + getAttribute,
    // deliberately NOT reusing extractAnchors' own code path.
    const raw = readFileSync(
      resolve(__dirname, "../../../project-planning/captures/agent-page-html-zephira-home.json"),
      "utf8",
    ).replace(/^(\/\/.*\n)+/, "");
    const { html } = JSON.parse(raw) as { html: string };

    const extracted = extractAnchors(html).map((f) => ({ href: f.href, ordinal: f.ordinal }));

    const doc = new DOMParser().parseFromString(html, "text/html");
    const independent = Array.from(doc.querySelectorAll("a")).map((a, i) => ({
      href: a.getAttribute("href") === null ? "(no href)" : (a.getAttribute("href") as string),
      ordinal: i + 1,
    }));

    const report = reconcileAnchors(extracted, independent);
    expect(report.isFullMatch).toBe(true);
    expect(extracted.length).toBeGreaterThan(0);
  });
});
