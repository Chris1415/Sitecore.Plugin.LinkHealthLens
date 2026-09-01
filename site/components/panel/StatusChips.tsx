// T044 — the chip strip. Every status-set member renders (ADR-0005); the
// headline member is outlined + tinted, the rest flat `muted` chips with
// `foreground` text (never `muted-foreground` on `muted` — 4.40:1, fails
// AA, T010). Order: headline first, then remaining real findings in
// precedence order, then the standing `reachability-not-checked` note last
// — it is never a headline and never suppressed (ported from panel.js §
// renderChips).
import type { ComponentType, SVGProps } from "react";
import {
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock,
  EyeOff,
  Hash,
  LockOpen,
  TriangleAlert,
} from "lucide-react";
import type { StatusMember } from "@/lib/model/types";
import { PRECEDENCE, headlineOf } from "@/lib/model/precedence";
import { STATUS_LABEL } from "@/lib/panel/copy";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const STATUS_ICON: Record<StatusMember, IconComponent> = {
  "not-found": CircleAlert,
  "not-found-or-unpublished": CircleAlert,
  unpublished: Clock,
  malformed: TriangleAlert,
  "missing-anchor": Hash,
  "insecure-scheme": LockOpen,
  "could-not-check": CircleHelp,
  "reachability-not-checked": EyeOff,
  ok: CircleCheck,
};

// tone drives the outlined/tinted CSS class only when a member IS the
// headline (`.lhl-chip.is-headline.tone-*`, panel.css). Ported from
// panel.js § STATUS's `tone` field.
const STATUS_TONE: Record<StatusMember, "act" | "check" | "note" | "clear"> = {
  "not-found": "act",
  "not-found-or-unpublished": "act",
  unpublished: "check",
  malformed: "check",
  "missing-anchor": "check",
  "insecure-scheme": "note",
  "could-not-check": "note",
  "reachability-not-checked": "note",
  ok: "clear",
};

export function StatusChips({ statuses }: { statuses: Set<StatusMember> }) {
  const head = headlineOf(statuses);
  const rest = PRECEDENCE.filter((m) => statuses.has(m) && m !== head);
  const ordered: StatusMember[] = [head, ...rest];
  if (statuses.has("reachability-not-checked")) ordered.push("reachability-not-checked");

  return (
    <div className="lhl-chips">
      {ordered.map((member, i) => {
        const Icon = STATUS_ICON[member];
        const isHeadline = i === 0;
        const cls = "lhl-chip" + (isHeadline ? ` is-headline tone-${STATUS_TONE[member]}` : "");
        return (
          <span className={cls} key={member}>
            <Icon className="lhl-i" width={14} height={14} aria-hidden="true" />
            {STATUS_LABEL[member]}
          </span>
        );
      })}
    </div>
  );
}
