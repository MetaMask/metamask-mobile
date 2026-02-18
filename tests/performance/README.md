# Appwright Performance Tests

This directory contains performance tests for MetaMask Mobile using [Appwright](https://github.com/empirical-run/appwright), a mobile testing framework that combines Appium+Playwright.

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
├── appwright.config.ts              # Main Appwright configuration file
├── tags.performance.js              # Performance test tags for filtering
├── teams-config.js                  # Team/Slack mapping for notifications
├── framework/
│   ├── fixtures/
│   │   └── performance-test.js      # Custom test fixture with performance tracking
│   ├── quality-gates/
│   │   ├── types.ts                 # Shared type definitions for quality gates
│   │   ├── QualityGateError.ts      # Custom error class for threshold failures
│   │   ├── QualityGatesValidator.ts # Threshold validation engine
│   │   ├── QualityGatesReportFormatter.ts # Console, HTML, and CSV report formatting
│   │   └── helpers.ts               # File-based failure tracking across workers
│   ├── TimerStore.ts               # Low-level timer management
│   ├── TimerHelper.ts              # Timer helper with thresholds support
│   └── utils/
│       ├── Flows.js                 # Shared user flows
│       ├── TestConstants.js         # Test constants and credentials
│       ├── BrowserStackCredentials.js # BrowserStack auth helper
│       ├── MobileBrowser.js         # Mobile browser helpers
│       └── Utils.js                 # General utilities
├── reporters/
│   ├── custom-reporter.js           # Custom reporter for HTML/CSV/JSON output
│   ├── PerformanceTracker.js        # Performance metrics collector
│   ├── AppProfilingDataHandler.js   # App profiling data processor
│   └── reports/                     # Generated per-test reports
├── performance/
│   ├── device-matrix.json           # Device configurations for parallel testing
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

The test suite is configured in `tests/appwright.config.ts`, which defines multiple projects for different testing environments.

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
- **Report Location**: `./test-reports/appwright-report`

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
yarn run-appwright:android          # Run on local Android emulator
yarn run-appwright:ios              # Run on local iOS simulator

# BrowserStack Tests
yarn run-appwright:android-bs       # Run login tests on BrowserStack Android
yarn run-appwright:ios-bs           # Run login tests on BrowserStack iOS
yarn run-appwright:android-onboarding-bs  # Run onboarding tests on BrowserStack Android
yarn run-appwright:ios-onboarding-bs      # Run onboarding tests on BrowserStack iOS

# MM Connect (Multichain API + local Browser Playground dapp)
yarn run-appwright:mm-connect-android-local    # Local Android emulator (dapp on 10.0.2.2:8090)
yarn run-appwright:mm-connect-android-bs      # BrowserStack Android (no tunnel; use remote dapp if any)
yarn run-appwright:mm-connect-android-bs-local # BrowserStack Android + Local tunnel (see below)
```

#### MM Connect on BrowserStack (local dapp)

The `connection-multichain` test starts a **local dapp server** (Browser Playground) on port **8090**. To run it on BrowserStack, the cloud device must reach that server via **BrowserStack Local** (tunnel).

1. **Start the BrowserStack Local binary** (in a separate terminal):
   - Download from [BrowserStack Local](https://www.browserstack.com/docs/local-testing/binary-params) if needed.
   - Run: `./BrowserStackLocal --key $BROWSERSTACK_ACCESS_KEY` (optionally add `--verbose --force-local`).
   - Keep it running until you see: `[SUCCESS] You can now access your local server(s) in our remote browser`.

2. **Run the test** with Local enabled:

   ```bash
   yarn run-appwright:mm-connect-android-bs-local
   ```

   That command sets `BROWSERSTACK_LOCAL=true` for the run, so the patch sets `local: true` in BrowserStack capabilities and the test uses **`http://bs-local.com:8090`** for the dapp.

3. Ensure `.e2e.env` has `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY`. The mm-connect BrowserStack project uses `BROWSERSTACK_ANDROID_APP_URL` (or the default `bs://...` in config) for the app; override via env for a custom build.

**Local Android (emulator):** When you run `yarn run-appwright:mm-connect-android-local`, Chrome is launched with a single tab: the test clears Chrome data, starts Chrome, and dismisses first-run modals (sign-in, ad privacy, notifications) with short timeouts so the flow reaches the dapp before the app auto-locks. After the connection is confirmed in MetaMask, the test switches back to the browser with `switchToMobileBrowser` (no reload), so the dapp page state is preserved.

**If you see `BROWSERSTACK_LOCAL_CONNECTION_FAILED`:**

- **Start the binary before the test** and wait until it prints: `[SUCCESS] You can now access your local server(s) in our remote browser`. Then wait 5–10 seconds before running the test.
- **Use the same credentials:** the key passed to `./BrowserStackLocal --key <key>` must be the same as `BROWSERSTACK_ACCESS_KEY` in `.e2e.env` (and the binary must be using the same BrowserStack account as `BROWSERSTACK_USERNAME`).
- **One tunnel per account:** don’t run multiple Local binaries for the same account unless you use different `localIdentifier` values and pass them in capabilities.
- **Tunnel timeouts** (`TIMEOUT_CONNECTING` to port 45691 in the Local terminal): the cloud device cannot reach your Local binary. Allow incoming connections for ports **45690** and **45691** in your firewall, or try a different network (e.g. avoid strict NAT). See [BrowserStack Local troubleshooting](https://www.browserstack.com/docs/app-automate/appium/troubleshooting/local-issues) for more.

### Using Appwright CLI Directly

```bash
# Run specific project
npx appwright test --project browserstack-android --config tests/appwright.config.ts

# Run a single test file
npx appwright test tests/performance/login/asset-balances.spec.js --project android --config tests/appwright.config.ts

# Run all tests in a category
npx appwright test tests/performance/login/*.spec.js --project android --config tests/appwright.config.ts
```

### Running Tests by Tag

Tests are tagged by area for selective execution. Use the `--grep` option to filter tests by tag:

```bash
# Run all login performance tests
npx appwright test --grep "@PerformanceLogin" --project android --config tests/appwright.config.ts

# Run all onboarding performance tests
npx appwright test --grep "@PerformanceOnboarding" --project android --config tests/appwright.config.ts

# Run all swap-related performance tests
npx appwright test --grep "@PerformanceSwaps" --project android --config tests/appwright.config.ts

# Run multiple tags (OR logic)
npx appwright test --grep "@PerformanceLogin|@PerformanceOnboarding" --project android --config tests/appwright.config.ts

# Run tests with specific tag combination
npx appwright test --grep "@PerformanceLogin.*@PerformanceLaunch" --project android --config tests/appwright.config.ts
```

## Test Tags

Tests are tagged with area-specific, tool-agnostic tags defined in `tests/tags.performance.js`. These tags allow for selective test execution based on which areas of the app are affected by code changes.

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

```javascript
import { PerformanceLogin, PerformanceSwaps } from '../../tags.performance.js';

test.describe(`${PerformanceLogin} ${PerformanceSwaps}`, () => {
  test('Swap flow performance', async ({ device, performanceTracker }) => {
    // test implementation
  });
});
```

## Test Categories

### Login Tests (`tests/performance/login/`)

Tests for users with existing wallets:

- `asset-balances.spec.js` - Asset balance loading times
- `asset-view.spec.js` - Individual asset view performance
- `eth-swap-flow.spec.js` - ETH swap transaction flow
- `cross-chain-swap-flow.spec.js` - Cross-chain swap performance
- `import-multiple-srps.spec.js` - Multiple SRP import performance
- `perps-add-funds.spec.js` - Perpetuals fund addition
- `perps-position-management.spec.js` - Position management flows
- `launch-times/` - Cold/warm start measurements

### Onboarding Tests (`tests/performance/onboarding/`)

Tests for new users:

- `import-wallet.spec.js` - Wallet import via SRP
- `imported-wallet-account-creation.spec.js` - Account creation after import
- `new-wallet-account-creation.spec.js` - New wallet creation flow
- `launch-times/` - Onboarding launch metrics

### Predict Tests (`tests/performance/login/predict/`)

Tests for prediction market features:

- `predict-available-balance.spec.js`
- `predict-deposit.spec.js`
- `predict-market-details.spec.js`

### MM Connect Tests (`tests/performance/mm-connect/`)

Integration tests for MetaMask Connect:

- `connection-evm.spec.js` - EVM connection performance
- `connection-multichain.spec.js` - Multichain connection performance
- `connection-wagmi.spec.js` - Wagmi integration performance

## Performance Tracking System

### Overview

The performance tracking system consists of three main components:

1. **TimerHelper** (`tests/framework/TimerHelper.ts`) - Creates and manages individual timers with platform-specific thresholds
2. **PerformanceTracker** (`tests/reporters/PerformanceTracker.js`) - Collects all timers and generates metrics
3. **Quality Gates** (`tests/framework/quality-gates/`) - TypeScript module for threshold validation and reporting:
   - `QualityGatesValidator` - Validates metrics against defined thresholds
   - `QualityGatesReportFormatter` - Formats results as console, HTML, and CSV reports
   - `QualityGateError` - Custom error class for threshold failures
   - `helpers` - File-based failure tracking across Playwright workers

### TimerHelper

`TimerHelper` is the core class for measuring performance. It supports:

- Platform-specific thresholds (iOS vs Android)
- Automatic 10% margin on thresholds
- Multiple measurement patterns

```javascript
import TimerHelper from '../../framework/TimerHelper';

// Timer without threshold (informational only)
const timer = new TimerHelper('Description of measurement');
timer.start();
await someAction();
timer.stop();

// Timer with platform-specific thresholds
const timerWithThreshold = new TimerHelper(
  'Time for screen to load',
  { ios: 1500, android: 2000 }, // Thresholds in milliseconds
  device, // Device instance for platform detection
);

// Manual start/stop pattern
timerWithThreshold.start();
await Screen.tapButton();
await Screen.waitForElement();
timerWithThreshold.stop();

// Using measure() for cleaner code
await timerWithThreshold.measure(async () => {
  await Screen.tapButton();
  await Screen.waitForElement();
});
```

### Timer Methods

| Method                   | Description                             |
| ------------------------ | --------------------------------------- |
| `start()`                | Starts the timer                        |
| `stop()`                 | Stops the timer                         |
| `getDuration()`          | Returns duration in milliseconds        |
| `getDurationInSeconds()` | Returns duration in seconds             |
| `measure(action)`        | Measures async function execution time  |
| `hasThreshold()`         | Checks if timer has a threshold defined |
| `changeName(newName)`    | Renames the timer                       |

### PerformanceTracker

The `PerformanceTracker` is provided as a fixture and handles:

- Collecting timers from the test
- Attaching metrics to test results
- Storing session data for video retrieval
- BrowserStack video URL resolution

```javascript
import { test } from '../../framework/fixtures/performance-test.js';

test('My test', async ({ device, performanceTracker }, testInfo) => {
  const timer = new TimerHelper(
    'My measurement',
    { ios: 1000, android: 1200 },
    device,
  );

  await timer.measure(async () => {
    await SomeScreen.doSomething();
  });

  // Add timer to tracker (metrics are auto-attached after test)
  performanceTracker.addTimer(timer);

  // Or add multiple timers at once
  performanceTracker.addTimers(timer1, timer2, timer3);
});
```

## Quality Gates & Thresholds

### How Thresholds Work

1. **Base Threshold**: The target time you define per platform
2. **Effective Threshold**: Base + 10% margin (automatic)
3. **Validation**: Test fails if any timer exceeds its effective threshold

```javascript
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

```javascript
// This happens automatically in the fixture:
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

Tests use Page Objects from `wdio/screen-objects/`:

```javascript
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import LoginScreen from '../../../wdio/screen-objects/LoginScreen.js';

test('My test', async ({ device }) => {
  // IMPORTANT: Always assign device to page objects
  LoginScreen.device = device;
  WalletMainScreen.device = device;

  await LoginScreen.typePassword('password');
  await LoginScreen.tapUnlockButton();
  await WalletMainScreen.isMainWalletViewVisible();
});
```

## Shared Flows

Common user flows are in `tests/framework/utils/Flows.js`:

### `login(device, options)`

Standard login flow with optional modal dismissal:

```javascript
import { login } from '../../framework/utils/Flows.js';

// Simple login
await login(device);

// Login with modals dismissal
await login(device, { dismissModals: true });

// Login for onboarding scenario (different password)
await login(device, { scenarioType: 'onboarding' });
```

### `onboardingFlowImportSRP(device, srp)`

Complete onboarding flow for importing a wallet:

```javascript
import { onboardingFlowImportSRP } from '../../framework/utils/Flows.js';

await onboardingFlowImportSRP(device, process.env.TEST_SRP);
```

### `importSRPFlow(device, srp, dismissModals)`

Import additional SRP for logged-in user. Returns array of timers:

```javascript
import { importSRPFlow } from '../../framework/utils/Flows.js';

const timers = await importSRPFlow(device, process.env.TEST_SRP_2);
performanceTracker.addTimers(...timers);
```

### `dissmissAllModals(device)`

Dismiss common modals (Multichain, Predictions, etc.):

```javascript
import { dissmissAllModals } from '../../framework/utils/Flows.js';

await dissmissAllModals(device);
```

### `selectAccountDevice(device, testInfo)`

Select account based on device for parallel testing:

```javascript
import { selectAccountDevice } from '../../framework/utils/Flows.js';

await selectAccountDevice(device, testInfo);
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

Standard Playwright report at `test-reports/appwright-report/index.html`:

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

1. **Use the performance-test fixture**:

   ```javascript
   import { test } from '../../framework/fixtures/performance-test.js';
   ```

2. **Start timers AFTER the triggering action**:

   ```javascript
   // ✅ Good - timer starts right after click
   await Button.tap();
   timer.start();
   await Screen.isVisible();
   timer.stop();

   // ❌ Bad - timer includes element lookup time
   timer.start();
   await Button.tap();
   await Screen.isVisible();
   timer.stop();
   ```

3. **Use descriptive timer names**:

   ```javascript
   // ✅ Good
   'Time since user taps Send button until confirmation screen appears';

   // ❌ Bad
   'send time';
   ```

4. **Set realistic thresholds per platform**:

   ```javascript
   // iOS is typically faster for UI animations
   { ios: 1500, android: 2000 }
   ```

5. **Always dismiss modals**:
   ```javascript
   await login(device, { dismissModals: true });
   // or
   await dissmissAllModals(device);
   ```

### Test Structure Example

```javascript
import { test } from '../../framework/fixtures/performance-test.js';
import TimerHelper from '../../framework/TimerHelper';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import { login, dissmissAllModals } from '../../framework/utils/Flows.js';

test('My Performance Test', async ({
  device,
  performanceTracker,
}, testInfo) => {
  // 1. Setup page objects
  WalletMainScreen.device = device;

  // 2. Login and setup
  await login(device);
  await dissmissAllModals(device);

  // 3. Create timer with thresholds
  const timer = new TimerHelper(
    'Time for action to complete',
    { ios: 1500, android: 2000 },
    device,
  );

  // 4. Measure the action
  await WalletMainScreen.tapSomeButton();
  await timer.measure(async () => {
    await WalletMainScreen.waitForResult();
  });

  // 5. Add timer to tracker (metrics auto-attach after test)
  performanceTracker.addTimer(timer);
});
```

## Troubleshooting

### Common Issues

**Tests timing out**

- Increase timeout in `tests/appwright.config.ts`
- Check device/emulator resources
- Verify network connectivity for BrowserStack

**Page objects not found**

- Ensure device is assigned: `ScreenObject.device = device`
- Verify selectors are up to date

**BrowserStack connection issues**

- Verify credentials in `.e2e.env`
- Check app URLs are valid
- Ensure account has available sessions

**BrowserStack Local testing shows "Off" for mm-connect**

- Use `yarn run-appwright:mm-connect-android-bs-local` (it sets `BROWSERSTACK_LOCAL` for the run). Ensure the patch is applied (`yarn install`).
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

   ```javascript
   console.log(`Timer duration: ${timer.getDuration()}ms`);
   console.log(`Threshold: ${timer.threshold}ms`);
   console.log(`Has threshold: ${timer.hasThreshold()}`);
   ```

2. **Check timer values after completion**:
   ```javascript
   timer.stop();
   console.log(`Duration: ${timer.getDuration()}ms`);
   console.log(`Duration in seconds: ${timer.getDurationInSeconds()}s`);
   ```

## Additional Resources

- [Appwright Documentation](https://appwright.dev/)
- [MetaMask Mobile E2E Documentation](../../docs/readme/e2e-testing.md)
- [WDIO Page Objects](../../wdio/screen-objects/)
- [Performance Test Fixtures](../framework/fixtures/)

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
- Review page objects in `wdio/screen-objects/`
- Consult the [Appwright documentation](https://github.com/empirical-run/appwright)
- Reach out to the QA team
