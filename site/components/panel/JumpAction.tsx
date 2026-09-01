"use client";

// T037 — the ONE sanctioned client.mutate call in this app (T048's
// prohibition gate greps for it). ADR-0010: PagesContextParams carries no
// field selector (`{ itemId?, language?, itemVersion? }`,
// node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts), so
// this navigates to the owning ITEM and is labelled for exactly that —
// never "jump to a field". No sitecoreContextId is needed: unlike the
// xmc.* REST/GraphQL calls, `pages.context` is a native portal mutation and
// its declared params carry no such field.
import { Check, CornerDownRight } from "lucide-react";
import { useState } from "react";
import { useMarketplaceClient } from "@/components/providers/marketplace";
import { ORIGIN_OPENED_CONFIRMATION, ORIGIN_OPEN_LABEL } from "@/lib/panel/copy";
import type { Attribution } from "@/lib/scan/attribute";

// Guards `target: unknown` (§ 4c-6 data model) without a blind `as` cast —
// the same discipline the sitecoreContextId reads elsewhere in this app use.
function itemIdOf(target: unknown): string | null {
  if (target && typeof target === "object" && "itemId" in target) {
    const value = (target as { itemId: unknown }).itemId;
    return typeof value === "string" && value.length > 0 ? value : null;
  }
  return null;
}

export function JumpAction({ attribution }: { attribution: Attribution }) {
  const client = useMarketplaceClient();
  const [opened, setOpened] = useState(false);
  const itemId = itemIdOf(attribution.target);

  // No owner item id despite an attribution object existing (should not
  // happen — attribute() only returns a non-null result with one — but the
  // component never renders a control that cannot act; T038's exhaustive
  // three-way switch relies on this staying honest at every layer).
  if (!itemId) return null;

  const handleOpen = async () => {
    await client.mutate("pages.context", { params: { itemId } });
    setOpened(true);
  };

  return (
    <div className="lhl-origin">
      <button
        type="button"
        className="lhl-jump"
        onClick={() => void handleOpen()}
        aria-label={`${ORIGIN_OPEN_LABEL}: ${attribution.fieldPath}`}
      >
        <CornerDownRight className="lhl-i" width={14} height={14} aria-hidden="true" />
        {ORIGIN_OPEN_LABEL} <span className="lhl-field">{attribution.fieldPath}</span>
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
