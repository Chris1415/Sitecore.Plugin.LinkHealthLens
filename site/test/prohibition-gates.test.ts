// T048 — the four prohibition gates that define this product (§ 4c-1).
// Static scans over the SHIPPED source tree (app/, components/, lib/ —
// production code only, never test files, which are allowed to name a
// banned pattern as a string literal for their own control assertions).
// Each gate carries its own control assertion proving it can fail — "a gate
// that cannot fail is worse than no gate" (the task's own text).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SITE_ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["app", "components", "lib"];
// components/ui/ is Blok registry infrastructure — generated, not
// hand-authored, and (per docs/build-decisions.md T009) two of its members
// aren't even wired into any rendered state. It is exempt from the shipped-
// copy gates below the same way `86-component-authorability`'s scaffold
// exemption treats generated wrappers, and it never carries a network call
// or a mutation of its own.
const EXCLUDE_DIR_NAMES = new Set(["node_modules", ".next", "__tests__", "ui"]);

function isTestFile(file: string): boolean {
  return /\.test\.(ts|tsx)$/.test(file);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !isTestFile(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function productionFiles(): { file: string; content: string }[] {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    const full = path.join(SITE_ROOT, dir);
    if (fs.existsSync(full)) walk(full, files);
  }
  return files.map((file) => ({ file, content: fs.readFileSync(file, "utf8") }));
}

/** Strips `//` and `/* … *‍/` comments — good enough for this scan's
 * purpose (finding real code, not documentation prose that happens to
 * mention a pattern inside a comment, e.g. a `.d.ts` shape quoted in a
 * `//` note). Not a full parser; production files here are typical enough
 * that a naive strip does not eat real code. */
function stripComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

/** All string-literal BODIES (quotes stripped) in a source file. */
function stringLiteralBodies(content: string): string[] {
  const matches = content.match(/(["'`])(?:\\.|(?!\1).)*\1/g) ?? [];
  return matches.map((m) => m.slice(1, -1));
}

describe("T048 — prohibition gate 1 (FR-18): no outbound request to any link target", () => {
  // The only network-shaped call anywhere in this app is the portal bridge
  // (client.query / client.mutate). A raw fetch/XHR/HEAD/beacon call against
  // an extracted href would be indistinguishable from a legitimate one by
  // pattern alone, so the gate is a floor: NONE of these APIs may appear in
  // production source at all (ADR-0002: no backing route, no server-side
  // surface, so there is no legitimate reason for any of them to exist).
  const FETCH_CALL = /\bfetch\s*\(/;
  const XHR = /\bnew\s+XMLHttpRequest\b/;
  const BEACON = /\bnavigator\.sendBeacon\b/;
  const isForbidden = (s: string) => FETCH_CALL.test(s) || XHR.test(s) || BEACON.test(s);

  it("no forbidden network primitive appears in shipped production source", () => {
    const offenders = productionFiles().filter(({ content }) => isForbidden(content));
    expect(offenders.map((o) => o.file)).toEqual([]);
  });

  it("CONTROL: the detector fires on a planted fetch/XHR/beacon call", () => {
    expect(isForbidden('await fetch("https://example.com")')).toBe(true);
    expect(isForbidden("new XMLHttpRequest()")).toBe(true);
    expect(isForbidden('navigator.sendBeacon("/x")')).toBe(true);
  });
});

describe("T048 — prohibition gate 2 (FR-19): no mutation beyond the T037-sanctioned canvas call", () => {
  // Three legitimate `client.mutate(...)` call sites exist, and only three
  // (§ run brief): JumpAction.tsx's sanctioned canvas navigation
  // (`pages.context`), plus TWO read-only GraphQL passthroughs the SDK
  // mis-types as mutations (`marketplace-sdk-xmc` § 6c) —
  // resolveItemByPath.ts (`xmc.authoring.graphql`) and
  // checkLiveViaEdge.ts (`xmc.live.graphql`). A naive "no client.mutate"
  // grep would fail a correct build; the gate instead pins the EXACT
  // allowed set and its keys, and fails on anything beyond it.
  const MUTATE_CALL = /client\.mutate\s*\(\s*["'`]([^"'`]+)["'`]/g;
  const ALLOWED: Record<string, string> = {
    "JumpAction.tsx": "pages.context",
    "resolveItemByPath.ts": "xmc.authoring.graphql",
    "checkLiveViaEdge.ts": "xmc.live.graphql",
  };

  it("every client.mutate(...) call site is one of the three allowed, with the expected key", () => {
    const found: Record<string, string[]> = {};
    for (const { file, content } of productionFiles()) {
      const code = stripComments(content);
      for (const m of code.matchAll(MUTATE_CALL)) {
        const name = path.basename(file);
        (found[name] ??= []).push(m[1]);
      }
    }
    expect(Object.keys(found).sort()).toEqual(Object.keys(ALLOWED).sort());
    for (const [name, keys] of Object.entries(found)) {
      expect(keys).toEqual([ALLOWED[name]]);
    }
  });

  it("CONTROL: the detector fires on a planted extra mutate call in a disallowed file", () => {
    const code = 'client.mutate("some.other.key", {})';
    expect([...code.matchAll(MUTATE_CALL)].length).toBe(1);
  });
});

describe("T048 — prohibition gate 3 (NFR-3): no persistence, telemetry or cookie write", () => {
  const FORBIDDEN =
    /\b(localStorage|sessionStorage|indexedDB|document\.cookie|navigator\.sendBeacon|gtag\s*\(|dataLayer\.push)\b/;

  it("no storage write / telemetry call appears in shipped production source", () => {
    const offenders = productionFiles().filter(({ content }) => FORBIDDEN.test(content));
    expect(offenders.map((o) => o.file)).toEqual([]);
  });

  it("CONTROL: the detector fires on a planted localStorage write", () => {
    expect(FORBIDDEN.test('localStorage.setItem("x", "y")')).toBe(true);
    expect(FORBIDDEN.test('document.cookie = "x=y"')).toBe(true);
  });
});

describe("T048 — prohibition gate 4 (M5): the global banned-word list, scoped to shipped UI copy", () => {
  const BANNED = /\b(broken|dead|404|unreachable)\b/i;

  // Scoped to shipped UI COPY, never code identifiers or SDK-layer
  // diagnostics: `lib/panel/copy.ts` (the exported copy constants every
  // component renders from) plus every `.tsx` component file outside the
  // vendored `components/ui/` registry. `getLivePageState.ts` (a `.ts` SDK
  // module, never a `.tsx` component) legitimately handles a literal HTTP
  // 404 as DATA (ADR-0008) and logs it to the developer console — neither
  // is rendered to an editor, so neither is "UI copy" (task text: "the word
  // ban applies to UI copy, not to code identifiers").
  function uiCopyFiles(): { file: string; content: string }[] {
    return productionFiles().filter(
      ({ file }) => file.endsWith(path.join("lib", "panel", "copy.ts")) || file.endsWith(".tsx"),
    );
  }

  it("no banned word appears inside a shipped UI copy string literal", () => {
    const offenders: string[] = [];
    for (const { file, content } of uiCopyFiles()) {
      const code = stripComments(content);
      for (const body of stringLiteralBodies(code)) {
        if (BANNED.test(body)) offenders.push(`${file}: ${body}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("CONTROL: the detector fires on a planted banned word inside a string literal", () => {
    const sample = 'const x = "this link is broken";';
    const found = stringLiteralBodies(sample).some((body) => BANNED.test(body));
    expect(found).toBe(true);
  });
});
