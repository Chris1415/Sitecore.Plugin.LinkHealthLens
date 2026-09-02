"use client";

// T041/T045 — the grouped, collapsible finding list. WAI-ARIA Disclosure
// pattern on each group header (button + aria-expanded + aria-controls);
// collapsed groups render NO row DOM at all — unmounted, not CSS-hidden
// (M1: a 150-anchor page must not build 150 invisible subtrees; a screen
// reader must not walk them either). A zero-count group renders no
// `<section>` (T041: "omitted, not greyed" — a decision, not a gap).
import { useId, useState } from "react";
import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock,
  EyeOff,
  Hash,
  LockOpen,
  TriangleAlert,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import type { LinkFinding } from "@/lib/model/types";
import { GROUPS, defaultOpenGroupIds, groupBuckets } from "@/lib/model/groups";
import { FindingRow } from "./FindingRow";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const GROUP_ICON: Record<string, IconComponent> = {
  "not-found": CircleAlert,
  unpublished: Clock,
  malformed: TriangleAlert,
  "missing-anchor": Hash,
  insecure: LockOpen,
  "could-not-check": CircleHelp,
  external: EyeOff,
  "no-findings": CircleCheck,
};

function GroupSubline({ rows, tier }: { rows: LinkFinding[]; tier: string }) {
  // Ported from panel.js § renderGroup: the "N of M are site chrome" sub-
  // line only applies to the fixable tiers (act/check/note) — the standing
  // (external) and clear (no-findings) tiers never earn one, since neither
  // reports a fixable problem in the first place.
  if (tier !== "act" && tier !== "check" && tier !== "note") return null;
  const chrome = rows.filter((r) => r.origin === "chrome").length;
  if (chrome === 0) return null;
  return (
    <div className="lhl-gsub">
      {chrome} of {rows.length} are site chrome — not fixable from this page
    </div>
  );
}

function Group({
  id,
  name,
  tone,
  tier,
  rows,
  open,
  onToggle,
}: {
  id: string;
  name: string;
  tone: string;
  tier: string;
  rows: LinkFinding[];
  open: boolean;
  onToggle: () => void;
}) {
  const bodyId = useId();
  const Icon = GROUP_ICON[id] ?? CircleCheck;

  return (
    <section className={`lhl-group tone-${tone}`} id={`group-${id}`}>
      <button
        type="button"
        className="lhl-group-head"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <ChevronRight className="lhl-i lhl-chev" width={14} height={14} aria-hidden="true" />
        <Icon className="lhl-i lhl-gi" width={14} height={14} aria-hidden="true" />
        <span className="lhl-gname">{name}</span>
        <span className="lhl-gcount">{rows.length}</span>
      </button>
      {open && (
        <>
          <GroupSubline rows={rows} tier={tier} />
          <ul className="lhl-rows" id={bodyId}>
            {rows.map((finding) => (
              <FindingRow finding={finding} key={`${finding.ordinal}-${finding.href}`} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function GroupList({ findings }: { findings: LinkFinding[] }) {
  const buckets = groupBuckets(findings);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => defaultOpenGroupIds(buckets));
  // "Adjust state during render" (react.dev) rather than an effect: a new
  // scan (new page selection, or the same page re-resolved) resets the
  // disclosure state to the default-open rule. `findings` is a fresh array
  // per scan (usePageScan), so `prevFindings !== findings` never fires on
  // an unrelated re-render of the SAME scan's output, and updating state
  // during render (before commit) avoids the extra render pass + the
  // setState-in-effect lint the equivalent useEffect would trigger.
  const [prevFindings, setPrevFindings] = useState(findings);
  if (findings !== prevFindings) {
    setPrevFindings(findings);
    setOpenGroups(defaultOpenGroupIds(buckets));
  }

  const toggle = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const nonEmpty = GROUPS.filter((g) => (buckets.get(g.id) ?? []).length > 0);

  // Defect fix 2026-09-02 (docs/build-decisions.md § clean-state group
  // wrapper): an all-clean page puts every row in the SOLE "no-findings"
  // group, whose verdict is already stated by VerdictHead above. A
  // collapsible header naming and counting the one group that exists is
  // chrome with nothing to disclose — render its rows directly. Deliberate
  // divergence from the POC (state-clean.html renders the ordinary
  // collapsible group here); every OTHER combination — including a clean
  // page that also has an `external` group — still renders the normal
  // grouped, collapsible list below.
  if (nonEmpty.length === 1 && nonEmpty[0].id === "no-findings") {
    const rows = buckets.get("no-findings") ?? [];
    return (
      <ul className="lhl-rows lhl-rows-flat">
        {rows.map((finding) => (
          <FindingRow finding={finding} key={`${finding.ordinal}-${finding.href}`} />
        ))}
      </ul>
    );
  }

  return (
    <>
      {nonEmpty.map((g) => (
        <Group
          key={g.id}
          id={g.id}
          name={g.name}
          tone={g.tone}
          tier={g.tier}
          rows={buckets.get(g.id) ?? []}
          open={openGroups.has(g.id)}
          onToggle={() => toggle(g.id)}
        />
      ))}
    </>
  );
}
