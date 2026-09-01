// T015 — pages.context subscription + per-selection scan. RED before GREEN.
// TR-4 addendum: sitecoreContextId now comes from AppContextContext
// (resourceAccess[0].context.preview) — every wrapper below supplies a stub
// appContext so the pre-existing tests don't regress under the new read.
import type { ApplicationContext, PagesContext } from "@sitecore-marketplace-sdk/client";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppContextContext, ClientSDKContext } from "@/components/providers/marketplace";
import { createStubClient } from "@/test/client-stub";
import { usePageScan } from "./usePageScan";

const STUB_APP_CONTEXT: ApplicationContext = {
  id: "app-1",
  url: "https://example.test",
  resourceAccess: [
    // Shaped from the REAL application.context captured in the portal
    // (project-planning/captures/) — resourceId and tenantId are required by
    // ApplicationResourceContext and were missing, which failed `tsc --noEmit`
    // silently since TR-2: `next build` does not traverse test files.
    {
      resourceId: "xmcloud",
      tenantId: "29eac3eb-6cbb-42a4-1a72-08ded696f4f5",
      context: { live: "ctx-live-1", preview: "ctx-preview-1" },
    },
  ],
};

function wrapperFor(
  stubClient: ReturnType<typeof createStubClient>["stubClient"],
  appContext: ApplicationContext | null = STUB_APP_CONTEXT,
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ClientSDKContext.Provider value={stubClient}>
        <AppContextContext.Provider value={appContext}>{children}</AppContextContext.Provider>
      </ClientSDKContext.Provider>
    );
  };
}

const READY_CTX: PagesContext = {
  siteInfo: { language: "en", rootPath: "/sitecore/content/Zephira-Brand/Zephira" },
  pageInfo: { id: "page-1", name: "Home", path: "/", language: "en" },
};

describe("usePageScan", () => {
  it("subscribes to pages.context and starts loading immediately", async () => {
    const { stubClient, query } = createStubClient();
    query.mockResolvedValue({ data: undefined, unsubscribe: vi.fn() } as never);

    const { result } = renderHook(() => usePageScan(), { wrapper: wrapperFor(stubClient) });

    expect(result.current.status).toBe("loading");
    await waitFor(() => {
      expect(query).toHaveBeenCalledWith(
        "pages.context",
        expect.objectContaining({ subscribe: true }),
      );
    });
  });

  it("discards all prior findings before the next scan starts (FR-4/AC-1.3)", async () => {
    const { stubClient, query } = createStubClient();
    let onSuccess: ((ctx: PagesContext) => void) | undefined;
    query.mockImplementation(((_key: string, opts?: { onSuccess?: (c: PagesContext) => void }) => {
      onSuccess = opts?.onSuccess;
      return Promise.resolve({ data: undefined, unsubscribe: vi.fn() });
    }) as never);

    const { result } = renderHook(() => usePageScan(), { wrapper: wrapperFor(stubClient) });
    await waitFor(() => expect(onSuccess).toBeDefined());

    // First page: HTML resolves with one anchor.
    query.mockResolvedValueOnce({
      data: { data: { pageId: "page-1", html: '<a href="/a">A</a>' } },
    } as never);
    onSuccess?.(READY_CTX);
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.scan?.findings).toHaveLength(1);

    // Second selection arrives mid-render — reset must be synchronous with the
    // loading transition, not merely eventually consistent.
    query.mockImplementationOnce(() => new Promise(() => {})); // never resolves during this assertion window
    act(() => {
      onSuccess?.({ ...READY_CTX, pageInfo: { id: "page-2", name: "Other", path: "/other", language: "en" } });
    });

    expect(result.current.status).toBe("loading");
    expect(result.current.scan).toBeNull();
  });

  it("reads language from pageInfo.language ?? siteInfo.language and never defaults to 'en'", async () => {
    const { stubClient, query } = createStubClient();
    let onSuccess: ((ctx: PagesContext) => void) | undefined;
    query.mockImplementation(((_key: string, opts?: { onSuccess?: (c: PagesContext) => void }) => {
      onSuccess = opts?.onSuccess;
      return Promise.resolve({ data: undefined, unsubscribe: vi.fn() });
    }) as never);

    const { result } = renderHook(() => usePageScan(), { wrapper: wrapperFor(stubClient) });
    await waitFor(() => expect(onSuccess).toBeDefined());

    onSuccess?.({
      siteInfo: {},
      pageInfo: { id: "page-1", name: "Home", path: "/" }, // no language anywhere
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.scan?.health.pageHtml).toBe(false);
    expect(result.current.scan?.page.language).not.toBe("en");
    // No HTML fetch was attempted — you cannot ask pagesGetPageHtml a required
    // param it doesn't have.
    expect(query).not.toHaveBeenCalledWith(
      "xmc.agent.pagesGetPageHtml",
      expect.anything(),
    );
  });

  it("passes sitecoreContextId (.context.preview) through to pagesGetPageHtml", async () => {
    const { stubClient, query } = createStubClient();
    let onSuccess: ((ctx: PagesContext) => void) | undefined;
    query.mockImplementation(((_key: string, opts?: { onSuccess?: (c: PagesContext) => void }) => {
      onSuccess = opts?.onSuccess;
      return Promise.resolve({ data: undefined, unsubscribe: vi.fn() });
    }) as never);

    const { result } = renderHook(() => usePageScan(), { wrapper: wrapperFor(stubClient) });
    await waitFor(() => expect(onSuccess).toBeDefined());

    query.mockResolvedValueOnce({
      data: { data: { pageId: "page-1", html: '<a href="/a">A</a>' } },
    } as never);
    onSuccess?.(READY_CTX);

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(query).toHaveBeenCalledWith(
      "xmc.agent.pagesGetPageHtml",
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.objectContaining({ sitecoreContextId: "ctx-preview-1" }),
        }),
      }),
    );
  });

  it("goes to the error state (never a silent pass, never a cast) when no context id is available", async () => {
    const { stubClient, query } = createStubClient();
    let onSuccess: ((ctx: PagesContext) => void) | undefined;
    query.mockImplementation(((_key: string, opts?: { onSuccess?: (c: PagesContext) => void }) => {
      onSuccess = opts?.onSuccess;
      return Promise.resolve({ data: undefined, unsubscribe: vi.fn() });
    }) as never);

    const noContext: ApplicationContext = { id: "app-1", url: "https://example.test", resourceAccess: [] };
    const { result } = renderHook(() => usePageScan(), { wrapper: wrapperFor(stubClient, noContext) });
    await waitFor(() => expect(onSuccess).toBeDefined());

    onSuccess?.(READY_CTX);

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.scan?.health.pageHtml).toBe(false);
    // The failure is reported (no-context), never a call with sitecoreContextId=undefined on the wire.
    expect(query).not.toHaveBeenCalledWith(
      "xmc.agent.pagesGetPageHtml",
      expect.anything(),
    );
  });

  it("unsubscribes on unmount", async () => {
    const { stubClient, query } = createStubClient();
    const unsubscribe = vi.fn();
    query.mockResolvedValue({ data: undefined, unsubscribe } as never);

    const { unmount } = renderHook(() => usePageScan(), { wrapper: wrapperFor(stubClient) });
    await waitFor(() => expect(query).toHaveBeenCalled());
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
