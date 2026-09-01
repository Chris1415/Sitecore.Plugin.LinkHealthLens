// T041/T045 — GroupList. RED before GREEN.
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ClientSDKContext } from "@/components/providers/marketplace";
import { createStubClient } from "@/test/client-stub";
import type { LinkFinding, StatusMember } from "@/lib/model/types";
import { GroupList } from "./GroupList";

function wrapperFor(stubClient: ReturnType<typeof createStubClient>["stubClient"]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ClientSDKContext.Provider value={stubClient}>{children}</ClientSDKContext.Provider>;
  };
}

function seed(overrides: Partial<LinkFinding>): LinkFinding {
  return {
    href: "/x",
    ordinal: 1,
    text: "x",
    statuses: new Set<StatusMember>(["ok"]),
    attribution: null,
    targetLabel: null,
    origin: "chrome",
    ...overrides,
  };
}

function busyDataset(): LinkFinding[] {
  const out: LinkFinding[] = [];
  let ordinal = 1;
  for (let i = 0; i < 4; i++) out.push(seed({ ordinal: ordinal++, statuses: new Set<StatusMember>(["not-found"]) }));
  for (let i = 0; i < 7; i++) out.push(seed({ ordinal: ordinal++, statuses: new Set<StatusMember>(["unpublished"]) }));
  for (let i = 0; i < 2; i++) out.push(seed({ ordinal: ordinal++, statuses: new Set<StatusMember>(["malformed"]) }));
  return out;
}

function renderGroups(findings: LinkFinding[]) {
  const { stubClient } = createStubClient();
  return render(<GroupList findings={findings} />, { wrapper: wrapperFor(stubClient) });
}

describe("GroupList — default disclosure", () => {
  it("exactly 2 groups are expanded by default on the busy (11-row exposed) dataset", () => {
    const { container } = renderGroups(busyDataset());
    expect(container.querySelectorAll('[aria-expanded="true"]')).toHaveLength(2);
  });

  it("collapsed groups contribute ZERO row DOM nodes, not CSS-hidden ones", () => {
    const { container } = renderGroups(busyDataset());
    // not-found(4) + unpublished(7) = 11 rows exposed; malformed(2) collapsed and unmounted.
    expect(container.querySelectorAll(".lhl-row")).toHaveLength(11);
  });

  it("aria-expanded and aria-controls are present and correctly paired on every header", () => {
    const { container } = renderGroups(busyDataset());
    const headers = container.querySelectorAll(".lhl-group-head");
    expect(headers.length).toBeGreaterThan(0);
    headers.forEach((header) => {
      const controls = header.getAttribute("aria-controls");
      expect(header.hasAttribute("aria-expanded")).toBe(true);
      const expanded = header.getAttribute("aria-expanded") === "true";
      if (expanded) {
        expect(controls).toBeTruthy();
        expect(document.getElementById(controls!)).not.toBeNull();
      }
    });
  });

  it("a zero-count group renders no section at all", () => {
    renderGroups([seed({ statuses: new Set<StatusMember>(["not-found"]) })]);
    expect(document.getElementById("group-unpublished")).toBeNull();
  });

  it("clicking a collapsed group header opens it and mounts its rows", () => {
    const { container } = renderGroups(busyDataset());
    const malformedHeader = container.querySelector("#group-malformed .lhl-group-head")!;
    expect(malformedHeader.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(malformedHeader);
    expect(malformedHeader.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelectorAll("#group-malformed .lhl-row")).toHaveLength(2);
  });
});

describe("GroupList — chrome sub-line", () => {
  it("a fixable-tier group with chrome rows shows the 'N of M are site chrome' sub-line", () => {
    const { container } = renderGroups([
      seed({ ordinal: 1, origin: "chrome", statuses: new Set<StatusMember>(["not-found"]) }),
      seed({ ordinal: 2, origin: "content", statuses: new Set<StatusMember>(["not-found"]) }),
    ]);
    expect(screen.getByText("1 of 2 are site chrome — not fixable from this page")).toBeInTheDocument();
    expect(container).toBeTruthy();
  });
});
