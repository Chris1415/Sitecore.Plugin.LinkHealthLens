// T018 — the § 12a T1 exit evidence: every anchor of the page, listed once,
// unclassified. Reuses the POC's row/text/href geometry (`.lhl-rows`,
// `.lhl-row`, `.lhl-text`, `.lhl-href`, ported at T011) minus the chips/
// detail/origin anatomy TR-3..TR-6 add — those tranches replace this
// component's body, not its markup contract (`.lhl-href` start-truncates via
// CSS; never re-slice the string in JS, per NFR-4).
import type { LinkFinding } from "@/lib/model/types";

export function RawAnchorList({ findings }: { findings: LinkFinding[] }) {
  return (
    <ul className="lhl-rows">
      {findings.map((f) => (
        <li className="lhl-row" key={`${f.ordinal}-${f.href}`}>
          <div className="lhl-text">
            {f.text} <em>#{f.ordinal}</em>
          </div>
          <div className="lhl-href" title={f.href}>
            {f.href}
          </div>
        </li>
      ))}
    </ul>
  );
}
