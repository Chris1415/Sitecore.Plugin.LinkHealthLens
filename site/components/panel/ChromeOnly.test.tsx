// T040 — ChromeOnly. RED before GREEN.
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ClientSDKContext } from "@/components/providers/marketplace";
import { createStubClient } from "@/test/client-stub";
import type { LinkFinding } from "@/lib/model/types";
import { ChromeOnly, isChromeOnly } from "./ChromeOnly";

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
    statuses: new Set(),
    attribution: null,
    targetLabel: null,
    ...overrides,
  };
}

describe("isChromeOnly", () => {
  it("is true when every finding is chrome-origin and there is at least one", () => {
    expect(isChromeOnly([seed({ origin: "chrome" }), seed({ origin: "chrome" })])).toBe(true);
  });

  it("is false when any finding is content-origin", () => {
    expect(isChromeOnly([seed({ origin: "chrome" }), seed({ origin: "content" })])).toBe(false);
  });

  it("is false for an empty finding list — a zero-link page is EmptyState's territory, not this one", () => {
    expect(isChromeOnly([])).toBe(false);
  });
});

describe("ChromeOnly", () => {
  it("a chrome-only page renders zero jump affordances and the exact sub-line", () => {
    const { stubClient } = createStubClient();
    const findings = [
      seed({ ordinal: 1, href: "/a", origin: "chrome" }),
      seed({ ordinal: 2, href: "/b", origin: "chrome" }),
      seed({ ordinal: 3, href: "/c", origin: "chrome" }),
    ];
    render(<ChromeOnly findings={findings} />, { wrapper: wrapperFor(stubClient) });

    expect(screen.getByText("Every one of them is site chrome — not editable from this page.")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("renders nothing when the page is not chrome-only", () => {
    const { stubClient } = createStubClient();
    const findings = [seed({ origin: "chrome" }), seed({ origin: "content", attribution: null })];
    const { container } = render(<ChromeOnly findings={findings} />, { wrapper: wrapperFor(stubClient) });
    expect(container).toBeEmptyDOMElement();
  });
});
