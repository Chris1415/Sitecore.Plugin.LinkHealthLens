"use client";

// T038 — the three-way origin affordance (FR-15 / AC-7.2 / AC-7.3 / AC-7.5).
// Exactly one of three per row, mutually exclusive by construction (a single
// `return`, never a class-toggle over all three markups): (1) content +
// attributed -> JumpAction (T037); (2) content + unattributed -> the fixed
// "field not identified" string; (3) chrome -> the fixed "site chrome"
// string. The two label strings are exported constants (lib/panel/copy.ts)
// so a "fixed string" cannot quietly diverge between this file and its test.
// Applying the chrome string to a content link is an automatic Critical
// (§ 4c-1) — the branch on `finding.origin` below is what makes that
// impossible to get backwards.
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

  if (!finding.attribution) {
    return (
      <div className="lhl-origin">
        <FileSearch className="lhl-i" width={14} height={14} aria-hidden="true" />
        <span className="lhl-label">{ORIGIN_UNATTRIBUTED_LABEL}</span>
      </div>
    );
  }

  return <JumpAction attribution={finding.attribution} />;
}
