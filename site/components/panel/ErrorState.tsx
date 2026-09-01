"use client";

// T013 — error state. Framed as a failure of THIS PANEL, never a verdict
// about the page or its links (rule: never say the page is broken). Frame:
// state-error.html.
import { FileText, RotateCw, SearchX } from "lucide-react";
import { PanelShell } from "@/components/panel/PanelShell";
import { ScopeStrip } from "@/components/panel/ScopeStrip";
import { ERROR_BODY, ERROR_FOOT, ERROR_RETRY, ERROR_TITLE, ERROR_VERDICT } from "@/lib/panel/copy";

export function ErrorState({
  pageName,
  onRetry,
}: {
  pageName?: string;
  /** Real retry (re-run the scan) is wired in TR-2 (T016); the control
   * exists now so the state's Expected Output is complete on its own. */
  onRetry?: () => void;
}) {
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
          <SearchX className="lhl-i" width={14} height={14} aria-hidden="true" />
          <span>{ERROR_VERDICT}</span>
        </div>
      }
      headExtra={<ScopeStrip noToggle />}
      scrollProps={{ role: "alert" }}
      foot={ERROR_FOOT}
    >
      <div className="lhl-state">
        <SearchX className="lhl-i" width={32} height={32} aria-hidden="true" />
        <h2>{ERROR_TITLE}</h2>
        <p>{ERROR_BODY}</p>
        <button type="button" className="lhl-retry" onClick={onRetry}>
          <RotateCw width={14} height={14} aria-hidden="true" />
          {ERROR_RETRY}
        </button>
      </div>
    </PanelShell>
  );
}
