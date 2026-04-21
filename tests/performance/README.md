# Performance Tests

This directory contains Playwright-based performance tests for MetaMask Mobile, measuring real user flows on real devices and BrowserStack cloud infrastructure.

## Overview

The performance test suite measures metrics for critical user flows in MetaMask Mobile, including onboarding, login, account management, swap flow, send flow, perps, and more. Tests are organized to run on both local devices/simulators and BrowserStack cloud infrastructure.

The performance framework lives under the `tests/` directory alongside the rest of the E2E testing infrastructure, with shared utilities in `tests/framework/` and reporters in `tests/reporters/`.

## Table of Contents

- [Test Structure](#test-structure)
- [Configuration](#configuration)
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
│   ├── fixture/
│   │   └── index.ts                 # Custom Playwright fixture with performance tracking
│   ├── quality-gates/
│   │   ├── types.ts                 # Shared type definitions for quality gates
│   │   ├── QualityGateError.ts      # Custom error class for threshold failures
│   │   ├── QualityGatesValidator.ts # Threshold validation engine
│   │   ├── QualityGatesReportFormatter.ts # Console, HTML, and CSV report formatting
│   │   └── helpers.ts               # File-based failure tracking across workers
│   ├── TimerStore.ts               # Low-level timer management
│   ├── TimerHelper.ts              # Timer helper with thresholds support
│   ├── PlaywrightContextHelpers.ts  # Native ↔ web context switching (dapp tests)
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
│   ├── onboarding/                  # Tests for new user onboarding
│   │   └── launch-times/            # Onboarding launch metrics
│   └── mm-connect/                  # MetaMask Connect integration tests
├── aggregated-reports/              # Combined reports from CI runs
└── test-reports/                    # Playwright HTML reports
```

## Configuration

The test suite is configured in `tests/playwright.config.ts`, which defines multiple projects for different testing environments.

### Available Projects

| Project Name                      | Platform | Environment     | Test Scope                 |
| --------------------------------- | -------- | --------------- | -------------------------- |
| `android`                         | Android  | Local Emulator  | All performance tests      |
| `ios`                             | iOS      | Local Simulator | All performance tests      |
| `browserstack-android`            | Android  | BrowserStack    | Login tests only           |
| `browserstack-ios`                | iOS      | BrowserStack    | Login tests only           |
| `android-onboarding`              | Android  | BrowserStack    | Onboarding tests only      |
| `ios-onboarding`                  | iOS      | BrowserStack    | Onboarding tests only      |
| `mm-connect-android-local`        | Android  | Local Emulator  | connection-multichain only |
| `mm-connect-android-browserstack` | Android  | BrowserStack    | connection-multichain only |
| `mm-connect-ios-local`            | iOS      | Local Simulator | MM Connect tests           |
| `mm-connect-ios-browserstack`     | iOS      | BrowserStack    | MM Connect tests           |

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
      "name": "Samsung Galaxy S23 Ultra",
      "os_version": "13.0",
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

## Running Tests

### Using Package Scripts

```bash
# Local Device/Simulator Tests
yarn run-playwright:android          # Run on local Android emulator
yarn run-playwright:ios              # Run on local iOS simulator

# BrowserStack Tests
yarn run-playwright:android-bs       # Run login tests on BrowserStack Android
yarn run-playwright:ios-bs           # Run login tests on BrowserStack iOS
yarn run-playwright:android-onboarding-bs  # Run onboarding tests on BrowserStack Android
yarn run-playwright:ios-onboarding-bs      # Run onboarding tests on BrowserStack iOS

# MM Connect (Multichain API + local Browser Playground dapp)
yarn run-playwright:mm-connect-android-local    # Local Android emulator (dapp on 10.0.2.2:8090)
yarn run-playwright:mm-connect-android-bs      # BrowserStack Android (no tunnel; use remote dapp if any)
yarn run-playwright:mm-connect-android-bs-local # BrowserStack Android + Local tunnel (see below)
```

#### MM Connect on BrowserStack (local dapp)

The `connection-multichain` test starts a **local dapp server** (Browser Playground) on port **8090**. To run it on BrowserStack, the cloud device must reach that server via **BrowserStack Local** (tunnel).

1. **Start the BrowserStack Local binary** (in a separate terminal):
   - Download from [BrowserStack Local](https://www.browserstack.com/docs/local-testing/binary-params) if needed.
   - Run **without** `--local-identifier` (so the test uses your single tunnel):
     ```bash
     ./BrowserStackLocal --key $BROWSERSTACK_ACCESS_KEY
     ```
     (Optionally add `--verbose --force-local`. If you run multiple tunnels, start with `--local-identifier <id>` and set `BROWSERSTACK_LOCAL_IDENTIFIER=<id>` when running the test.)
   - Keep it running until you see: `[SUCCESS] You can now access your local server(s) in our remote browser`. Wait 5–10 seconds, then run the test.

2. **Run the test** with Local enabled:

   ```bash
   yarn run-playwright:mm-connect-android-bs-local
   ```

   Set `BROWSERSTACK_LOCAL=true` in `.e2e.env` so the patch sends `local: true` in capabilities (and `localIdentifier` only if you set `BROWSERSTACK_LOCAL_IDENTIFIER`). The test uses **`http://bs-local.com:8090`** for the dapp.

3. Ensure `.e2e.env` has `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY`. The mm-connect BrowserStack project uses `BROWSERSTACK_ANDROID_APP_URL` (or the default `bs://...` in config) for the app; override via env for a custom build.

**Local Android (emulator):** When you run `yarn run-playwright:mm-connect-android-local`, Chrome is launched with a single tab: the test clears Chrome data, starts Chrome, and dismisses first-run modals (sign-in, ad privacy, notifications) with short timeouts so the flow reaches the dapp before the app auto-locks. After the connection is confirmed in MetaMask, the test switches back to the browser with `switchToMobileBrowser` (no reload), so the dapp page state is preserved.

**If you see `BROWSERSTACK_LOCAL_CONNECTION_FAILED`:**

- **Start the binary before the test** and wait until it prints: `[SUCCESS] You can now access your local server(s) in our remote browser`. Then wait 5–10 seconds before running the test.
- **Single tunnel:** start the binary without `--local-identifier` and run the test as-is; the test does not send `localIdentifier` unless you set `BROWSERSTACK_LOCAL_IDENTIFIER`. If you use multiple tunnels, start the binary with `--local-identifier <id>` and set `BROWSERSTACK_LOCAL_IDENTIFIER=<id>` when running the test so they match.
- **Use the same credentials:** the key passed to `./BrowserStackLocal --key <key>` must be the same as `BROWSERSTACK_ACCESS_KEY` in `.e2e.env` (and the binary must be using the same BrowserStack account as `BROWSERSTACK_USERNAME`).
- **One tunnel per account:** don't run multiple Local binaries for the same account unless you use different `localIdentifier` values and pass them in capabilities.
- **Tunnel timeouts** (`TIMEOUT_CONNECTING` to port 45691 in the Local terminal): the cloud device cannot reach your Local binary. Allow incoming connections for ports **45690** and **45691** in your firewall, or try a different network (e.g. avoid strict NAT). See [BrowserStack Local troubleshooting](https://www.browserstack.com/docs/app-automate/appium/troubleshooting/local-issues) for more.

**CI:** BrowserStack Local is enabled for all performance build types (not only mm-connect); the tunnel is started and `local: true` plus `localIdentifier` are sent in capabilities so every run can use the tunnel (e.g. for future test dapps). The workflow starts the tunnel with `--force-local --verbose` only (no `--include-hosts`). Using `--include-hosts localhost 127.0.0.1` can prevent requests to `bs-local.com:8090` from being forwarded to the runner's localhost; the device then cannot load the dapp. The workflow waits 15s for mm-connect (10s for other build types) after starting the tunnel before running tests.

### Using CLI Directly

```bash
# Run specific project
npx playwright test --project browserstack-android --config tests/playwright.config.ts

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

Tests are tagged with area-specific tags defined in `tests/tags.performance.js`. These tags allow for selective test execution based on which areas of the app are affected by code changes.

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

Tags are imported into test files from `tests/tags.performance.js`:

```typescript
import { PerformanceLogin, PerformanceSwaps } from '../../tags.performance.js';

perfTest.describe(`${PerformanceLogin} ${PerformanceSwaps}`, () => {
  perfTest(
    'Swap flow performance',
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      // test implementation
    },
  );
});
```

## Test Categories

### Login Tests (`tests/performance/login/`)

Tests for users with existing wallets:

- `asset-balances.spec.ts` - Asset balance loading times
- `asset-view.spec.ts` - Individual asset view performance
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
- `launch-times/` - Onboarding launch metrics

### Predict Tests (`tests/performance/login/predict/`)

Tests for prediction market features:

- `predict-available-balance.spec.ts`
- `predict-deposit.spec.ts`
- `predict-market-details.spec.ts`

### MM Connect Tests (`tests/performance/mm-connect/`)

Integration tests for MetaMask Connect:

- `connection-evm.spec.ts` - EVM connection performance
- `connection-multichain.spec.ts` - Multichain connection performance
- `connection-wagmi.spec.ts` - Wagmi integration performance
- `multichain-rn-connect.spec.ts` - Multichain + Solana via the React Native Playground APK
- `legacy-evm-rn-connect.spec.ts` - Legacy EVM connection via the React Native Playground APK

> The RN playground tests require a separate APK built from the
> [`playground/react-native-playground`](https://github.com/MetaMask/connect-monorepo/tree/main/playground/react-native-playground)
> directory of the [connect-monorepo](https://github.com/MetaMask/connect-monorepo).
> The APK must be installed on the emulator before running.
> See [`tests/performance/mm-connect/README.md`](mm-connect/README.md) for full setup instructions.

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
- Automatic 10% margin on thresholds
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
  await PlaywrightAssertions.expectElementToBeVisible(
    asPlaywrightElement(NextScreen.container),
  );
});

// Manual start/stop for cross-context flows (dapp tests)
await PlaywrightContextHelpers.switchToWebViewContext(DAPP_URL);
await DappScreen.tapConnect(); // action
timer.start(); // start AFTER the action
await PlaywrightContextHelpers.switchToNativeContext();
await DappConnectionModal.tapConfirm();
await PlaywrightContextHelpers.switchToWebViewContext(DAPP_URL);
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
- BrowserStack video URL resolution

```typescript
import { test as perfTest } from '../../framework/fixture';

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
      await PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(NextScreen.container),
      );
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
2. **Effective Threshold**: Base + 10% margin (automatic)
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
✅ Step 1: 850ms [threshold: 1100ms (base: 1000ms +10%)]
   └─ Time for button tap to screen load
✅ Step 2: 1200ms [threshold: 1650ms (base: 1500ms +10%)]
   └─ Time for data to load
───────────────────────────────────────────────────────────────
✅ Total: 2050ms [threshold: 2750ms]
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
import { asPlaywrightElement, PlaywrightAssertions } from '../../framework';
import WalletView from '../../page-objects/wallet/WalletView';
import LoginView from '../../page-objects/wallet/LoginView';

perfTest(
  'My test',
  async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
    // No device assignment needed — page objects use the global driver
    await WalletView.tapOnToken('USDC');
    await PlaywrightAssertions.expectElementToBeVisible(
      asPlaywrightElement(WalletView.accountIcon),
    );
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

### `dismisspredictionsModalPlaywright()`

Dismiss the Predictions modal:

```typescript
import { dismisspredictionsModalPlaywright } from '../../flows/wallet.flow';

await dismisspredictionsModalPlaywright();
```

### `selectAccountByDevice(deviceName)`

Select the account mapped to the current device for parallel testing:

```typescript
import { selectAccountByDevice } from '../../flows/wallet.flow';

await selectAccountByDevice(currentDeviceDetails.deviceName);
```

### Context switching for dapp tests

```typescript
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';

// Switch to native MetaMask context
await PlaywrightContextHelpers.switchToNativeContext();

// Switch to a specific web/dapp context
await PlaywrightContextHelpers.switchToWebViewContext(DAPP_URL);
```

## Environment Variables

Create a `.e2e.env` file in the project root:

### BrowserStack Configuration

```bash
# BrowserStack Credentials (required for BrowserStack tests)
BROWSERSTACK_USERNAME=your_username
BROWSERSTACK_ACCESS_KEY=your_access_key

# Device Configuration (optional, defaults provided in config)
BROWSERSTACK_DEVICE="Samsung Galaxy S23 Ultra"
BROWSERSTACK_OS_VERSION="13.0"

# App URLs (required for BrowserStack tests)
BROWSERSTACK_ANDROID_APP_URL=bs://your-android-app-id
BROWSERSTACK_IOS_APP_URL=bs://your-ios-app-id

# Clean Apps for Onboarding Tests
BROWSERSTACK_ANDROID_CLEAN_APP_URL=bs://your-clean-android-app-id
BROWSERSTACK_IOS_CLEAN_APP_URL=bs://your-clean-ios-app-id
```

### Test Configuration

```bash
# Test SRPs for multi-account tests
TEST_SRP_1="your test recovery phrase 1"
TEST_SRP_2="your test recovery phrase 2"
TEST_SRP_3="your test recovery phrase 3"
BROWSERSTACK_USERNAME='YOUR_BS_USERNAME'
BROWSERSTACK_ACCESS_KEY='YOUR_BS_ACCESS_KEY'
E2E_PASSWORD='WALLET_PASSWORD' // 1Password

# Test Passwords (can be found in 1Password)
TEST_PASSWORD_LOGIN="your test password"
TEST_PASSWORD_ONBOARDING="your onboarding password"
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

## Reports and Metrics

### Per-Test Reports

After each test, the custom reporter generates:

| File Type | Location                                                       | Content                   |
| --------- | -------------------------------------------------------------- | ------------------------- |
| HTML      | `reporters/reports/performance-report-{test}-{timestamp}.html` | Visual report with charts |
| CSV       | `reporters/reports/performance-report-{test}-{timestamp}.csv`  | Spreadsheet-friendly data |
| JSON      | `reporters/reports/performance-metrics-{test}-{device}.json`   | Raw metrics data          |

### HTML Report Contents

- Test metadata (name, device, timestamp)
- Step-by-step timing breakdown
- Quality gates validation results
- Threshold comparison table
- Video link (when available from BrowserStack)

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
node scripts/aggregate-performance-reports.mjs
```

### Generated Files

| File                                                          | Description                                 |
| ------------------------------------------------------------- | ------------------------------------------- |
| `tests/aggregated-reports/performance-results.json`           | Combined results grouped by platform/device |
| `tests/aggregated-reports/aggregated-performance-report.json` | Same as above (alias)                       |
| `tests/aggregated-reports/summary.json`                       | Statistics and metadata                     |
| `tests/aggregated-reports/performance-report.html`            | **Visual HTML dashboard**                   |

### HTML Dashboard Features

The aggregated HTML report (`performance-report.html`) includes:

- **Summary Cards**: Pass rate, total tests, passed/failed counts
- **Profiling Overview**: CPU usage, memory stats, performance issues
- **Platform Breakdown**: Android/iOS device-by-device results
- **Interactive Test Table**: Filterable by status (All/Passed/Failed)
- **Step Details**: Expandable timing breakdown per test
- **Video Links**: Direct links to BrowserStack recordings

## Best Practices

### Writing Performance Tests

1. **Import `test` from the framework fixture**:

   ```typescript
   import { test as perfTest } from '../../framework/fixture';
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
     await PlaywrightAssertions.expectElementToBeVisible(
       asPlaywrightElement(NextScreen.container),
     );
   });

   // ❌ Bad — action inside measure pollutes the timing
   await timer.measure(async () => {
     await WalletView.tapButton();
     await PlaywrightAssertions.expectElementToBeVisible(...);
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
import { test as perfTest } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { asPlaywrightElement, PlaywrightAssertions } from '../../framework';
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
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(TokenOverview.container),
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
- Verify network connectivity for BrowserStack

**Element not found**

- Verify the page object selector is up to date in `tests/page-objects/`
- Ensure the correct view is imported from `tests/page-objects/`

**BrowserStack connection issues**

- Verify credentials in `.e2e.env`
- Check app URLs are valid
- Ensure account has available sessions

**BrowserStack Local testing shows "Off" for mm-connect**

- Use `yarn run-playwright:mm-connect-android-bs-local` with `BROWSERSTACK_LOCAL=true` in `.e2e.env`. Ensure the patch is applied (`yarn install`).
- Start the BrowserStack Local binary before the test and wait for the success message.

**Quality gates failing unexpectedly**

- Review threshold values (remember +10% margin)
- Check if platform-specific threshold is appropriate
- Consider network/device variability

**Video URL not available**

- BrowserStack needs time to process recordings
- Check session ID is being stored correctly
- Verify BrowserStack credentials

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
   Example: WDIO_LOG_LEVEL=debug yarn playwright test --project mm-connect-android-browserstack

## Additional Resources

- [MetaMask Mobile E2E Documentation](../../docs/readme/e2e-testing.md)
- [Performance Test Fixtures](../framework/fixture/)
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
