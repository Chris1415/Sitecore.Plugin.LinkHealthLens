"use client";

// T041–T045 — the composed, ready-state panel. Assembles PanelShell (T012)
// with VerdictHead (T042) in the verdict/headExtra slots, the permanent
// ScopeStrip (T043 — present in every state, disclosure live here since
// there IS a result to qualify against), and GroupList (T041/T045) as the
// scrollable body. This is the component `app/pages-context/page.tsx`
// renders once a scan is `ready`; the non-result states (loading/error/
// empty) each own their own composition already (TR-1).
import { FileText } from "lucide-react";
import type { PageScan } from "@/lib/model/types";
import { computeCounts } from "@/lib/panel/verdict";
import { PanelShell } from "./PanelShell";
import { ScopeStrip } from "./ScopeStrip";
import { CountRail, VerdictSentence } from "./VerdictHead";
import { GroupList } from "./GroupList";

export function Panel({ scan }: { scan: PageScan }) {
  const counts = computeCounts(scan.findings);

  return (
    <PanelShell
      pageLabel={
        <div className="lhl-page">
          <FileText width={14} height={14} aria-hidden="true" />
          <span>{scan.page.name}</span>
        </div>
      }
      // Sentence + sub-line only, inside PanelShell's aria-live region
      // (panel.js § renderHead) — the rail sits outside it, below.
      verdict={<VerdictSentence counts={counts} />}
      headExtra={
        <>
          <CountRail counts={counts} />
          <ScopeStrip />
        </>
      }
      foot={`${scan.findings.length} links on this page · recomputed on every page selection · nothing is stored`}
    >
      <GroupList findings={scan.findings} />
    </PanelShell>
  );
}
