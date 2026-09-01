"use client";

// The ONE extension route (ADR-0004): xmc:pages:contextpanel.
// TR-1 (T012-T014): renders the panel shell + POC visual layer. Acquisition
// (pages.context subscription, page HTML, real verdict/rows) is TR-2+; until
// then the panel honestly shows "checking links" rather than a placeholder
// verdict it cannot back up.
import "@/app/panel.css";
import { useMarketplaceClient } from "@/components/providers/marketplace";
import { LoadingState } from "@/components/panel/LoadingState";

export default function PagesContextPage() {
  useMarketplaceClient();

  return <LoadingState />;
}
