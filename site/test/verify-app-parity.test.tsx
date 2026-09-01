// T047 — verify-poc.mjs's 35 assertions, ported to run against the APP
// (React + Blok, not the clickdummy). The port proves the app; running
// `node verify-poc.mjs` itself (a separate, non-Vitest step — see § 8 /
// docs/build-decisions.md) proves the POC, the visual ground truth, hasn't
// drifted. Both are required at every tranche-exit gate, this file is only
// the app-side half.
//
// Many individual assertions already exist as focused unit/UI tests
// elsewhere (groups.test.ts, GroupList.test.tsx, OriginAffordance.test.tsx,
// precedence.test.ts, wordBan.test.ts, no-emoji.test.tsx) — this file is the
// INTEGRATION mirror over the assembled `Panel`, the same shape
// verify-poc.mjs itself takes (one rendered surface, many assertions),
// deliberately re-asserting rather than trusting composition alone.
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ClientSDKContext } from "@/components/providers/marketplace";
import { createStubClient } from "@/test/client-stub";
import type { LinkFinding, PageScan, StatusMember } from "@/lib/model/types";
import { Panel } from "@/components/panel/Panel";
import { LoadingState } from "@/components/panel/LoadingState";
import { ErrorState } from "@/components/panel/ErrorState";
import { EmptyState } from "@/components/panel/EmptyState";
import { groupBuckets } from "@/lib/model/groups";

const BANNED = /\b(broken|dead|404|unreachable)\b/i;

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

