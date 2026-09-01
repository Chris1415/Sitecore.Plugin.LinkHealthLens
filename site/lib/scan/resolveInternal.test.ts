// T028 RED — resolveInternal composes normalization + call 1.
import { describe, expect, it } from "vitest";
import { createStubClient } from "@/test/client-stub";
import { resolveInternal } from "./resolveInternal";

const ROOT = "/sitecore/content/Zephira-Brand/Zephira/Home";
const CTX = { siteRootPath: ROOT, language: "en", contextId: "ctx-1" };

describe("resolveInternal", () => {
  it("no result from call 1 ⇒ not-found, terminal", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockResolvedValueOnce({ data: { data: { item: null } } } as never);

    const result = await resolveInternal(stubClient, "/no-such-page", CTX);

    expect(result).toEqual({ status: "not-found" });
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("a HIT carries itemId + name forward as targetLabel material (AC-3.2)", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockResolvedValueOnce({
      data: { data: { item: { itemId: "abc-123", name: "Destinations" } } },
    } as never);

    const result = await resolveInternal(stubClient, "/destinations", CTX);

    expect(result).toEqual({
      status: "found",
      path: `${ROOT}/destinations`,
      itemId: "abc-123",
      name: "Destinations",
    });
  });

  it("a media path is excluded before any call is made", async () => {
    const { stubClient, mutate } = createStubClient();

    const result = await resolveInternal(stubClient, "/-/media/brochure.pdf", CTX);

    expect(result).toEqual({ status: "excluded" });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("rejected-shortcut regression: a fixture with hasPresentation:true (not on this query) still proceeds to call 2, never short-circuits to ok here", async () => {
    const { stubClient, mutate } = createStubClient();
    // hasPresentation is not part of the resolveItemByPath query at all — the
    // shortcut is structurally impossible, not merely avoided by convention.
    mutate.mockResolvedValueOnce({
      data: { data: { item: { itemId: "abc-123", name: "Destinations", hasPresentation: true } } },
    } as never);

    const result = await resolveInternal(stubClient, "/destinations", CTX);

    expect(result.status).toBe("found"); // never 'ok' — publish state is call 2's job
  });

  it("propagates could-not-check when call 1 fails", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockRejectedValueOnce(new Error("network"));

    const result = await resolveInternal(stubClient, "/destinations", CTX);

    expect(result).toEqual({ status: "could-not-check" });
  });
});
