"use client";

// The ONE extension route (ADR-0004): xmc:pages:contextpanel. This is the T005
// handshake probe only — panel shell, states and the ported visual layer land
// in TR-1 (T012+). Kept minimal on purpose so the portal handshake result is
// unambiguous during the probe.
import { useAppContext, useMarketplaceClient } from "@/components/providers/marketplace";

export default function PagesContextPage() {
  useMarketplaceClient();
  const appContext = useAppContext();

  return (
    <div className="p-4 text-sm">
      <h1 className="font-semibold">Link Health Lens — handshake probe</h1>
      <p className="text-muted-foreground">application.context resolved:</p>
      <pre className="bg-muted p-2 rounded text-xs overflow-auto">
        {JSON.stringify(appContext, null, 2)}
      </pre>
    </div>
  );
}
