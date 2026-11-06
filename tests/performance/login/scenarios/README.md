# Step-based performance scenarios (PoC)

This folder holds a proof of concept that writes a performance scenario as
plain-language steps instead of Page Object calls. The steps run through the
existing Page Objects first. An AI fallback runs only for untimed steps, and
every heal is recorded and reflected in the run status.

The PoC covers one scenario: the swap flow from
[`../eth-swap-flow.spec.ts`](../eth-swap-flow.spec.ts). That spec is
unchanged and remains the scenario that scheduled and labeled CI runs.

| File                                                                                             | Purpose                                                                                          |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [`eth-swap-flow.scenario.yaml`](eth-swap-flow.scenario.yaml)                                     | The scenario: `do` / `expect` steps, timers, visual check                                        |
| [`eth-swap-flow.scenario.lock.json`](eth-swap-flow.scenario.lock.json)                           | How each step is done today: Page Object binding plus known locators                             |
| [`swapBindings.ts`](swapBindings.ts)                                                             | Binding keys mapped to `WalletView` / `QuoteView` methods                                        |
| [`eth-swap-flow.scenario.spec.ts`](eth-swap-flow.scenario.spec.ts)                               | Thin Playwright spec using the existing performance fixtures                                     |
| [`../../../playwright.scenario-shadow.config.ts`](../../../playwright.scenario-shadow.config.ts) | Opt-in config; the only way to run scenario specs                                                |
| [`../../../framework/scenario/`](../../../framework/scenario/)                                   | Loader / schema, `ScenarioExecutor`, run status rules, report formatting, Appium locator actions |

## Scenario format

```yaml
id: swap-eth-to-usdc
title: 'Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3 [scenario shadow]'
tags: ['@PerformanceShadow'] # @Performance / @System are rejected by the loader
team: '@swap-bridge-dev-team'
platforms: [android]
precondition: logged-in # thin spec runs loginToAppPlaywright()
profiling: hermes # thin spec runs enableHermesAppProfiling()

steps:
  - id: open-swap
    do: Tap the Swap button on the wallet home
  - id: swap-screen-visible
    expect: The swap screen with the source amount input is visible
  - id: pick-destination
    do: Select USDC on Ethereum as the destination token
    params: { network: Ethereum, token: USDC }
  # ...

timers:
  - name: 'Time since the user clicks on the "Swap" button until the swap page is loaded'
    after: open-swap # action, not timed
    until: swap-screen-visible # end condition, timed
    threshold: { ios: 2000, android: 2500 }
```

- A step has exactly one of `do` (an action) or `expect` (a postcondition).
- Optional step fields:
  - `params`: string map. `${env.NAME}` is resolved at run time and never
    written to the report.
  - `sensitive: true`: never sent to the AI.
  - `allowHeal: false`: only the binding may run the step.
- A timer's `after` must be a `do` step and its `until` must be the
  **next** `expect` step. This is the "action before `measure()`, assertion
  inside `measure()`" rule from [`../../README.md`](../../README.md), enforced
  by the schema.
- Timer names and thresholds are copied from the existing spec. The title has
  a `[scenario shadow]` suffix so shadow runs never mix into the real
  scenario's Sentry or TestMu history.

## Lockfile

Each step has a lock entry that records how it is done today:

```json
"open-swap": {
  "text": "Tap the Swap button on the wallet home",
  "action": "tap",
  "binding": "WalletView.tapWalletSwapButton",
  "source": "tests/page-objects/wallet/WalletView.ts#tapWalletSwapButton",
  "locators": [
    {
      "strategy": "testID",
      "value": "wallet-swap-button",
      "source": "WalletViewSelectorsIDs.WALLET_SWAP_BUTTON (app/components/Views/Wallet/WalletView.testIds.ts)"
    }
  ]
}
```

- `action` is `tap` or `assertVisible` for a single control, or `macro` for a
  composite Page Object flow such as `QuoteView.selectNetworkAndTokenTo`.
  Macros run only through their binding.
- The loader fails if a step has no entry, an entry has no step, or `text`
  differs from the step. Editing a step's wording therefore forces a review of
  its binding.
- For the PoC the lockfile is hand-written from the Page Objects. In the
  design, a generator builds it from the Page Object AST plus a runtime
  selector trace.

## How a step runs

