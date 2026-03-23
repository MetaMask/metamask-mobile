# Agentic System Design

The agentic toolkit is a system that lets AI agents write code, verify it against a running
app, and iterate — all without human intervention. It provides a fast, local feedback loop:
the agent gets signal in seconds from a live app instead of waiting for heavyweight test
frameworks. It complements E2E tests (Detox) and CI — it doesn't replace them. It's built
on three pillars.

The toolkit was built by the perps team but designed for any team in MetaMask Mobile. The
infrastructure (`scripts/perps/agentic/teams/`) auto-discovers team directories — any team
can add flows, recipes, and pre-conditions without modifying shared code.

---

## The Three Pillars

1. **Wallet Fixtures & Preflight** — Get to a known state in seconds, not minutes
2. **Recipe & Flow System** — Parameterized, composable, deterministic test sequences
3. **CDP Instrumentation** — Direct app access via Chrome DevTools Protocol, no vision model needed

These aren't independent tools. They form a flywheel:

```
Wallet Fixtures ──→ Known State ──→ Recipes execute deterministically
       ↑                                         │
       └──── Clean state for next iteration ←────┘
                        ↑
               CDP: text-based assertions
               (no screenshots, no vision tokens)
```

---

## Pillar 1: Wallet Fixtures & Preflight

### The problem

A fresh MetaMask wallet requires ~15 manual steps to reach a usable state: create wallet,
back up seed phrase, dismiss onboarding modals, import trading accounts, enable feature
flags, suppress consent screens, navigate to the target feature. An E2E test takes 2-5
minutes for this. An agent doing it via UI automation burns tokens on every step and hits
flaky modal dismissals along the way.

### The solution

`wallet-fixture.json` defines the desired wallet state declaratively — password, accounts
(mnemonic or private key), and settings that suppress friction:

```json
{
  "password": "...",
  "accounts": [
    { "type": "mnemonic", "value": "twelve word seed ..." },
    { "type": "privateKey", "value": "0xabc...", "name": "Trading" }
  ],
  "settings": {
    "metametrics": false,
    "skipGtmModals": true,
    "skipPerpsTutorial": true,
    "autoLockNever": true
  }
}
```

`setup-wallet.sh` reads this fixture and calls `__AGENTIC__.setupWallet(fixture)` — a single
CDP eval that restores the wallet, imports accounts, dispatches all onboarding flags,
suppresses modals, and navigates to wallet home. Pure JS execution, no UI navigation, no
modal handling, no screenshot verification.

`preflight.sh` orchestrates the full environment pipeline:

| Scenario                           | What runs                           | Time    |
| ---------------------------------- | ----------------------------------- | ------- |
| Cold start (first time)            | build + boot + Metro + CDP + wallet | ~150s   |
| Warm start (Metro running)         | boot device + CDP + wallet          | ~10-20s |
| Hot iteration (everything running) | wallet restore if needed            | ~2-5s   |

**Key insight: isolation.** Each agent run starts from a known wallet state. No leaking
state between iterations. The fixture is the contract — deterministic input produces
deterministic starting point.

---

## Pillar 2: Recipe & Flow System

### The problem

E2E tests (Detox) take 90-300 seconds per test, run serially, and produce failures that
require screenshots to diagnose. CI on GitHub can take up to 20 minutes per push. These
tools remain essential for final validation, but an agent iterating on a fix needs faster
signal during development.

### The solution

JSON-based recipes and flows executed via `validate-recipe.sh`, organized by team under
`scripts/perps/agentic/teams/`. Each team directory follows the same structure:

- `teams/<team>/flows/` — flow JSONs validated by `validate-flow-schema.js`
- `teams/<team>/evals.json` — quick eval refs (e.g. `perps/positions`, `swap/quote-status`)
- `teams/<team>/evals/` — named eval ref collections
- `teams/<team>/pre-conditions.js` — namespaced checks (e.g. `perps.ready_to_trade`, `swap.has_valid_quote`)

`lib/registry.js` auto-discovers all team directories and merges their pre-conditions at load
time. Duplicate keys across teams cause a load-time error — namespace enforcement by convention.
A new team adds a directory and immediately gets access to all shared infrastructure.

**Recipes** are single CDP eval expressions — state snapshots that run in <1 second.
The path `<team>/<name>` is the team boundary — `eval-ref perps/positions` is a perps team
eval ref, `eval-ref swap/quote-status` would be a swap team eval ref.

**Flows** are multi-step UI sequences — navigate, press, type, wait, assert. They run in
10-30 seconds. Parameterized with `{{symbol}}`, composable via `flow_ref` and `eval_ref`.

