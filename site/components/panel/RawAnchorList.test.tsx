// T018 — the raw anchor list (no classification yet; T041-T048 build the
// styled group/row anatomy). RED before GREEN.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LinkFinding } from "@/lib/model/types";
import { RawAnchorList } from "./RawAnchorList";

function seed(href: string, ordinal: number, text: string): LinkFinding {
  return { href, ordinal, text, statuses: new Set(), attribution: null, targetLabel: null, targetItemId: null };
}

describe("RawAnchorList", () => {
  it("renders one row per finding, each showing its text, href and ordinal", () => {
    render(
      <RawAnchorList
        findings={[seed("/book", 1, "Book now"), seed("(no href)", 2, "no href here")]}
      />,
    );
    const rows = document.querySelectorAll(".lhl-row");
    expect(rows).toHaveLength(2);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("/book")).toBeInTheDocument();
    expect(screen.getByText("(no href)")).toBeInTheDocument();
  });

  it("preserves document order (no re-sorting)", () => {
    render(<RawAnchorList findings={[seed("/b", 2, "B"), seed("/a", 1, "A")]} />);
    const texts = Array.from(document.querySelectorAll(".lhl-href")).map((n) => n.textContent);
    expect(texts).toEqual(["/b", "/a"]);
  });
});