1. **Binding**: the lockfile's Page Object method, e.g.
   `WalletView.tapWalletSwapButton()`. Normal runs make exactly the same calls
   as the existing spec. `eth-swap-flow.scenario.test.ts` checks the order.
2. **Lockfile alternatives**: each `locators` entry, tapped or waited for
   directly. This tier is deterministic and uses no model.
3. **AI fallback**: `ClaudeLocatorRecoveryProvider` from
   [`framework/ai-locator`](../../../framework/ai-locator/README.md) receives
   the step text, the binding, and the locators that used to work. It runs
   only when all of these are true:
   - the step is a `tap` / `assertVisible` step, not sensitive, and
     `allowHeal` is not false;
   - no timer is running (both the executor's own window flag and
     `TimerStore.hasActiveTimer()` are checked);
   - the per-run budget (3 calls) is not used up;
   - recovery is enabled (`AI_LOCATOR_RECOVERY_ENABLED=true` and
     `ANTHROPIC_API_KEY`).

   The provider still refuses secret screens through
   `SENSITIVE_PAGE_SOURCE_MARKERS`.

The per-tap recovery built into `Gestures.waitAndTap` is suspended while a
scenario runs. A binding therefore either passes deterministically or falls
into tiers 2 and 3, where every heal is recorded.

### Timed windows

- Inside `TimerHelper.measure()` only the `until` step's **binding** runs.
- Timers that pass go to `performanceTracker.addTimer`, so the fixture's
  quality gates (`QualityGatesValidator`, +15% margin, no retry after a gate
  failure) apply unchanged.
- If the end condition fails inside the window, the timer stops and is **not
  reported**. The step is then diagnosed with tiers 2 and 3 to produce a lock
  patch, and the flow continues so later drift is also found. The run is
  `INVALID_MEASUREMENT`.

## Run status

| Status                | When                                                     | Test result                                    |
| --------------------- | -------------------------------------------------------- | ---------------------------------------------- |
| `PASS`                | Every step ran through its binding                       | Pass                                           |
| `PASS_HEALED`         | Only untimed steps healed                                | Pass; fails under `PERF_HEAL_POLICY=fail`      |
| `PASS_HEALED_TRIGGER` | A timer's trigger step healed (before the timer started) | Pass; fails under `PERF_HEAL_POLICY=fail`      |
| `FAIL_THRESHOLD`      | All timers valid, a quality gate failed                  | Fails through the fixture's `QualityGateError` |
| `INVALID_MEASUREMENT` | A timed end condition failed with the locked binding     | Fails                                          |
| `FAIL_FUNCTIONAL`     | A step could not be completed by any allowed tier        | Fails                                          |

`PERF_HEAL_POLICY` controls healing:

- `report` (default): heal and report.
- `fail`: heal to diagnose, but fail the test on any heal.
- `off`: bindings only.

Every run:

- prints a `SCENARIO RUN` block in the test output;
- adds a `scenario-status` annotation (shown in the Playwright HTML report);
- attaches `scenario-run-report` (JSON with per-step tier, errors, skipped
  tiers, timers, AI calls and a gate pre-check);
- attaches `scenario-heal-report` when anything healed. It contains the
  lockfile path and a `proposedLockPatch` per heal, with the working locator
  first.

## Running it

Scenario specs run only with the opt-in config. CI never uses that config.
`@PerformanceShadow` does not match the `/@Performance\b/` grep or the
HyperExecute discovery regex, and
[`scenario-shadow-excluded-from-performance-ci.test.ts`](scenario-shadow-excluded-from-performance-ci.test.ts)
checks both.

