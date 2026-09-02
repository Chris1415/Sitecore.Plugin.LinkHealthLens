// TR-3/TR-5 orchestrator — composes the scope + string-check +
// reachability-note + in-page-anchor + structural-origin + attribution
// classifiers over a scan's findings. TR-4's CM resolution runs separately
// (resolveFindings.ts, after this) since it is async and network-bound; this
// seam stays synchronous and pure so every check remains independently
// testable and `usePageScan` has one call site per phase.
import type { LinkFinding } from "@/lib/model/types";
import { classifyScope } from "./classifyScope";
import { isInsecureScheme, isMalformed } from "./stringChecks";
import { attachReachabilityNote } from "./reachabilityNote";
import { checkInPageAnchorIn } from "./anchorCheck";
import { classifyOriginIn } from "./classifyOrigin";
import { attributeIn, parsePresentationDetails } from "./attribute";

export function classifyFindings(
  findings: LinkFinding[],
  html: string,
  presentationDetails?: string,
): LinkFinding[] {
  // The page HTML and the presentation-details JSON are parsed ONCE per scan,
  // not once (twice, in fact) per anchor — a 150-anchor page was doing ~300
  // full DOMParser passes over the whole document against a 6s budget.
  // docs/build-decisions.md#parse-the-page-once-per-scan
  const doc = new DOMParser().parseFromString(html, "text/html");
  const renderings = parsePresentationDetails(presentationDetails);

  return findings.map((finding) => {
    const scope = classifyScope(finding.href);
    const statuses = new Set(finding.statuses);

    if (isInsecureScheme(finding.href)) statuses.add("insecure-scheme");
    if (isMalformed(finding.href)) statuses.add("malformed");
    if (checkInPageAnchorIn(doc, finding.href)) statuses.add("missing-anchor");
    attachReachabilityNote(scope, statuses);

    // T035: structural origin, decided from the landmark alone — computed
    // here, BEFORE attribution runs on the next line, so an attribution
    // failure can never reach back and change it (ADR-0006).
    const origin = classifyOriginIn(doc, finding.ordinal);
    // T036: best-effort, content-origin only — a chrome link never attempts
    // attribution (T038 renders its fixed label unconditionally).
    const attribution = origin === "content" ? attributeIn(doc, finding.ordinal, renderings) : null;

    return { ...finding, scope, statuses, origin, attribution };
  });
}
