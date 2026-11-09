# Performance Tests

This directory contains Playwright-based performance tests for MetaMask Mobile, measuring real user flows on real devices and TestMu cloud infrastructure.

## Overview

The performance test suite measures metrics for critical user flows in MetaMask Mobile, including onboarding, login, account management, swap flow, send flow, perps, and more. Tests run on local devices and simulators, and on TestMu cloud devices in CI.

The performance framework lives under the `tests/` directory alongside the rest of the E2E testing infrastructure, with shared utilities in `tests/framework/` and reporters in `tests/reporters/`.

## Table of Contents

- [Test Structure](#test-structure)
- [Configuration](#configuration)
- [CI Triggers](#ci-triggers)
- [Running Tests](#running-tests)
- [Test Categories](#test-categories)
- [Performance Tracking System](#performance-tracking-system)
- [Quality Gates & Thresholds](#quality-gates--thresholds)
- [Page Object Model](#page-object-model)
- [Shared Flows](#shared-flows)
- [Environment Variables](#environment-variables)
- [Reports and Metrics](#reports-and-metrics)
- [Aggregated Reports](#aggregated-reports)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Test Structure

```
tests/
├── playwright.config.ts              # Main configuration file
├── tags.performance.js              # Performance test tags for filtering
├── teams-config.js                  # Team/Slack mapping for notifications
├── framework/
│   ├── fixtures/
│   │   ├── FixtureBuilder.ts
│   │   └── playwright/              # Playwright test.extend (performance tests)
│   │       ├── index.ts             # import `test` from fixtures/playwright
│   │       └── *.fixture.ts         # currentDeviceDetails, deviceProvider, driver, performanceTracker
│   ├── quality-gates/
│   │   ├── types.ts                 # Shared type definitions for quality gates
│   │   ├── QualityGateError.ts      # Custom error class for threshold failures
│   │   ├── QualityGatesValidator.ts # Threshold validation engine
│   │   ├── QualityGatesReportFormatter.ts # Console, HTML, and CSV report formatting
│   │   └── helpers.ts               # File-based failure tracking across workers
│   ├── TimerStore.ts               # Low-level timer management
│   ├── TimerHelper.ts              # Timer helper with thresholds support
│   ├── AppiumContextHelpers.ts  # Native ↔ web context switching (dapp tests)
│   └── utils/
│       ├── TestConstants.js         # Test constants and credentials
│       └── Utils.js                 # General utilities
├── flows/
│   └── wallet.flow.ts               # Shared user flows (login, onboarding, modals)
├── page-objects/                    # Static page object classes
│   ├── wallet/                      # Wallet screens
│   ├── Onboarding/                  # Onboarding screens
│   ├── Predict/                     # Predict market screens
│   ├── MMConnect/                   # Dapp connection screens
│   └── ...
├── reporters/
│   ├── custom-reporter.js           # Custom reporter for HTML/CSV/JSON output
│   ├── PerformanceTracker.js        # Performance metrics collector
│   ├── AppProfilingDataHandler.js   # App profiling data processor
│   └── reports/                     # Generated per-test reports
├── performance/
│   ├── device-matrix.json           # Device configurations for parallel testing
│   ├── feature-flag-helper.ts       # Production feature flag fetching
│   ├── login/                       # Tests for logged-in user flows
│   │   ├── launch-times/            # Cold/warm start measurements
│   │   └── predict/                 # Predict market features
│   └── onboarding/                  # Tests for new user onboarding
│       └── launch-times/            # Onboarding launch metrics
├── aggregated-reports/              # Combined reports from CI runs
└── test-reports/                    # Playwright HTML reports
```

## Configuration

Local emulator and simulator projects live in `tests/playwright.config.ts`. Cloud performance projects live in `tests/playwright.testmu.config.ts`.

### Available Projects

| Project Name                         | Platform | Environment     | Test Scope          |
| ------------------------------------ | -------- | --------------- | ------------------- |
| `android`                            | Android  | Local Emulator  | Demo fixture spec   |
| `ios`                                | iOS      | Local Simulator | Demo fixture spec   |
| `testmu-android`                     | Android  | TestMu          | Login tests only    |
| `testmu-android-onboarding`          | Android  | TestMu          | Onboarding tests    |
| `testmu-android-onboarding-seedless` | Android  | TestMu          | Seedless onboarding |

### Configuration Details

- **Timeout**: 7 minutes per test (to accommodate performance metrics collection)
- **Expect Timeout**: 30 seconds for element interactions
- **Reporters**: HTML report, custom performance reporter, and list reporter
- **Report Location**: `./test-reports/playwright-report`

### Device Matrix

The `tests/performance/device-matrix.json` file defines device configurations for parallel testing, with device categories for different testing tiers:

```json
{
  "android_devices": [
    {
      "name": "Samsung Galaxy S25 Ultra",
      "os_version": "15.0",
      "category": "high"
    },
    { "name": "Google Pixel 8 Pro", "os_version": "14.0", "category": "low" }
  ],
  "ios_devices": [
    { "name": "iPhone 16 Pro Max", "os_version": "18", "category": "high" },
    { "name": "iPhone 12", "os_version": "17", "category": "low" }
  ],
  "device_categories": {
    "high": "High-end devices for primary testing",
    "medium": "Mid-range devices for broader compatibility testing",
    "low": "Low-end devices for backward compatibility and emerging market testing"
  }
}
```

## CI Triggers

Performance E2E never runs on push. On a PR it runs only from a performance label. `run-performance-tests` runs the full suite. An area label such as `run-performance-perps-tests` runs only that area, and several area labels run their union. Coverage otherwise comes from the fixed schedule, with manual dispatch for everything else (release branches, ad-hoc `exp`/`rc` runs, etc.).

| Event                                 | Behavior                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Push to `main`, `stable`, `release/*` | No performance tests.                                                                                    |
| PR without a performance label        | No performance tests. Smart E2E Selection does not start them.                                           |
| PR with `run-performance-tests`       | Full performance suite. Ignored on fork PRs and when the base branch is `stable`.                        |
| PR with area performance labels       | Only the labeled areas. Several labels run their union. The full-suite label wins when both are present. |
| Scheduled (Mon–Sat)                   | `e2e` builds from `main` every 6 hours starting at 00:00 UTC. Experimental builds are manual-only.       |
| Manual dispatch                       | Run against any selected branch or tag with any build variant (`e2e`, `exp`, or `rc`).                   |

Workflow layout:

- [`run-performance-e2e.yml`](../../.github/workflows/run-performance-e2e.yml) — reusable execution engine (`workflow_call` only). Builds the apps, runs the Playwright suite on TestMu HyperExecute, aggregates results, and posts the PR comment/Slack notification. Never triggered directly.
- [`run-performance-e2e-manual.yml`](../../.github/workflows/run-performance-e2e-manual.yml) — the only workflow with `schedule`/`workflow_dispatch` triggers. Wraps `run-performance-e2e.yml` for both the scheduled cadence and manual runs.
- `ci.yml` (`run-performance-tests-pr` job) — calls `run-performance-e2e.yml` when the PR has `run-performance-tests` or an area label such as `run-performance-perps-tests`. The general label runs the full suite. Area labels run only their tags.

### TestMu scheduled-performance dashboard

A pull request does not run performance tests unless it has
`run-performance-tests` or an area performance label, so an ordinary PR never
creates TestMu sessions. The
four daily scheduled runs (Monday–Saturday) use one stable project and build.
Manual TestMu dispatches and labeled PR runs keep a branch build name, so they
do not join this history:

- Project: `MetaMask Mobile Scheduled Performance`
- Build: `TestMu-Android-Performance-main-Scheduled-HyperExecute`
- Device: Google Pixel 8 Pro / Android 14
- Test name: the Playwright performance scenario title

In TestMu, open **Insights**, create an **App Automation** dashboard, and filter
all widgets by that project and build. Useful widgets are pass/fail count and
rate over `create_timestamp`, average/p90 `duration` grouped by `test_name`, and
a failed-tests table with `failure_category`, device, and OS version. The
**App Profiling** view uses the same sessions for CPU, memory, FPS, network,
battery, and temperature trends; filter by the scenario names and Android
device/build version.

The TestMu duration is the full Appium session duration. Step timers and their
quality gates remain in `performance-results.json`, the generated HTML report,
and Sentry; they are not native TestMu widget metrics.

For PRs, `run-performance-e2e.yml` builds against the exact PR merge commit (`source_ref: github.sha`), the same ref used by the standard E2E builds, so performance results reflect the same code. `branch_name` (`github.head_ref`) is only used for human-readable build names/reports.

`build_variant` (`e2e`, `exp`, or `rc`) selects which native app profile CI builds and uploads to TestMu. It is distinct from `E2E_PERFORMANCE_BUILD_VARIANT` (see [Test Configuration](#test-configuration) below), which selects the remote feature-flag environment (`rc | exp | test`) used inside the test run itself.

## Running Tests

### Using Package Scripts

```bash
# Local Device/Simulator Tests
yarn run-playwright:android          # Run on local Android emulator
yarn run-playwright:ios              # Run on local iOS simulator

# TestMu cloud tests
yarn run-playwright:android-testmu              # Run login tests on TestMu Android
yarn run-playwright:android-onboarding-testmu   # Run onboarding tests on TestMu Android

```

> MetaMask Connect browser/RN playground E2E coverage now lives under [`tests/smoke-appium/mm-connect/`](../smoke-appium/mm-connect/) (`SmokeMMConnect` Appium smoke CI).

### Using CLI Directly

```bash
# Run specific project
npx playwright test --project testmu-android --config tests/playwright.testmu.config.ts

# Run a single test file
npx playwright test tests/performance/login/asset-balances.spec.ts --project android --config tests/playwright.config.ts

# Run all tests in a category
npx playwright test tests/performance/login/*.spec.ts --project android --config tests/playwright.config.ts
```

### Running Tests by Tag

Tests are tagged by area for selective execution. Use the `--grep` option to filter tests by tag:

```bash
# Run all login performance tests
npx playwright test --grep "@PerformanceLogin" --project android --config tests/playwright.config.ts

# Run all onboarding performance tests
npx playwright test --grep "@PerformanceOnboarding" --project android --config tests/playwright.config.ts

# Run all swap-related performance tests
npx playwright test --grep "@PerformanceSwaps" --project android --config tests/playwright.config.ts

# Run multiple tags (OR logic)
npx playwright test --grep "@PerformanceLogin|@PerformanceOnboarding" --project android --config tests/playwright.config.ts

# Run tests with specific tag combination
npx playwright test --grep "@PerformanceLogin.*@PerformanceLaunch" --project android --config tests/playwright.config.ts
```

## Test Tags

Tags are defined in `tests/tags.performance.js` and embedded in `test.describe()` names. They are runner-agnostic — any runner with `--grep` support can filter by them.

### Test Type Tags

These tags control which Playwright config picks up a test:

| Tag            | Description                                                            | Config that filters for it                                                                 |
| -------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `@Performance` | Test measures performance (uses `TimerHelper`, quality gates enforced) | `playwright.config.ts` (`grep: /@Performance/`)                                            |
| `@System`      | Test verifies functionality (no quality gates or metrics)              | `playwright.system.config.ts` / `playwright.system-emulator.config.ts` (`grep: /@System/`) |

Most existing tests are tagged with **both** `@Performance @System` — they measure perf and also serve as system smoke tests. A test can use just one tag if it should only run in one suite.

### Area Tags

These tags categorize tests by feature area and can be used with `--grep` for ad-hoc filtering:

| Tag                        | Description                                                   |
| -------------------------- | ------------------------------------------------------------- |
| `@PerformanceAccountList`  | Account list rendering and dismissal performance              |
| `@PerformanceNetworkList`  | Network list rendering and dismissal performance              |
| `@PerformanceOnboarding`   | Onboarding flow performance (wallet creation, SRP import)     |
| `@PerformanceLogin`        | Login and unlock performance                                  |
| `@PerformanceSwaps`        | Swap flow performance                                         |
| `@PerformanceLaunch`       | App launch performance (cold/warm start)                      |
| `@PerformanceAssetLoading` | Asset and balance loading performance                         |
| `@PerformancePredict`      | Predict market performance (market list, details, deposits)   |
| `@PerformancePreps`        | Perpetuals trading performance (positions, add funds, orders) |
| `@PerformanceRewards`      | Rewards tab time-to-content (onboarding or dashboard shell)   |

### Tagging Convention

Import type tags and area tags from `tests/tags.performance.js`:

```typescript
import {
  Performance,
  System,
  PerformanceLogin,
  PerformanceSwaps,
} from '../../tags.performance.js';

// Both perf and system test (most common):
perfTest.describe(
  `${Performance} ${System} ${PerformanceLogin} ${PerformanceSwaps}`,
  () => {
    perfTest(
      'Swap flow performance',
      async (
        { currentDeviceDetails, driver, performanceTracker },
        testInfo,
      ) => {
        // test implementation with TimerHelper and thresholds
      },
    );
  },
);

// System-only test (functional verification, no perf measurement):
test.describe(`${System} ${PerformanceLogin}`, () => {
  test('Verify wallet loads after login', async ({ driver }) => {
    // No TimerHelper — pure functional check
    await loginToAppPlaywright();
    await WalletView.waitForAccountName('Account 1');
  });
});
```

## Test Categories

### Login Tests (`tests/performance/login/`)

Tests for users with existing wallets:

- `asset-balances.spec.ts` - Asset balance loading times
- `asset-view.spec.ts` - Individual asset view performance
- `rewards-tab-time-to-content.spec.ts` - Rewards tab time-to-content (onboarding or dashboard)
- `eth-swap-flow.spec.ts` - ETH swap transaction flow
- `cross-chain-swap-flow.spec.ts` - Cross-chain swap performance
- `import-multiple-srps.spec.ts` - Multiple SRP import performance
- `perps-add-funds.spec.ts` - Perpetuals fund addition
- `perps-position-management.spec.ts` - Position management flows
- `launch-times/` - Cold/warm start measurements

### Onboarding Tests (`tests/performance/onboarding/`)

Tests for new users:

- `import-wallet.spec.ts` - Wallet import via SRP
- `imported-wallet-account-creation.spec.ts` - Account creation after import
- `new-wallet-account-creation.spec.ts` - New wallet creation flow
- `seedless-apple-onboarding.spec.ts` - Apple social sign-in onboarding
- `seedless-google-onboarding.spec.ts` - Google social sign-in onboarding
- `seedless-telegram-onboarding.spec.ts` - Telegram social sign-in onboarding (requires `MM_TELEGRAM_LOGIN_ENABLED=true` on without-srp e2e builds)
- `launch-times/` - Onboarding launch metrics

### Predict Tests (`tests/performance/login/predict/`)

Tests for prediction market features:

- `predict-available-balance.spec.ts`
- `predict-deposit.spec.ts`
- `predict-market-details.spec.ts`

### MetaMask Connect

MMConnect E2E specs were migrated to Appium smoke: [`tests/smoke-appium/mm-connect/`](../smoke-appium/mm-connect/).

## Performance Tracking System

### Overview

The performance tracking system consists of three main components:

1. **TimerHelper** (`tests/framework/TimerHelper.ts`) - Creates and manages individual timers with platform-specific thresholds
2. **PerformanceTracker** (`tests/reporters/PerformanceTracker.ts`) - Collects all timers and generates metrics
3. **Quality Gates** (`tests/framework/quality-gates/`) - Threshold validation and reporting:
   - `QualityGatesValidator` - Validates metrics against defined thresholds
   - `QualityGatesReportFormatter` - Formats results as console, HTML, and CSV reports
   - `QualityGateError` - Custom error class for threshold failures
   - `helpers` - File-based failure tracking across Playwright workers

### TimerHelper

`TimerHelper` is the core class for measuring performance. It supports:

- Platform-specific thresholds (iOS vs Android)
- Automatic 15% margin on thresholds
- Multiple measurement patterns

```typescript
import TimerHelper from '../../framework/TimerHelper';

// Timer with platform-specific thresholds (preferred)
const timer = new TimerHelper(
  'Time since the user taps Send until confirmation screen appears',
  { ios: 1500, android: 2000 }, // Thresholds in milliseconds
  currentDeviceDetails.platform, // 'ios' | 'android'
);

// Using measure() — action BEFORE measure, assertion INSIDE measure
await SomeScreen.tapButton(); // action (not timed)
await timer.measure(async () => {
  await AppiumAssertions.expectElementToBeVisible(NextScreen.container);
});

// Manual start/stop for cross-context flows (dapp tests)
await AppiumContextHelpers.switchToWebViewContext(DAPP_URL);
await DappScreen.tapConnect(); // action
timer.start(); // start AFTER the action
await AppiumContextHelpers.switchToNativeContext();
await DappConnectionModal.tapConfirm();
await AppiumContextHelpers.switchToWebViewContext(DAPP_URL);
await DappScreen.assertConnected(); // assertion
timer.stop(); // stop AFTER assertion
```

### Timer Methods

| Method                   | Description                             |
| ------------------------ | --------------------------------------- |
| `start()`                | Starts the timer                        |
| `stop()`                 | Stops the timer                         |
| `getDuration()`          | Returns duration in milliseconds        |
| `getDurationInSeconds()` | Returns duration in seconds             |
| `measure(action)`        | Wraps an async assertion (timed)        |
| `hasThreshold()`         | Checks if timer has a threshold defined |
| `changeName(newName)`    | Renames the timer                       |

### PerformanceTracker

The `PerformanceTracker` is provided as a fixture and handles:

- Collecting timers from the test
- Automatically attaching metrics to test results on teardown
- Storing session data for video retrieval
- TestMu video URL resolution

```typescript
import { test as perfTest } from '../../framework/fixtures/playwright';

perfTest(
  'My test',
  async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
    const timer = new TimerHelper(
      'My measurement',
      { ios: 1000, android: 1200 },
      currentDeviceDetails.platform,
    );

    await SomeScreen.tapButton(); // action
    await timer.measure(async () => {
      await AppiumAssertions.expectElementToBeVisible(NextScreen.container);
    });

    // Add timer to tracker — metrics are auto-attached after the test by the fixture
    performanceTracker.addTimer(timer);

    // Or add multiple timers at once
    performanceTracker.addTimers(timer1, timer2, timer3);

    // DO NOT call performanceTracker.attachToTest() — the fixture handles this automatically
  },
);
```

## Quality Gates & Thresholds

### How Thresholds Work

1. **Base Threshold**: The target time you define per platform
2. **Effective Threshold**: Base + 15% margin (automatic)
3. **Validation**: Test fails if any timer exceeds its effective threshold

```typescript
// If you set threshold: { ios: 1000, android: 1500 }
// Effective thresholds will be: iOS = 1100ms, Android = 1650ms
```

### Quality Gates Module (`tests/framework/quality-gates/`)

The quality gates module is organized into focused TypeScript files by responsibility:

| File                             | Responsibility                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `types.ts`                       | Shared interfaces (`TimerLike`, `StepResult`, `QualityGatesResult`, `Violation`, etc.) |
| `QualityGatesValidator.ts`       | Core validation logic (`validateTimers`, `validateMetrics`, `assertThresholds`)        |
| `QualityGatesReportFormatter.ts` | Report formatting (`formatConsoleReport`, `generateHtmlSection`, `generateCsvRows`)    |
| `QualityGateError.ts`            | Custom error class for threshold failures (non-retryable)                              |
| `helpers.ts`                     | File-based failure tracking that persists across Playwright workers                    |

The validator runs automatically after each test (via the fixture) if any timer has thresholds defined:

```typescript
// This happens automatically in the fixture teardown:
if (hasThresholds) {
  QualityGatesValidator.assertThresholds(
    testInfo.title,
    performanceTracker.timers,
  );
}
```

### Validation Output

When thresholds are defined, you'll see console output like:

```
═══════════════════════════════════════════════════════════════
                    QUALITY GATES VALIDATION
═══════════════════════════════════════════════════════════════
Test: My Performance Test
Status: ✅ PASSED
───────────────────────────────────────────────────────────────
✅ Step 1: 850ms [threshold: 1150ms (base: 1000ms +15%)]
   └─ Time for button tap to screen load
✅ Step 2: 1200ms [threshold: 1725ms (base: 1500ms +15%)]
   └─ Time for data to load
───────────────────────────────────────────────────────────────
✅ Total: 2050ms [threshold: 2875ms]
═══════════════════════════════════════════════════════════════
```

### When Thresholds Fail

If a timer exceeds its threshold, the test will fail with a detailed error:

```
Quality Gates FAILED for "My Test":
  • Step 1 exceeded: 1500ms > 1100ms (+400ms / +36.4%)
```

## Page Object Model

Tests use static page object classes from `tests/page-objects/`. No device assignment is needed — just import and call:

```typescript
import { AppiumAssertions } from '../../framework';
import WalletView from '../../page-objects/wallet/WalletView';
import LoginView from '../../page-objects/wallet/LoginView';

perfTest(
  'My test',
  async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
    // No device assignment needed — page objects use the global driver
    await WalletView.tapOnToken('USDC');
    await AppiumAssertions.expectElementToBeVisible(WalletView.accountIcon);
  },
);
```

Dapp tests use page objects under `tests/page-objects/MMConnect/`:

```typescript
import BrowserPlaygroundDapp from '../../page-objects/MMConnect/BrowserPlaygroundDapp';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import SignModal from '../../page-objects/MMConnect/SignModal';
```

## Shared Flows

Common user flows are in `tests/flows/wallet.flow.ts`.

### `loginToAppPlaywright(options?)`

Standard login flow:

```typescript
import { loginToAppPlaywright } from '../../flows/wallet.flow';

// Simple login
await loginToAppPlaywright();

// Login for a different wallet scenario
await loginToAppPlaywright({ scenarioType: 'login' });
```

### `onboardingFlowImportSRPPlaywright(srp)`

Complete onboarding flow for importing a wallet:

```typescript
import { onboardingFlowImportSRPPlaywright } from '../../flows/wallet.flow';

await onboardingFlowImportSRPPlaywright(process.env.TEST_SRP_1);
```

### `selectAccountByDevice(deviceName)`

Select the account mapped to the current device for parallel testing. The device is looked up in `device-matrix.json` without its brand, so `Pixel 8 Pro` and `Google Pixel 8 Pro` resolve to the same entry. A device that is not in the matrix throws `Account name not found for device`:

```typescript
import { selectAccountByDevice } from '../../flows/wallet.flow';

await selectAccountByDevice(currentDeviceDetails.deviceName);
```

### Context switching for dapp tests

```typescript
import AppiumContextHelpers from '../../framework/AppiumContextHelpers';

// Switch to native MetaMask context
await AppiumContextHelpers.switchToNativeContext();

// Switch to a specific web/dapp context
await AppiumContextHelpers.switchToWebViewContext(DAPP_URL);
```

## Environment Variables

Create a `.e2e.env` file in the project root:

### TestMu Configuration

```bash
# TestMu AI credentials (required for cloud performance tests)
LT_USERNAME=your_username
LT_ACCESS_KEY=your_access_key

# Device configuration (optional, defaults provided in playwright.testmu.config.ts)
TESTMU_DEVICE="Pixel 8 Pro"
TESTMU_OS_VERSION="14"

# App URLs (required for local TestMu runs)
TESTMU_ANDROID_APP_URL=lt://your-android-app-id

# Clean apps for onboarding tests
TESTMU_ANDROID_ONBOARDING_PERF_APP_URL=lt://your-onboarding-android-app-id
TESTMU_ANDROID_CLEAN_APP_URL=lt://your-clean-android-app-id
TESTMU_ANDROID_SEEDLESS_PERF_APP_URL=lt://your-seedless-android-app-id
```

### Test Configuration

```bash
# Test SRPs for multi-account tests
TEST_SRP_1="your test recovery phrase 1"
TEST_SRP_2="your test recovery phrase 2"
TEST_SRP_3="your test recovery phrase 3"
TEST_SRP_4='your test recovery phrase 4" // user for Perps
LT_USERNAME='YOUR_TESTMU_USERNAME'
LT_ACCESS_KEY='YOUR_TESTMU_ACCESS_KEY'
E2E_PASSWORD='WALLET_PASSWORD' // 1Password

# Test Passwords (can be found in 1Password)
TEST_PASSWORD_LOGIN="your test password"
TEST_PASSWORD_ONBOARDING="your onboarding password"

# Feature flags for performance tests (client-config API: rc | exp | test; not e2e)
E2E_PERFORMANCE_BUILD_VARIANT=rc

# CI note: PR (main) and scheduled performance runs use build_variant=e2e
# (GitHub environment build-e2e). Manual dispatch also supports build_variant=exp
# or rc. E2E_PERFORMANCE_BUILD_VARIANT=rc is set separately in
# performance-test-runner for the flags API. See "CI Triggers".
#
# Android performance dual builds (main-e2e-bs-*) follow the same fingerprint
# procedure as main-e2e Android (build-android-e2e.yml), via find-reusable-build in
# build-android-upload-to-testmu.yml. Performance runs upload the staged
# APKs to TestMu only:
#   - miss → fresh dual Gradle builds
#   - hit + test-only (main_branch_only/reuse_main_builds) → re-upload APKs as-is
#   - hit + app changes → skip Gradle, @expo/repack-app both profiles with current JS,
#     then upload (fingerprint ignores JS-only changes, so repack avoids stale JS)
# Separate from Appium smoke main-e2e APKs. reuse_main_builds is the test-only
# fast path that reuses the latest main APKs.
```

### Sentry Performance Instrumentation (Optional)

If you want each performance scenario to upload timer data to Sentry,
set the following variables in `.e2e.env`:

```bash
# Required to enable upload
E2E_PERFORMANCE_SENTRY_DSN="https://<publicKey>@<host>/<projectId>"

# Optional controls
E2E_PERFORMANCE_SENTRY_ENABLED=true
E2E_PERFORMANCE_SENTRY_SAMPLE_RATE=1
E2E_PERFORMANCE_SENTRY_ENVIRONMENT="e2e-performance"
E2E_PERFORMANCE_SENTRY_RELEASE="mm-mobile-e2e-<build>"
```

What gets sent per scenario:

- One Sentry `transaction` event per scenario
- Each test timer as a numeric measurement (duration in milliseconds)
- Scenario metadata (test name, project, tags, team, retry, worker)
- Timer details (thresholds and pass/fail validation) in `extra.timer_steps`
- RC track-only tags when running release builds: `ci_build_variant`,
  `release_version`, `github_ref`, `github_run_id`, `tracking_mode=observe`

### RC performance tracking (observe-only)

RC performance E2E is available through manual dispatch of
`run-performance-e2e-manual.yml` against a `release/*` branch with
`build_variant=rc`. This path is **track-only** (does not block the release):

- Uploads scenario + profiling metrics to the **test** Sentry project by default
  (`sentry_target: test`)
- Tags events with `ci_build_variant:rc` and `release_version` (from
  `release/X.Y.Z`) so RC runs are filterable in Discover
- Slack summary is labeled `RC <version> (track-only)`

Filter example in Sentry:

```text
ci_build_variant:rc release_version:7.58.0
```

## Reports and Metrics

### Per-Test Reports

After each test, the custom reporter generates:

| File Type | Location                                                                      | Content                                       |
| --------- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| HTML      | `reporters/reports/performance-report-{test}-{timestamp}.html`                | Visual report with charts                     |
| CSV       | `reporters/reports/performance-report-{test}-{timestamp}.csv`                 | Spreadsheet-friendly data                     |
| JSON      | `reporters/reports/performance-metrics-{test}-{device}.json`                  | Raw metrics data                              |
| Profiling | `reporters/reports/app-profiling/app-profiling-{scenario}-{device}-{os}.json` | Per-scenario TestMu app profiling + API calls |

### HTML Report Contents

- Test metadata (name, device, timestamp)
- Step-by-step timing breakdown
- Quality gates validation results
- Threshold comparison table
- Video link (when available from TestMu)

### Playwright HTML Report

Standard Playwright report at `test-reports/playwright-report/index.html`:

- Test results and status
- Screenshots and videos
- Console logs
- Error traces

## Aggregated Reports

For CI/CD pipelines, the aggregation script combines results from multiple test runs.

### Running Aggregation

```bash
node .github/scripts/qa-automation/performance-tests/aggregate-performance-reports.mjs
```

### Generated Files

| File                                                          | Description                                 |
| ------------------------------------------------------------- | ------------------------------------------- |
| `tests/aggregated-reports/performance-results.json`           | Combined results grouped by platform/device |
| `tests/aggregated-reports/aggregated-performance-report.json` | Same as above (alias)                       |
| `tests/aggregated-reports/summary.json`                       | Statistics and metadata                     |
| `tests/aggregated-reports/performance-report.html`            | **Visual HTML dashboard**                   |
| `tests/aggregated-reports/app-profiling/*.json`               | Per-scenario app profiling + API call files |

### App profiling check (automatic on PR failures)

When a PR performance run has failed scenarios, the results comment includes
an inline **App profiling check** under each failed scenario that has a prior
usable baseline on `main` (short summary + collapsed metric table). Scenarios
without a prior baseline are omitted from that block.

Baselines come from the scheduled `main` runs of
[`run-performance-e2e-manual.yml`](../../.github/workflows/run-performance-e2e-manual.yml)
(`BASELINE_WORKFLOW` in `.github/scripts/qa-automation/performance-tests/diff-app-profiling.mjs`). The reusable
`run-performance-e2e.yml` cannot be used as the baseline source: it is
`workflow_call` only, so its invocations are jobs of the caller run and never
appear in `gh run list --workflow run-performance-e2e.yml`.

Header uses ⚠️ when there are failed tests.

Manual re-run remains available via:

```text
@metamaskbot app-profiling-check --test "Cold Start Login" --platform Android --device "Google Pixel 8 Pro+14.0" --run <RUN_ID>
```

Or compare all failed scenarios from that run:

```text
@metamaskbot app-profiling-check --all --run <RUN_ID>
```

This uses `.github/workflows/app-profiling-check.yml` (bot command /
`workflow_dispatch`). The automatic PR path embeds profiling into the
performance results comment from `run-performance-e2e.yml`.

Both paths share `.github/scripts/qa-automation/performance-tests/diff-app-profiling.mjs`, so a `--workflow`
override on the manual command also changes where baselines are looked up.

### Weekly app profiling report (Cursor Automation)

For a weekly rollup of TestMu app-profiling averages across merged PRs
that ran performance tests:

```bash
node .github/scripts/qa-automation/performance-tests/weekly-app-profiling-report.mjs --days 7 --top 10 --out-dir /tmp/weekly-app-profiling
```

Outputs:

| File             | Description                                                                   |
| ---------------- | ----------------------------------------------------------------------------- |
| `report.json`    | Scenario averages, peak-sample recording URLs, failing PRs, data-driven leads |
| `slack.md`       | Slack-ready markdown (leads include TestMu recording links for peaks)         |
| `ai-briefing.md` | Briefing for an AI pass (investigation insights + peak recordings)            |

Recommended automation: schedule the prompt in
[`.cursor/automations/weekly-app-profiling-report.md`](../../.cursor/automations/weekly-app-profiling-report.md).
That run collects metrics, adds a final **AI insights to investigate** section
based on merged PR themes/hotspots, and DMs the report on Slack.

### HTML Dashboard Features

The aggregated HTML report (`performance-report.html`) includes:

- **Summary Cards**: Pass rate, total tests, passed/failed counts
- **Profiling Overview**: CPU usage, memory stats, performance issues
- **Platform Breakdown**: Android/iOS device-by-device results
- **Interactive Test Table**: Filterable by status (All/Passed/Failed)
- **Step Details**: Expandable timing breakdown per test
- **Video Links**: Direct links to TestMu recordings

## Best Practices

### Writing Performance Tests

1. **Import `test` from the framework fixture**:

   ```typescript
   import { test as perfTest } from '../../framework/fixtures/playwright';
   ```

2. **Use `currentDeviceDetails.platform` as the `TimerHelper` third argument**:

   ```typescript
   const timer = new TimerHelper(
     'Time since user taps Send until confirmation screen appears',
     { ios: 1500, android: 2000 },
     currentDeviceDetails.platform, // ✅ correct
   );
   ```

3. **Action BEFORE `measure()`, assertion INSIDE `measure()`**:

   ```typescript
   // ✅ Good — action outside, assertion inside
   await WalletView.tapButton();
   await timer.measure(async () => {
     await AppiumAssertions.expectElementToBeVisible(
       NextScreen.container,
     );
   });

   // ❌ Bad — action inside measure pollutes the timing
   await timer.measure(async () => {
     await WalletView.tapButton();
     await AppiumAssertions.expectElementToBeVisible(...);
   });
   ```

4. **Use descriptive timer names**:

   ```typescript
   // ✅ Good
   'Time since user taps Send button until confirmation screen appears';

   // ❌ Bad
   'send time';
   ```

5. **Set realistic thresholds per platform**:

   ```typescript
   // iOS is typically faster for UI animations
   { ios: 1500, android: 2000 }
   ```

6. **Do not call `attachToTest` manually** — the fixture teardown handles it automatically.

### Test Structure Example

```typescript
import { test as perfTest } from '../../framework/fixtures/playwright';
import TimerHelper from '../../framework/TimerHelper';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { AppiumAssertions } from '../../framework';
import WalletView from '../../page-objects/wallet/WalletView';
import TokenOverview from '../../page-objects/wallet/TokenOverview';
import {
  PerformanceLogin,
  PerformanceAssetLoading,
} from '../../tags.performance.js';

perfTest.describe(`${PerformanceLogin} ${PerformanceAssetLoading}`, () => {
  perfTest(
    'Asset View performance',
    { tag: '@assets-dev-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      // 1. Login
      await loginToAppPlaywright();

      // 2. Create timer with thresholds
      const timer = new TimerHelper(
        'Time since the user taps the token until the overview screen is visible',
        { ios: 600, android: 600 },
        currentDeviceDetails.platform,
      );

      // 3. Measure the action
      await WalletView.tapOnToken('USDC'); // action (not timed)
      await timer.measure(async () => {
        await AppiumAssertions.expectElementToBeVisible(
          TokenOverview.container,
        );
      });

      // 4. Add timer to tracker (metrics auto-attach after test)
      performanceTracker.addTimer(timer);
    },
  );
});
```

## Troubleshooting

### Common Issues

**Tests timing out**

- Increase timeout in `tests/playwright.config.ts`
- Check device/emulator resources
- Verify network connectivity for TestMu

**Element not found**

- Verify the page object selector is up to date in `tests/page-objects/`
- Ensure the correct view is imported from `tests/page-objects/`

**TestMu connection issues**

- Verify `LT_USERNAME` and `LT_ACCESS_KEY` in `.e2e.env`
- Check app URLs are valid `lt://` links
- Ensure the account has available sessions

**Quality gates failing unexpectedly**

- Review threshold values (remember +15% margin)
- Check if platform-specific threshold is appropriate
- Consider network/device variability

**Video URL not available**

- TestMu needs time to process recordings
- Check session ID is being stored correctly
- Verify TestMu credentials

### Debugging Tips

1. **Enable verbose logging**:

   ```typescript
   console.log(`Timer duration: ${timer.getDuration()}ms`);
   console.log(`Threshold: ${timer.threshold}ms`);
   console.log(`Has threshold: ${timer.hasThreshold()}`);
   ```

2. **Check timer values after completion**:

   ```typescript
   timer.stop();
   console.log(`Duration: ${timer.getDuration()}ms`);
   console.log(`Duration in seconds: ${timer.getDurationInSeconds()}s`);
   ```

3. **Enable Webdrverio Logs**:
   Set `WDIO_LOG_LEVEL=debug` to your run command.
   Example: WDIO_LOG_LEVEL=debug yarn run-playwright:android-testmu

## Additional Resources

- [MetaMask Mobile E2E Documentation](../../docs/readme/e2e-testing.md)
- [Performance Test Fixtures](../framework/fixtures/playwright/)
- [Page Objects](../page-objects/)
- [Flow Utilities](../flows/wallet.flow.ts)

## Contributing

When adding new performance tests:

1. Follow the existing test structure and naming conventions
2. Use descriptive timer names that clearly indicate what is being measured
3. Set appropriate thresholds for both platforms
4. Update this README if adding new test categories or features
5. Ensure tests work on both Android and iOS platforms
6. Test locally before pushing to CI

## Support

For issues or questions:

- Check existing test examples in `tests/performance/`
- Review page objects in `tests/page-objects/`
- Reach out to the QA team
