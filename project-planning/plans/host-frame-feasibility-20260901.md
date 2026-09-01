# Host-frame visual pass — automation feasibility probe

**Date:** 2026-09-01
**Probe scope:** can the per-tranche pixel-compare-against-POC step (currently unperformed for TR-1) be automated end-to-end, or does it need a human at each tranche exit?
**Skill loaded:** `marketplace-sdk-host-frame-testing`

## Verdict

**Not automatable end-to-end. Automatable-with-caveats after a one-time operator login, but the caveat is a policy decision, not just a technical one.** Every tranche exit needs, at minimum, an operator to open a browser and authenticate — the question of whether that session can then be *reused* across the remaining five tranches is answered "possible but explicitly out of scope by default" by the skill's own contract, not by anything I hit technically.

## What was tested and how

No Playwright MCP tool was present in this session's toolset (only `Bash` was available), so per the agent's signature behavior this was driven from a Node script through `Bash`, using the same Playwright the repo already resolves (`playwright@1.62.1`, Chromium build `1234`, already present in `C:\Users\chah\AppData\Local\ms-playwright`). A throwaway script (`chromium.launch({ headless: true })` → fresh `newContext()` → `page.goto('https://portal.sitecorecloud.io')`) navigated to the real Cloud Portal entry point.

**No Cloud Portal Pages canvas URL was supplied for this run** (the task named the org/tenant/sites but not the deep-link URL the host-frame skill requires as a mandatory input), so the probe could only reach as far as the portal's own auth boundary — it could not test iframe-location or clipping (§ 3-4 of the skill) against a real canvas.

## Evidence

A fresh, cookie-less browser context requesting `https://portal.sitecorecloud.io` was immediately redirected to:

```
https://auth.sitecorecloud.io/u/login/identifier?state=...
```

titled *"Log in | Sitecore Cloud Portal"*, rendering an Auth0 Universal Login **identifier-first** form (email address field → Continue; no password field shown yet, no visible SSO/social buttons on this first screen). Screenshot captured at `C:\Users\chah\AppData\Local\Temp\claude\...\scratchpad\probe-https___portal_sitecorecloud_io.png` (not committed — throwaway evidence, reproducible by re-running the script).

I stopped at this screen deliberately. Per the task's constraint I did not enter any email address to see what the next step resolves to (password field vs. federated SSO redirect vs. MFA challenge) — doing so risks triggering a real magic-link/OTP send to whatever account the devex org's automation would target, and I do not know which identity (personal `christian@hahn-solo.net` vs. a Dev Relations org account) is the correct one to use for the devex tenant. That determination has to be the operator's, made live.

So concretely:

- **Fresh headless Playwright has zero usable session against Cloud Portal.** Confirmed — no cached cookies, no auto-redirect past the identifier screen.
- **Login mechanism specifics (SSO / MFA / device trust) — unconfirmed.** The identifier-first Auth0 pattern strongly suggests the next step branches by email domain (password vs. federated IdP), which is consistent with an org-managed account likely carrying MFA, but I did not push past the identifier field to confirm, for the reason above.
- **No mechanism in this environment for a human to interact live with a Bash-spawned browser mid-turn.** This session had no Playwright MCP (which is what would normally let the operator "see" the browser and type into it turn-by-turn) and a Bash-driven headless launch has no display for a human to intervene in. A real interactive handoff needs either the MCP tool present, or a headed launch on a machine where the operator is physically watching the screen the process opens on — neither was confirmable from here.

## Reusability — the actual crux

Playwright mechanically supports exactly this pattern: interactive login once → `context.storageState({ path })` → later runs `browser.newContext({ storageState: path })` to resume the session without re-authenticating, until the underlying tokens expire or the IdP invalidates the session (device/IP change, MFA re-challenge policy, etc.).

That is a **known, working Playwright feature** — nothing observed here contradicts it being viable for Cloud Portal specifically. But the `marketplace-sdk-host-frame-testing` skill this task told me to load is explicit on this exact point:

> "No persisted storage state. Each test run starts a fresh browser session and goes through interactive login. This is by explicit preference — do not introduce a 'remember me' optimization without asking."

So the honest answer has two layers:
1. **Technically:** storage-state reuse is very likely to work, standard Playwright mechanism, low implementation risk.
2. **As currently authorized:** it is explicitly disallowed by default. The skill's own contract requires interactive login on *every* run unless the operator opts in.

I did not treat "the skill says no" as something to route around — the task asked whether this is automatable, and the honest answer is that the tooling can do it, but the standing policy this project already wrote for itself says not to, absent an explicit ask.

## Recommendation

- **Do not build a scripted six-tranche visual pass on an assumed reusable session** without first asking the operator whether they want to opt into `storageState` reuse for this specific product (a one-time question, not a per-run one).
- **If the operator declines or doesn't answer:** batch the visual pass at the `build` gate (single `/test` close), not per tranche — one interactive login covering one pass, matching what the run is already structured to allow (rigor gates are pick-any, and `build`/`final` is explicitly the one look at the whole implementation). This is the safe default and needs no policy change.
- **If the operator opts in:** the recipe is mechanical — one interactive login via a headed browser (needs either the Playwright MCP tool available in-session, or a headed launch the operator is physically watching), `context.storageState()` saved to a gitignored path under the product's `project-planning/`, reused via `newContext({ storageState })` for the remaining five tranche exits, re-validated (probe for the login-page chrome per the skill's own § 2 recipe) before trusting it each time in case the session expired.
- Either way, **the actual host URL (Cloud Portal Pages canvas deep link for a page in the devex tenant) is still a missing mandatory input** — get that from the operator before the first real attempt, whichever cadence is chosen.

## What was NOT verified (explicitly out of scope for this probe)

- iframe location by origin against a real Pages canvas (§ 3 of the skill)
- clipping / state-driving / POC comparison mechanics (§ 4-6)
- the exact identity-provider branch (password / SSO / MFA) Cloud Portal takes past the identifier screen for the devex org
