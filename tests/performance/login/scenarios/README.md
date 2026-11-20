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

## Cache report

Each run writes `tests/reporters/reports/scenario-outcome-<name>.json`. After a
CI run, the `Scenario cache report` job writes a table of every scenario to the
job summary, and for each step whose cache failed or drifted (including drift a
retry would hide): the cached action, the error, and the action Haiku found.

- **cache fix below**: every pinned check and threshold passed, so the report
  includes the corrected entry, ready to paste into `*.scenario.cache.json`.
- **report only**: a pinned check, a threshold, a guard or a crash; the reason
  is shown and no cache entry is suggested.
- **passed**: nothing to do.

Only cache entries are ever suggested; pins, timers and thresholds stay in the
Markdown. Automatic heal PRs come in a follow-up PR. Locally, on a downloaded
run:

```bash
gh run download <run id> --pattern 'testmu-he-*-test-results-*' --dir /tmp/run
yarn tsx .github/scripts/qa-automation/performance-tests/scenario-report.ts \
  --artifacts /tmp/run
```
