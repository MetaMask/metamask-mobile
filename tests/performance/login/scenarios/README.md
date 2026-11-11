# Agent-driven performance scenarios

An AI agent runs these tests. You write the scenario in Markdown; the agent
reads the screen and decides what to tap. There are no Page Object bindings to
write.

## Writing a scenario

```markdown
# Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3 [scenario shadow]

Tags: @PerformanceShadow
Team: @swap-bridge-dev-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
2. Tap the Swap button on the wallet home
3. Expect: the swap screen with the source amount input is visible [check: testID=source-token-area-input]
4. Select USDC on Ethereum as the destination token
5. Enter 0.01 as the source amount
6. Dismiss the amount keypad
7. Expect: a quote with a positive destination amount is displayed

## Timers

- Measure from step 2 until step 3 (Android 2500 ms, iOS 2000 ms): Time since the user clicks on the "Swap" button until the swap page is loaded
- Measure from step 6 until step 7 (Android 3000 ms, iOS 9000 ms): Time since the user enters the amount until the quote is displayed
```

- Number the steps and write each one the way you would tell a person.
- `Expect:` is something to wait for, not to tap.
- `Secret:` steps (login, SRP import) are run by existing test code. The
  screen is never sent to the model for them.
- A timer starts on an action and ends on a later `Expect:` step. Plain steps
  in between (like dismissing the keypad) run after the window and are not
  timed. On a typing step the clock starts right after the last key press.
  The name and limits are the ones used in the quality gate (+15% margin).
- `[check: ...]` at the end of a step pins the check the original spec's
  Page Object makes, so code runs it and the model never chooses it:
  `[check: testID=foo]` (visible), `[check: testID=foo text=/regex/]` (its
  text, or text inside it, matches), `[check: gone testID=foo]` (disappears
  within 30 s). Several markers run in order. On an `Expect:` step it is the
  expectation (and a timer's end element); on a plain step it is the proof
  the step took effect, and a plain step whose checks already hold is skipped
  (never a Confirm/Submit step). Steps without one get a proof the model
  picks and code verifies. Pinned checks are never written to the cache.
- Keep `@PerformanceShadow`. `@Performance` and `@System` are rejected so a
  scenario never lands in scheduled CI by accident.

## Running on TestMu

Only `tests/playwright.scenario-shadow.config.ts` runs scenarios. In CI they
run on TestMu HyperExecute when a run selects `@PerformanceShadow`: the
`run-performance-shadow-tests` PR label, or a manual dispatch of
`run-performance-e2e-manual.yml` with `performance_tags='["@PerformanceShadow"]'`.
The schedule and the full-suite `run-performance-tests` label do not run them.
CI uploads the caches the agent writes as part of the test-results artifact.

Locally:

```bash
LT_USERNAME=... LT_ACCESS_KEY=... \
TESTMU_ANDROID_APP_URL=lt://<app-id> \
ANTHROPIC_API_KEY=... \
ANTHROPIC_BASE_URL=... ANTHROPIC_MODEL=... \
E2E_PASSWORD=... \
yarn playwright test --config tests/playwright.scenario-shadow.config.ts \
  --project scenario-shadow-testmu-android
```

`ANTHROPIC_BASE_URL` (for a proxy such as LiteLLM) and `ANTHROPIC_MODEL` are
optional; empty means unset, and the model defaults to
`claude-haiku-4-5-20251001`. `E2E_PASSWORD` is the login wallet password, the same one the other
performance tests read from `.e2e.env`. For a local emulator, use
`--project scenario-shadow-android-emulator`.

The test attaches `scenario-agent-run` to the Playwright report with each
step's actions, the timers, and the status: `PASS`, `INVALID_MEASUREMENT`,
or `FAIL`. Valid timers go through the usual quality gates.

## The cache file

After a run that completes every step, the agent writes
`eth-swap-flow.scenario.cache.json` next to the scenario: each step's text and
the actions that worked. The next run replays the cache and asks the model
only when an element is missing. The log shows `Step N changed: was ..., now
...` for every step that resolved differently. Commit the file to share what
the agent learned. Delete it to start over.

## Heal PRs from CI

Each scenario run writes `scenario-outcome-<name>.json` to
`tests/reporters/reports/`. After a CI run that selected `@PerformanceShadow`,
the `Heal agent-driven scenarios` job classifies every outcome:

- **Repairable**: every step ran (so every pinned check passed), no threshold
  failed, and each invalid timer ended on a model-chosen element that the
  agent re-resolved after the window. The job opens one draft PR against the
  branch that ran (`perf-scenario-heal/<run id>`), labelled `team-qa` and
  `perf-scenario-heal`, with the healed cache and any step wording the agent
  proposed.
- **Report only**: a pinned check failed, a threshold was exceeded, the submit
  guard or an app alert stopped the run, a timeout or crash, or the model
  found no path. These may be app bugs; the job summary lists them.

A heal may only change `*.scenario.cache.json` and the wording of do/expect
steps in `*.scenario.md`. Pins, `[if:]`, timers, thresholds, tags, Secret/App
steps and every other file are rejected in code
(`tests/framework/scenario-agent/heal.ts`), and the job aborts instead.

Dry run on a downloaded run (artifacts named `testmu-he-*-test-results-*`):

```bash
gh run download <run id> --pattern 'testmu-he-*-test-results-*' --dir /tmp/run
SCENARIO_HEAL_DRY_RUN=true yarn tsx \
  .github/scripts/qa-automation/performance-tests/scenario-heal.ts \
  --artifacts /tmp/run --out /tmp/heal
```

It prints the summary and the heal diff, and writes `summary.md`,
`heal-plan.json`, `heal-pr-body.md` and `heal.diff` to `--out`. Nothing in
the repo changes.

## How timing stays honest

For a timed step, the model picks the tap and predicts the element that will
appear before anything happens. That element must not already be on screen.
Code then taps, and `TimerHelper.measure` covers only the polling for that
element. No model call can run while a timer is active. If the element never
appears, the timer is dropped and the run is `INVALID_MEASUREMENT`. The agent
then finds the real element outside the window and saves it for next time.

### Pinned taps and App steps

- `Tap the Rewards tab [tap: testID=tab-bar-item-Rewards]` pins the element the
  original taps. Code taps it; the model is never asked and nothing is cached.
- `App:` steps run in code with the same `AppiumGestures` calls as the
  originals: `App: terminate the app`, `App: activate the app`,
  `App: background the app for 35 s`, `App: arm Hermes profiling`,
  `App: skip Hermes collection until restart`, and `App: start the clock`
  (no action: a timer that starts at a step boundary).
- A timer may start on an `App:` step. The clock starts when the command
  returns (as the originals call `TimerHelper.measure` right after
  `activateApp`), and the end must be the next step with a pinned `[check: ...]`.
- `Secret: Log in to the wallet without profiling` logs in without arming
  Hermes profiling (cold-start originals never arm it).
  `Secret: Unlock on the login screen with the login password` uses
  `LoginView.enterPassword` + `LoginView.tapLoginButton`.
- Scenarios run entirely by code learn nothing and keep no cache file.

### Code checks, conditions, code steps, skipped scenarios

- `[check: code=balance-stable]` ends an Expect step with a wait the original
  runs in code (`WalletView.waitForBalanceToStabilize`). Shared waits live in
  `CODE_CHECKS` in `scenarioTest.ts`; a spec can add its own (`codeChecks`).
- `[if: perps-gtm-onboarding]` runs a step only when the original's own `if`
  holds (`resolvePerpsGtmOnboardingModalEnabled`, flags fetched before login).
  Every step of a timer must carry the same condition; a skipped timer is not
  reported, like the original.
- A plain step right before `App: start the clock` does not wait for a proof:
  its action returns like the original's tap and the clock starts at once; the
  timer's pinned end check verifies it.
- `scenarioTest(path, hints, { codeSteps, codeChecks, skip })`: `codeSteps`
  runs `Secret:` steps with the original's helpers (SRP import, passwords,
  dapp/browser hops), keyed by exact step text; `skip` registers the test as
  `test.skip` (no device session), used for skipped originals and for
  real-funds flows that need explicit approval.
