// T043 groundwork (built early in TR-1 since LoadingState/ErrorState/EmptyState
// all depend on it) — AC-8.3: permanent, never dismissible, toggle expands
// the three-tier list honestly.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScopeStrip } from "./ScopeStrip";

describe("ScopeStrip", () => {
  it("shows the one-line statement and expands the three-tier list on toggle", () => {
    render(<ScopeStrip />);
    expect(
      screen.getByText("Internal link integrity — reachability is never checked."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Checked on every link")).toBeNull();

    fireEvent.click(screen.getByText("What is checked?"));
    expect(screen.getByText("Checked on every link")).toBeInTheDocument();
    expect(screen.getByText("Checked on internal links")).toBeInTheDocument();
    expect(screen.getByText("Never checked, on any link")).toBeInTheDocument();
    expect(screen.getByText("Hide what is checked")).toBeInTheDocument();
  });

  it("suppresses the toggle entirely when noToggle is set, but keeps the statement", () => {
    render(<ScopeStrip noToggle />);
    expect(
      screen.getByText("Internal link integrity — reachability is never checked."),
    ).toBeInTheDocument();
    expect(screen.queryByText("What is checked?")).toBeNull();
  });
});
