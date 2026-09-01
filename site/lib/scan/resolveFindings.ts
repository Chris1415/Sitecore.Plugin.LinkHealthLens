// T029/T031/T032/T033 — the TR-4 orchestrator `usePageScan` calls. Wires
// resolveInternal (call 1) and resolveLiveState (call 2) over every
// internal-scope finding, de-duplicated by resolved path (ADR-0009 addendum:
// one dedup level, by path, before either call — 57 anchors measured down to
// 20 distinct on the real captured page). Never blanks the panel on a
// resolution failure (NFR-2): a systemic failure marks the health flag and
// every affected finding `could-not-check`; a partial failure marks only the
// findings it actually touched.
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import type { LinkFinding, StatusMember } from "@/lib/model/types";
import { mapWithConcurrency } from "./concurrency";
import { normalizeInternalTarget } from "./normalizeInternalTarget";
import { resolveInternal } from "./resolveInternal";
import { resolveLiveState } from "./resolveLiveState";
import { logScanTiming, nowMs } from "./timing";

const CONCURRENCY_LIMIT = 6;

export interface ResolveFindingsContext {
  siteRootPath: string | undefined;
  language: string;
  client: ClientSDK;
  authoringContextId: string | undefined; // .preview — Authoring reads the CM working tree
  liveContextId: string | undefined; // .live — the one genuine Edge/Delivery read in this app
  pageName?: string;
}

export interface ResolveFindingsOutcome {
  findings: LinkFinding[];
  health: { resolution: boolean; liveState: boolean };
}

interface PathOutcome {
  statuses: StatusMember[];
  targetLabel: string | null;
}

export async function resolveInternalFindings(
  findings: LinkFinding[],
  ctx: ResolveFindingsContext,
): Promise<ResolveFindingsOutcome> {
  const start = nowMs();

  // De-dup by resolved path (ADR-0009 addendum) — group every internal
  // finding under the ONE path key it normalizes to.
  const pathToFindings = new Map<string, LinkFinding[]>();
  for (const finding of findings) {
    if (finding.scope !== "internal") continue;
    const path = normalizeInternalTarget(finding.href, ctx.siteRootPath);
    if (path === null) continue; // excluded — no lookup (fragment-only, media, no site root)
    const bucket = pathToFindings.get(path);
    if (bucket) bucket.push(finding);
    else pathToFindings.set(path, [finding]);
  }

  const uniquePaths = Array.from(pathToFindings.keys());
  const outcomes = new Map<string, PathOutcome>();
  let resolutionFailures = 0;
  let liveChecksAttempted = 0;
  let liveCheckFailures = 0;

  await mapWithConcurrency(uniquePaths, CONCURRENCY_LIMIT, async (path) => {
    const representative = pathToFindings.get(path)![0].href;
    const call1 = await resolveInternal(ctx.client, representative, {
      siteRootPath: ctx.siteRootPath,
      language: ctx.language,
      contextId: ctx.authoringContextId,
    });

    if (call1.status === "not-found") {
      outcomes.set(path, { statuses: ["not-found"], targetLabel: null });
      return;
    }
    if (call1.status === "could-not-check") {
      resolutionFailures++;
      outcomes.set(path, { statuses: ["could-not-check"], targetLabel: null });
      return;
    }
    // "excluded" cannot occur here — the grouping step above already filtered it.
    if (call1.status !== "found") return;

    liveChecksAttempted++;
    const verdict = await resolveLiveState(ctx.client, {
      path: call1.path,
      itemId: call1.itemId,
      language: ctx.language,
      liveContextId: ctx.liveContextId,
      previewContextId: ctx.authoringContextId,
    });

    if (verdict === "could-not-check") liveCheckFailures++;
    const statuses: StatusMember[] = verdict === "published" ? [] : [verdict];
    outcomes.set(path, { statuses, targetLabel: call1.name });
  });

  const resolvedFindings = findings.map((finding) => {
    if (finding.scope !== "internal") return finding;
    const path = normalizeInternalTarget(finding.href, ctx.siteRootPath);
    if (path === null) return finding;
    const outcome = outcomes.get(path);
    if (!outcome) return finding;
    const statuses = new Set(finding.statuses);
    for (const member of outcome.statuses) statuses.add(member);
    return { ...finding, statuses, targetLabel: outcome.targetLabel };
  });

  const health = {
    // A systemic failure — every attempted lookup failed — degrades the flag
    // without blanking the panel (NFR-2); a partial failure leaves it true so
    // T032's "other checks still render" contract holds at this layer too.
    resolution: uniquePaths.length === 0 || resolutionFailures < uniquePaths.length,
    liveState: liveChecksAttempted === 0 || liveCheckFailures < liveChecksAttempted,
  };

  if (ctx.pageName) {
    logScanTiming(ctx.pageName, findings.length, nowMs() - start);
  }

  return { findings: resolvedFindings, health };
}
