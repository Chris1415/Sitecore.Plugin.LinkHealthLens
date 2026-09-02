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
import { createStubClient } from "@/test/client-stub";
import { extractAnchors } from "./extractAnchors";
import { classifyFindings } from "./classifyFindings";
import { computeAttributionRate } from "./attributionRate";
import { resolveInternalFindings } from "./resolveFindings";

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

  // Regression (defect fixed 2026-09-02, ADR-0010 amended): "Open in canvas"
  // navigated to attribute()'s datasource id — a datasource, which
  // `pages.context` cannot open. The fix runs TR-4 resolution over the real
  // captured page and asserts every id an owner-and-open control would hand
  // to `client.mutate('pages.context', ...)` is a resolved PAGE id
  // (`targetItemId`), and specifically that it is never one of the real
  // datasource guids the paired presentationDetails fixture carries.
  it("resolves every content link to a target PAGE id that is never a datasource id from presentationDetails (regression)", async () => {
    const { stubClient, mutate } = createStubClient();
    let pageCounter = 0;
    mutate.mockImplementation((async (key: string, opts: unknown) => {
      if (key === "xmc.authoring.graphql") {
        pageCounter += 1;
        return { data: { data: { item: { itemId: `RESOLVED-PAGE-${pageCounter}`, name: "Some Page" } } } };
      }
      if (key === "xmc.live.graphql") {
        return { data: { data: { item: { id: "live-1" } } } };
      }
      throw new Error(`unexpected mutate key in test: ${key} ${JSON.stringify(opts)}`);
    }) as never);

    const datasourceIds = new Set(
      ((presentationDetailsCapture.devices as { renderings?: { dataSource?: string }[] }[])[0]?.renderings ?? [])
        .map((r) => r.dataSource)
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    );
    expect(datasourceIds.size).toBeGreaterThan(0); // sanity: the fixture actually carries datasource ids

    const seeded = classifyFindings(extractAnchors(html), html, presentationDetailsRaw);
    const { findings } = await resolveInternalFindings(seeded, {
      siteRootPath: "/sitecore/content/Velaro/Velaro/Home",
      language: "en",
      client: stubClient,
      authoringContextId: "ctx-preview",
      liveContextId: "ctx-live",
    });

    const navigable = findings.filter((f) => f.targetItemId !== null);
    expect(navigable.length).toBeGreaterThan(0);
    for (const f of navigable) {
      expect(datasourceIds.has(f.targetItemId!)).toBe(false);
      // The two ids genuinely differ when both are present on the same row —
      // the exact case that shipped broken (owner attributed, button used
      // attribution.target.itemId instead of this resolved id).
      if (f.attribution) {
        const owningDatasourceId = (f.attribution.target as { itemId?: string }).itemId;
        expect(f.targetItemId).not.toBe(owningDatasourceId);
      }
    }
  });

  it("measures M3 (>= 50% is the A3 threshold — reported, not enforced, here)", () => {
    const findings = classifyFindings(extractAnchors(html), html, presentationDetailsRaw);
    const rate = computeAttributionRate(findings);
    console.info(
      `[T041 real-fixture M3] ${rate.numerator}/${rate.denominator} (${(rate.rate * 100).toFixed(1)}%)`,
    );
    // AMENDED 2026-09-02: M3's numerator now counts resolved target PAGES
    // (targetItemId), not structural attribution — see attributionRate.ts.
    // classifyFindings alone never populates targetItemId (that is TR-4's
    // job, exercised in the regression test above), so over this seed-only
    // pipeline the rate is honestly 0 — not a claim about the shipped app.
    expect(rate.denominator).toBe(10);
    expect(rate.numerator).toBe(0);
    expect(rate.rate).toBe(0);
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
