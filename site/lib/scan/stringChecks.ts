// T023 — the two string checks. FR-7/FR-8. Pure string inspection, no
// request and no response interpretation, and no scope short-circuit: both
// checks run on every link, internal or external (§ 4c-1's named failure mode).
import { NO_HREF } from "./extractAnchors";

const INSECURE_SCHEME = /^http:\/\//i;
const MALFORMED_PLACEHOLDER = new Set(["undefined", "null"]);
// A bare '#' and the '(no href)' sentinel are the conventional idiom for a
// JS-driven toggle/menu trigger — exactly the chrome the rendered scope
// pulls in. Flagging either makes the M4 known-good control unreachable
// (AC-5.2).
const EXEMPT_FROM_MALFORMED = new Set(["#", NO_HREF]);

export function isInsecureScheme(href: string): boolean {
  return INSECURE_SCHEME.test(href.trim());
}

export function isMalformed(href: string): boolean {
  if (EXEMPT_FROM_MALFORMED.has(href)) return false;
  const trimmed = href.trim();
  if (trimmed === "") return true;
  return MALFORMED_PLACEHOLDER.has(trimmed);
}
