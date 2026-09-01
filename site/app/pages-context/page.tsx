"use client";

// The ONE extension route (ADR-0004): xmc:pages:contextpanel.
// TR-1 (T012-T014): renders the panel shell + POC visual layer. Acquisition
// (pages.context subscription, page HTML, real verdict/rows) is TR-2+; until
// then the panel honestly shows "checking links" rather than a placeholder
// verdict it cannot back up.
import Link from "next/link";
import "@/app/panel.css";
import { useMarketplaceClient } from "@/components/providers/marketplace";
import { LoadingState } from "@/components/panel/LoadingState";

export default function PagesContextPage() {
  useMarketplaceClient();

  return (
    <>
      <LoadingState />
      {/* T006 throwaway harness — deleted at TR-1 close (T014), per the
          Developer brief; kept reachable only via this link during the
          tranche, never the URL bar (no address bar inside the portal
          iframe). */}
      <Link href="/probe" className="mt-2 inline-block text-xs underline text-muted-foreground">
        Dev: open probe harness (T006) →
      </Link>
    </>
  );
}
