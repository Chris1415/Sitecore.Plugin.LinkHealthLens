// T017 — anchor extractor. Parses the raw HTML string returned by
// xmc.agent.pagesGetPageHtml with DOMParser (the app never navigates to or
// requests the page itself — the string is the only input). One seed
// LinkFinding per <a> in document order; classification fields land in TR-3..5.
import type { LinkFinding } from "@/lib/model/types";

const NO_HREF = "(no href)";

export function extractAnchors(html: string): LinkFinding[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const anchors = Array.from(doc.querySelectorAll("a"));

  return anchors.map((anchor, index) => {
    const rawHref = anchor.getAttribute("href");
    return {
      href: rawHref === null ? NO_HREF : rawHref,
      ordinal: index + 1,
      text: (anchor.textContent ?? "").replace(/\s+/g, " ").trim(),
      statuses: new Set(),
      attribution: null,
      targetLabel: null,
    };
  });
}
