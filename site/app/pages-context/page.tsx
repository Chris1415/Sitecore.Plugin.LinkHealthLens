"use client";

// The ONE extension route (ADR-0004): xmc:pages:contextpanel.
// TR-2 (T015-T018): wires the pages.context subscription + page-HTML fetch +
// anchor extraction to the three TR-1 states plus a raw, unclassified list —
// this is the § 12a T1 exit evidence. Classification (chips/verdict/rail/
// grouping) is TR-3..TR-6; until then the verdict line is honestly provisional.
import "@/app/panel.css";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/panel/EmptyState";
import { ErrorState } from "@/components/panel/ErrorState";
import { LoadingState } from "@/components/panel/LoadingState";
import { PanelShell } from "@/components/panel/PanelShell";
import { RawAnchorList } from "@/components/panel/RawAnchorList";
import { usePageScan } from "@/lib/scan/usePageScan";

export default function PagesContextPage() {
  const { status, scan } = usePageScan();

  if (status === "loading") {
    return <LoadingState pageName={scan?.page.name} />;
  }
  if (status === "error") {
    return <ErrorState pageName={scan?.page.name} />;
  }
  if (!scan || scan.findings.length === 0) {
    return <EmptyState pageName={scan?.page.name} />;
  }

  return (
    <PanelShell
      pageLabel={
        <div className="lhl-page">
          <FileText width={14} height={14} aria-hidden="true" />
          <span>{scan.page.name}</span>
        </div>
      }
      // Provisional — T042 supplies the real verdict sentence + count rail
      // once statuses exist (TR-3+). This line is honest about what TR-2 can
      // say: how many links were found, nothing about their health yet.
      verdict={<span>{scan.findings.length} link{scan.findings.length === 1 ? "" : "s"} found</span>}
      foot="recomputed on every page selection · nothing is stored"
    >
      <RawAnchorList findings={scan.findings} />
    </PanelShell>
  );
}
