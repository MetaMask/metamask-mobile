# Appwright Performance Tests

This directory contains performance tests for MetaMask Mobile using [Appwright](https://github.com/empirical-run/appwright), a mobile testing framework that combines Appium+Plawright.

## Overview

The Appwright test suite measures performance metrics for critical user flows in MetaMask Mobile, including onboarding, login, account management, swap flow, send flow, perps... Tests are organized to run on both local devices/simulators and BrowserStack cloud infrastructure.

## Table of Contents

- [Test Structure](#test-structure)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Test Categories](#test-categories)
- [Page Object Model](#page-object-model)
- [Environment Variables](#environment-variables)
- [Reports and Metrics](#reports-and-metrics)

## Test Structure

```
appwright/
├── appwright.config.ts        # Main configuration file
├── fixtures/                  # Test fixtures and utilities
├── reporters/                 # Custom reporters for test results
├── tests/
│   └── performance/
│       ├── login/            # Tests for logged-in user flows
│       ├── onboarding/       # Tests for new user onboarding
│       └── predict/          # Tests for predict market features
├── utils/                    # Shared utilities and flows
└── test-reports/             # Generated test reports
```

## Configuration

The test suite is configured in `appwright.config.ts`, which defines multiple projects for different testing environments:

### Available Projects

| Project Name           | Platform | Environment     | Test Scope            |
| ---------------------- | -------- | --------------- | --------------------- |
| `android`              | Android  | Local Emulator  | All performance tests |
| `ios`                  | iOS      | Local Simulator | All performance tests |
| `browserstack-android` | Android  | BrowserStack    | Login tests only      |
| `browserstack-ios`     | iOS      | BrowserStack    | Login tests only      |
| `android-onboarding`   | Android  | BrowserStack    | Onboarding tests only |
| `ios-onboarding`       | iOS      | BrowserStack    | Onboarding tests only |

### Configuration Details

- **Timeout**: 7 minutes per test (to accommodate performance metrics collection)
- **Expect Timeout**: 30 seconds for element interactions
- **Reporters**: HTML report, custom performance reporter, and list reporter
- **Report Location**: `./test-reports/appwright-report`

### Device Configuration

#### Local Testing

- **Android**: Requires path to `.apk` file and emulator details (name, OS version)
- **iOS**: Requires path to `.app` file and simulator OS version

#### BrowserStack Testing

- Device names and OS versions can be configured via environment variables
- Build paths are provided via environment variables (see [Environment Variables](#environment-variables))

## Running Tests

### Using Package Scripts

The easiest way to run tests is using the predefined npm scripts:

```bash
# Local Device/Simulator Tests
yarn run-appwright:android          # Run on local Android emulator
yarn run-appwright:ios              # Run on local iOS simulator

# BrowserStack Tests
yarn run-appwright:android-bs       # Run login tests on BrowserStack Android
yarn run-appwright:ios-bs           # Run login tests on BrowserStack iOS
yarn run-appwright:android-onboarding-bs  # Run onboarding tests on BrowserStack Android
yarn run-appwright:ios-onboarding-bs      # Run onboarding tests on BrowserStack iOS
```

### Using Appwright CLI Directly

You can also run tests directly using the Appwright CLI:

```bash
# Run specific project
npx appwright test --project browserstack-android --config appwright/appwright.config.ts

```

### Running a Single Test

To run a single test file, specify the test file path:

```bash
# Run a single test
npx appwright test appwright/tests/performance/login/asset-balances.spec.js --project android --config appwright/appwright.config.ts

# Run all tests in a category (using glob pattern)
npx appwright test appwright/tests/performance/login/*.spec.js --project android --config appwright/appwright.config.ts
```

### Command Options

- `--project`: Specify which project configuration to use (see [Available Projects](#available-projects))
- `--config`: Path to the Appwright configuration file

## Test Categories

Tests are organized in three main categories:

- **Login Tests** (`tests/performance/login/`): Tests for users with existing wallets (asset operations, swaps, account management, launch times)
- **Onboarding Tests** (`tests/performance/onboarding/`): Tests for new users setting up wallets (wallet creation, import, feature onboarding)
- **Predict Tests** (`tests/performance/predict/`): Tests for prediction market features

## Page Object Model

The tests use the Page Object Model (POM) pattern for maintainability and reusability. Page objects are located in the `../wdio/screen-objects/` directory and represent different screens and components of the app:

### Screen Objects Categories

- **Onboarding Screens**: `OnboardingScreen.js`, `CreateNewWalletScreen.js`, `ImportFromSeedScreen.js`, etc.
- **Main Screens**: `WalletMainScreen.js`, `LoginScreen.js`, `SwapScreen.js`, `SendScreen.js`, etc.
- **Modals**: Located in `Modals/` subdirectory (e.g., `AddAccountModal.js`, `NetworkListModal.js`)
- **Components**: Reusable components like `AccountListComponent.js`

### Example Usage

```javascript
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';

test('My test', async ({ device }) => {
  LoginScreen.device = device;
  WalletMainScreen.device = device;

  await LoginScreen.typePassword('password');
  await LoginScreen.tapUnlockButton();
  await WalletMainScreen.isMainWalletViewVisible();
});
```

### Shared Flows

Common user flows are abstracted into reusable functions in `utils/Flows.js`:

- `login(device, options)`: Standard login flow
- `onboardingFlowImportSRP(device, srp)`: Import wallet via SRP
- `importSRPFlow(device, srp)`: Import additional SRP for logged-in user
- `dissmissAllModals(device)`: Dismiss onboarding modals (Perps, Rewards, Multichain)

## Environment Variables

Create a `.e2e.env` file in the project root with the following variables:

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

# Clean Apps for Onboarding Tests (required for onboarding tests)
BROWSERSTACK_ANDROID_CLEAN_APP_URL=bs://your-clean-android-app-id
BROWSERSTACK_IOS_CLEAN_APP_URL=bs://your-clean-ios-app-id
```

### Test Configuration

```bash
# Test SRPs for multi-account tests
TEST_SRP_1="your test recovery phrase 1"
TEST_SRP_2="your test recovery phrase 2"
TEST_SRP_3="your test recovery phrase 3"

# Test Passwords
TEST_PASSWORD_LOGIN="your test password", // this  can be found in 1Password
TEST_PASSWORD_ONBOARDING="your onboarding password"
```

## Reports and Metrics

### HTML Report

After test execution, an HTML report is generated at:

```
test-reports/appwright-report/index.html
```

Open this file in a browser to view:

- Test results and status
- Performance metrics and timings
- Screenshots and videos (if enabled)
- Detailed error logs for failed tests

### Custom Performance Reporter

The custom reporter generates JSON files with detailed performance metrics at:

```
appwright/reporters/reports/performance-metrics-*.json
```

These reports include:

- Individual timer measurements for each user interaction
- Flow completion times
- Device and platform information
- Test metadata

### Metrics Tracked

Performance tests track various timing metrics, including:

- **Screen Transitions**: Time to navigate between screens
- **Component Loading**: Time for UI components to render
- **User Interactions**: Time for tap/click actions to complete
- **Data Loading**: Time to fetch and display data (balances, NFTs, etc.)
- **Form Submissions**: Time to process form inputs and submissions

Example timer from tests:

```javascript
const timer = new TimerHelper(
  'Time since user clicks button until screen is visible',
);
timer.start();
await SomeScreen.tapButton();
await NextScreen.isVisible();
timer.stop();
performanceTracker.addTimer(timer);
```

## Best Practices

### Writing New Tests

1. **Use Page Objects**: Always use existing page objects or create new ones for new screens
2. **Leverage Shared Flows**: Reuse common flows from `utils/Flows.js`
3. **Track Performance**: Use `TimerHelper` for measuring critical interactions
4. **Handle Modals**: Always dismiss onboarding modals using `dissmissAllModals()`
5. **Set Device Context**: Always assign `device` to page objects: `ScreenObject.device = device`
6. **Timer start**: Start the timer right after clicking the element to make sure no other operation (like find and element) is included in that timer

### Example Test Structure

```javascript
import { test } from '../../../fixtures/performance-test.js';
import TimerHelper from '../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import { login } from '../../../utils/Flows.js';

test('My Performance Test', async ({
  device,
  performanceTracker,
}, testInfo) => {
  // Setup page objects
  WalletMainScreen.device = device;

  // Login
  await login(device);

  // Create timer for tracked action
  const timer = new TimerHelper('Description of what is being measured');
  timer.start();

  // Perform action
  await WalletMainScreen.tapSomeButton();
  await WalletMainScreen.isSomeElementVisible();

  timer.stop();

  // Add timer to performance tracker
  performanceTracker.addTimer(timer);
  await performanceTracker.attachToTest(testInfo);
});
```

## Troubleshooting

### Common Issues

**Tests timing out**

- Increase timeout in `appwright.config.ts`
- Check if device/emulator has sufficient resources
- Verify network connectivity for BrowserStack tests

**Page objects not found**

- Ensure device is assigned to page object: `ScreenObject.device = device`
- Verify element selectors are up to date in page objects

**BrowserStack connection issues**

- Verify credentials in `.e2e.env`
- Check app URLs are valid and accessible
- Ensure BrowserStack account has available sessions

**Local device not connecting**

- Verify emulator/simulator is running
- Check build paths in config point to valid `.apk`/`.app` files
- Ensure Appium dependencies are installed

## Additional Resources

- [Appwright Documentation](https://appwright.dev/)
- [MetaMask Mobile E2E Documentation](../e2e/README.md)
- [WDIO Page Objects](../wdio/screen-objects/)
- [Performance Test Fixtures](./fixtures/)

## Contributing

When adding new performance tests:

1. Follow the existing test structure and naming conventions
2. Use descriptive timer names that clearly indicate what is being measured
3. Update this README if adding new test categories or significant features
4. Ensure tests work on both Android and iOS platforms
5. Add appropriate tags and categorization for test filtering

## Support

For issues or questions:

- Check existing test examples in the `tests/` directory
- Review page objects in `../wdio/screen-objects/`
- Consult the [Appwright documentation](https://github.com/empirical-run/appwright)
- Reach out to the QA team
