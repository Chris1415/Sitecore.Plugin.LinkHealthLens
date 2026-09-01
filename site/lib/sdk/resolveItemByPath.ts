// T028 — call 1 of ADR-0009: resolve a site-relative path to a CM item via
// Authoring GraphQL. `xmc.authoring.graphql` is declared under MutationMap
// (node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/
// augmentation.gen.d.ts) even though the body is a read-only GraphQL `query`
// — the SDK verb name reflects the transport, not the tenant effect; ADR-0009
// itself names this call sanctioned and Mode A/ADR-0002-compliant.
//
// Envelope shape (marketplace-sdk-xmc skill § 6c, the "Component Usage Atlas
// burned a week" trap): body lives INSIDE params, never at the top level, and
// the response DOUBLE-unwraps (result.data.data) — both differ from the REST
// mutations elsewhere in this app.
//
// Context: Authoring reads the CM working tree, the same class of call as
// pagesGetPageHtml — `.preview`, not `.live` (matches usePageScan's existing
// choice; `.live` is reserved for the genuine Edge/Delivery read in
// checkLiveViaEdge.ts).
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";

const QUERY = `
  query LinkHealthLensResolveTarget($path: String!, $language: String!) {
    item(where: { path: $path, language: $language }) {
      itemId(format: D)
      name
    }
  }
`;

export type ResolveItemByPathResult =
  | { ok: true; found: true; itemId: string; name: string }
  | { ok: true; found: false }
  | { ok: false; reason: "no-context" | "request-failed" | "graphql-error" };

export async function resolveItemByPath(
  client: ClientSDK,
  params: { path: string; language: string; contextId: string | undefined },
): Promise<ResolveItemByPathResult> {
  if (!params.contextId) {
    console.error("resolveItemByPath: no sitecoreContextId available", { path: params.path });
    return { ok: false, reason: "no-context" };
  }

  try {
    const res = await client.mutate("xmc.authoring.graphql", {
      params: {
        query: { sitecoreContextId: params.contextId },
        body: { query: QUERY, variables: { path: params.path, language: params.language } },
      },
    });
    const root = (res.data as { data?: { item?: { itemId?: string; name?: string } | null; errors?: unknown[] } } | undefined)?.data;

    if (root?.errors?.length) {
      console.error("resolveItemByPath: GraphQL errors", { path: params.path, errors: root.errors });
      return { ok: false, reason: "graphql-error" };
    }
    if (!root || root.item === null || root.item === undefined) {
      return { ok: true, found: false };
    }
    if (typeof root.item.itemId !== "string" || typeof root.item.name !== "string") {
      console.error("resolveItemByPath: item present but missing itemId/name", { path: params.path });
      return { ok: false, reason: "graphql-error" };
    }
    return { ok: true, found: true, itemId: root.item.itemId, name: root.item.name };
  } catch (err) {
    console.error("resolveItemByPath: request threw", {
      path: params.path,
      message: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "request-failed" };
  }
}
