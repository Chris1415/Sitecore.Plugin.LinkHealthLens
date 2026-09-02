"use client";

// T038 — the origin affordance (FR-15 / AC-7.2 / AC-7.3 / AC-7.5). Amended
// 2026-09-02 (ADR-0010 amendment, docs/build-decisions.md § OriginAffordance
// owner/navigate split): the OWNER LABEL and the NAVIGATE control are two
// independent signals, not one three-way switch. `chrome` origin still
// renders only the fixed chrome string (ADR-0006 — unchanged, no control).
// For `content` origin: the owner label always renders as TEXT — the
// attributed field path, or the "field not identified" fallback — and is
// never itself a navigation target (it names *where the link lives*, per
// ADR-0010). The JumpAction button renders independently, gated ONLY on
// whether TR-4 resolved the link to a real target PAGE (`targetItemId`) —
// never on whether attribution succeeded, since a resolved page is useful
// ("this points at an unpublished page — go look") even when its owning
// rendering could not be determined.
import { FileSearch, LayoutTemplate } from "lucide-react";
import type { LinkFinding } from "@/lib/model/types";
import { ORIGIN_CHROME_LABEL, ORIGIN_UNATTRIBUTED_LABEL } from "@/lib/panel/copy";
import { JumpAction } from "./JumpAction";

export function OriginAffordance({ finding }: { finding: LinkFinding }) {
  if (finding.origin === "chrome") {
    return (
      <div className="lhl-origin">
        <LayoutTemplate className="lhl-i" width={14} height={14} aria-hidden="true" />
        <span className="lhl-label">{ORIGIN_CHROME_LABEL}</span>
      </div>
    );
  }

  const ownerLabel = finding.attribution?.fieldPath ?? null;

  return (
    <div className="lhl-origin">
      <FileSearch className="lhl-i" width={14} height={14} aria-hidden="true" />
      <span className="lhl-label">{ownerLabel ?? ORIGIN_UNATTRIBUTED_LABEL}</span>
      {finding.targetItemId && (
        <JumpAction targetItemId={finding.targetItemId} targetLabel={finding.targetLabel} />
      )}
    </div>
  );
}
