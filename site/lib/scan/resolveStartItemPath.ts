// Defect fix 2026-09-02: turns `siteInfo.startItemId` into the path
// site-relative hrefs actually resolve against (docs/build-decisions.md — the
// `rootPath` trap). A missing or unresolvable start item is never papered
// over with the site node's rootPath — that is the exact wrong base that
// produced 15 false not-found findings live — so this returns `undefined` and
// the caller degrades through the SAME "missing site root" loud path
// resolveInternalFindings already implements (could-not-check, never silent).
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { resolveItemPathById } from "@/lib/sdk/resolveItemPathById";

export async function resolveStartItemPath(
  client: ClientSDK,
  params: { startItemId: string | undefined; language: string; contextId: string | undefined },
): Promise<string | undefined> {
  if (!params.startItemId) return undefined;

  const result = await resolveItemPathById(client, {
    itemId: params.startItemId,
    language: params.language,
    contextId: params.contextId,
  });
  if (!result.ok || !result.found) return undefined;
  return result.path;
}
