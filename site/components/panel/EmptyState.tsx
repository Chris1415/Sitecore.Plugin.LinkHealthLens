"use client";

// T013 — no-links state (AC-1.4). A page with zero anchors gets an explicit
// empty state, never a blank panel. Frame: state-no-links.html.
import { CircleCheck, FileText, Link as LinkIcon } from "lucide-react";
import { PanelShell } from "@/components/panel/PanelShell";
import { ScopeStrip } from "@/components/panel/ScopeStrip";
import { NO_LINKS_BODY, NO_LINKS_TITLE } from "@/lib/panel/copy";

export function EmptyState({ pageName }: { pageName?: string }) {
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
          <CircleCheck className="lhl-i" width={14} height={14} aria-hidden="true" />
          <span>{NO_LINKS_TITLE}</span>
        </div>
      }
      headExtra={<ScopeStrip />}
      foot="0 links on this page · recomputed on every page selection · nothing is stored"
    >
      <div className="lhl-state">
        <LinkIcon className="lhl-i" width={32} height={32} aria-hidden="true" />
        <h2>{NO_LINKS_TITLE}</h2>
        <p>{NO_LINKS_BODY}</p>
      </div>
    </PanelShell>
  );
}
