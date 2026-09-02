// T029/T031/T032 RED — resolveInternalFindings: de-dup call counts, the
// could-not-check + insecure-scheme coexistence case (AC-2.3), and partial
// results when one path's resolution fails but others succeed (NFR-2).
import { describe, expect, it } from "vitest";
import { createStubClient } from "@/test/client-stub";
import type { LinkFinding } from "@/lib/model/types";
import { resolveInternalFindings } from "./resolveFindings";

const ROOT = "/sitecore/content/Zephira-Brand/Zephira/Home";

function finding(overrides: Partial<LinkFinding>): LinkFinding {
  return {
    href: "/x",
    ordinal: 1,
    text: "x",
    scope: "internal",
    statuses: new Set(),
    attribution: null,
    targetLabel: null,
    targetItemId: null,
    ...overrides,
  };
}

const CTX = (client: ReturnType<typeof createStubClient>["stubClient"]) => ({
  siteRootPath: ROOT,
  language: "en",
  client,
  authoringContextId: "ctx-preview",
  liveContextId: "ctx-live",
});

describe("resolveInternalFindings", () => {
  it("20 identical hrefs de-dup to exactly 1 call-1 + 1 call-2 (NFR-1)", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockImplementation((async (key: string) => {
      if (key === "xmc.authoring.graphql") {
        return { data: { data: { item: { itemId: "item-1", name: "Book" } } } };
      }
      return { data: { data: { item: { id: "live-1" } } } }; // live-Edge lead: published
    }) as never);

    const findings = Array.from({ length: 20 }, (_, i) => finding({ href: `/book?to=Guest${i}`, ordinal: i + 1 }));
    await resolveInternalFindings(findings, CTX(stubClient));

    const call1Count = mutate.mock.calls.filter((c) => c[0] === "xmc.authoring.graphql").length;
    const call2Count = mutate.mock.calls.filter((c) => c[0] === "xmc.live.graphql").length;
    expect(call1Count).toBe(1);
    expect(call2Count).toBe(1);
  });

  it("two distinct hrefs sharing one resolved path (query-string variants) still make exactly 1+1 calls", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockImplementation((async (key: string) => {
      if (key === "xmc.authoring.graphql") {
        return { data: { data: { item: { itemId: "item-1", name: "Book" } } } };
      }
      return { data: { data: { item: { id: "live-1" } } } };
    }) as never);

    const findings = [finding({ href: "/book?to=Lisbon", ordinal: 1 }), finding({ href: "/book?to=Accra", ordinal: 2 })];
    await resolveInternalFindings(findings, CTX(stubClient));

    expect(mutate.mock.calls.filter((c) => c[0] === "xmc.authoring.graphql").length).toBe(1);
    expect(mutate.mock.calls.filter((c) => c[0] === "xmc.live.graphql").length).toBe(1);
  });

  it("a row that is both could-not-check and insecure-scheme shows both — resolution never overwrites an existing member (AC-2.3/T031)", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockRejectedValue(new Error("network"));

    const findings = [
      finding({ href: "/broken", ordinal: 1, statuses: new Set(["insecure-scheme"]) }),
    ];
    const { findings: result } = await resolveInternalFindings(findings, CTX(stubClient));

    expect(result[0].statuses.has("could-not-check")).toBe(true);
    expect(result[0].statuses.has("insecure-scheme")).toBe(true);
  });

  it("partial results: one path's resolution fails, another's succeeds — health.resolution stays true and both findings render", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockImplementation((async (key: string, opts: { params: { body: { variables: { path: string } } } }) => {
      if (key === "xmc.authoring.graphql") {
        if (opts.params.body.variables.path === `${ROOT}/fails`) throw new Error("network");
        return { data: { data: { item: { itemId: "item-ok", name: "OK" } } } };
      }
      return { data: { data: { item: { id: "live-1" } } } };
    }) as never);

    const findings = [finding({ href: "/fails", ordinal: 1 }), finding({ href: "/ok", ordinal: 2 })];
    const { findings: result, health } = await resolveInternalFindings(findings, CTX(stubClient));

    expect(result[0].statuses.has("could-not-check")).toBe(true);
    expect(result[1].statuses.has("could-not-check")).toBe(false);
    expect(health.resolution).toBe(true); // partial — not systemic
  });

  it("systemic failure: every path fails resolution — health.resolution flips false", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockRejectedValue(new Error("network"));

    const findings = [finding({ href: "/a", ordinal: 1 }), finding({ href: "/b", ordinal: 2 })];
    const { health } = await resolveInternalFindings(findings, CTX(stubClient));

    expect(health.resolution).toBe(false);
  });

  it("excluded findings (media path) are left untouched — no could-not-check, no call made", async () => {
    const { stubClient, mutate } = createStubClient();

    const findings = [finding({ href: "/-/media/brochure.pdf", ordinal: 1 })];
    const { findings: result } = await resolveInternalFindings(findings, CTX(stubClient));

    expect(result[0].statuses.size).toBe(0);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("populates targetItemId with the resolved PAGE's item id — the id the owner-and-open control navigates to (regression, defect fixed 2026-09-02)", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockImplementation((async (key: string) => {
      if (key === "xmc.authoring.graphql") {
        return { data: { data: { item: { itemId: "PAGE-ITEM-ID", name: "Models" } } } };
      }
      return { data: { data: { item: { id: "live-1" } } } };
    }) as never);

    const findings = [finding({ href: "/models", ordinal: 1 })];
    const { findings: result } = await resolveInternalFindings(findings, CTX(stubClient));

    expect(result[0].targetItemId).toBe("PAGE-ITEM-ID");
  });

  it("a not-found or could-not-check path never carries a targetItemId — there is no page to navigate to", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockImplementation((async (key: string, opts: { params: { body: { variables: { path: string } } } }) => {
      if (key === "xmc.authoring.graphql") {
        if (opts.params.body.variables.path === `${ROOT}/missing`) return { data: { data: { item: null } } };
        throw new Error("network");
      }
      return { data: { data: { item: { id: "live-1" } } } };
    }) as never);

    const findings = [
      finding({ href: "/missing", ordinal: 1 }),
      finding({ href: "/fails", ordinal: 2 }),
    ];
    const { findings: result } = await resolveInternalFindings(findings, CTX(stubClient));

    expect(result[0].targetItemId).toBeNull();
    expect(result[1].targetItemId).toBeNull();
  });

  it("non-internal findings are left untouched", async () => {
    const { stubClient, mutate } = createStubClient();

    const findings = [finding({ href: "https://example.com", scope: "external" })];
    const { findings: result } = await resolveInternalFindings(findings, CTX(stubClient));

    expect(result[0]).toBe(findings[0]);
    expect(mutate).not.toHaveBeenCalled();
  });
});
