// T025 — in-page anchor check. FR-9/US-6. Only a pure fragment href
// ('#name', at least one char after '#') is evaluated; a bare '#' has no
// fragment name to match (AC-5.2) and a fragment on a different page's href
// ('/other#x') is out of scope — this app checks the CURRENT page's own HTML
// only (AC-6.3). A match anywhere in the document, including chrome,
// satisfies the check (AC-6.2).
const FRAGMENT_ONLY = /^#(.+)$/;

export function checkInPageAnchor(href: string, html: string): boolean {
  const match = href.trim().match(FRAGMENT_ONLY);
  if (!match) return false;

  const targetName = match[1];
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (doc.getElementById(targetName)) return false;

  const named = Array.from(doc.querySelectorAll("[name]"));
  const hasNameMatch = named.some((el) => el.getAttribute("name") === targetName);
  return !hasNameMatch;
}
