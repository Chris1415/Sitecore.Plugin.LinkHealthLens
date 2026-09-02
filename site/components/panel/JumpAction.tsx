"use client";

// T037 — the ONE sanctioned client.mutate call in this app (T048's
// prohibition gate greps for it). ADR-0010 (amended 2026-09-02): navigates
// to the link's resolved TARGET PAGE — `targetItemId`, the id TR-4's
// `resolveInternal` resolves (ADR-0009 call 1), NEVER the owning datasource
// id `attribute()` produces. A datasource is not a page; `pages.context`
// cannot open one (defect: docs/build-decisions.md § JumpAction navigation
// target). PagesContextParams carries no field selector (`{ itemId?,
// language?, itemVersion? }`, node_modules/@sitecore-marketplace-sdk/core/
// dist/shared-types.d.ts) — labelled for what it does, never "jump to a
// field". No sitecoreContextId is needed: `pages.context` is a native
// portal mutation and its declared params carry no such field.
import { Check, CornerDownRight } from "lucide-react";
import { useState } from "react";
import { useMarketplaceClient } from "@/components/providers/marketplace";
import { ORIGIN_OPENED_CONFIRMATION, ORIGIN_OPEN_LABEL } from "@/lib/panel/copy";

export function JumpAction({
  targetItemId,
  targetLabel,
}: {
  targetItemId: string;
  targetLabel: string | null;
}) {
  const client = useMarketplaceClient();
  const [opened, setOpened] = useState(false);
  const label = targetLabel ?? "target page";

  const handleOpen = async () => {
    await client.mutate("pages.context", { params: { itemId: targetItemId } });
    setOpened(true);
  };

  return (
    <div className="lhl-jump-wrap">
      <button
        type="button"
        className="lhl-jump"
        onClick={() => void handleOpen()}
        aria-label={`${ORIGIN_OPEN_LABEL}: ${label}`}
      >
        <CornerDownRight className="lhl-i" width={14} height={14} aria-hidden="true" />
        {ORIGIN_OPEN_LABEL} <span className="lhl-field">{label}</span>
      </button>
      {opened && (
        <div className="lhl-jumped-note">
          <Check className="lhl-i" width={14} height={14} aria-hidden="true" />
          {ORIGIN_OPENED_CONFIRMATION}
        </div>
      )}
    </div>
  );
}
