// T013 / T014 — AC-1.4: a page with no anchors renders an explicit empty
// state, never a blank panel.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders a non-empty, distinguishable node tree", () => {
    render(<EmptyState pageName="Media - Brand Assets" />);
    const region = screen.getByRole("region", { name: "Link Health Lens" });
    expect(region.textContent?.trim().length).toBeGreaterThan(0);
    expect(screen.getAllByText("No links on this page").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Nothing to report. This panel updates on its own when you select another page.",
      ),
    ).toBeInTheDocument();
  });

  it("still offers the scope disclosure toggle (a ready-variant state, unlike loading/error)", () => {
    render(<EmptyState />);
    expect(screen.getByText("What is checked?")).toBeInTheDocument();
  });
});
