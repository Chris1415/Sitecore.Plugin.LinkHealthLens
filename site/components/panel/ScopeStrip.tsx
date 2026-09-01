"use client";

// The permanent scope statement (AC-8.3 / T043). Always present, never
// dismissible. `noToggle` suppresses the disclosure control in the loading
// and error states (T013) — the statement stays, there is just nothing yet
// to qualify against an empty/unknown result.
import { useId, useState } from "react";
import { Info } from "lucide-react";
import {
  SCOPE_STATEMENT,
  SCOPE_TIER_EVERY_BODY,
  SCOPE_TIER_EVERY_TITLE,
  SCOPE_TIER_INTERNAL_BODY,
  SCOPE_TIER_INTERNAL_TITLE,
  SCOPE_TIER_NEVER_BODY,
  SCOPE_TIER_NEVER_TITLE,
  SCOPE_TOGGLE_CLOSE,
  SCOPE_TOGGLE_OPEN,
} from "@/lib/panel/copy";

export function ScopeStrip({ noToggle = false }: { noToggle?: boolean }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  return (
    <div className="lhl-scope">
      <div className="lhl-scope-line">
        <Info className="lhl-i" width={14} height={14} aria-hidden="true" />
        <span>{SCOPE_STATEMENT}</span>
      </div>
      {!noToggle && (
        <button
          type="button"
          className="lhl-scope-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? SCOPE_TOGGLE_CLOSE : SCOPE_TOGGLE_OPEN}
        </button>
      )}
      {!noToggle && open && (
        <dl className="lhl-scope-body" id={bodyId}>
          <dt>{SCOPE_TIER_EVERY_TITLE}</dt>
          <dd>{SCOPE_TIER_EVERY_BODY}</dd>
          <dt>{SCOPE_TIER_INTERNAL_TITLE}</dt>
          <dd>{SCOPE_TIER_INTERNAL_BODY}</dd>
          <dt>{SCOPE_TIER_NEVER_TITLE}</dt>
          <dd>{SCOPE_TIER_NEVER_BODY}</dd>
        </dl>
      )}
    </div>
  );
}
