"use client";

// The outer panel region (T012). Structural skeleton only — head/scroll/foot
// are slots later tranches fill (TR-2 page name + TR-3..6 verdict/rail/rows).
// Theme is never forced here: colour comes entirely from Blok's CSS vars,
// which flip under the `.dark` class next-themes applies to <html> based on
// the host's `prefers-color-scheme` (see components/theme-provider.tsx).
import type { HTMLAttributes, ReactNode } from "react";

export interface PanelShellProps {
  /** `.lhl-page` row — file icon + page name. Populated from TR-2. */
  pageLabel?: ReactNode;
  /** Content of the always-present `aria-live="polite"` verdict slot. */
  verdict?: ReactNode;
  /** Anything else that belongs in the sticky head after the verdict
   * (sub-verdict, count rail, the scope strip). */
  headExtra?: ReactNode;
  /** The scrollable finding list / state body. */
  children?: ReactNode;
  /** Pinned foot line. Omitted entirely when not supplied. */
  foot?: ReactNode;
  /** Extra props forwarded to the scroll region, e.g. role="alert" (T013). */
  scrollProps?: HTMLAttributes<HTMLDivElement>;
}

export function PanelShell({
  pageLabel,
  verdict,
  headExtra,
  children,
  foot,
  scrollProps,
}: PanelShellProps) {
  return (
    <div className="lhl" role="region" aria-label="Link Health Lens">
      <div className="lhl-head">
        {pageLabel}
        <div aria-live="polite">{verdict}</div>
        {headExtra}
      </div>
      <div className="lhl-scroll" {...scrollProps}>
        {children}
      </div>
      {foot !== undefined ? <div className="lhl-foot">{foot}</div> : null}
    </div>
  );
}
