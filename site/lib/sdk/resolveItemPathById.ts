// Defect fix 2026-09-02: resolves the site's START ITEM (siteInfo.startItemId)
// to its content-tree path — one Authoring GraphQL call, reused for every
// finding in a scan. `siteInfo.properties.rootPath` is the SITE NODE, not the
// routable tree (its children are Home/Media/Data/Dictionary/Presentation/
// Settings); site-relative hrefs resolve against the START ITEM, which is a
// child of that node and can be named anything — never hard-code `/Home`
// (docs/build-decisions.md). Same envelope shape as resolveItemByPath.ts
// (marketplace-sdk-xmc skill § 6c: body inside params, double-unwrap).
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { unwrapGraphqlResponse } from "./graphqlEnvelope";

const QUERY = `
  query LinkHealthLensResolveStartItemPath($itemId: ID!, $language: String!) {
    item(where: { itemId: $itemId, language: $language }) {
      path
    }
  }
`;

export type ResolveItemPathByIdResult =
  | { ok: true; found: true; path: string }
  | { ok: true; found: false }
  | { ok: false; reason: "no-context" | "request-failed" | "graphql-error" };

export async function resolveItemPathById(
  client: ClientSDK,
  params: { itemId: string; language: string; contextId: string | undefined },
): Promise<ResolveItemPathByIdResult> {
  if (!params.contextId) {
    console.error("resolveItemPathById: no sitecoreContextId available", { itemId: params.itemId });
    return { ok: false, reason: "no-context" };
  }

  try {
    const res = await client.mutate("xmc.authoring.graphql", {
      params: {
        query: { sitecoreContextId: params.contextId },
        body: { query: QUERY, variables: { itemId: params.itemId, language: params.language } },
      },
    });
    const { hasBody, data: root, errors } = unwrapGraphqlResponse<{ item?: { path?: string } | null }>(res);

    if (errors.length) {
      console.error("resolveItemPathById: GraphQL errors", { itemId: params.itemId, errors });
      return { ok: false, reason: "graphql-error" };
    }
    if (!hasBody || !root) {
      console.error("resolveItemPathById: no GraphQL data in response", { itemId: params.itemId });
      return { ok: false, reason: "graphql-error" };
    }
    if (root.item === null || root.item === undefined) {
      return { ok: true, found: false };
    }
    if (typeof root.item.path !== "string") {
      console.error("resolveItemPathById: item present but missing path", { itemId: params.itemId });
      return { ok: false, reason: "graphql-error" };
    }
    return { ok: true, found: true, path: root.item.path };
  } catch (err) {
    console.error("resolveItemPathById: request threw", {
      itemId: params.itemId,
      message: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "request-failed" };
  }
}
