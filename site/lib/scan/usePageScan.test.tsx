// T015 — pages.context subscription + per-selection scan. RED before GREEN.
// TR-4 addendum: sitecoreContextId now comes from AppContextContext
// (resourceAccess[0].context.preview) — every wrapper below supplies a stub
// appContext so the pre-existing tests don't regress under the new read.
import type { ApplicationContext, PagesContext } from "@sitecore-marketplace-sdk/client";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  // Operator-requested (2026-09-02): react to field/layout edits too, debounced
  // so a burst of keystrokes triggers ONE re-scan, never one per event.
  describe("content-change subscriptions (fieldsUpdated / layoutUpdated)", () => {
    function stubReadyOnce(query: ReturnType<typeof createStubClient>["query"]) {
      query.mockResolvedValueOnce({
        data: { data: { pageId: "page-1", html: '<a href="/a">A</a>' } },
      } as never);
    }

    function subscribeHandlers(subscribe: ReturnType<typeof createStubClient>["subscribe"]) {
      const handlers: Record<string, { onData: (data: unknown) => void }> = {};
      subscribe.mockImplementation(((key: string, opts: { onData: (data: unknown) => void }) => {
        handlers[key] = opts;
        return vi.fn();
      }) as never);
      return handlers;
    }

    // Fake timers make @testing-library's real-timer-based `waitFor` hang —
    // flush microtasks + any zero-delay timers explicitly instead.
    async function flush() {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    }

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("coalesces ten rapid fieldsUpdated events into a single re-scan", async () => {
      const { stubClient, query, subscribe } = createStubClient();
      let onSuccess: ((ctx: PagesContext) => void) | undefined;
      query.mockImplementation(((_key: string, opts?: { onSuccess?: (c: PagesContext) => void }) => {
        onSuccess = opts?.onSuccess;
        return Promise.resolve({ data: undefined, unsubscribe: vi.fn() });
      }) as never);
      const handlers = subscribeHandlers(subscribe);

      renderHook(() => usePageScan(), { wrapper: wrapperFor(stubClient) });
      await flush();
      expect(onSuccess).toBeDefined();

      stubReadyOnce(query);
      await act(async () => {
        onSuccess?.(READY_CTX);
      });
      await flush();
      expect(query).toHaveBeenCalledWith("xmc.agent.pagesGetPageHtml", expect.anything());
      query.mockClear();

      stubReadyOnce(query);
      await act(async () => {
        for (let i = 0; i < 10; i += 1) {
          handlers["pages.content.fieldsUpdated"]?.onData({
            itemId: "page-1",
            language: "en",
            itemVersion: 1,
            fields: [{ fieldId: "f", value: `v${i}`, originalValue: "v" }],
          });
        }
        // Advance less than the debounce window — nothing has fired yet.
        await vi.advanceTimersByTimeAsync(400);
      });
      expect(query).not.toHaveBeenCalledWith("xmc.agent.pagesGetPageHtml", expect.anything());

      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });

      const rescans = query.mock.calls.filter(([key]) => key === "xmc.agent.pagesGetPageHtml");
      expect(rescans).toHaveLength(1);
    });

    it("still re-scans immediately on a pages.context page change while a content debounce is pending", async () => {
      const { stubClient, query, subscribe } = createStubClient();
      let onSuccess: ((ctx: PagesContext) => void) | undefined;
      query.mockImplementation(((_key: string, opts?: { onSuccess?: (c: PagesContext) => void }) => {
        onSuccess = opts?.onSuccess;
        return Promise.resolve({ data: undefined, unsubscribe: vi.fn() });
      }) as never);
      const handlers = subscribeHandlers(subscribe);

      renderHook(() => usePageScan(), { wrapper: wrapperFor(stubClient) });
      await flush();
      expect(onSuccess).toBeDefined();

      stubReadyOnce(query);
      await act(async () => {
        onSuccess?.(READY_CTX);
      });
      await flush();
      expect(query).toHaveBeenCalledWith("xmc.agent.pagesGetPageHtml", expect.anything());
      query.mockClear();

      // A content edit starts a pending debounce...
      act(() => {
        handlers["pages.content.fieldsUpdated"]?.onData({
          itemId: "page-1",
          language: "en",
          itemVersion: 1,
          fields: [{ fieldId: "f", value: "v", originalValue: "v0" }],
        });
      });

      // ...then the author selects a different page well inside the debounce
      // window. The page change must re-scan NOW, not wait behind it.
      stubReadyOnce(query);
      await act(async () => {
        onSuccess?.({ ...READY_CTX, pageInfo: { id: "page-2", name: "Other", path: "/other", language: "en" } });
      });

      expect(query).toHaveBeenCalledWith("xmc.agent.pagesGetPageHtml", expect.anything());
    });

    it("the stale-response guard drops a slow debounced re-scan superseded by a newer page selection", async () => {
      const { stubClient, query, subscribe } = createStubClient();
      let onSuccess: ((ctx: PagesContext) => void) | undefined;
      query.mockImplementation(((_key: string, opts?: { onSuccess?: (c: PagesContext) => void }) => {
        onSuccess = opts?.onSuccess;
        return Promise.resolve({ data: undefined, unsubscribe: vi.fn() });
      }) as never);
      const handlers = subscribeHandlers(subscribe);

      const { result } = renderHook(() => usePageScan(), { wrapper: wrapperFor(stubClient) });
      await flush();
      expect(onSuccess).toBeDefined();

      stubReadyOnce(query);
      await act(async () => {
        onSuccess?.(READY_CTX);
      });
      await flush();
      expect(result.current.status).toBe("ready");

      // A field edit schedules a debounced re-scan whose HTML fetch will
      // resolve slowly (never, within this test's window).
      act(() => {
        handlers["pages.content.fieldsUpdated"]?.onData({
          itemId: "page-1",
          language: "en",
          itemVersion: 1,
          fields: [{ fieldId: "f", value: "v", originalValue: "v0" }],
        });
      });
      query.mockImplementationOnce(() => new Promise(() => {}));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      // The debounced scan is now in flight (never resolves).

      // A newer page selection arrives and resolves normally — it must win.
      stubReadyOnce(query);
      await act(async () => {
        onSuccess?.({ ...READY_CTX, pageInfo: { id: "page-2", name: "Other", path: "/other", language: "en" } });
      });

      await flush();
      expect(result.current.status).toBe("ready");
      expect(result.current.scan?.page.id).toBe("page-2");
    });

    it("cancels a pending debounce timer and unsubscribes both content events on unmount", async () => {
      const { stubClient, query, subscribe } = createStubClient();
      let onSuccess: ((ctx: PagesContext) => void) | undefined;
      query.mockImplementation(((_key: string, opts?: { onSuccess?: (c: PagesContext) => void }) => {
        onSuccess = opts?.onSuccess;
        return Promise.resolve({ data: undefined, unsubscribe: vi.fn() });
      }) as never);
      const fieldsUnsub = vi.fn();
      const layoutUnsub = vi.fn();
      subscribe.mockImplementation(((key: string) => {
        return key === "pages.content.fieldsUpdated" ? fieldsUnsub : layoutUnsub;
      }) as never);

      const { unmount } = renderHook(() => usePageScan(), { wrapper: wrapperFor(stubClient) });
      await flush();
      expect(onSuccess).toBeDefined();

      unmount();

      expect(fieldsUnsub).toHaveBeenCalled();
      expect(layoutUnsub).toHaveBeenCalled();

      // A timer firing after unmount must not throw / must not re-render.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    });

    it("fails soft: a subscribe() that throws still leaves page-change re-scanning working", async () => {
      const { stubClient, query, subscribe } = createStubClient();
      let onSuccess: ((ctx: PagesContext) => void) | undefined;
      query.mockImplementation(((_key: string, opts?: { onSuccess?: (c: PagesContext) => void }) => {
        onSuccess = opts?.onSuccess;
        return Promise.resolve({ data: undefined, unsubscribe: vi.fn() });
      }) as never);
      subscribe.mockImplementation(() => {
        throw new Error("extension point does not support this event");
      });

      const { result } = renderHook(() => usePageScan(), { wrapper: wrapperFor(stubClient) });
      await flush();
      expect(onSuccess).toBeDefined();

      stubReadyOnce(query);
      await act(async () => {
        onSuccess?.(READY_CTX);
      });

      await flush();
      expect(result.current.status).toBe("ready");
    });
  });
});
