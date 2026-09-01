"use client";

// T013 — loading state. Must never read as "clean": the skeleton is paired
// with an explicit "no result yet" label. Frame: state-loading.html.
import { FileText, RotateCw } from "lucide-react";
import { PanelShell } from "@/components/panel/PanelShell";
import { ScopeStrip } from "@/components/panel/ScopeStrip";
import { LOADING_FOOT, LOADING_LABEL, LOADING_SUBVERDICT, LOADING_VERDICT } from "@/lib/panel/copy";

const ROWS = [0, 1, 2, 3, 4, 5];

export function LoadingState({ pageName }: { pageName?: string }) {
  return (
    <PanelShell
      pageLabel={
        pageName ? (
          <div className="lhl-page">
            <FileText width={14} height={14} aria-hidden="true" />
            <span>{pageName}</span>
          </div>
        ) : null
      }
      verdict={
        <div className="lhl-verdict tone-clear">
          <RotateCw className="lhl-i" width={14} height={14} aria-hidden="true" />
          <span>{LOADING_VERDICT}</span>
        </div>
      }
      headExtra={
        <>
          <div className="lhl-subverdict">{LOADING_SUBVERDICT}</div>
          <ScopeStrip noToggle />
        </>
      }
      foot={LOADING_FOOT}
    >
      <div className="lhl-loading-label">
        <RotateCw width={14} height={14} aria-hidden="true" />
        {LOADING_LABEL}
      </div>
      {ROWS.map((i) => (
        <div className="lhl-sk-row" key={i}>
          <div className="lhl-sk" style={{ width: `${78 - i * 6}%` }} />
          <div className="lhl-sk" style={{ width: `${62 - i * 4}%`, height: 8 }} />
          <div className="lhl-sk" style={{ width: "44%", height: 14, borderRadius: 999 }} />
        </div>
      ))}
    </PanelShell>
  );
}
