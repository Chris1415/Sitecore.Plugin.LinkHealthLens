// T030 — the lead named in the T0 addendum: query the LIVE Edge for the
// resolved path. Present ⇒ published; absent ⇒ unpublished — unambiguous,
// unlike getLivePageState's 404 (probe (b)). `xmc.live.graphql` is a declared
// SDK key (MutationMap, same GraphQL-passthrough envelope as authoring —
// body INSIDE params, double unwrap). Context is `.live`: this is the one
// call in this app that genuinely reads the Delivery/Edge surface.
//
// Existence via Authoring (call 1) already confirmed the item is real, so a
// MISS here on the same path can only mean "not published to live" — not
// "wrong path". That is what makes this lead decisive where the REST
// fallback is not.
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { unwrapGraphqlResponse } from "./graphqlEnvelope";

const QUERY = `
  query LinkHealthLensLiveCheck($path: String!, $language: String!) {
    item(path: $path, language: $language) { id }
  }
`;

export type CheckLiveViaEdgeResult =
  | { ok: true; exists: boolean }
  | { ok: false; reason: "no-context" | "request-failed" | "graphql-error" };

export async function checkLiveViaEdge(
  client: ClientSDK,
  params: { path: string; language: string; contextId: string | undefined },
): Promise<CheckLiveViaEdgeResult> {
  if (!params.contextId) {
    return { ok: false, reason: "no-context" };
  }

  try {
    const res = await client.mutate("xmc.live.graphql", {
      params: {
        query: { sitecoreContextId: params.contextId },
        body: { query: QUERY, variables: { path: params.path, language: params.language } },
      },
    });
    const { hasBody, data: root, errors } = unwrapGraphqlResponse<{ item?: { id?: string } | null }>(res);

    if (errors.length) {
      console.error("checkLiveViaEdge: GraphQL errors", { path: params.path, errors });
      return { ok: false, reason: "graphql-error" };
    }
    if (!hasBody || !root) {
      return { ok: false, reason: "graphql-error" };
    }
    return { ok: true, exists: root.item !== null && root.item !== undefined };
  } catch {
    // Untested in-app per probe (b) ("two out-of-band endpoint forms rejected
    // the raw context id") — a transport failure here is expected to be live,
    // not exceptional, which is exactly why resolveLiveState falls back
    // rather than surfacing this as could-not-check directly.
    return { ok: false, reason: "request-failed" };
  }
}
