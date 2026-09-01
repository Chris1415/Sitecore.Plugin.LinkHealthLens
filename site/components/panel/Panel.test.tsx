// T041–T045 — Panel composition. RED before GREEN.
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ClientSDKContext } from "@/components/providers/marketplace";
import { createStubClient } from "@/test/client-stub";
import type { LinkFinding, PageScan, StatusMember } from "@/lib/model/types";
import { Panel } from "./Panel";

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
    origin: "content",
    ...overrides,
  };
}

function scanWith(findings: LinkFinding[]): PageScan {
  return {
    page: { id: "p1", path: "/careers", language: "en", name: "Careers" },
    findings,
    health: { pageHtml: true, hosts: true, resolution: true, liveState: true },
    completedAt: Date.now(),
  };
}

function renderPanel(findings: LinkFinding[]) {
  const { stubClient } = createStubClient();
  return render(<Panel scan={scanWith(findings)} />, { wrapper: wrapperFor(stubClient) });
}

describe("Panel", () => {
  it("renders the page label, the scope statement and the finding rows", () => {
    renderPanel([
      seed({ ordinal: 1, statuses: new Set<StatusMember>(["not-found"]), origin: "chrome" }),
      seed({ ordinal: 2, statuses: new Set<StatusMember>(["ok"]) }),
    ]);
    expect(screen.getByText("Careers")).toBeInTheDocument();
    expect(screen.getByText("Internal link integrity — reachability is never checked.")).toBeInTheDocument();
    expect(screen.getByText("1 link needs attention before publishing")).toBeInTheDocument();
  });

  it("the region carries the required landmark + live-region attributes", () => {
    const { container } = renderPanel([seed({})]);
    const region = container.querySelector('[role="region"]');
    expect(region?.getAttribute("aria-label")).toBe("Link Health Lens");
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it("the rail is NOT inside the aria-live region (would re-announce noisily every scan)", () => {
    const { container } = renderPanel([
      seed({ ordinal: 1, statuses: new Set<StatusMember>(["not-found"]), origin: "chrome" }),
    ]);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.querySelector(".lhl-rail")).toBeNull();
    expect(container.querySelector(".lhl-rail")).not.toBeNull();
  });

  it("the foot reports the total link count", () => {
    renderPanel([seed({ ordinal: 1 }), seed({ ordinal: 2 })]);
    expect(
      screen.getByText("2 links on this page · recomputed on every page selection · nothing is stored"),
    ).toBeInTheDocument();
  });
});
