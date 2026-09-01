// T042 — VerdictHead. RED before GREEN.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LinkFinding, StatusMember } from "@/lib/model/types";
import { VerdictHead } from "./VerdictHead";

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

describe("VerdictHead — verdict branches", () => {
  it("act tier present: 'N links need attention before publishing'", () => {
    render(
      <VerdictHead
        findings={[
          seed({ ordinal: 1, origin: "chrome", statuses: new Set<StatusMember>(["not-found"]) }),
          seed({ ordinal: 2, origin: "chrome", statuses: new Set<StatusMember>(["not-found"]) }),
        ]}
      />,
    );
    expect(screen.getByText("2 links need attention before publishing")).toBeInTheDocument();
  });

  it("check tier only: 'N links to check before publishing'", () => {
    render(<VerdictHead findings={[seed({ origin: "chrome", statuses: new Set<StatusMember>(["unpublished"]) })]} />);
    expect(screen.getByText("1 link to check before publishing")).toBeInTheDocument();
  });

  it("note tier only: 'Nothing to fix before publishing'", () => {
    render(
      <VerdictHead findings={[seed({ origin: "chrome", statuses: new Set<StatusMember>(["insecure-scheme"]) })]} />,
    );
    expect(screen.getByText("Nothing to fix before publishing")).toBeInTheDocument();
  });

  it("no links at all: 'No links on this page'", () => {
    render(<VerdictHead findings={[]} />);
    expect(screen.getByText("No links on this page")).toBeInTheDocument();
  });

  it("links exist but every tier is empty: 'No findings on this page'", () => {
    render(
      <VerdictHead
        findings={[seed({ statuses: new Set<StatusMember>(["ok"]) }), seed({ ordinal: 2, statuses: new Set<StatusMember>(["ok"]) })]}
      />,
    );
    expect(screen.getByText("No findings on this page")).toBeInTheDocument();
  });
});

describe("VerdictHead — chrome-count REGRESSION (load-bearing mitigation, not decoration)", () => {
  it("chrome-heavy page's sub-line count renders, is not dropped", () => {
    render(
      <VerdictHead
        findings={[
          seed({ ordinal: 1, origin: "chrome", statuses: new Set<StatusMember>(["not-found"]) }),
          seed({ ordinal: 2, origin: "chrome", statuses: new Set<StatusMember>(["not-found"]) }),
        ]}
      />,
    );
    expect(screen.getByText("Every one of them is site chrome — not editable from this page.")).toBeInTheDocument();
  });

  it("rail renders the worst-first chips with the correct counts", () => {
    const { container } = render(
      <VerdictHead
        findings={[
          seed({ ordinal: 1, origin: "chrome", statuses: new Set<StatusMember>(["not-found"]) }),
          seed({ ordinal: 2, origin: "content", statuses: new Set<StatusMember>(["unpublished"]) }),
          seed({
            ordinal: 3,
            origin: "content",
            scope: "external",
            statuses: new Set<StatusMember>(["ok", "reachability-not-checked"]),
          }),
        ]}
      />,
    );
    const rail = container.querySelector(".lhl-rail");
    expect(rail?.querySelector(".tone-act")?.textContent).toBe("1 act now");
    expect(rail?.querySelector(".tone-check")?.textContent).toBe("1 to check");
    expect(rail?.querySelectorAll(".tone-note")).toHaveLength(1);
    expect(rail?.querySelector('a[href="#group-external"]')?.textContent).toBe("1 external");
  });
});