Set up `.e2e.env` the same way as for the existing performance tests (see
[`../../README.md#environment-variables`](../../README.md#environment-variables)).
You need the login wallet password and, for TestMu, `LT_USERNAME` /
`LT_ACCESS_KEY`.

```bash
# Local Android emulator (an imported-wallet e2e build already installed, or pass the APK)
SCENARIO_ANDROID_BUILD_PATH=/path/to/app.apk \
  yarn playwright test --config tests/playwright.scenario-shadow.config.ts \
  --project scenario-shadow-android-emulator

# TestMu (same app URL as the testmu-android project)
TESTMU_ANDROID_APP_URL=lt://<app-id> \
  yarn playwright test --config tests/playwright.scenario-shadow.config.ts \
  --project scenario-shadow-testmu-android
```

Open `tests/test-reports/playwright-report/index.html` to see the
`scenario-status` annotation and the attachments. The usual per-test
performance report is written to `tests/reporters/reports/`.

### Simulating a heal

`SCENARIO_SIMULATE_DRIFT` takes a comma-separated list of `<stepId>:<mode>`
entries:

- `binding` makes the bound Page Object method fail as if its selector
  changed.
- `locators` also suffixes every lockfile alternative with
  `__simulated_drift`, so it cannot match on device and only the AI can heal
  the step.

```bash
CONFIG="--config tests/playwright.scenario-shadow.config.ts --project scenario-shadow-testmu-android"

# Trigger healed from the lockfile -> PASS_HEALED_TRIGGER (test passes)
SCENARIO_SIMULATE_DRIFT=open-swap:binding yarn playwright test $CONFIG

# Trigger healed by the AI -> PASS_HEALED_TRIGGER, heal report has the AI locator
SCENARIO_SIMULATE_DRIFT=close-keypad:locators \
  AI_LOCATOR_RECOVERY_ENABLED=true ANTHROPIC_API_KEY=<key> \
  yarn playwright test $CONFIG

# End condition drifted -> quote timer dropped, INVALID_MEASUREMENT (test fails)
SCENARIO_SIMULATE_DRIFT=quote-visible:binding yarn playwright test $CONFIG

# Strict policy -> any heal fails the test
PERF_HEAL_POLICY=fail SCENARIO_SIMULATE_DRIFT=open-swap:binding yarn playwright test $CONFIG
```

You can also break a locator by hand: change `wallet-swap-button` in the
lockfile and run with `SCENARIO_SIMULATE_DRIFT=open-swap:binding`. The
alternative fails for real on the device, and the AI tier takes over if it is
enabled.

Sample output for `SCENARIO_SIMULATE_DRIFT=close-keypad:locators`, captured
from the Jest harness with mocked Page Objects. Durations show 0ms because the
Jest setup freezes `Date.now`; device runs show real values.

```text
═══════════════════════════════════════════════════════════════
                    SCENARIO RUN
═══════════════════════════════════════════════════════════════
Scenario: swap-eth-to-usdc (android)
Status: PASS_HEALED_TRIGGER   policy=report   ai=on (1 call(s), 0ms)
───────────────────────────────────────────────────────────────
✅ open-swap [trigger]: binding (0ms)
✅ swap-screen-visible [until]: binding (0ms)
✅ pick-destination: binding (0ms)
✅ enter-amount: binding (0ms)
🩹 close-keypad [trigger]: ai label=Close keypad (0ms)
   └─ binding QuoteView.dismissKeypad: Simulated drift: binding QuoteView.dismissKeypad for step "close-keypad" no longer matches the UI
   └─ alternative testID=quote-keypad-dismiss-target__simulated_drift: element quote-keypad-dismiss-target__simulated_drift not found
✅ quote-visible [until]: binding (0ms)
───────────────────────────────────────────────────────────────
⏱️ 0ms  Time since the user clicks on the "Swap" button until the swap page is loaded
⏱️ 0ms  Time since the user enters the amount until the quote is displayed
Quality gates (pre-check): passed
Heals: 1 — see the "scenario-heal-report" attachment for the proposed lockfile patch
═══════════════════════════════════════════════════════════════
```

## Unit tests

```bash
yarn jest tests/framework/scenario tests/performance/login/scenarios
```

These cover:

- loader and schema validation;
- the resolution order (binding, then alternatives, then AI);
- the rule that no alternative or AI call happens while a timer is running;
- sensitive, macro, policy and budget guards;
- status precedence and policy failures;
- the attachments;
- the real swap YAML, lockfile and bindings against mocked Page Objects;
- exclusion from CI discovery.

## Not in this PoC

- A lockfile generator (Page Object AST plus runtime trace) and a
  `--check` step in CI.
- Multi-action AI plans, such as handling a new interstitial or a reordered
  flow. The fallback returns one locator for one tap or wait.
- Healing macro steps.
- Record-then-replay mode.
- Automatic draft PRs from heal reports.
- Wiring heal status into `PerformanceReporter`, the PR comment or Sentry.
- iOS (the source spec skips iOS too).
- The swap visual check and `SUBMIT_SWAP` follow the existing spec. The
  visual check is only active with `AI_VISUAL_TESTING_ENABLED=true`, and
  submit is not ported.
