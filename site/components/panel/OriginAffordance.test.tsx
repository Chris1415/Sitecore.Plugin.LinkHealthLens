// T038 — OriginAffordance. RED before GREEN. Ports verify-poc.mjs's three
// mutual-exclusivity assertions (§ 10): every row shows exactly one of the
// three affordances; no row mixes the chrome label with a jump or the
// content label; both verbatim strings render correctly per case.
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

  it("content origin, no attribution: renders exactly the 'field not identified' string, no jump control, no chrome label", () => {
    const { stubClient } = createStubClient();
    render(
      <OriginAffordance finding={seed({ origin: "content", attribution: null })} />,
      { wrapper: wrapperFor(stubClient) },
    );

    expect(screen.getByText(UNATTRIBUTED_STRING)).toBeInTheDocument();
    expect(screen.queryByText(CHROME_STRING)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("content origin, attributed: renders exactly the owner-and-open control, neither fixed string", () => {
    const { stubClient } = createStubClient();
    render(
      <OriginAffordance
        finding={seed({
          origin: "content",
          attribution: { fieldPath: "headless-main > Section 1", target: { itemId: "abc-1" } },
        })}
      />,
      { wrapper: wrapperFor(stubClient) },
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.queryByText(CHROME_STRING)).toBeNull();
    expect(screen.queryByText(UNATTRIBUTED_STRING)).toBeNull();
  });
});
