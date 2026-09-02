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

  // REGRESSION (code review 2026-09-02): the HTTP status lives on the hey-api
  // envelope at `res.data.response.status`. `QueryResult.status` is a
  // QueryStatus STRING ('idle'|'loading'|'error'|'success' —
  // node_modules/@sitecore-marketplace-sdk/client/dist/types.d.ts), so the old
  // fixtures put a number where the SDK never puts one; the whole 404 branch
  // was unreachable and every outcome resolved to live:true.
  it("204/200 → live:true, read off the hey-api envelope's response.status", async () => {
    const { stubClient, query } = createStubClient();
    query.mockResolvedValueOnce({
      data: { data: {}, response: { status: 200 } },
      status: "success",
    } as never);

    const result = await getLivePageState(stubClient, { itemId: "abc", language: "en", contextId: "ctx-1" });

    expect(result).toEqual({ ok: true, live: true });
  });

  it("a RESOLVED result whose envelope carries response.status 404 is data (unpublished), not an error", async () => {
    const { stubClient, query } = createStubClient();
    query.mockResolvedValueOnce({
      data: { error: { detail: "Not Found" }, response: { status: 404 } },
      status: "success",
    } as never);

    const result = await getLivePageState(stubClient, { itemId: "abc", language: "en", contextId: "ctx-1" });

    expect(result).toEqual({ ok: true, live: false });
  });

  it("FAILS CLOSED: no HTTP status anywhere and no payload → request-failed, never live:true", async () => {
    const { stubClient, query } = createStubClient();
    query.mockResolvedValueOnce({ data: undefined, error: new Error("boom"), status: "error", isError: true } as never);

    const result = await getLivePageState(stubClient, { itemId: "abc", language: "en", contextId: "ctx-1" });

    expect(result).toEqual({ ok: false, reason: "request-failed" });
  });

  it("a payload with no error and no status is still accepted as live (2xx with no captured response)", async () => {
    const { stubClient, query } = createStubClient();
    query.mockResolvedValueOnce({ data: { data: { pageId: "abc" } }, status: "success" } as never);

    const result = await getLivePageState(stubClient, { itemId: "abc", language: "en", contextId: "ctx-1" });

    expect(result).toEqual({ ok: true, live: true });
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
    query.mockResolvedValueOnce({ data: { error: {}, response: { status: 500 } }, status: "success" } as never);

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
