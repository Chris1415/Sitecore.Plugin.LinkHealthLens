// T028 RED — normalizeInternalTarget. ADR-0009 addendum: strip query +
// fragment, exclude non-page paths, join to the site root.
import { describe, expect, it } from "vitest";
import { NO_HREF } from "./extractAnchors";
import { normalizeInternalTarget } from "./normalizeInternalTarget";

const ROOT = "/sitecore/content/Zephira-Brand/Zephira/Home";

describe("normalizeInternalTarget", () => {
  it("joins a plain relative href to the site root", () => {
    expect(normalizeInternalTarget("/destinations", ROOT)).toBe(`${ROOT}/destinations`);
  });

  it("strips the query string before joining (the seven ?to= variants collapse to one)", () => {
    expect(normalizeInternalTarget("/book?to=Lisbon", ROOT)).toBe(`${ROOT}/book`);
    expect(normalizeInternalTarget("/book?to=Accra", ROOT)).toBe(`${ROOT}/book`);
  });

  it("strips a fragment before joining", () => {
    expect(normalizeInternalTarget("/book#top", ROOT)).toBe(`${ROOT}/book`);
  });

  it("returns null for a fragment-only href (targets the current page, not a lookup)", () => {
    expect(normalizeInternalTarget("#content", ROOT)).toBeNull();
  });

  it("returns null for an empty href", () => {
    expect(normalizeInternalTarget("", ROOT)).toBeNull();
  });

  it("returns null for the no-href sentinel", () => {
    expect(normalizeInternalTarget(NO_HREF, ROOT)).toBeNull();
  });

  it("excludes a media path (would MISS by construction, not a real not-found)", () => {
    expect(normalizeInternalTarget("/-/media/foo.pdf", ROOT)).toBeNull();
    expect(normalizeInternalTarget("/-/jssmedia/bar.png", ROOT)).toBeNull();
  });

  it("returns null when no site root path is known", () => {
    expect(normalizeInternalTarget("/destinations", undefined)).toBeNull();
  });

  it("resolves the site root itself for a root-only href", () => {
    expect(normalizeInternalTarget("/", ROOT)).toBe(ROOT);
  });
});
