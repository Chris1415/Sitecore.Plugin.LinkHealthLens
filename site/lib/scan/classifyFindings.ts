// TR-3 orchestrator — composes the scope + string-check + reachability-note +
// in-page-anchor classifiers over a scan's findings. TR-4/TR-5 amend the
// pipeline in place as resolution and origin land; this is the one seam
// `usePageScan` calls so each pure check stays independently testable.
import type { LinkFinding } from "@/lib/model/types";
import { classifyScope } from "./classifyScope";
import { isInsecureScheme, isMalformed } from "./stringChecks";
import { attachReachabilityNote } from "./reachabilityNote";
import { checkInPageAnchor } from "./anchorCheck";

export function classifyFindings(findings: LinkFinding[], html: string): LinkFinding[] {
  return findings.map((finding) => {
    const scope = classifyScope(finding.href);
    const statuses = new Set(finding.statuses);

    if (isInsecureScheme(finding.href)) statuses.add("insecure-scheme");
    if (isMalformed(finding.href)) statuses.add("malformed");
    if (checkInPageAnchor(finding.href, html)) statuses.add("missing-anchor");
    attachReachabilityNote(scope, statuses);

    return { ...finding, scope, statuses };
  });
}
