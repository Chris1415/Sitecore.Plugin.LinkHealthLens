// Defect fix 2026-09-02 (fourth shape/semantics misreading — see
// docs/build-decisions.md): `siteInfo.properties.rootPath` is the SITE NODE,
// not the routable tree; site-relative hrefs resolve against the START ITEM
// named by `siteInfo.startItemId`. Ground truth measured by the operator
// against the live Velaro tenant. Asserted against the REAL captured page +
// site-info pair (project-planning/captures/) — never a hand-written fixture,
// which is exactly what let the prior misreading agree with itself across 257
// passing tests.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createStubClient } from "@/test/client-stub";
import { extractAnchors } from "./extractAnchors";
import { classifyFindings } from "./classifyFindings";
import { resolveInternalFindings } from "./resolveFindings";
import { resolveStartItemPath } from "./resolveStartItemPath";

function readCapture(name: string): unknown {
  const raw = readFileSync(resolve(__dirname, "../../../project-planning/captures", name), "utf8").replace(
    /^(\/\/.*\n)+/,
    "",
  );
  return JSON.parse(raw);
}

const START_ITEM_PATH = "/sitecore/content/Velaro-Brand/Velaro/Home";

describe("start-item-path resolution against the real Velaro DEVREL capture pair", () => {
  const { html } = readCapture("agent-page-html-velaro-home.DEVREL.json") as { html: string };
  const { siteInfo } = readCapture("velaro-home-site-info.DEVREL.json") as {
    siteInfo: { startItemId?: string; properties?: { rootPath?: string } };
  };

  it("the capture's startItemId is present and its site-node rootPath is a DIFFERENT path (the trap this fix closes)", () => {
    expect(siteInfo.startItemId).toBe("ef14cc17-5a0b-4c15-aa2a-98749073b5db");
    expect(siteInfo.properties?.rootPath).toBe("/sitecore/content/Velaro-Brand/Velaro");
    expect(siteInfo.properties?.rootPath).not.toBe(START_ITEM_PATH);
  });

  it("resolveStartItemPath resolves startItemId to the start item's own path via one Authoring GraphQL call, never the site-node rootPath", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockImplementation((async (key: string, opts: { params: { body: { variables: { itemId?: string } } } }) => {
      expect(key).toBe("xmc.authoring.graphql");
      expect(opts.params.body.variables.itemId).toBe(siteInfo.startItemId);
      return { data: { data: { item: { path: START_ITEM_PATH } } } };
    }) as never);

    const path = await resolveStartItemPath(stubClient, {
      startItemId: siteInfo.startItemId,
      language: "en",
      contextId: "ctx-preview",
    });

    expect(path).toBe(START_ITEM_PATH);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("discriminates real HITs from the real MISS on the actual captured page — the whole point of this fix", async () => {
    const { stubClient, mutate } = createStubClient();
    // Ground truth measured by the operator against the live tenant
    // (task brief): every one of these paths under the START ITEM resolves;
    // `/contact4` does not exist anywhere on the tenant and must MISS. The
    // captured page itself carries no `/contact4` anchor, so it is added
    // alongside the real anchors — the same shape a stray/typo'd author link
    // would take.
    const HIT_PATHS = new Set([
      START_ITEM_PATH, // "/" resolves to the start item itself
      `${START_ITEM_PATH}/models`,
      `${START_ITEM_PATH}/brand`,
      `${START_ITEM_PATH}/Contact`,
      `${START_ITEM_PATH}/Editions`,
      `${START_ITEM_PATH}/Technology`,
      `${START_ITEM_PATH}/models/velaro-s`,
    ]);
    mutate.mockImplementation((async (key: string, opts: { params: { body: { variables: { path?: string } } } }) => {
      if (key === "xmc.authoring.graphql") {
        const path = opts.params.body.variables.path;
        if (path && HIT_PATHS.has(path)) {
          return { data: { data: { item: { itemId: `ITEM-${path}`, name: "Resolved" } } } };
        }
        return { data: { data: { item: null } } }; // MISS — includes /contact4
      }
      return { data: { data: { item: { id: "live-1" } } } }; // xmc.live.graphql lead — published
    }) as never);

    const seeded = classifyFindings(extractAnchors(html), html);
    const withContact4 = [
      ...seeded,
      {
        href: "/contact4",
        ordinal: seeded.length + 1,
        text: "Contact4",
        scope: "internal" as const,
        statuses: new Set<never>(),
        attribution: null,
        targetLabel: null,
        targetItemId: null,
        origin: "content" as const,
      },
    ];

    const { findings } = await resolveInternalFindings(withContact4, {
      siteRootPath: START_ITEM_PATH,
      language: "en",
      client: stubClient,
      authoringContextId: "ctx-preview",
      liveContextId: "ctx-live",
    });

    const byHref = (href: string) => findings.filter((f) => f.href === href);

    // Real HITs — real, existing pages under the start item.
    for (const href of ["/models", "/brand", "/Contact", "/Editions", "/Technology", "/models/velaro-s"]) {
      const hits = byHref(href);
      expect(hits.length).toBeGreaterThan(0);
      for (const f of hits) {
        expect(f.statuses.has("not-found")).toBe(false);
        expect(f.targetItemId).not.toBeNull();
      }
    }

    // The one real MISS — proves the checker still catches a genuine defect,
    // not just "everything resolves now".
    const contact4 = byHref("/contact4");
    expect(contact4.length).toBe(1);
    expect(contact4[0].statuses.has("not-found")).toBe(true);
    expect(contact4[0].targetItemId).toBeNull();

    // Root href resolves to the start item itself, not `${START_ITEM_PATH}/`.
    const root = byHref("/");
    expect(root.length).toBeGreaterThan(0);
    for (const f of root) expect(f.statuses.has("not-found")).toBe(false);

    // In-page anchor — no CM lookup, never flagged.
    const anchor = byHref("#main");
    expect(anchor.length).toBeGreaterThan(0);
    for (const f of anchor) {
      expect(f.statuses.has("not-found")).toBe(false);
      expect(f.statuses.has("could-not-check")).toBe(false);
    }
  });
});
