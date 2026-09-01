// Typed ClientSDK stub for unit tests — no mock-portal path exists (Mode A),
// so this is what lets scan/panel logic be tested without a real iframe.
// Pattern: marketplace-sdk-client skill § 9 / references/vitest-stubs.md.
import { vi, type Mock } from "vitest";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";

type QueryFn = ClientSDK["query"];
type MutateFn = ClientSDK["mutate"];
type SubscribeFn = ClientSDK["subscribe"];
type DestroyFn = ClientSDK["destroy"];

export function createStubClient() {
  const query: Mock<QueryFn> = vi.fn<QueryFn>();
  const mutate: Mock<MutateFn> = vi.fn<MutateFn>();
  const subscribe: Mock<SubscribeFn> = vi.fn<SubscribeFn>();
  const destroy: Mock<DestroyFn> = vi.fn<DestroyFn>();

  const stubClient = { query, mutate, subscribe, destroy } as unknown as ClientSDK;

  return { stubClient, query, mutate, subscribe, destroy };
}
