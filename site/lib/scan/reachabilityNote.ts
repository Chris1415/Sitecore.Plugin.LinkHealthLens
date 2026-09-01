// T024 — the standing reachability-not-checked member. FR-11. A policy note,
// not a failed check (that's could-not-check, TR-4) — attached to every
// external row regardless of what else is on it, and never removed.
import type { LinkScope, StatusMember } from "@/lib/model/types";

export function attachReachabilityNote(scope: LinkScope, statuses: Set<StatusMember>): void {
  if (scope === "external") statuses.add("reachability-not-checked");
}
