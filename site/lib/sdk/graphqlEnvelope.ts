// Shared unwrap for the three XMC GraphQL passthroughs. `errors` is a SIBLING
// of `data` inside the GraphQL response body, not a member of it — see
// docs/build-decisions.md#graphql-errors-depth.
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";

export interface GraphqlUnwrapped<T> {
  /** The SDK returned a recognisable GraphQL response body. */
  hasBody: boolean;
  /** The GraphQL `data` payload — `undefined` when absent or errored. */
  data: T | undefined;
  errors: unknown[];
}

type MutateResult = Awaited<ReturnType<ClientSDK["mutate"]>>;

export function unwrapGraphqlResponse<T>(res: MutateResult): GraphqlUnwrapped<T> {
  const body = (res as { data?: { data?: unknown; errors?: unknown[] } } | undefined)?.data;
  if (!body || typeof body !== "object") {
    return { hasBody: false, data: undefined, errors: [] };
  }
  return {
    hasBody: true,
    data: (body.data as T | undefined) ?? undefined,
    errors: Array.isArray(body.errors) ? body.errors : [],
  };
}
