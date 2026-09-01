// T016 — pagesGetPageHtml wrapper. RED before GREEN.
// TR-4 addendum: sitecoreContextId is required in Mode A (marketplace-sdk-xmc
// skill § 6a); these cases pin that it's on the wire, that an absent context
// id is its own reported failure (never a silent `as string` cast), and that
// the three failure causes stay distinguishable.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStubClient } from "@/test/client-stub";
import { fetchPageHtml } from "./pagesGetPageHtml";

describe("fetchPageHtml", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("double-unwraps result.data.data.html on success (rule 40 regression: single-unwrap yields undefined)", async () => {
    const { stubClient, query } = createStubClient();
    query.mockResolvedValueOnce({
      data: { data: { pageId: "abc", html: "<a href=\"/x\">X</a>" } },
    } as never);

    const result = await fetchPageHtml(stubClient, {
      pageId: "abc",
      language: "en",
      contextId: "ctx-123",
    });

    expect(query).toHaveBeenCalledWith("xmc.agent.pagesGetPageHtml", {
      params: {
        path: { pageId: "abc" },
        query: { language: "en", sitecoreContextId: "ctx-123" },
      },
    });
    expect(result).toEqual({ ok: true, pageId: "abc", html: '<a href="/x">X</a>' });
  });

  it("returns ok:false, reason:'no-context' when contextId is absent — never a silent cast, never calls the SDK", async () => {
    const { stubClient, query } = createStubClient();

    const result = await fetchPageHtml(stubClient, {
      pageId: "abc",
      language: "en",
      contextId: undefined,
    });

    expect(result).toEqual({ ok: false, reason: "no-context" });
    expect(query).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns ok:false, reason:'request-failed' on a bad pageId (SDK rejects) — never throws, never a blank pass", async () => {
    const { stubClient, query } = createStubClient();
    query.mockRejectedValueOnce(new Error("422 validation error"));

    const result = await fetchPageHtml(stubClient, {
      pageId: "not-a-real-id",
      language: "en",
      contextId: "ctx-123",
    });

    expect(result).toEqual({ ok: false, reason: "request-failed" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns ok:false, reason:'bad-envelope' when the double-unwrap yields no html (envelope shape mismatch)", async () => {
    const { stubClient, query } = createStubClient();
    query.mockResolvedValueOnce({ data: { data: {} } } as never);

    const result = await fetchPageHtml(stubClient, {
      pageId: "abc",
      language: "en",
      contextId: "ctx-123",
    });

    expect(result).toEqual({ ok: false, reason: "bad-envelope" });
    expect(errorSpy).toHaveBeenCalled();
  });
});
