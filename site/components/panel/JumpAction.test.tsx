// T037 — JumpAction. Rewritten 2026-09-02 (defect fix, ADR-0010 amended):
// navigates to the resolved TARGET PAGE (`targetItemId`, TR-4), never to the
// owning datasource's id — a datasource is not a page and `pages.context`
// cannot open one.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ClientSDKContext } from "@/components/providers/marketplace";
import { createStubClient } from "@/test/client-stub";
import { JumpAction } from "./JumpAction";

const TARGET_ITEM_ID = "bbbbbbbb-1111-2222-3333-444444444444";
// A real datasource guid from the captured Velaro presentationDetails
// fixture — used ONLY as a distractor, to prove the mutation never carries
// it (that was the shipped bug).
const DATASOURCE_ID_DISTRACTOR = "{D2E186FD-3C4A-4704-B535-55912941FD53}";

function wrapperFor(stubClient: ReturnType<typeof createStubClient>["stubClient"]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ClientSDKContext.Provider value={stubClient}>{children}</ClientSDKContext.Provider>;
  };
}

describe("JumpAction", () => {
  it("navigates to the resolved target page via the sanctioned pages.context mutation — never a datasource id, never labelled a jump to a field", () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockResolvedValue({ data: undefined } as never);
    render(<JumpAction targetItemId={TARGET_ITEM_ID} targetLabel="Models" />, {
      wrapper: wrapperFor(stubClient),
    });

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Open in canvas");
    expect(button).not.toHaveTextContent(/jump to field/i);

    fireEvent.click(button);

    expect(mutate).toHaveBeenCalledWith("pages.context", {
      params: { itemId: TARGET_ITEM_ID },
    });
    expect(mutate).not.toHaveBeenCalledWith("pages.context", {
      params: { itemId: DATASOURCE_ID_DISTRACTOR },
    });
  });

  it("shows the confirmation state after opening — never claiming a field was selected", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockResolvedValue({ data: undefined } as never);
    render(<JumpAction targetItemId={TARGET_ITEM_ID} targetLabel="Models" />, {
      wrapper: wrapperFor(stubClient),
    });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Opened in the canvas")).toBeInTheDocument();
    });
    expect(screen.queryByText(/field selected/i)).toBeNull();
  });

  it("gives the button a richer accessible name than its visible label, naming the resolved target page", () => {
    const { stubClient } = createStubClient();
    render(<JumpAction targetItemId={TARGET_ITEM_ID} targetLabel="Models" />, {
      wrapper: wrapperFor(stubClient),
    });

    expect(screen.getByRole("button", { name: "Open in canvas: Models" })).toBeInTheDocument();
  });

  it("falls back to a generic label when the resolved target page has no known name", () => {
    const { stubClient } = createStubClient();
    render(<JumpAction targetItemId={TARGET_ITEM_ID} targetLabel={null} />, {
      wrapper: wrapperFor(stubClient),
    });

    expect(screen.getByRole("button", { name: "Open in canvas: target page" })).toBeInTheDocument();
  });
});
