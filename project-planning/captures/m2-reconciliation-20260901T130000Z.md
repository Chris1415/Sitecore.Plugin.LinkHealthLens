# M2 — anchor-coverage reconciliation (T019)

**Run** `20260831T143222Z` · **Date** 2026-09-01

## Automated leg — real captured page, independent query, in CI

`site/lib/scan/reconcileAnchors.test.ts` ("100% pairwise match against the real captured
Zephira Home page…") runs on every `npm run test` and is the harness's own self-test's
sibling case:

- **Ground truth:** `project-planning/captures/agent-page-html-zephira-home.json` (T007
  capture, Tier-1 tracked, real devex response — see `probe-findings-t008-*.md`).
- **Extracted side:** `extractAnchors(html)` (T017), mapped to `{ href, ordinal }`.
- **Independent side:** a bare `new DOMParser().parseFromString(html).querySelectorAll('a')`
  + `getAttribute('href')`, deliberately re-implemented at the call site rather than
  imported from `extractAnchors` — a genuinely separate query path over the same
  document, not the extractor compared to itself.
- **Result:** **59/59 pairwise matched** (57 with an `href` attribute, 2 without —
  `reconcileAnchors.isFullMatch === true`, `unmatchedExtracted: []`,
  `unmatchedIndependent: []`).
- **Self-test (M4-discipline control):** a deliberately-mismatched fixture
  (`/b`≠`/c` at the same ordinal) is asserted to be CAUGHT — `isFullMatch === false`
  with both sides' unmatched rows named individually. Proves the harness can fail
  before trusting that it passed.

## Outstanding — the live-canvas leg (operator step, not completed in this pass)

T019's full contract is a pairwise match against an **independent DOM query executed in
the real Pages canvas** — the rendered iframe DOM, not a second parse of the same capture
string. That requires the app framed by an authenticated Cloud Portal session
(`marketplace-sdk-host-frame-testing`), which is the same integration boundary T005's
handshake and T014's pixel compare already needed and which this pass has no access to.

**What the automated leg proves:** the extraction and reconciliation logic itself is
correct against real, captured markup, with a working self-test. **What it does not
prove:** that the live canvas's rendered DOM agrees with the captured HTML byte-for-byte
(client-side hydration, script-injected anchors, etc.) — that agreement is exactly what
the live leg is for.

**Recorded, not silently passed** (rule 88) — same treatment as TR-1's T014 outstanding
pixel-compare step.
