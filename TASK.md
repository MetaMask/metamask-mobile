# Worker: Fix Bug

**Runner:** `claude`
**Model:** `opus`
**Effort:** `auto`
**Started: 2026-03-19**

> Orchestrator sends this to pool workers. Fully autonomous — zero human input.

---

You are an autonomous agent fixing a bug in MetaMask Mobile. Work completely independently. Do not ask questions — if blocked, update the Status field in your TASK file and stop.

**CRITICAL: Never pause or wait for user input. After completing each step, immediately proceed to the next. You must complete ALL steps in a single uninterrupted run.**

## Task

```
JIRA: TAT-2236
TITLE: Button color flash when open a market with an open position
BRANCH: fix/perps/tat-2236-0319-1519
PR_NUMBER: 27669
STATUS: working
SESSION: mm-3
REPO: /Users/deeeed/dev/metamask/metamask-mobile-3
PLATFORM: ios
ADB_SERIAL:
IOS_SIMULATOR: mm-3
WATCHER_PORT: 8063
```

## Acceptance Criteria

1. Navigating to a market with an open position shows Close Position / Modify immediately — no Long/Short flash visible
2. Navigating to a market with NO position shows Long/Short immediately — no flash
3. If position data cannot be available synchronously, a skeleton/loading state is shown — never the wrong buttons
4. No regression: close, modify, add collateral flows work correctly after the fix
5. CDP validation: recipe confirms correct button state on first render (no wrong intermediate state in logs or screenshots)

## Affected Area

Perps market detail screen — action button area (Long/Short vs Close Position/Modify). The position hook (`usePerpsPositions` or similar) initializes with empty state before async resolution, causing a brief flash of incorrect button state. Root cause hypothesis from ticket: initialize from cached PerpsController state synchronously, or show neutral loading state until positions are confirmed.

## Root Cause Hypothesis

