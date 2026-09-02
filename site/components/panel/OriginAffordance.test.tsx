// T038 — OriginAffordance. Rewritten 2026-09-02 (defect fix, ADR-0010
// amended, docs/build-decisions.md § OriginAffordance owner/navigate split):
// the owner label and the navigate control are now two INDEPENDENT signals.
// Chrome origin still renders only the fixed chrome string, no control
// (ADR-0006, unchanged). Content origin always renders an owner label as
// text (attributed field path, or the fixed "field not identified" string)
// and renders JumpAction iff the finding carries a resolved target page id —
// regardless of whether attribution itself succeeded.
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ClientSDKContext } from "@/components/providers/marketplace";
import { createStubClient } from "@/test/client-stub";
import type { LinkFinding } from "@/lib/model/types";
import { OriginAffordance } from "./OriginAffordance";

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
    targetItemId: null,
    ...overrides,
  };
}

const CHROME_STRING = "site chrome — not editable from this page";
const UNATTRIBUTED_STRING = "in your content — field not identified";

describe("OriginAffordance", () => {
  it("chrome origin: renders exactly the chrome string, no jump control, no content label", () => {
    const { stubClient } = createStubClient();
    render(<OriginAffordance finding={seed({ origin: "chrome" })} />, { wrapper: wrapperFor(stubClient) });

    expect(screen.getByText(CHROME_STRING)).toBeInTheDocument();
    expect(screen.queryByText(UNATTRIBUTED_STRING)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("content origin, no attribution, no resolved target: renders the 'field not identified' string, no jump control, no chrome label", () => {
    const { stubClient } = createStubClient();
    render(
      <OriginAffordance finding={seed({ origin: "content", attribution: null, targetItemId: null })} />,
      { wrapper: wrapperFor(stubClient) },
    );

    expect(screen.getByText(UNATTRIBUTED_STRING)).toBeInTheDocument();
    expect(screen.queryByText(CHROME_STRING)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("content origin, attributed, resolved target: shows BOTH the owner label as text and the jump control — the button navigates to the resolved page, never the datasource (defect fixed 2026-09-02)", () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockResolvedValue({ data: undefined } as never);
    render(
      <OriginAffordance
        finding={seed({
          origin: "content",
          attribution: { fieldPath: "headless-main > Section 1", target: { itemId: "datasource-abc-1" } },
          targetItemId: "resolved-page-1",
          targetLabel: "Models",
        })}
      />,
      { wrapper: wrapperFor(stubClient) },
    );

    expect(screen.getByText("headless-main > Section 1")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.queryByText(CHROME_STRING)).toBeNull();
    expect(screen.queryByText(UNATTRIBUTED_STRING)).toBeNull();
  });

  it("content origin, attributed, but NO resolved target: shows the owner label as text and renders NO button (unresolved target)", () => {
    const { stubClient } = createStubClient();
    render(
      <OriginAffordance
        finding={seed({
          origin: "content",
          attribution: { fieldPath: "headless-main > Section 1", target: { itemId: "datasource-abc-1" } },
          targetItemId: null,
        })}
      />,
      { wrapper: wrapperFor(stubClient) },
    );

    expect(screen.getByText("headless-main > Section 1")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("content origin, unattributed, but a resolved target DOES exist: shows the 'field not identified' text AND the jump control — the two signals are independent", () => {
    const { stubClient } = createStubClient();
    render(
      <OriginAffordance
        finding={seed({
          origin: "content",
          attribution: null,
          targetItemId: "resolved-page-2",
          targetLabel: "Contact",
        })}
      />,
      { wrapper: wrapperFor(stubClient) },
    );

    expect(screen.getByText(UNATTRIBUTED_STRING)).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
