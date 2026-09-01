// T030 RED — getLivePageState. Both the "resolved with a status" and
// "thrown with a status" 404 shapes are exercised, since runtime behaviour
// wasn't captured in-app at T0 (see the file header).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStubClient } from "@/test/client-stub";
import { getLivePageState } from "./getLivePageState";

describe("getLivePageState", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("204/200 → live:true", async () => {
    const { stubClient, query } = createStubClient();
    query.mockResolvedValueOnce({ data: { data: {} }, status: 200 } as never);

    const result = await getLivePageState(stubClient, { itemId: "abc", language: "en", contextId: "ctx-1" });

    expect(result).toEqual({ ok: true, live: true });
  });

  it("a RESOLVED result carrying status:404 is treated as data (unpublished), not an error", async () => {
    const { stubClient, query } = createStubClient();
    query.mockResolvedValueOnce({ status: 404, error: { detail: "Not Found" } } as never);

    const result = await getLivePageState(stubClient, { itemId: "abc", language: "en", contextId: "ctx-1" });

    expect(result).toEqual({ ok: true, live: false });
  });

  it("a THROWN error carrying status:404 is also treated as data (regression: the headline-defect case)", async () => {
    const { stubClient, query } = createStubClient();
    const err = Object.assign(new Error("Not Found"), { status: 404 });
    query.mockRejectedValueOnce(err);

    const result = await getLivePageState(stubClient, { itemId: "abc", language: "en", contextId: "ctx-1" });

    expect(result).toEqual({ ok: true, live: false });
  });

  it("500 → ok:false, reason:'request-failed' — never 'live:false'", async () => {
    const { stubClient, query } = createStubClient();
    query.mockResolvedValueOnce({ status: 500, error: {} } as never);

    const result = await getLivePageState(stubClient, { itemId: "abc", language: "en", contextId: "ctx-1" });

    expect(result).toEqual({ ok: false, reason: "request-failed" });
  });

  it("returns ok:false, reason:'no-context' when contextId is absent — never calls the SDK", async () => {
    const { stubClient, query } = createStubClient();

    const result = await getLivePageState(stubClient, { itemId: "abc", language: "en", contextId: undefined });

    expect(result).toEqual({ ok: false, reason: "no-context" });
    expect(query).not.toHaveBeenCalled();
  });
});
