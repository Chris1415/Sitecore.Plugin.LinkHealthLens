"use client";

// T040 — a chrome-only page renders zero jump/owner-and-open affordances and
// says so on its sub-line. Scoped to the ALL-chrome case only (see
// lib/panel/copy.ts's CHROME_ONLY_SUBLINE note) — the general verdict/
// sub-line composition (partial chrome, act/check/note counts) is T042's
// contract (TR-6), which this component does not attempt to preempt.
import type { LinkFinding } from "@/lib/model/types";
import { CHROME_ONLY_SUBLINE } from "@/lib/panel/copy";
import { OriginAffordance } from "./OriginAffordance";

export function isChromeOnly(findings: LinkFinding[]): boolean {
  return findings.length > 0 && findings.every((f) => f.origin === "chrome");
}

export function ChromeOnly({ findings }: { findings: LinkFinding[] }) {
  if (!isChromeOnly(findings)) return null;

  return (
    <div className="lhl-chrome-only">
      <p className="lhl-gsub">{CHROME_ONLY_SUBLINE}</p>
      <ul className="lhl-rows">
        {findings.map((finding) => (
          <li className="lhl-row" key={`${finding.ordinal}-${finding.href}`}>
            <OriginAffordance finding={finding} />
          </li>
        ))}
      </ul>
    </div>
  );
}
