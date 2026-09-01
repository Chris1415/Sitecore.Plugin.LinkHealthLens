// T030 — call 2 of ADR-0008/0009. Tries the live-Edge lead first (decisive:
// present ⇒ published, absent ⇒ unpublished — probe (b) addendum); falls
// back to getLivePageState's ambiguous 404 only when the lead itself could
// not be reached. AC-3.3 fires only on that fallback path — the lead being
// decisive is exactly what makes the merged label avoidable when it works.
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { checkLiveViaEdge } from "@/lib/sdk/checkLiveViaEdge";
import { getLivePageState } from "@/lib/sdk/getLivePageState";

export type LiveResolutionVerdict = "published" | "unpublished" | "not-found-or-unpublished" | "could-not-check";

export async function resolveLiveState(
  client: ClientSDK,
  params: { path: string; itemId: string; language: string; liveContextId: string | undefined; previewContextId: string | undefined },
): Promise<LiveResolutionVerdict> {
  const lead = await checkLiveViaEdge(client, {
    path: params.path,
    language: params.language,
    contextId: params.liveContextId,
  });
  if (lead.ok) {
    return lead.exists ? "published" : "unpublished";
  }

  const fallback = await getLivePageState(client, {
    itemId: params.itemId,
    language: params.language,
    contextId: params.previewContextId,
  });
  if (!fallback.ok) return "could-not-check";
  // The fallback's 404 cannot distinguish "not live" from "wrong params"
  // (probe (b)) — the merged label is the honest output, not "unpublished".
  return fallback.live ? "published" : "not-found-or-unpublished";
}
