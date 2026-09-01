// T044 — FindingRow. RED before GREEN.
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ClientSDKContext } from "@/components/providers/marketplace";
import { createStubClient } from "@/test/client-stub";
import type { LinkFinding, StatusMember } from "@/lib/model/types";
import { FindingRow } from "./FindingRow";

function wrapperFor(stubClient: ReturnType<typeof createStubClient>["stubClient"]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ClientSDKContext.Provider value={stubClient}>{children}</ClientSDKContext.Provider>;
  };
}

function seed(overrides: Partial<LinkFinding>): LinkFinding {
  return {
    href: "/x",
    ordinal: 1,
    text: "Some link",
    statuses: new Set<StatusMember>(["ok"]),
    attribution: null,
    targetLabel: null,
    origin: "content",
    ...overrides,
  };
}

function renderRow(finding: LinkFinding) {
  const { stubClient } = createStubClient();
  return render(
    <ul>
      <FindingRow finding={finding} />
    </ul>,
    { wrapper: wrapperFor(stubClient) },
  );
}

describe("FindingRow", () => {
  it("a two-status row renders two chips with the higher-precedence one headlined", () => {
    const { container } = renderRow(
      seed({ statuses: new Set<StatusMember>(["not-found", "insecure-scheme"]), origin: "chrome" }),
    );
    const chips = container.querySelectorAll(".lhl-chip");
    expect(chips).toHaveLength(2);
    expect(chips[0].className).toContain("is-headline");
    expect(chips[0].textContent).toContain("Target not found");
  });

  it("an empty href renders '(empty href)' in exactly one row", () => {
    renderRow(seed({ href: "", statuses: new Set<StatusMember>(["malformed"]), origin: "chrome" }));
    expect(screen.getAllByText("(empty href)")).toHaveLength(1);
  });

  it("renders the anchor text and ordinal", () => {
    renderRow(seed({ text: "Careers", ordinal: 7 }));
    expect(screen.getByText("Careers")).toBeInTheDocument();
    expect(screen.getByText("#7")).toBeInTheDocument();
  });

  it("renders the headline detail sentence for a real finding", () => {
    renderRow(seed({ statuses: new Set<StatusMember>(["not-found"]), origin: "chrome" }));
    expect(screen.getByText("No item in the CM matches this path.")).toBeInTheDocument();
  });

  it("a bare ok row (no reachability note) renders no detail sentence", () => {
    const { container } = renderRow(seed({ statuses: new Set<StatusMember>(["ok"]) }));
    expect(container.querySelector(".lhl-detail")).toBeNull();
  });

  it("an ok row carrying the standing note gets the reachability detail sentence", () => {
    renderRow(
      seed({
        scope: "external",
        statuses: new Set<StatusMember>(["ok", "reachability-not-checked"]),
      }),
    );
    expect(
      screen.getByText(
        "This app never contacts a destination. Its format and scheme were checked; whether it responds was not.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the origin affordance for a chrome row", () => {
    renderRow(seed({ origin: "chrome" }));
    expect(screen.getByText("site chrome — not editable from this page")).toBeInTheDocument();
  });
});

// Runtime contrast assertion (not merely `toHaveClass`): chips render
// `foreground` on `muted` — computed here from the SAME token values T010
// measured off the real `app/globals.css` (see docs/build-decisions.md §
// T010), because jsdom's `getComputedStyle` does not reliably resolve
// Tailwind v4 `@theme`-nested `var()` chains the way a real browser does. A
// class can be present while the token it names collapses (T010's own
// measured-failure list — e.g. `primary-foreground` on `primary` at 1.48:1).
describe("FindingRow — chip contrast (foreground on muted)", () => {
  function relativeLuminance([r, g, b]: [number, number, number]): number {
    const chan = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const [R, G, B] = [chan(r), chan(g), chan(b)];
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }
  function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
    const L1 = relativeLuminance(a);
    const L2 = relativeLuminance(b);
    const [lighter, darker] = L1 >= L2 ? [L1, L2] : [L2, L1];
    return (lighter + 0.05) / (darker + 0.05);
  }
  function composite(fg: [number, number, number, number], bg: [number, number, number]): [number, number, number] {
    const [r, g, b, a] = fg;
    return [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
  }

  it("light mode: --foreground (blackAlpha-900 over white) on --muted (gray-50) passes AA (>= 4.5:1)", () => {
    const muted: [number, number, number] = [0xf7, 0xf7, 0xf7]; // --color-gray-50
    const foreground = composite([0, 0, 0, 0.94], muted); // --color-blackAlpha-900
    expect(contrastRatio(foreground, muted)).toBeGreaterThanOrEqual(4.5);
  });

  it("dark mode: --foreground (white) on --muted (gray-900) passes AA (>= 4.5:1)", () => {
    const muted: [number, number, number] = [0x21, 0x21, 0x21]; // --color-gray-900
    const foreground: [number, number, number] = [0xff, 0xff, 0xff];
    expect(contrastRatio(foreground, muted)).toBeGreaterThanOrEqual(4.5);
  });
});
