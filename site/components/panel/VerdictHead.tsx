"use client";

// T042 — verdict sentence, sub-line and worst-first count rail (UI spec §
// 3.2). Counts are derived from findings on every render
// (lib/panel/verdict.ts), never stored. Split into two pieces so a caller
// can place them exactly like the POC (panel.js § renderHead): the
// SENTENCE + sub-line sit inside the `aria-live="polite"` region, the RAIL
// sits outside it (a re-announced rail on every scan would be noisy) —
// `VerdictHead` below composes both for callers (and tests) that don't need
// the split.
import { CircleAlert, CircleCheck, EyeOff, LockOpen, TriangleAlert } from "lucide-react";
import type { LinkFinding } from "@/lib/model/types";
import { type GroupCounts, computeCounts, computeVerdict } from "@/lib/panel/verdict";

const TONE_ICON = { act: CircleAlert, check: TriangleAlert, clear: CircleCheck } as const;

export function VerdictSentence({ counts }: { counts: GroupCounts }) {
  const verdict = computeVerdict(counts);
  const Icon = TONE_ICON[verdict.tone];
  return (
    <>
      <div className={`lhl-verdict tone-${verdict.tone}`}>
        <Icon className="lhl-i" width={14} height={14} aria-hidden="true" />
        <span>{verdict.sentence}</span>
      </div>
      {verdict.subline && <div className="lhl-subverdict">{verdict.subline}</div>}
    </>
  );
}

export function CountRail({ counts }: { counts: GroupCounts }) {
  if (counts.total === 0) return null;
  return (
    <div className="lhl-rail">
      {counts.act > 0 && (
        <a className="lhl-count tone-act" href="#group-not-found">
          <CircleAlert className="lhl-i" width={14} height={14} aria-hidden="true" />
          <b>{counts.act}</b> act now
        </a>
      )}
      {counts.check > 0 && (
        <a className="lhl-count tone-check" href="#group-unpublished">
          <TriangleAlert className="lhl-i" width={14} height={14} aria-hidden="true" />
          <b>{counts.check}</b> to check
        </a>
      )}
      {counts.note > 0 && (
        <a className="lhl-count tone-note" href="#group-insecure">
          <LockOpen className="lhl-i" width={14} height={14} aria-hidden="true" />
          <b>{counts.note}</b> noted
        </a>
      )}
      {counts.external > 0 && (
        <a className="lhl-count tone-note" href="#group-external">
          <EyeOff className="lhl-i" width={14} height={14} aria-hidden="true" />
          <b>{counts.external}</b> external
        </a>
      )}
    </div>
  );
}

/** Convenience composition of both pieces, for callers/tests that don't
 * need the aria-live split (the exact scenario Panel.tsx cares about). */
export function VerdictHead({ findings }: { findings: LinkFinding[] }) {
  const counts = computeCounts(findings);
  return (
    <>
      <VerdictSentence counts={counts} />
      <CountRail counts={counts} />
    </>
  );
}
