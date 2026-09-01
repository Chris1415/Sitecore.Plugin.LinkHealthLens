// T041 — real-fixture M3 measurement. Ground truth: the operator's paired
// DEVREL capture of Velaro Home's rendered HTML and its own
// `pageInfo.presentationDetails` blob (project-planning/captures/
// agent-page-html-velaro-home.DEVREL.json +
// velaro-home-presentation-details.DEVREL.json) — the fixture pair the
// T036/T039 escalation named as missing. Exercises the real pipeline
// (extractAnchors -> classifyFindings -> computeAttributionRate), not the
// unit-level attribute() alone, so the measured rate reflects what
// usePageScan actually produces on this page.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractAnchors } from "./extractAnchors";
import { classifyFindings } from "./classifyFindings";
import { computeAttributionRate } from "./attributionRate";

function readCapture(name: string): unknown {
  const raw = readFileSync(
    resolve(__dirname, "../../../project-planning/captures", name),
    "utf8",
  ).replace(/^(\/\/.*\n)+/, "");
  return JSON.parse(raw);
}

describe("M3 against the real Velaro Home DEVREL capture pair", () => {
  const { html } = readCapture("agent-page-html-velaro-home.DEVREL.json") as { html: string };
  const presentationDetailsCapture = readCapture(
    "velaro-home-presentation-details.DEVREL.json",
  ) as { devices: unknown };
  // pageInfo.presentationDetails arrives as a JSON *string* on the real
  // payload (PageInfoPageVersion.presentationDetails?: string) — the capture
  // file stores it pre-parsed for readability, so re-stringify the
  // `devices` payload (dropping the capture's own `_captured`/`_note`
  // metadata keys) to reproduce what classifyFindings actually receives.
  const presentationDetailsRaw = JSON.stringify({ devices: presentationDetailsCapture.devices });

  it("finds the correlation root one level below <main> (5 sections == 5 renderings)", () => {
    const findings = classifyFindings(extractAnchors(html), html, presentationDetailsRaw);
    const contentFindings = findings.filter((f) => f.origin === "content");
    const attributed = contentFindings.filter((f) => f.attribution !== null);
    // Real measured shape: 17 anchors total, 10 structurally content, and
    // (post-T041 fix) every content anchor's section correlates to a
    // rendering one-for-one.
    expect(findings.length).toBe(17);
    expect(contentFindings.length).toBe(10);
    expect(attributed.length).toBeGreaterThan(0);
  });

  it("measures M3 (>= 50% is the A3 threshold — reported, not enforced, here)", () => {
    const findings = classifyFindings(extractAnchors(html), html, presentationDetailsRaw);
    const rate = computeAttributionRate(findings);
    console.info(
      `[T041 real-fixture M3] ${rate.numerator}/${rate.denominator} (${(rate.rate * 100).toFixed(1)}%)`,
    );
    expect(rate.denominator).toBe(10);
    expect(rate.numerator).toBe(10);
    expect(rate.rate).toBe(1);
  });

  it("sanity-checks the structural origin split against the page's own chrome/content landmarks", () => {
    const findings = classifyFindings(extractAnchors(html), html, presentationDetailsRaw);
    const chrome = findings.filter((f) => f.origin === "chrome").length;
    const content = findings.filter((f) => f.origin === "content").length;
    expect(chrome).toBe(7);
    expect(content).toBe(10);
    expect(chrome + content).toBe(findings.length);
  });
});
