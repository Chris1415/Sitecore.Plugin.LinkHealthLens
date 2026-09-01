// T006 throwaway probe harness — evidence for OQ (d)/(g), deleted at T008 close
// (docs/build-decisions.md). Every entry is wrapped so one failed surface never
// aborts the rest (rule 88: a check that cannot fail is worse than no check —
// here inverted: a harness that can only succeed answers nothing).
import type { ApplicationContext, ClientSDK } from "@sitecore-marketplace-sdk/client";

export type ProbeOutcome<T = unknown> =
  | { ok: true; value: T }
  | { ok: false; error: string };

async function safely<T>(fn: () => Promise<T> | T): Promise<ProbeOutcome<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
  }
}

export const SDK_VERSIONS = {
  "@sitecore-marketplace-sdk/client": "0.3.6",
  "@sitecore-marketplace-sdk/xmc": "0.4.2",
} as const;

// Declared at COMPILE TIME from client/dist/sdk-types.d.ts. This is a type-level
// list, not a runtime enumeration — a key present at runtime but absent here
// would itself change the answer to (g), which is why runtimeModules below
// probes the client object directly rather than trusting this list.
export const DECLARED_KEYS = {
  query: [
    "host.user",
    "host.state",
    "pages.context",
    "application.context",
    "site.context",
    "host.route",
  ],
  mutate: ["pages.reloadCanvas", "pages.context"],
  subscribe: ["pages.content.layoutUpdated", "pages.content.fieldsUpdated"],
} as const;

export type OneShotResults = Record<string, ProbeOutcome>;

/** One-shot probes only — the live subscription log is owned by the page component. */
export async function runOneShotProbes(
  client: ClientSDK,
  appContext: ApplicationContext | null,
): Promise<OneShotResults> {
  const results: OneShotResults = {};

  results.applicationContextDump = await safely(() => appContext);

  results.runtimeIntrospection = await safely(() => {
    // availableModules/hasModule are declared `private` in client.d.ts but exist
    // on the compiled instance — probing them is the only way to see the
    // runtime module registry rather than the declared QueryMap/MutationMap keys.
    const anyClient = client as unknown as {
      availableModules?: () => string[];
      hasModule?: (namespace: string) => boolean;
    };
    return {
      availableModules:
        typeof anyClient.availableModules === "function"
          ? anyClient.availableModules()
          : "availableModules() not reachable on this instance",
      hasXmcModule:
        typeof anyClient.hasModule === "function"
          ? anyClient.hasModule("xmc")
          : "hasModule() not reachable on this instance",
    };
  });

  results.pagesContextQueryOnce = await safely(() => client.query("pages.context"));

  // client.getValue() calls the undeclared 'pages.getValue' operation (client.d.ts).
  // It is documented for Custom Fields, not the context panel — captured anyway
  // because it is exactly the kind of undeclared surface (g) asks about. Read-only.
  results.getValueProbe = await safely(() => client.getValue());

  const currentItemId = extractItemId(results.pagesContextQueryOnce);
  results.mutatePagesContextAttempt = currentItemId
    ? await safely(() => client.mutate("pages.context", { params: { itemId: currentItemId } }))
    : { ok: false, error: "skipped — no pageInfo.id available from pages.context to re-navigate to" };

  return results;
}

function extractItemId(outcome: ProbeOutcome): string | undefined {
  if (!outcome.ok) return undefined;
  const data = (outcome.value as { data?: { pageInfo?: { id?: string } } } | undefined)?.data;
  return data?.pageInfo?.id;
}