In `usePerpsLivePositions.ts`, positions are derived from `rawPositions` via a `useEffect` (lines 117-128), creating a render cycle where `isInitialLoading` and `rawPositions` update together (batched), but `positions` lags by one render (useEffect runs after render). When WebSocket subscription callback fires: (1) `setIsInitialLoading(false)` + `setRawPositions(newData)` batch together, (2) React renders with `isInitialLoading=false` but `positions` still empty (useEffect hasn't run), (3) `hasLongShortButtons=true` + `existingPosition=null` → Long/Short buttons briefly flash, (4) useEffect fires → `setPositions(enriched)` → correct Close/Modify buttons render. Fix: replace `useEffect` with `useMemo` for position enrichment so it's computed synchronously during render.

---

## Checklist

Execute top-to-bottom. Every step is mandatory. Do NOT skip, reorder, or batch steps.

**After completing each step you MUST:**
1. Edit this file to mark the checkbox `[x]`
2. Immediately proceed to the next step — never pause for user input

STOP at any failing step — fix before proceeding.

### Setup

- [x] **1. Read the agentic toolkit** — `/Users/deeeed/dev/metamask/metamask-mobile-3/scripts/perps/agentic/.agent/agentic-toolkit.md` contains CDP commands, recipe patterns, video recording rules, and debugging techniques. Read it before proceeding.
- [x] **2. Update Status** — edit the Task block above: set `STATUS: working`.
- [x] **3. Resolve branch and PR number:**
  - **If PR_NUMBER is set** — confirm you are on branch `fix/perps/tat-2236-0319-1519` in `/Users/deeeed/dev/metamask/metamask-mobile-3`. If not, set status to `blocked: wrong branch` and stop.
  - **If PR_NUMBER is empty** — create the branch and draft PR:
    ```bash
    cd /Users/deeeed/dev/metamask/metamask-mobile-3
    git checkout main && git pull origin main
    git checkout -b fix/perps/tat-2236-0319-1519
    git commit --allow-empty -m "feat: TAT-2236 — Button color flash when open a market with an open position"
    git push -u origin fix/perps/tat-2236-0319-1519
    unset GH_TOKEN && gh pr create --draft --title "TAT-2236: Button color flash when open a market with an open position" --body "WIP — automated fix for TAT-2236" --label "DO-NOT-MERGE" --label "team-perps"
    ```
    Update `PR_NUMBER:` in the Task block above with the PR number from output.
- [x] **4. Confirm CDP and Metro are live:**
  ```bash
  bash scripts/perps/agentic/app-state.sh status
  ```
  If CDP is down, set status to `blocked: CDP not responding` and stop.
  Metro startup and device boot are the orchestrator's responsibility via `prepare-slot.sh` — do not attempt to start Metro or rebuild the app.
- [x] **5. List available recipes and CDP expressions:**
  ```bash
  bash scripts/perps/agentic/app-state.sh recipe --list
  ```
  Use existing named expressions — do not reinvent what already exists.

> REMINDER: Do NOT stop or wait for user input. Continue autonomously through all steps.

### Reproduce (BEFORE any code changes)

- [x] **6. Navigate to the affected screen via CDP:**
  ```bash
  bash scripts/perps/agentic/app-navigate.sh <target>
  ```
- [x] **7. Observe the bug via CDP eval.** Use ES5 only — no arrow functions, no const/let, no template literals.
  ```javascript
  // GOOD — ES5
  Engine.context.PerpsController.getPositions().then(function(r) { return JSON.stringify(r) })
  // BAD — ES6+
  Engine.context.PerpsController.getPositions().then(r => JSON.stringify(r))
  ```
  **If the fix is already committed on this branch**, `git stash` first, complete steps 7-10 with the bug visible, then `git stash pop`.
- [x] **8. Add a DevLogger reproduction marker** in the relevant source code that fires exactly when the bug condition occurs:
  ```javascript
  DevLogger.log('[PR-<PR_NUMBER>] BUG_MARKER: <condition description>');
  ```
  Reproduce via CDP and confirm the marker fires:
  ```bash
  grep "PR-<PR_NUMBER>" .agent/metro.log
  ```
  Commit the marker on its own — **save the commit SHA**, you will need it for the report:
  ```bash
  git add -A && git commit -m "debug(pr-<PR_NUMBER>): add reproduction marker"
  ```
- [x] **9. Write `automation/<PR_NUMBER>/recipe.json`** — an executable recipe that validates the fix via `validate-recipe.sh`. Must cover all acceptance criteria. See the Reference section below for schema and example.
  If you cannot write a valid recipe, set status to `blocked: cannot reproduce` and stop.
- [x] **10. Record before.mp4 (if visual)** — if the bug has a visible UI symptom, record the recipe reproduction flow before any fix code is written. Use the video recording commands from the agentic toolkit. Skip if the bug is purely logical (e.g. wrong data, crash, race condition with no UI artifact).

> REMINDER: Do NOT stop or wait for user input. Continue autonomously through all steps.

### Investigate

- [x] **11. Check Metro logs** for errors related to the affected area:
  ```bash
  grep -i "error\|warn\|fail" .agent/metro.log | tail -30
  ```
- [x] **12. Use DevLogger and CDP to trace the issue.** Never guess — confirm root cause with a file:line reference. Read the relevant source files. Understand the data flow before changing anything. Update the Root Cause Hypothesis section above with your findings.

### Fix (minimal change only)

- [x] **13. Make the minimal change** to fix the bug. No refactoring, no cleanup. Only modify files directly related to the fix.
- [x] **14. Update or add tests** to cover the fix. If the affected code has existing tests, update them. If no tests exist for the specific bug condition, add a focused test.

### Validate (every step mandatory — do NOT skip any)

- [x] **15. Run `yarn lint:tsc`** — STOP if you introduced new type errors. Fix before proceeding.
  ```bash
  NODE_OPTIONS='--max-old-space-size=8192' npx tsc --noEmit --incremental --tsBuildInfoFile .tsbuildinfo --project ./tsconfig.json 2>&1 | tail -20
  ```
- [x] **16. Run affected tests** — `yarn jest <specific-test-file> --no-coverage`. STOP if any test fails. Fix before proceeding. NEVER use `--findRelatedTests`.
- [x] **17. Run `yarn coverage:analyze`** — target 80% newCodeCoverage on changed lines.
- [x] **18. Run validate-recipe.sh** — must exit 0. Do NOT skip. Do NOT proceed if it fails.
  ```bash
  bash scripts/perps/agentic/validate-recipe.sh automation/<PR_NUMBER>/ --skip-manual
  ```
- [x] **19. Record after.mp4** — same navigation path as before.mp4. Use the video recording commands from the agentic toolkit. Verify the file exists and is non-empty.
- [x] **20. Remove the reproduction marker** added in step 8. **Only stage and commit the marker removal — do NOT include fix files in this commit.**
  ```bash
  # If marker and fix are in different files:
  git add <marker-file-only> && git commit -m "cleanup(pr-<PR_NUMBER>): remove reproduction marker"
  # If marker and fix are in the same file, use partial staging:
  git add -p <file>   # stage only the marker removal hunks, skip fix hunks
  git commit -m "cleanup(pr-<PR_NUMBER>): remove reproduction marker"
  ```
  After this commit, verify: `git diff HEAD` should show ONLY the fix changes (not the marker).

> REMINDER: Do NOT stop or wait for user input. Continue autonomously through all steps.

### Report and finish

- [x] **21. Write `automation/<PR_NUMBER>/report.md`** — must include ALL of the following:
  - **Summary**: 1-3 sentences describing the bug and fix
  - **Root cause**: file:line reference, data flow explanation
  - **Reproduction commit**: SHA from step 8 with the BUG_MARKER, plus Metro log excerpt proving it fired
  - **Changes**: list of modified files with one-line description each
  - **Test plan**: automated results (tests, lint, recipe, coverage) + manual Gherkin steps
  - **Evidence**: references to before.mp4, after.mp4, and screenshots
  - **JIRA**: ticket number
- [x] **22. Write `automation/<PR_NUMBER>/pr-description.md`** — PR description following the repo's PR template format:
  ```markdown
  ## **Description**
  <summary from report.md: what the bug was, root cause, and fix>

  ## **Changelog**
  CHANGELOG entry: Fixed <user-facing description in past tense>

  ## **Related issues**
  Fixes: TAT-2236

  ## **Manual testing steps**
  ```gherkin
  Feature: <feature>
    Scenario: <scenario>
      Given <initial state>
      When <action>
      Then <expected outcome>
  ```

  ## **Screenshots/Recordings**
  ### **Before**
  See automation/<PR_NUMBER>/before.mp4
  ### **After**
  See automation/<PR_NUMBER>/after.mp4

  ## **Pre-merge author checklist**
  - [x] I've followed MetaMask Contributor Docs and Coding Standards
  - [x] I've completed the PR template to the best of my ability
  - [x] I've included tests if applicable
  - [ ] I've documented my code using JSDoc format if applicable
  - [x] I've applied the right labels on the PR
  ```
- [ ] **23. Commit the fix:**
  ```bash
  git add -A && git commit -m "fix: TAT-2236 — <one-line summary of the fix>"
  ```
- [ ] **24. Push the branch:**
  ```bash
  git push origin fix/perps/tat-2236-0319-1519
  ```
- [ ] **25. Update the PR description:**
  ```bash
  unset GH_TOKEN && gh pr edit <PR_NUMBER> --body-file automation/<PR_NUMBER>/pr-description.md
  ```
- [ ] **26. Update Status** — set `STATUS: done` in the Task block above.
- [ ] **27. Print final report to terminal.**

---

## Rules (non-negotiable)

- **Never pause for user input** — this is a fully autonomous flow. After outputting text, immediately continue to the next step. Complete ALL 27 steps in a single uninterrupted run.
- **Mark checkboxes** — after completing each step, edit this file to change `[ ]` to `[x]` before proceeding.
- **Every step is mandatory** — there is no optional section. One flat list, top to bottom.
- **STOP at failures** — if lint, test, or recipe fails, fix it before moving to the next step.
- **before.mp4 BEFORE code changes** — if the bug is visual, step 10 must complete before step 11. Skip only for non-visual bugs.
- **Recipe before code** — write recipe.json (step 9) before any source changes (step 13).
- **validate-recipe.sh must exit 0** — do not skip, do not proceed if it fails.
- **Commit and push the fix before updating PR description** — allowed commits: empty bootstrap, reproduction marker, marker cleanup, and the fix commit (step 23). The marker cleanup commit must contain ONLY marker removal — never the fix.
- **Report must include reproduction commit** — the SHA from step 8 is evidence. Include it and the Metro log excerpt in the report.
- **ES5 only** in all CDP eval expressions — no arrow functions, no const/let, no top-level await.
- **One hypothesis per bash command** — state what you expect before running.
- **kill -INT for video** — never kill -TERM or plain kill.
- **Never mention Claude/AI/LLM** in any commit message, PR body, or comment.
- **No refactoring** — minimal fix only. No cleanup, no added abstractions.
- **If blocked** — write reason to Status field, stop working.

---

## Reference

<details>
<summary>Recipe schema, actions, and example</summary>

### Concrete example (Perps position-list bug)

```json
{
  "pr": "27400",
  "title": "Position list flickers on market open",
  "jira": "TAT-2200",
  "acceptance_criteria": [
    "Opening a market with an existing position must not cause the position list to flicker",
    "No new TypeScript errors"
  ],
  "validate": {
    "static": ["yarn lint:tsc"],
    "runtime": {
      "pre_conditions": ["CDP connected", "Wallet unlocked on Wallet route"],
      "steps": [
        {
          "id": "nav_home",
          "description": "Navigate to perps home",
          "action": "navigate",
          "target": "PerpsMarketListView"
        },
        {
          "id": "has_positions",
          "description": "Verify at least one open position exists",
          "action": "recipe_ref",
          "ref": "positions",
          "assert": { "operator": "length_gt", "value": 0 }
        },
        {
          "id": "open_market",
          "description": "Navigate to BTC market detail",
          "action": "navigate",
          "target": "PerpsMarketDetails",
          "params": {"market":{"symbol":"BTC","name":"BTC","price":"0","change24h":"0","change24hPercent":"0","volume":"0","maxLeverage":"100"}}
        },
        {
          "id": "wait_render",
          "description": "Wait for render to settle",
          "action": "wait",
          "ms": 2000
        },
        {
          "id": "check_no_errors",
          "description": "No render errors in Metro logs",
          "action": "log_watch",
          "window_seconds": 5,
          "must_not_appear": ["TypeError", "undefined is not an object", "flickered"],
          "watch_for": ["PerpsMarketDetails mounted"]
        },
        {
          "id": "verify_state",
          "description": "Account state still loaded (no flash to empty)",
          "action": "eval_sync",
          "expression": "JSON.stringify(Engine.context.PerpsController.state.accountState)",
          "assert": { "operator": "not_null" }
        },
        {
          "id": "screenshot_result",
          "description": "Capture final market detail state",
          "action": "screenshot",
          "filename": "market-detail-after-open.png"
        }
      ]
    }
  }
}
```

### Step actions (executed by `validate-recipe.sh` via `cdp-bridge.js`)

| Action | Required Fields | What it does |
|--------|----------------|--------------|
| `navigate` | `target` (route name) | Calls `app-navigate.sh --no-screenshot <target> [params-json]` |
| `eval_sync` | `expression` (ES5 JS) | `Runtime.evaluate` — must return immediately |
| `eval_async` | `expression` (ES5 JS with `.then()`) | Polls `globalThis` for Promise result |
| `recipe_ref` | `ref` (name from `recipes/perps.json`) | Runs the named recipe expression |
| `log_watch` | `window_seconds`, `must_not_appear[]` | Scans last N seconds of `.agent/metro.log` |
| `screenshot` | `filename` | Takes screenshot, saves to recipe folder |
| `wait` | `ms` | Sleep (use between navigate and state checks) |
| `manual` | `note` | Human step — skipped with `--skip-manual` |

### Assert (optional on any step)

`{ "operator": "<op>", "value": <expected>, "field": "dot.path" }`

Operators: `not_null`, `eq`, `gt`, `length_eq`, `length_gt`, `contains`, `not_contains`

### Named recipe refs

Available in `scripts/perps/agentic/recipes/perps.json`:
`positions`, `auth`, `balances`, `markets`, `orders`, `state`, `providers`, `pre-trade`, `post-trade`, `place-order`

</details>
