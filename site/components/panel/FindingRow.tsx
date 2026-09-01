"use client";

// T044 — row anatomy (UI spec § 3.4). Four stacked lines inside a 3px
// severity rail (`.lhl-row.tone-*`, panel.css): link text + ordinal · the
// href (start-truncated by CSS, NFR-4 — never re-sliced in JS) · the chip
// strip (StatusChips) · the headline detail sentence · the origin
// affordance. `(empty href)` is shown for a genuinely empty href — distinct
// from the `(no href)` seed value T017 already produces for a missing
// attribute, which reads fine as-is.
import type { LinkFinding } from "@/lib/model/types";
import { headlineOf } from "@/lib/model/precedence";
import { STATUS_DETAIL } from "@/lib/panel/copy";
import { StatusChips } from "./StatusChips";
import { OriginAffordance } from "./OriginAffordance";

const TONE_BY_MEMBER: Record<string, "act" | "check" | "note" | "clear"> = {
  "not-found": "act",
  "not-found-or-unpublished": "act",
  unpublished: "check",
  malformed: "check",
  "missing-anchor": "check",
  "insecure-scheme": "note",
  "could-not-check": "note",
  ok: "clear",
};

function detailFor(finding: LinkFinding): string | null {
  const head = headlineOf(finding.statuses);
  if (head === "ok") {
    // Ported from panel.js § renderRow: an `ok` headline with the standing
    // note attached still gets an explanatory line; a bare `ok` gets none.
    return finding.statuses.has("reachability-not-checked")
      ? STATUS_DETAIL["reachability-not-checked"]
      : null;
  }
  return STATUS_DETAIL[head as keyof typeof STATUS_DETAIL] ?? null;
}

export function FindingRow({ finding }: { finding: LinkFinding }) {
  const head = headlineOf(finding.statuses);
  const tone = TONE_BY_MEMBER[head] ?? "clear";
  const detail = detailFor(finding);
  const displayHref = finding.href === "" ? "(empty href)" : finding.href;

  return (
    <li className={`lhl-row tone-${tone}`}>
      <div className="lhl-text">
        {finding.text} <em>#{finding.ordinal}</em>
      </div>
      <div className="lhl-href" title={finding.href}>
        {displayHref}
      </div>
      <StatusChips statuses={finding.statuses} />
      {detail !== null && <div className="lhl-detail">{detail}</div>}
      <OriginAffordance finding={finding} />
    </li>
  );
}
