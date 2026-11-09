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
3. Expect: the swap screen with the source amount input is visible
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
- A timer starts on an action and ends on the `Expect:` step right after it.
  The name and limits are the ones used in the quality gate (+15% margin).
- Keep `@PerformanceShadow`. `@Performance` and `@System` are rejected so a
  scenario never lands in scheduled CI by accident.

## Running on TestMu

Only the opt-in config runs scenarios; no CI workflow uses it.

```bash
LT_USERNAME=... LT_ACCESS_KEY=... \
TESTMU_ANDROID_APP_URL=lt://<app-id> \
ANTHROPIC_API_KEY=... \
E2E_PASSWORD=... \
yarn playwright test --config tests/playwright.scenario-shadow.config.ts \
  --project scenario-shadow-testmu-android
```

`E2E_PASSWORD` is the login wallet password, the same one the other
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

## How timing stays honest

For a timed step, the model picks the tap and predicts the element that will
appear before anything happens. That element must not already be on screen.
Code then taps, and `TimerHelper.measure` covers only the polling for that
element. No model call can run while a timer is active. If the element never
appears, the timer is dropped and the run is `INVALID_MEASUREMENT`. The agent
then finds the real element outside the window and saves it for next time.
