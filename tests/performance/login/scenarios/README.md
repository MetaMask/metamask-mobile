# Performance scenarios

A scenario is a Markdown test case. Anyone can read it, and anyone can write one:
you edit the `.md` file and nothing else.

This is the swap scenario, `eth-swap-flow.scenario.md`. It measures the same two
moments, with the same names and limits, as
[`../eth-swap-flow.spec.ts`](../eth-swap-flow.spec.ts).

```markdown
# Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3 [scenario shadow]

Tags: @PerformanceShadow
Team: @swap-bridge-dev-team
Platforms: Android

## Steps

1. Tap the Swap button on the wallet home
2. Expect: the swap screen with the source amount input is visible
3. Select USDC on Ethereum as the destination token
4. Enter 0.01 as the source amount
5. Dismiss the amount keypad
6. Expect: a quote with a positive destination amount is displayed

## Timers

- Measure from step 1 until step 2 (Android 2500 ms, iOS 2000 ms): Time since the user clicks on the "Swap" button until the swap page is loaded
- Measure from step 5 until step 6 (Android 3000 ms, iOS 9000 ms): Time since the user enters the amount until the quote is displayed
```

## How to write one

- The `#` heading is the test name.
- `Tags`, `Team` and `Platforms` go under it. Use `@PerformanceShadow`. The tags
  `@Performance` and `@System` are rejected, so a scenario can never join the
  scheduled runs by accident.
- Number the steps `1.` `2.` `3.`. One line each. Write what a person does.
- Start a step with `Expect:` when it is something you wait to see, not
  something you tap.
- Start a step with `Secret:` when it types a recovery phrase, a password or a
  private key. That step is never sent to the AI.
- A timer starts on an action and ends on the **next** step, which must be an
  `Expect:`. The name after the colon is the timer name. Android and iOS can
  be written in either order. The limits above are the ones the existing spec uses.

Changing "USDC" or "0.01" is just editing the sentence. You do not touch any
code for that.

## After you edit the steps

Run this. It matches each sentence to the Page Object action that already
knows how to do it, and rewrites the lockfile next to the Markdown.

```bash
yarn scenario:lock tests/performance/login/scenarios/eth-swap-flow.scenario.md
```

You do not edit the lockfile, and you do not edit `swapBindings.ts`. Those are
generated and maintainer-owned. If a sentence matches nothing, the command
stops and lists the closest known actions, for example:

```text
Step 1: "Send a postcard to the moon"
  No known action is close. A maintainer needs to add one.
```

A maintainer adds the new wording to
[`bindingCatalog.ts`](../../../framework/scenario/bindingCatalog.ts). Wording
that is close to an existing action ("Tap the swap button") matches on its own.

`yarn scenario:lock --check <file>` fails when the lockfile is out of date.

## What a run does

For each step, in order:

1. Run the Page Object method the sentence matched (the same call the existing spec makes).
2. If that fails, try the known backup locator (the testID that method uses today).
3. If that also fails, ask the AI locator to find the control.

The AI step never runs while a timer is going, and never runs for a `Secret:`
step. A timer measures only its `Expect:` step, through the same `TimerHelper`
and quality gates as every other performance test. If that expectation can no
longer be found with the known locator, the timer is dropped and the run is
`INVALID_MEASUREMENT` instead of being reported as a slow app.

The test output ends with a `SCENARIO RUN` block. The Playwright report gets a
`scenario-status` annotation, a `scenario-run-report` attachment, and, when
anything had to be found another way, a `scenario-heal-report` attachment with
the locator that worked.

| Status                | Meaning                                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| `PASS`                | Every step used its Page Object method                                                |
| `PASS_HEALED`         | An untimed step needed another locator                                                |
| `PASS_HEALED_TRIGGER` | The tap that starts a timer needed another locator (the timer itself is unchanged)    |
| `FAIL_THRESHOLD`      | A timer is valid and over its limit. Same failure as the other performance tests      |
| `INVALID_MEASUREMENT` | A timer's expectation could not be found the known way, so the number is not reported |
| `FAIL_FUNCTIONAL`     | A step could not be completed                                                         |

`PERF_HEAL_POLICY=fail` turns any heal into a failure. `off` disables healing.

## How to run it

The scenario runs only when you ask for it. Scheduled and labeled performance
CI do not pick it up: the tag does not match their filter, and no workflow uses
the shadow config.

Same `.e2e.env` as the other performance tests.

```bash
# TestMu
TESTMU_ANDROID_APP_URL=lt://<app-id> \
  yarn playwright test --config tests/playwright.scenario-shadow.config.ts \
  --project scenario-shadow-testmu-android

# Local emulator
yarn playwright test --config tests/playwright.scenario-shadow.config.ts \
  --project scenario-shadow-android-emulator
```

Open `tests/test-reports/playwright-report/index.html` for the annotation and
the attachments. The usual performance report is under `tests/reporters/reports/`.

## How to see a heal

`SCENARIO_SIMULATE_DRIFT` takes step numbers from the Markdown.

```bash
CONFIG="--config tests/playwright.scenario-shadow.config.ts --project scenario-shadow-testmu-android"

# Step 1's Page Object method fails. The known testID still works.
# Status: PASS_HEALED_TRIGGER, and the test passes.
SCENARIO_SIMULATE_DRIFT=1:binding yarn playwright test $CONFIG

# Step 5's method and its known locator both fail, so the AI has to find it.
SCENARIO_SIMULATE_DRIFT=5:locators \
  AI_LOCATOR_RECOVERY_ENABLED=true ANTHROPIC_API_KEY=<key> \
  yarn playwright test $CONFIG

# Step 6 is the end of a timer. The timer is dropped.
# Status: INVALID_MEASUREMENT, and the test fails.
SCENARIO_SIMULATE_DRIFT=6:binding yarn playwright test $CONFIG
```

`1:binding` means "pretend the Page Object method's selector changed".
`5:locators` also breaks the backup locator, which is the only way the AI runs.

## Tests

```bash
yarn jest tests/framework/scenario tests/performance/login/scenarios
```

## Not in this proof of concept

The AI finds one control, not a whole new screen. Multi-step actions (picking
the token, typing the amount) are not healed; they run through their Page
Object method or they fail. There is no automatic pull request from a heal
report, and heal status is not in the performance PR comment or Sentry yet.