| Dimension     | E2E (Detox)                 | Recipes/Flows                             |
| ------------- | --------------------------- | ----------------------------------------- |
| Speed         | 90-300s/test                | 1-30s/flow                                |
| Flakiness     | High (animations, timing)   | Low (explicit waits, direct fiber access) |
| Output        | Screenshots (vision tokens) | JSON text (cheap)                         |
| Composability | Copy entire test files      | `flow_ref` + `eval_ref` + params          |

Flows declare their requirements via pre-conditions. If the wallet isn't unlocked or no
position exists, the runner aborts with a clear error before wasting time on doomed steps.

### Recipes are the agent's eyes

Instead of "take a screenshot and look at it" (thousands of vision tokens), the agent runs
`recipe perps/positions` and gets structured JSON back. The assertion system (`eq`, `gt`,
`length_gt`, `contains`) lets the agent verify state without seeing the screen. One recipe
call costs one tool invocation. One screenshot costs a vision model call plus the tokens
to describe what's in the image.

### Recipes are proof

When an agent fixes a bug, it writes a recipe that reproduces the bug (assertion fails),
applies the fix, re-runs the recipe (assertion passes). The recipe IS the proof. It goes
into the PR as `recipe.json` — reviewers can re-run it to verify. The same recipe becomes
a regression check for future changes.

---

## Pillar 3: CDP Instrumentation

### The problem

Traditional mobile test automation requires either a native framework (Detox, Appium) with
heavy setup, or coordinate-based tapping that breaks on layout changes.

### The solution

The `__AGENTIC__` bridge on `globalThis`, installed by `AgenticService.ts` in `__DEV__`
mode when NavigationService sets its ref. It exposes:

- **Navigation**: `navigate()`, `getRoute()`, `canGoBack()`, `goBack()`
- **Accounts**: `listAccounts()`, `getSelectedAccount()`, `switchAccount()`
- **UI interaction**: `pressTestId()`, `scrollView()`, `setInput()`
- **Setup**: `setupWallet()` (the 11-step initialization from Pillar 1)

`pressTestId` walks the React fiber tree via `__REACT_DEVTOOLS_GLOBAL_HOOK__` to find the
component with a matching `testID` prop and calls its `onPress` handler directly. No
coordinates, no image recognition, no screenshots. Same for `setInput` (calls
`onChangeText`) and `scrollView` (calls `scrollTo` on the nearest scrollable ancestor).

`cdp-bridge.js` connects via Metro's Hermes WebSocket — same protocol on iOS and Android.
Everything returns structured JSON.

**Key insight: the bridge turns the running app into an API.** Instead of "look at the
screen, find the button, tap at coordinates", the agent says
`press perps-market-details-long-button`. Instead of "take a screenshot to check what
screen we're on", the agent evaluates `getRoute().name` and gets `"PerpsMarketDetails"`
as a string.

---

## The Flywheel: How It All Connects

### Agent development cycle

1. Agent gets a task (bug fix, new feature, PR review)
2. Preflight restores wallet to known state (~2-5s warm)
3. Agent reads code, understands the problem
4. Agent writes a recipe that reproduces the bug (assertion fails)
5. Agent fixes the code
6. Metro hot-reloads (~2s)
7. Agent re-runs the recipe (assertion passes) — **sub-minute verification**
8. Agent commits fix + recipe as PR evidence

**Without the toolkit:** the agent's fastest feedback is Detox (90-300s per test) or pushing
to CI (up to 20 minutes). Screenshots require vision models (expensive, fragile).

**With the toolkit:** the agent verifies locally against a running app. Metro auto-reloads
on save (HMR for React changes is instantaneous), and feedback comes back as text.

### Feedback channels — cheapest to most expensive

The toolkit provides multiple feedback layers. In practice, ~95% of verification uses the
cheapest one:

1. **DevLogger + grep (primary)** — Drop a tagged log line in any render path or hook, save
   the file, Metro hot-reloads instantly, grep the Metro log for your tag. One log line +
   one grep = instant signal about what the UI is actually doing. Works for state bugs, race
   conditions, render order, data flow — anything where you need to know _what happened_, not
   _what it looks like_. Zero vision tokens, near-zero cost.
2. **CDP eval / recipes** — Query app state directly via `__AGENTIC__` bridge. Returns
   structured JSON. Use when you need to assert on controller state, position data, or
   any value the UI consumes. Cheap but each call is a tool invocation.
3. **Screenshots** — Capture the screen for visual feedback. Use when implementing from a
   design reference and comparing against designer mockups. Triggers a vision model call —
   reserve for cases where visual appearance is what you're verifying.
