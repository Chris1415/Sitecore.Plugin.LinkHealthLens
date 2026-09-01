// T036 — attribute. RED before GREEN.
import { describe, expect, it } from "vitest";
import { attribute } from "./attribute";

const TWO_SECTION_PAGE = `<!DOCTYPE html><html><body>
  <main>
    <section class="hero"><a href="/book">Book now</a></section>
    <section class="destgroup"><a href="/destinations/Lisbon">Lisbon</a><a href="/destinations/Dubai">Dubai</a></section>
  </main>
</body></html>`;

const TWO_RENDERINGS = JSON.stringify([
  { id: "r1", instanceId: "i1", placeholderKey: "headless-main", dataSource: "11111111-1111-1111-1111-111111111111" },
  { id: "r2", instanceId: "i2", placeholderKey: "headless-main", dataSource: "22222222-2222-2222-2222-222222222222" },
]);

describe("attribute", () => {
  it("attributes an anchor to the datasource of its section's matching-order rendering", () => {
    // ordinal 1 = "/book" (inside the first <section>)
    const result = attribute(1, TWO_SECTION_PAGE, TWO_RENDERINGS);
    expect(result).toEqual({
      fieldPath: "headless-main > Section 1",
      target: { itemId: "11111111-1111-1111-1111-111111111111" },
    });
  });

  it("attributes a second anchor in the same section to the same rendering", () => {
    // ordinal 3 = "/destinations/Dubai" (second anchor in the second <section>)
    const result = attribute(3, TWO_SECTION_PAGE, TWO_RENDERINGS);
    expect(result).toEqual({
      fieldPath: "headless-main > Section 2",
      target: { itemId: "22222222-2222-2222-2222-222222222222" },
    });
  });

  it("returns null when presentationDetails is missing entirely", () => {
    expect(attribute(1, TWO_SECTION_PAGE, undefined)).toBeNull();
  });

  it("returns null when presentationDetails does not parse as JSON", () => {
    expect(attribute(1, TWO_SECTION_PAGE, "{not json")).toBeNull();
  });

  it("returns null when the section count and rendering count disagree — refuses to guess", () => {
    const oneRendering = JSON.stringify([
      { id: "r1", instanceId: "i1", placeholderKey: "headless-main", dataSource: "11111111-1111-1111-1111-111111111111" },
    ]);
    expect(attribute(1, TWO_SECTION_PAGE, oneRendering)).toBeNull();
  });

  it("returns null when there is no <main> in the page", () => {
    const noMain = `<!DOCTYPE html><html><body><a href="/x">x</a></body></html>`;
    expect(attribute(1, noMain, TWO_RENDERINGS)).toBeNull();
  });

  it("returns null when the matched rendering has no dataSource", () => {
    const noDataSource = JSON.stringify([
      { id: "r1", instanceId: "i1", placeholderKey: "headless-main", dataSource: "" },
      { id: "r2", instanceId: "i2", placeholderKey: "headless-main", dataSource: "22222222-2222-2222-2222-222222222222" },
    ]);
    expect(attribute(1, TWO_SECTION_PAGE, noDataSource)).toBeNull();
  });

  it("returns null for an out-of-range ordinal", () => {
    expect(attribute(999, TWO_SECTION_PAGE, TWO_RENDERINGS)).toBeNull();
  });
});
