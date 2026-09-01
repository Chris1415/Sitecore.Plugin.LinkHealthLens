// T028 — href → content-tree path normalisation (ADR-0009). Three load-bearing
// rules, all from the addendum: strip query + fragment before lookup (the
// captured page carries seven `?to=` variants of one page); exclude media/
// non-page paths before lookup (they MISS by construction — reporting them as
// `not-found` is the exact false-positive class M4 exists to catch); a
// fragment-only or empty remainder targets the current page, not a lookup.
import { NO_HREF } from "./extractAnchors";

// Content SDK's media/asset convention prefix (`/-/media/…`, `/-/jssmedia/…`,
// `/-/icon/…`, …) — ADR-0009 names `/-/media/…` explicitly; the dash-prefix
// itself is the non-page-path signal, not just the `media` segment.
const NON_PAGE_PREFIX = /^\/-\//;

export function normalizeInternalTarget(href: string, siteRootPath: string | undefined): string | null {
  if (!siteRootPath) return null;
  if (href === NO_HREF) return null;

  const withoutFragment = href.split("#")[0];
  const withoutQuery = withoutFragment.split("?")[0];
  const trimmed = withoutQuery.trim();
  if (!trimmed) return null; // fragment-only or empty — resolves to the current page, not a lookup

  if (NON_PAGE_PREFIX.test(trimmed)) return null;

  const relative = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const root = siteRootPath.replace(/\/+$/, "");
  return relative === "/" ? root : `${root}${relative}`;
}
