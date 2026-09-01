// T013 / T014 — loading must never read as clean.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingState } from "./LoadingState";

describe("LoadingState", () => {
  it("renders the skeleton AND the explicit no-result-yet copy simultaneously", () => {
    render(<LoadingState pageName="Careers - Open Roles" />);
    expect(screen.getByText("Checking links…")).toBeInTheDocument();
    expect(
      screen.getByText("No result yet — this is not a clean page."),
    ).toBeInTheDocument();
    expect(document.querySelectorAll(".lhl-sk-row")).toHaveLength(6);
  });

  it("keeps the scope statement but suppresses its disclosure toggle", () => {
    render(<LoadingState />);
    expect(
      screen.getByText("Internal link integrity — reachability is never checked."),
    ).toBeInTheDocument();
    expect(screen.queryByText("What is checked?")).toBeNull();
  });

  it("renders the region landmark with the aria-live verdict", () => {
    render(<LoadingState />);
    const region = screen.getByRole("region", { name: "Link Health Lens" });
    expect(region.querySelector('[aria-live="polite"]')).toHaveTextContent(
      "Checking links…",
    );
  });
});
