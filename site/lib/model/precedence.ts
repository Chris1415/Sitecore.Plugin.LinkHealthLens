// T026 — status-set model, display precedence and headline selection. ADR-0005.
// Precedence decides the HEADLINE and SORT only; every set member stays
// visible on the row regardless (enforced at the rendering layer, TR-6).
// `reachability-not-checked` is deliberately absent — a standing policy note,
// never a headline candidate, so its presence alone falls through to `ok`.
import type { StatusMember } from "./types";

export const PRECEDENCE: StatusMember[] = [
  "not-found",
  "not-found-or-unpublished",
  "unpublished",
  "malformed",
  "missing-anchor",
  "insecure-scheme",
  "could-not-check",
  "ok",
];

export function headlineOf(statuses: Set<StatusMember>): StatusMember {
  for (const candidate of PRECEDENCE) {
    if (statuses.has(candidate)) return candidate;
  }
  return "ok";
}