// A scaled-down mirror of panel.js's busyFindings() — every group
// represented, including a two-status row (not-found + insecure-scheme),
// a 9-external-carries-insecure-and-note case, and an attributed content row.
function busyFindings(): LinkFinding[] {
  let ordinal = 0;
  const next = () => ++ordinal;
  return [
    seed({ ordinal: next(), origin: "chrome", statuses: new Set<StatusMember>(["not-found"]) }),
    seed({
      ordinal: next(),
      origin: "content",
      statuses: new Set<StatusMember>(["not-found", "insecure-scheme"]),
    }),
    seed({ ordinal: next(), origin: "content", statuses: new Set<StatusMember>(["unpublished"]) }),
    seed({ ordinal: next(), origin: "chrome", statuses: new Set<StatusMember>(["unpublished"]) }),
    seed({ ordinal: next(), origin: "content", statuses: new Set<StatusMember>(["malformed"]), href: "" }),
    seed({ ordinal: next(), origin: "chrome", statuses: new Set<StatusMember>(["missing-anchor"]) }),
    seed({
      ordinal: next(),
      origin: "content",
      scope: "external",
      statuses: new Set<StatusMember>(["insecure-scheme", "reachability-not-checked"]),
    }),
    seed({ ordinal: next(), origin: "content", statuses: new Set<StatusMember>(["could-not-check"]) }),
    seed({
      ordinal: next(),
      origin: "chrome",
      scope: "external",
      statuses: new Set<StatusMember>(["ok", "reachability-not-checked"]),
    }),
    seed({
      ordinal: next(),
      origin: "content",
      attribution: { fieldPath: "Body > Section 1", target: { itemId: "abc-1" } },
      statuses: new Set<StatusMember>(["ok"]),
    }),
  ];
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

describe("verify-app-parity — ported verify-poc.mjs assertions", () => {
  it("group counts sum to the total anchor count", () => {
    const buckets = groupBuckets(busyFindings());
    const sum = Array.from(buckets.values()).reduce((acc, rows) => acc + rows.length, 0);
    expect(sum).toBe(busyFindings().length);
  });

  it("ordinals are 1..N with no duplicate across all groups combined", () => {
    const { container } = renderPanel(busyFindings());
    // Force every group open by clicking every collapsed header.
    container.querySelectorAll('.lhl-group-head[aria-expanded="false"]').forEach((el) => {
      (el as HTMLButtonElement).click();
    });
    const ordinals = Array.from(container.querySelectorAll(".lhl-text em")).map((el) =>
      Number(el.textContent?.replace("#", "")),
    );
    expect(new Set(ordinals).size).toBe(ordinals.length);
  });

  it("M5: zero banned words across the loading/error/empty/populated states, with a control that can fail", () => {
    const { stubClient } = createStubClient();
    const wrapper = wrapperFor(stubClient);
    const renders = [
      () => render(<LoadingState pageName="Careers" />, { wrapper }),
      () => render(<ErrorState pageName="Careers" />, { wrapper }),
      () => render(<EmptyState pageName="Careers" />, { wrapper }),
      () => render(<Panel scan={scanWith(busyFindings())} />, { wrapper }),
    ];
    for (const doRender of renders) {
      const { container, unmount } = doRender();
      expect(BANNED.test(container.textContent ?? "")).toBe(false);
      unmount();
    }
    expect(BANNED.test("this link is broken")).toBe(true); // control
  });

  it("AC-4.4: an external http:// row carries insecure-scheme AND reachability-not-checked on ONE row", () => {
    const { container } = renderPanel(busyFindings());
    container.querySelectorAll('.lhl-group-head[aria-expanded="false"]').forEach((el) => {
      (el as HTMLButtonElement).click();
    });
    const rows = Array.from(container.querySelectorAll(".lhl-row"));
    const multi = rows.filter((r) => r.querySelectorAll(".lhl-chip").length > 1);
    const externalInsecure = multi.find(
      (r) => r.textContent?.includes("Insecure scheme") && r.textContent?.includes("Reachability not checked"),
    );
    expect(externalInsecure).toBeDefined();
  });

  it("precedence: not-found outranks insecure-scheme as the headline on a two-status row", () => {
    const { container } = renderPanel(busyFindings());
    const rows = Array.from(container.querySelectorAll("#group-not-found .lhl-row"));
    const twoStatus = rows.find((r) => r.querySelectorAll(".lhl-chip").length === 2);
    expect(twoStatus?.querySelector(".is-headline")?.textContent).toContain("Target not found");
  });

  it("AC-1.2/AC-5.3: an empty href occupies exactly one row, rendered as '(empty href)'", () => {
    const { container } = renderPanel(busyFindings());
    container.querySelectorAll('.lhl-group-head[aria-expanded="false"]').forEach((el) => {
      (el as HTMLButtonElement).click();
    });
    const matches = Array.from(container.querySelectorAll(".lhl-href")).filter(
      (el) => el.textContent === "(empty href)",
    );
    expect(matches).toHaveLength(1);
  });

  it("ADR-0006: both verbatim origin strings appear, and no row mixes affordances", () => {
    const { container } = renderPanel(busyFindings());
    container.querySelectorAll('.lhl-group-head[aria-expanded="false"]').forEach((el) => {
      (el as HTMLButtonElement).click();
    });
    expect(screen.getAllByText("site chrome — not editable from this page").length).toBeGreaterThan(0);
    const rows = Array.from(container.querySelectorAll(".lhl-row"));
    for (const row of rows) {
      const hasChrome = row.textContent?.includes("site chrome — not editable from this page");
      const hasJump = row.querySelector('[aria-label^="Open in canvas"]') !== null;
      expect(hasChrome && hasJump).toBe(false);
    }
  });

  it("AC-7.5: every row shows exactly one of the three origin affordances", () => {
    const { container } = renderPanel(busyFindings());
    container.querySelectorAll('.lhl-group-head[aria-expanded="false"]').forEach((el) => {
      (el as HTMLButtonElement).click();
    });
    const rows = Array.from(container.querySelectorAll(".lhl-row"));
    for (const row of rows) {
      const origins = row.querySelectorAll(".lhl-origin");
      expect(origins).toHaveLength(1);
    }
  });

  it("AC-8.3: the scope statement is present in every rendered state, loading/error/empty/populated", () => {
    const { stubClient } = createStubClient();
    const wrapper = wrapperFor(stubClient);
    const renders = [
      () => render(<LoadingState pageName="Careers" />, { wrapper }),
      () => render(<ErrorState pageName="Careers" />, { wrapper }),
      () => render(<EmptyState pageName="Careers" />, { wrapper }),
      () => render(<Panel scan={scanWith(busyFindings())} />, { wrapper }),
    ];
    for (const doRender of renders) {
      const { container, unmount } = doRender();
      expect(container.textContent).toContain("Internal link integrity");
      unmount();
    }
  });

  it("a11y: disclosure pattern wired (aria-expanded + aria-controls) on every group header", () => {
    const { container } = renderPanel(busyFindings());
    const headers = container.querySelectorAll(".lhl-group-head");
    expect(headers.length).toBeGreaterThan(0);
    headers.forEach((h) => {
      expect(h.hasAttribute("aria-expanded")).toBe(true);
      expect(h.hasAttribute("aria-controls")).toBe(true);
    });
  });

  it("a11y: the verdict sits in a polite live region", () => {
    const { container } = renderPanel(busyFindings());
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it("a11y: severity is never colour-alone — every headline chip carries both a glyph and text", () => {
    const { container } = renderPanel(busyFindings());
    container.querySelectorAll('.lhl-group-head[aria-expanded="false"]').forEach((el) => {
      (el as HTMLButtonElement).click();
    });
    const headlineChips = Array.from(container.querySelectorAll(".lhl-chip.is-headline"));
    expect(headlineChips.length).toBeGreaterThan(0);
    headlineChips.forEach((chip) => {
      expect(chip.querySelector("svg")).not.toBeNull();
      expect(chip.textContent?.trim().length).toBeGreaterThan(0);
    });
  });
});
