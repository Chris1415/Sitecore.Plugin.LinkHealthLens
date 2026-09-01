// T028 — resolve an internal href to a CM item (call 1 of ADR-0009). No
// result ⇒ not-found, terminal, no call 2. `hasPresentation` is not on this
// query at all — the rejected shortcut (inferring publish state from it) is
// prevented structurally, not by a runtime check, since it was never fetched.
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { resolveItemByPath } from "@/lib/sdk/resolveItemByPath";
import { normalizeInternalTarget } from "./normalizeInternalTarget";

export type ResolveInternalResult =
  | { status: "excluded" } // fragment-only, media path, or no site root — no lookup made
  | { status: "not-found" }
  | { status: "found"; path: string; itemId: string; name: string }
  | { status: "could-not-check" };

export async function resolveInternal(
  client: ClientSDK,
  href: string,
  ctx: { siteRootPath: string | undefined; language: string; contextId: string | undefined },
): Promise<ResolveInternalResult> {
  const path = normalizeInternalTarget(href, ctx.siteRootPath);
  if (path === null) return { status: "excluded" };

  const result = await resolveItemByPath(client, { path, language: ctx.language, contextId: ctx.contextId });
  if (!result.ok) return { status: "could-not-check" };
  if (!result.found) return { status: "not-found" };
  return { status: "found", path, itemId: result.itemId, name: result.name };
}
