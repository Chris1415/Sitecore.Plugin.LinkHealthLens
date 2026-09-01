// T030 RED — resolveLiveState composes the lead + fallback per the addendum.
import { describe, expect, it } from "vitest";
import { createStubClient } from "@/test/client-stub";
import { resolveLiveState } from "./resolveLiveState";

const PATH = "/sitecore/content/Zephira-Brand/Zephira/Home/destinations";

describe("resolveLiveState", () => {
  it("published when the live-Edge lead finds the item — fallback never called", async () => {
    const { stubClient, mutate, query } = createStubClient();
    mutate.mockResolvedValueOnce({ data: { data: { item: { id: "x" } } } } as never);

    const verdict = await resolveLiveState(stubClient, {
      path: PATH,
      itemId: "item-1",
      language: "en",
      liveContextId: "ctx-live",
      previewContextId: "ctx-preview",
    });

    expect(verdict).toBe("published");
    expect(query).not.toHaveBeenCalled();
  });

  it("unpublished, decisively, when the live-Edge lead finds nothing — fallback never called", async () => {
    const { stubClient, mutate, query } = createStubClient();
    mutate.mockResolvedValueOnce({ data: { data: { item: null } } } as never);

    const verdict = await resolveLiveState(stubClient, {
      path: PATH,
      itemId: "item-1",
      language: "en",
      liveContextId: "ctx-live",
      previewContextId: "ctx-preview",
    });

    expect(verdict).toBe("unpublished");
    expect(query).not.toHaveBeenCalled();
  });

  it("falls back to getLivePageState when the lead itself cannot be reached, and reports the merged AC-3.3 label on 404", async () => {
    const { stubClient, mutate, query } = createStubClient();
    mutate.mockRejectedValueOnce(new Error("Failed to find tenant"));
    query.mockResolvedValueOnce({ status: 404 } as never);

    const verdict = await resolveLiveState(stubClient, {
      path: PATH,
      itemId: "item-1",
      language: "en",
      liveContextId: "ctx-live",
      previewContextId: "ctx-preview",
    });

    expect(verdict).toBe("not-found-or-unpublished");
  });

  it("published via the fallback when the lead cannot be reached but the fallback resolves live", async () => {
    const { stubClient, mutate, query } = createStubClient();
    mutate.mockRejectedValueOnce(new Error("Failed to find tenant"));
    query.mockResolvedValueOnce({ status: 200 } as never);

    const verdict = await resolveLiveState(stubClient, {
      path: PATH,
      itemId: "item-1",
      language: "en",
      liveContextId: "ctx-live",
      previewContextId: "ctx-preview",
    });

    expect(verdict).toBe("published");
  });

  it("could-not-check when both the lead and the fallback fail", async () => {
    const { stubClient, mutate, query } = createStubClient();
    mutate.mockRejectedValueOnce(new Error("network"));
    query.mockRejectedValueOnce(Object.assign(new Error("500"), { status: 500 }));

    const verdict = await resolveLiveState(stubClient, {
      path: PATH,
      itemId: "item-1",
      language: "en",
      liveContextId: "ctx-live",
      previewContextId: "ctx-preview",
    });

    expect(verdict).toBe("could-not-check");
  });
});
