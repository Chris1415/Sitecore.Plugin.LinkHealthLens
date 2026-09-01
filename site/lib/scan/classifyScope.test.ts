// T022 — classifyScope. RED before GREEN.
//
// FR-5, amended by the T0 addendum (2026-09-01): the tenant host list carries
// `targetHostname: ""` on 7 of 7 sites (probe (c)), so scope is decided by
// href SHAPE, never by matching against a host set. Relative ⇒ internal;
// absolute (any scheme, incl. protocol-relative `//host/x`) ⇒ external;
// mailto:/tel:/javascript: ⇒ non-navigational, exempt from the scope axis.
import { describe, expect, it } from "vitest";
import { classifyScope } from "./classifyScope";

describe("classifyScope", () => {
  it("classifies a path-relative href as internal", () => {
    expect(classifyScope("/book")).toBe("internal");
  });

  it("classifies a fragment-only href as internal", () => {
    expect(classifyScope("#content")).toBe("internal");
  });

  it("classifies a query-string-only href as internal", () => {
    expect(classifyScope("?to=Lisbon")).toBe("internal");
  });

  it("classifies an absolute https:// href as external", () => {
    expect(classifyScope("https://example.com/x")).toBe("external");
  });

  it("classifies an absolute href with an uppercase scheme as external", () => {
    expect(classifyScope("HTTPS://EXAMPLE.COM")).toBe("external");
  });

  it("classifies a protocol-relative href as external", () => {
    expect(classifyScope("//other-host.example/x")).toBe("external");
  });

  it("classifies mailto: as non-navigational", () => {
    expect(classifyScope("mailto:hello@example.com")).toBe("non-navigational");
  });

  it("classifies tel: as non-navigational", () => {
    expect(classifyScope("tel:+15551234567")).toBe("non-navigational");
  });

  it("classifies javascript: as non-navigational", () => {
    expect(classifyScope("javascript:void(0)")).toBe("non-navigational");
  });

  it("real-page check: all 56 relative hrefs on the captured Zephira Home page classify internal, 0 absolute", () => {
    // Ground truth: project-planning/captures/agent-page-html-zephira-home.json
    // (Tier-1 tracked, T007). 57 anchors carry an href; 56 are relative
    // (incl. the 7 `?to=` query-string variants), 1 is the `#content` anchor.
    const hrefs = [
      "/", "/book", "/stories", "/book/manage", "/destinations/Lisbon",
      "/book?to=Lisbon", "/destinations/Dubai", "/book?to=Dubai",
      "/destinations/Hong-Kong", "/book?to=Hong%20Kong", "/destinations/Accra",
      "/destinations/Barcelona", "/destinations/New-York", "/destinations/Istanbul",
      "/book?to=New%20York", "/book?to=Accra", "/book?to=Barcelona",
      "/book?to=Istanbul", "/stories/Reading-The-Air", "#content",
    ];
    for (const href of hrefs) {
      expect(classifyScope(href)).toBe("internal");
    }
  });
});
