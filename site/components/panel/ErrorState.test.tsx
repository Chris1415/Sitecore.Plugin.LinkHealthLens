// T013 / T014 — error is framed as a panel failure, never a verdict about
// the page or its links.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("carries role=alert on the scroll region and the not-a-verdict framing", () => {
    render(<ErrorState />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "not a verdict about the page or its links",
    );
  });

  it("renders the Try again control and calls the retry handler", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    screen.getByRole("button", { name: /try again/i }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("keeps the scope statement but suppresses its disclosure toggle", () => {
    render(<ErrorState />);
    expect(
      screen.getByText("Internal link integrity — reachability is never checked."),
    ).toBeInTheDocument();
    expect(screen.queryByText("What is checked?")).toBeNull();
  });

  it("never uses the banned words about the page or the links", () => {
    render(<ErrorState pageName="Careers - Open Roles" />);
    const text = document.body.textContent ?? "";
    for (const banned of ["broken", "dead", "404", "unreachable"]) {
      expect(text.toLowerCase()).not.toContain(banned);
    }
  });
});
