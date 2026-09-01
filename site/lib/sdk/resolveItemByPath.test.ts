// T028 RED — resolveItemByPath. Fixtures over T007-captured shapes (probe (e)
// proved the mechanism on the real tenant; these mirror that HIT/MISS pair).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStubClient } from "@/test/client-stub";
import { resolveItemByPath } from "./resolveItemByPath";

describe("resolveItemByPath", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  const PATH = "/sitecore/content/Zephira-Brand/Zephira/Home/destinations";

  it("calls xmc.authoring.graphql with body INSIDE params and double-unwraps a HIT", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockResolvedValueOnce({
      data: { data: { item: { itemId: "e5ecb5f7-ad3d-489d-8a48-b9d9148e410b", name: "Destinations" } } },
    } as never);

    const result = await resolveItemByPath(stubClient, { path: PATH, language: "en", contextId: "ctx-1" });

    expect(mutate).toHaveBeenCalledWith(
      "xmc.authoring.graphql",
      expect.objectContaining({
        params: expect.objectContaining({
          query: { sitecoreContextId: "ctx-1" },
          body: expect.objectContaining({ variables: { path: PATH, language: "en" } }),
        }),
      }),
    );
    expect(result).toEqual({
      ok: true,
      found: true,
      itemId: "e5ecb5f7-ad3d-489d-8a48-b9d9148e410b",
      name: "Destinations",
    });
  });

  it("returns found:false on a MISS (item: null) — never treated as a failure", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockResolvedValueOnce({ data: { data: { item: null } } } as never);

    const result = await resolveItemByPath(stubClient, { path: `${PATH}/no-such-page`, language: "en", contextId: "ctx-1" });

    expect(result).toEqual({ ok: true, found: false });
  });

  it("returns ok:false, reason:'no-context' when contextId is absent — never calls the SDK", async () => {
    const { stubClient, mutate } = createStubClient();

    const result = await resolveItemByPath(stubClient, { path: PATH, language: "en", contextId: undefined });

    expect(result).toEqual({ ok: false, reason: "no-context" });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("returns ok:false, reason:'graphql-error' when the response carries a GraphQL errors array", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockResolvedValueOnce({ data: { data: { errors: [{ message: "boom" }] } } } as never);

    const result = await resolveItemByPath(stubClient, { path: PATH, language: "en", contextId: "ctx-1" });

    expect(result).toEqual({ ok: false, reason: "graphql-error" });
  });

  it("returns ok:false, reason:'request-failed' when the SDK call throws", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockRejectedValueOnce(new Error("network error"));

    const result = await resolveItemByPath(stubClient, { path: PATH, language: "en", contextId: "ctx-1" });

    expect(result).toEqual({ ok: false, reason: "request-failed" });
  });
});
