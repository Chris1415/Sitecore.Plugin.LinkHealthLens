"use client";

// The ONE extension route (ADR-0004): xmc:pages:contextpanel.
// TR-6 (T041-T048): the three TR-1 non-result states plus the composed,
// grouped Panel (T041/T042/T043/T044/T045) once classification has run —
// this replaces TR-2's provisional raw anchor list and verdict line
// (RawAnchorList / "N links found") now that statuses, groups, the verdict
// sentence and the three-way origin affordance all exist.
import "@/app/panel.css";
import { EmptyState } from "@/components/panel/EmptyState";
import { ErrorState } from "@/components/panel/ErrorState";
import { LoadingState } from "@/components/panel/LoadingState";
import { Panel } from "@/components/panel/Panel";
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

  return <Panel scan={scan} />;
}
