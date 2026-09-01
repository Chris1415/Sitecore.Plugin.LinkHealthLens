// T030 RED — checkLiveViaEdge, the live-Edge lead.
import { describe, expect, it } from "vitest";
import { createStubClient } from "@/test/client-stub";
import { checkLiveViaEdge } from "./checkLiveViaEdge";

const PATH = "/sitecore/content/Zephira-Brand/Zephira/Home/destinations";

describe("checkLiveViaEdge", () => {
  it("reports exists:true when the item is present on live Edge", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockResolvedValueOnce({ data: { data: { item: { id: "abc" } } } } as never);

    const result = await checkLiveViaEdge(stubClient, { path: PATH, language: "en", contextId: "ctx-live" });

    expect(mutate).toHaveBeenCalledWith(
      "xmc.live.graphql",
      expect.objectContaining({
        params: expect.objectContaining({ query: { sitecoreContextId: "ctx-live" } }),
      }),
    );
    expect(result).toEqual({ ok: true, exists: true });
  });

  it("reports exists:false, decisively, when the item is absent on live Edge", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockResolvedValueOnce({ data: { data: { item: null } } } as never);

    const result = await checkLiveViaEdge(stubClient, { path: PATH, language: "en", contextId: "ctx-live" });

    expect(result).toEqual({ ok: true, exists: false });
  });

  it("returns ok:false without calling the SDK when contextId is absent", async () => {
    const { stubClient, mutate } = createStubClient();

    const result = await checkLiveViaEdge(stubClient, { path: PATH, language: "en", contextId: undefined });

    expect(result).toEqual({ ok: false, reason: "no-context" });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("returns ok:false, reason:'request-failed' when the SDK call throws (the untested in-app case per probe (b))", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockRejectedValueOnce(new Error("Failed to find tenant"));

    const result = await checkLiveViaEdge(stubClient, { path: PATH, language: "en", contextId: "ctx-live" });

    expect(result).toEqual({ ok: false, reason: "request-failed" });
  });
});
