# Agent-driven performance scenarios

An AI agent (Claude Haiku) runs these tests from Markdown. It reads the screen
and decides what to tap; checks, timers and thresholds are the same as the
original `@Performance` specs. Onboarding and seedless scenarios live in
`tests/performance/onboarding/scenarios/` and work the same way.

## Writing a scenario

```markdown
# Swap flow - ETH to LINK [scenario shadow]

Tags: @PerformanceShadow
Team: @swap-bridge-dev-team
Platforms: Android

## Hints

- QuoteViewSelectorIDs
- keypad

## Steps

1. Secret: Log in to the wallet
2. Tap the Swap button on the wallet home
3. Expect: the swap screen is visible [check: testID=source-token-area-input]
4. Enter 0.01 as the source amount
5. Expect: a positive quote is displayed [check: testID=dest-token-area-input text=/[1-9]/]

## Timers

- Measure from step 2 until step 3 (Android 2500 ms, iOS 2000 ms): Time since the user taps Swap until the swap page is loaded
- Measure from step 4 until step 5 (Android 3000 ms, iOS 9000 ms): Time since the user enters the amount until the quote is displayed
```

- Plain steps are actions in plain words; `Expect:` waits for something.
- `Secret:` steps (login, SRPs, passwords, OAuth) run existing code; their
  screens never reach the model. Non-login ones are registered by exact text
  in `scenarioOptions.ts` next to the Markdown (with `skip` / `requiredEnv`).
- `App:` steps run in code: `terminate the app`, `activate the app`,
  `background the app for 35 s`, `arm Hermes profiling`,
  `skip Hermes collection until restart`, `start the clock`.
- Pins, run by code, never chosen by the model and never cached:
  `[check: testID=x]`, `[check: testID=x text=/re/]`, `[check: gone testID=x]`,
  `[check: any testID=a | label="B"]`, `[check: code=name]` (a code wait),
  `[tap: testID=x]` (the element the original taps), `[if: name]` (the
  original's own condition).
- A timer starts when its action returns (after the last key press for
  typing) and ends on a later `Expect:`. `(no threshold)` keeps an original
  timer without one. Keep `@PerformanceShadow`; `@Performance` / `@System`
  are rejected.
- `## Hints` names testID modules, members or literal ids offered to the model.

## Running

TestMu (CI runs these when `@PerformanceShadow` is selected: the
`run-performance-shadow-tests` label or a manual run with
`performance_tags='["@PerformanceShadow"]'`):

```bash
LT_USERNAME=... LT_ACCESS_KEY=... TESTMU_ANDROID_APP_URL=lt://<app-id> \
ANTHROPIC_API_KEY=... E2E_PASSWORD=... \
yarn playwright test --config tests/playwright.testmu.config.ts \
  --project scenario-shadow-testmu-android
```

Local emulator: `--config tests/playwright.config.ts --project
scenario-shadow-android-emulator`. `ANTHROPIC_MODEL` / `ANTHROPIC_BASE_URL` are
optional. Missing secrets in `requiredEnv` register the test as skipped.

## Timing honesty

The model is never called while a timer runs. For a timed action the end
element is pinned, cached, or predicted before the tap; code then acts and
`TimerHelper.measure` only polls for it. A wrong end element drops the timer
(`INVALID_MEASUREMENT`) and is re-resolved after the window.

## Cache

After a run the agent writes `<name>.scenario.cache.json`: step text to the
actions (and proof element) that worked. Replays make no model calls; the
model is asked only from the first cached action that no longer works.
Commit it to share what was learned; delete it to start over.

## Heal

Each run writes `tests/reporters/reports/scenario-outcome-<name>.json`. After a
CI run, the `Heal agent-driven scenarios` job sorts each outcome into:

- **heal**: only the cache is stale (all pinned checks passed, no threshold
  failed, and the agent re-resolved the step: an invalid model-chosen timer end,
  or a passing run that drifted, including across retries). It opens one
  **draft** PR (`perf-scenario-heal/<run id>`, labels `team-qa`,
  `perf-scenario-heal`) that changes only `*.scenario.cache.json`, and posts to
  `#mm-qa-legends-ai-alerts` (secret `PERF_SCENARIO_HEAL_SLACK_WEBHOOK_URL`).
- **report**: anything else (a pinned check, a threshold, a guard, a crash);
  the job summary shows the reason.
- **passed**: nothing to do.

Heal PRs are never merged automatically, and code rejects any change to
Markdown, pins, timers, thresholds or other files. Dry run on a downloaded run:

```bash
gh run download <run id> --pattern 'testmu-he-*-test-results-*' --dir /tmp/run
SCENARIO_HEAL_DRY_RUN=true yarn tsx \
  .github/scripts/qa-automation/performance-tests/scenario-heal.ts \
  --artifacts /tmp/run --out /tmp/heal
```