- Onboarding scenarios live in `tests/performance/onboarding/scenarios/` and run
  on `scenario-shadow-testmu-android-onboarding(-seedless)`, which use the same
  app env vars as `playwright.testmu.config.ts`.

## Onboarding and seedless scenarios

`tests/performance/onboarding/scenarios/` holds the onboarding, launch-time,
Money and seedless scenarios. Their `Secret:` steps, `[check: code=...]` ends
and `[if: ...]` conditions are the original specs' Page Object calls, in
`onboardingScenarioSteps.ts`. They run on the onboarding projects:

- `scenario-shadow-testmu-android-onboarding`: fresh-install build
  (`TESTMU_ANDROID_ONBOARDING_PERF_APP_URL`, else `TESTMU_ANDROID_CLEAN_APP_URL`).
- `scenario-shadow-testmu-android-onboarding-seedless`: the `E2E_MOCK_OAUTH`
  seedless build (`TESTMU_ANDROID_SEEDLESS_PERF_APP_URL`); OAuth is the QA mock,
  no real Google / Apple / Telegram login.

### Secrets and CI

- `requiredEnv: ['TEST_SRP_3']` in a spec: when a listed variable is missing
  or empty, the test is registered as skipped with the variable *name* in the
  reason, before any device session. Values are never logged or sent to the
  model; `requireSecretEnv(name)` fails a code step with the name only.
- No cache yet: the agent learns the steps on the fly and writes
  `*.scenario.cache.json`. All-code scenarios make no model calls and write no
  cache. With no `ANTHROPIC_API_KEY`, a step that needs the model fails with
  "ANTHROPIC_API_KEY is required"; nothing is cached.
- `(no threshold)` in a timer line keeps an original timer that has none.
