// T044 — StatusChips. RED before GREEN.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StatusMember } from "@/lib/model/types";
import { StatusChips } from "./StatusChips";

describe("StatusChips", () => {
  it("renders one chip per status-set member, all visible", () => {
    render(<StatusChips statuses={new Set<StatusMember>(["not-found", "insecure-scheme"])} />);
    expect(screen.getByText("Target not found")).toBeInTheDocument();
    expect(screen.getByText("Insecure scheme (http://)")).toBeInTheDocument();
  });

  it("the higher-precedence member is headlined (is-headline class), the other is flat", () => {
    const { container } = render(
      <StatusChips statuses={new Set<StatusMember>(["insecure-scheme", "not-found"])} />,
    );
    const chips = container.querySelectorAll(".lhl-chip");
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent).toContain("Target not found");
    expect(chips[0].className).toContain("is-headline");
    expect(chips[1].textContent).toContain("Insecure scheme");
    expect(chips[1].className).not.toContain("is-headline");
  });

  it("reachability-not-checked always renders LAST, even when it is the only other member", () => {
    const { container } = render(
      <StatusChips statuses={new Set<StatusMember>(["reachability-not-checked", "insecure-scheme"])} />,
    );
    const chips = Array.from(container.querySelectorAll(".lhl-chip"));
    expect(chips.at(-1)?.textContent).toContain("Reachability not checked");
  });

  it("reachability-not-checked never carries is-headline", () => {
    const { container } = render(
      <StatusChips statuses={new Set<StatusMember>(["ok", "reachability-not-checked"])} />,
    );
    const chips = Array.from(container.querySelectorAll(".lhl-chip"));
    const note = chips.find((c) => c.textContent?.includes("Reachability not checked"));
    expect(note?.className).not.toContain("is-headline");
  });
});
