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
// The HTTP status is read off the hey-api envelope (`res.data.response.status`),
// NOT off the QueryResult — `QueryResult.status` is a QueryStatus string, never
// an HTTP code. An undeterminable status FAILS CLOSED to request-failed rather
// than claiming "published": docs/build-decisions.md#live-page-state-http-status.
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

/** HTTP status from a resolved `client.query` result: the hey-api envelope the
 * XMC module returns sits at `res.data`; the QueryResult itself is checked only
 * as a fallback for hosts that surface a numeric status one level up. */
function httpStatusOf(res: unknown): number | undefined {
  const envelope = (res as { data?: unknown } | undefined)?.data;
  return statusOf(envelope) ?? statusOf(res);
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
    const status = httpStatusOf(res);
    if (status === 404) return { ok: true, live: false };
    if (status !== undefined) {
      if (status >= 400) {
        console.error("getLivePageState: non-404 error status", { itemId: params.itemId, status });
        return { ok: false, reason: "request-failed" };
      }
      return { ok: true, live: true };
    }

    // No HTTP status anywhere in the envelope. A missing status is NOT evidence
    // of a live page — the only positive signal left is an actual payload with
    // no error beside it; anything else fails closed to request-failed, which
    // resolveLiveState renders as `could-not-check`, never as "published".
    const queryErrored = (res as { isError?: boolean; error?: unknown }).isError === true
      || (res as { error?: unknown }).error !== undefined;
    const envelope = (res as { data?: { data?: unknown; error?: unknown } }).data;
    if (!queryErrored && envelope?.error === undefined && envelope?.data !== undefined) {
      return { ok: true, live: true };
    }
    console.error("getLivePageState: no HTTP status in the response envelope", { itemId: params.itemId });
    return { ok: false, reason: "request-failed" };
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
