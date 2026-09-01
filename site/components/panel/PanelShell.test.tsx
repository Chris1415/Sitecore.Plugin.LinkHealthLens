// T012 / T014 — the shell renders its landmarks and never forces a theme.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PanelShell } from "./PanelShell";

describe("PanelShell", () => {
  it("renders role=region aria-label with an always-present aria-live verdict slot", () => {
    render(<PanelShell verdict="hello" />);
    const region = screen.getByRole("region", { name: "Link Health Lens" });
    expect(region).toBeInTheDocument();
    const live = region.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live).toHaveTextContent("hello");
  });

  it("renders the aria-live slot even with no verdict content yet (structural skeleton)", () => {
    render(<PanelShell />);
    const region = screen.getByRole("region", { name: "Link Health Lens" });
    expect(region.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it("never hardcodes a theme class on the shell itself", () => {
    render(<PanelShell verdict="hello" />);
    const region = screen.getByRole("region", { name: "Link Health Lens" });
    expect(region.className.split(" ")).not.toContain("dark");
    expect(region.className.split(" ")).not.toContain("light");
  });

  it("omits the foot entirely when not supplied, renders it when supplied", () => {
    const { rerender } = render(<PanelShell verdict="v" />);
    expect(document.querySelector(".lhl-foot")).toBeNull();
    rerender(<PanelShell verdict="v" foot="done" />);
    expect(document.querySelector(".lhl-foot")).toHaveTextContent("done");
  });
});
