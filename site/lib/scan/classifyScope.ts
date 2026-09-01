// T022 — scope classifier. FR-5, amended by the T0 addendum: the tenant host
// list is unusable (0 of 7 sites carry a `targetHostname`, probe (c)), so
// scope is decided by href SHAPE, not by matching a host set. No SDK call.
import type { LinkScope } from "@/lib/model/types";

const NON_NAVIGATIONAL_SCHEME = /^(mailto|tel|javascript):/i;
const ABSOLUTE_SCHEME_OR_PROTOCOL_RELATIVE = /^(\/\/|[a-z][a-z0-9+.-]*:)/i;

export function classifyScope(href: string): LinkScope {
  const trimmed = href.trim();
  if (NON_NAVIGATIONAL_SCHEME.test(trimmed)) return "non-navigational";
  if (ABSOLUTE_SCHEME_OR_PROTOCOL_RELATIVE.test(trimmed)) return "external";
  return "internal";
}