4. **System logs (logcat / Console.app)** — For native module work (Objective-C, Java/Kotlin).
   Rare on MetaMask Mobile since most code is JS/TS in the React Native layer.

**Rule of thumb:** if you can verify with a log line, don't take a screenshot. If you can
verify with a recipe, don't write custom CDP eval. Always start at level 1.

### HUD overlay — making videos reviewable

Agents produce video recordings as PR evidence, but raw video of an app being tapped by
an invisible hand is hard for human reviewers to follow. The **Agent Step HUD**
(`AgentStepHud.tsx`) solves this by rendering a persistent on-screen overlay during recipe
execution that shows the current step ID, description, and action type.

The HUD is enabled by default. Use `--no-hud` to disable it. Before each step executes,
the runner sends the step metadata to the app via CDP eval, and `AgentStepHud` renders it
as an overlay banner. The HUD propagates through `flow_ref` sub-invocations
automatically, so nested flow steps are annotated too.

This turns an opaque screen recording into a narrated walkthrough: reviewers see exactly
what the agent is testing at each moment, which assertion is running, and what the
expected outcome is — without needing to cross-reference the recipe JSON. The result is a
tighter feedback loop between autonomous agents and human reviewers: the video itself
communicates intent.

### The compounding effect

- Wallet fixtures make recipes deterministic (known starting state)
- Recipes make bug fixes provable (assertion = proof)
- CDP instrumentation makes recipes cheap (text, not vision)
- Pre-conditions catch stale state early (fail fast with hints)
- `flow_ref` lets agents compose complex scenarios from simple building blocks
- Each recipe written for one PR becomes reusable regression for future PRs

### Beyond single agents

The toolkit is designed to be consumed by autonomous orchestration systems. The orchestrator
dispatches tasks using **workflow templates** (bug fix, PR review, feature dev) that are
project-scoped, not team-scoped. An outer orchestrator can:

1. **Dispatch tasks** — assign a Jira ticket to an agent with a worker template
2. **Prepare the environment** — run `preflight.sh` to get the slot ready
3. **Monitor progress** — poll the task file for status transitions
4. **Validate results** — re-run the agent's recipe to confirm the fix independently
5. **Scale horizontally** — run multiple agents in parallel worktrees, each with its own
   `WATCHER_PORT`, device, and wallet fixture

The worker template injects team-specific context (which flows to run, which pre-conditions
to check) via template variables — different teams have different flow libraries but share
the same preflight, CDP bridge, recipe runner, and assertion engine.

This works because the toolkit's contracts are stable: fixtures produce known state, recipes
produce JSON assertions, CDP returns structured data. An orchestrator just prepares the
environment and lets the agent use the toolkit's primitives.

---

## Practical Example: Bug Fix Workflow

Here's a concrete example from the perps team — the first adopter. The same pattern
applies to any team's flows.

An agent is assigned: "TP/SL values don't persist after edit."

1. **Preflight** — wallet restored with funds on testnet (~5s)
2. **`flow_ref: trade-open-market`** — opens a BTC long position ($10)
3. **`flow_ref: tpsl-create`** — sets initial TP/SL using percentage presets (TP +25%, SL -10%)
4. **Recipe: read TP/SL** — `recipe perps/core/tpsl-orders` → assert TP/SL orders exist (PASS)
5. **`flow_ref: tpsl-edit`** — changes TP/SL presets (TP +50%, SL -25%)
6. **Recipe: read TP/SL** — assert updated TP/SL values (FAIL — bug confirmed, still shows old values)
7. **Agent reads code** — finds stale cache in the edit handler, fixes it
8. **Hot-reload** — Metro picks up changes (~2s)
9. **Re-run steps 5-6** — assert updated TP/SL values (PASS — fix verified)
10. **Recipe goes into PR** as `recipe.json` — reviewer runs `validate-recipe.sh` to verify

Total time from bug confirmation to verified fix: under 3 minutes of agent wall time.
The recipe.json is the test, the reproduction, and the proof — all in one file.

---

## Cross-Reference

- `docs/perps/perps-agentic-feedback-loop.md` — full reference for all commands, actions,
  routes, and pre-conditions
- `docs/perps/agentic-scripts-quickref.md` — cheat sheet for daily use
- `scripts/perps/agentic/schemas/flow.schema.json` — formal flow specification
- `scripts/perps/agentic/teams/README.md` — contribution guide for adding a new team
- `app/core/AgenticService/AgenticService.ts` — bridge implementation
