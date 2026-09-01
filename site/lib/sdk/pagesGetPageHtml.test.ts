// T016 — pagesGetPageHtml wrapper. RED before GREEN.
import { describe, expect, it } from "vitest";
import { createStubClient } from "@/test/client-stub";
import { fetchPageHtml } from "./pagesGetPageHtml";

describe("fetchPageHtml", () => {
  it("double-unwraps result.data.data.html on success (rule 40 regression: single-unwrap yields undefined)", async () => {
    const { stubClient, query } = createStubClient();
    query.mockResolvedValueOnce({
      data: { data: { pageId: "abc", html: "<a href=\"/x\">X</a>" } },
    } as never);

    const result = await fetchPageHtml(stubClient, { pageId: "abc", language: "en" });

    expect(query).toHaveBeenCalledWith("xmc.agent.pagesGetPageHtml", {
      params: { path: { pageId: "abc" }, query: { language: "en" } },
    });
    expect(result).toEqual({ ok: true, pageId: "abc", html: '<a href="/x">X</a>' });
  });

  it("returns ok:false on a bad pageId (SDK rejects) — never throws, never a blank pass", async () => {
    const { stubClient, query } = createStubClient();
    query.mockRejectedValueOnce(new Error("422 validation error"));

    const result = await fetchPageHtml(stubClient, { pageId: "not-a-real-id", language: "en" });

    expect(result).toEqual({ ok: false });
  });

  it("returns ok:false when the double-unwrap yields no html (envelope shape mismatch)", async () => {
    const { stubClient, query } = createStubClient();
    query.mockResolvedValueOnce({ data: { data: {} } } as never);

    const result = await fetchPageHtml(stubClient, { pageId: "abc", language: "en" });

    expect(result).toEqual({ ok: false });
  });
});
