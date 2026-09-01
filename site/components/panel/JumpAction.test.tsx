// T037 — JumpAction. RED before GREEN.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ClientSDKContext } from "@/components/providers/marketplace";
import { createStubClient } from "@/test/client-stub";
import type { Attribution } from "@/lib/scan/attribute";
import { JumpAction } from "./JumpAction";

const ATTRIBUTION: Attribution = {
  fieldPath: "headless-main > Section 3",
  target: { itemId: "aaaaaaaa-1111-2222-3333-444444444444" },
};

function wrapperFor(stubClient: ReturnType<typeof createStubClient>["stubClient"]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ClientSDKContext.Provider value={stubClient}>{children}</ClientSDKContext.Provider>;
  };
}

describe("JumpAction", () => {
  it("navigates to the owning item via the sanctioned pages.context mutation — never labelled a jump to a field", () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockResolvedValue({ data: undefined } as never);
    render(<JumpAction attribution={ATTRIBUTION} />, { wrapper: wrapperFor(stubClient) });

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Open in canvas");
    expect(button).not.toHaveTextContent(/jump to field/i);

    fireEvent.click(button);

    expect(mutate).toHaveBeenCalledWith("pages.context", {
      params: { itemId: "aaaaaaaa-1111-2222-3333-444444444444" },
    });
  });

  it("shows the confirmation state after opening — never claiming a field was selected", async () => {
    const { stubClient, mutate } = createStubClient();
    mutate.mockResolvedValue({ data: undefined } as never);
    render(<JumpAction attribution={ATTRIBUTION} />, { wrapper: wrapperFor(stubClient) });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Opened in the canvas")).toBeInTheDocument();
    });
    expect(screen.queryByText(/field selected/i)).toBeNull();
  });

  it("gives the button a richer accessible name than its visible label, naming the owner", () => {
    const { stubClient } = createStubClient();
    render(<JumpAction attribution={ATTRIBUTION} />, { wrapper: wrapperFor(stubClient) });

    expect(
      screen.getByRole("button", { name: "Open in canvas: headless-main > Section 3" }),
    ).toBeInTheDocument();
  });

  it("renders nothing when the attribution carries no resolvable item id", () => {
    const { stubClient } = createStubClient();
    const { container } = render(
      <JumpAction attribution={{ fieldPath: "headless-main > Section 1", target: {} }} />,
      { wrapper: wrapperFor(stubClient) },
    );
    expect(container).toBeEmptyDOMElement();
  });
});
