// T046 — zero emoji codepoints anywhere in rendered output. Ported pattern
// from verify-poc.mjs's own a11y assertion (`/[\u{1F000}-\u{1FAFF}✅❌⚠]/u`):
// every glyph is a `lucide-react` svg on `currentColor`, never a colour-emoji
// bitmap that ignores `color` and dark mode (blok-theming). Regression, with
// a control assertion proving the sweep can fail.
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ClientSDKContext } from "@/components/providers/marketplace";
import { createStubClient } from "@/test/client-stub";
import type { LinkFinding, PageScan, StatusMember } from "@/lib/model/types";
import { Panel } from "@/components/panel/Panel";
import { LoadingState } from "@/components/panel/LoadingState";
import { ErrorState } from "@/components/panel/ErrorState";
import { EmptyState } from "@/components/panel/EmptyState";

const EMOJI = /[\u{1F000}-\u{1FAFF}✅❌⚠]/u;

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

function busyScan(): PageScan {
  const findings: LinkFinding[] = [
    seed({ ordinal: 1, statuses: new Set<StatusMember>(["not-found"]), origin: "chrome" }),
    seed({ ordinal: 2, statuses: new Set<StatusMember>(["unpublished"]) }),
    seed({ ordinal: 3, statuses: new Set<StatusMember>(["malformed"]) }),
    seed({ ordinal: 4, statuses: new Set<StatusMember>(["missing-anchor"]) }),
    seed({
      ordinal: 5,
      scope: "external",
      statuses: new Set<StatusMember>(["insecure-scheme", "reachability-not-checked"]),
    }),
    seed({ ordinal: 6, statuses: new Set<StatusMember>(["could-not-check"]) }),
    seed({
      ordinal: 7,
      scope: "external",
      statuses: new Set<StatusMember>(["ok", "reachability-not-checked"]),
    }),
    seed({ ordinal: 8, statuses: new Set<StatusMember>(["ok"]) }),
  ];
  return {
    page: { id: "p1", path: "/careers", language: "en", name: "Careers" },
    findings,
    health: { pageHtml: true, hosts: true, resolution: true, liveState: true },
    completedAt: Date.now(),
  };
}

describe("no-emoji sweep across every rendered state", () => {
  it("the populated panel contains zero emoji codepoints", () => {
    const { stubClient } = createStubClient();
    const { container } = render(<Panel scan={busyScan()} />, { wrapper: wrapperFor(stubClient) });
    expect(EMOJI.test(container.textContent ?? "")).toBe(false);
  });

  it("loading / error / empty states contain zero emoji codepoints", () => {
    const { stubClient } = createStubClient();
    const wrapper = wrapperFor(stubClient);
    for (const El of [
      () => <LoadingState pageName="Careers" />,
      () => <ErrorState pageName="Careers" />,
      () => <EmptyState pageName="Careers" />,
    ]) {
      const { container, unmount } = render(El(), { wrapper });
      expect(EMOJI.test(container.textContent ?? "")).toBe(false);
      unmount();
    }
  });

  it("CONTROL: the detector can actually fail on a planted emoji", () => {
    expect(EMOJI.test("This is fine ✅")).toBe(true);
    expect(EMOJI.test("Warning ⚠")).toBe(true);
  });
});
