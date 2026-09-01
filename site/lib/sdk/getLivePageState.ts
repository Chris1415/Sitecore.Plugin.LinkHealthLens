// T030 — call 2 of ADR-0008/0009, fallback only (checkLiveViaEdge is tried
// first — see resolveLiveState.ts). `xmc.pages.getLivePageState` is a
// QueryMap key (client.query, DOUBLE unwrap — § 4c-6 #5) whose 200 body is
// declared `unknown`; only the 404 shape is independently typeable from the
// .d.ts (`Pages.GetLivePageStateErrors = { 404: ProblemDetails }`).
//
// A 404 is DATA — the ambiguous not-live signal (probe (b); resolveLiveState
// turns it into AC-3.3's merged label), never an error. It is asserted
// BEFORE any generic failure branch, per the task's own warning: a shared
// error handler converting this into an infrastructure warning is "the
// single most likely way to build this app wrong".
//
// Runtime throw-vs-return shape for a 404 was not captured in-app at T0 (the
// T007 fixture is the raw out-of-band REST 404, not a client.query() result)
// — both a resolved result carrying `status`/`error` and a thrown error
// carrying `status` are handled here defensively; confirming which one the
// real client.query() takes is an open item for the T034 real-tenant smoke
// (docs/build-decisions.md).
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";

export type GetLivePageStateResult =
  | { ok: true; live: true }
  | { ok: true; live: false } // 404 — ambiguous per probe (b), caller applies AC-3.3
  | { ok: false; reason: "no-context" | "request-failed" };

function statusOf(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const v = value as Record<string, unknown>;
  if (typeof v.status === "number") return v.status;
  const response = v.response as Record<string, unknown> | undefined;
  if (response && typeof response.status === "number") return response.status;
  return undefined;
}

export async function getLivePageState(
  client: ClientSDK,
  params: { itemId: string; language: string; contextId: string | undefined },
): Promise<GetLivePageStateResult> {
  if (!params.contextId) {
    console.error("getLivePageState: no sitecoreContextId available", { itemId: params.itemId });
    return { ok: false, reason: "no-context" };
  }

  try {
    const res = await client.query("xmc.pages.getLivePageState", {
      params: {
        path: { pageId: params.itemId },
        query: { language: params.language, sitecoreContextId: params.contextId },
      },
    });
    const status = statusOf(res);
    if (status === 404) return { ok: true, live: false };
    if (status !== undefined && status >= 400) {
      console.error("getLivePageState: non-404 error status", { itemId: params.itemId, status });
      return { ok: false, reason: "request-failed" };
    }
    return { ok: true, live: true };
  } catch (err) {
    const status = statusOf(err);
    if (status === 404) return { ok: true, live: false };
    console.error("getLivePageState: request threw", {
      itemId: params.itemId,
      message: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "request-failed" };
  }
}
