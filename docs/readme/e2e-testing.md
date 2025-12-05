# E2E Tests Overview

> **⚠️ IMPORTANT: E2E Tests Should Be Your Last Resort**
>
> Before adding E2E tests, ensure that unit tests and integration tests cannot adequately cover the functionallity to check.
>
> E2E tests are significantly slower, more brittle, and resource-intensive than unit and integration tests. Always prioritize unit and integration tests over E2E ones.

Our end-to-end (E2E) testing strategy leverages a combination of technologies to ensure robust test coverage for our mobile applications. We use [Wix/Detox](https://github.com/wix/Detox) for the majority of our automation tests, and for specific non-functional testing like app upgrades and launch times. All tests are written in TypeScript, and use jest test runners.

- [Local environment setup](#local-environment-setup)
  - [Tooling setup](#tooling-setup)
  - [Environment files](#environment-files)
- [Build the app (optional)](#build-the-app-optional)
- [Use Expo prebuilds (recommended)](#use-expo-prebuilds-recommended)
  - [iOS builds](#ios-builds)
  - [Android builds](#android-builds)
- [Run the E2E Tests](#run-the-e2e-tests)
- [Flask E2E Testing (Snaps Support)](#flask-e2e-testing-snaps-support)
- [Setup Troubleshooting](#setup-troubleshooting)
- [Appium](#appium)

## Local environment setup

### Tooling setup

Firstly, you need to have installed [Xcode for IOS](https://developer.apple.com/xcode/) and [Android Studio](https://developer.android.com/studio). Please follow the [environment setup guide](../readme/environment.md) to install and configure them.

Ensure that following devices are set up:

- **iOS**: iPhone 15 Pro
- **Android**: Pixel 5 API 34

> **Note**: You can change the default devices at any time by updating the `device.type` in the Detox config located at `.detoxrc.js`.

**iOS:**

1. Open Xcode
2. Go to **Window** → **Devices and Simulators**
3. Click the **+** button to add a new simulator
4. Select **iPhone 15 Pro** and create the simulator

**Android:**

1. Open Android Studio
2. Go to **Tools** → **AVD Manager** (Device Manager)
3. Click **Create Virtual Device**
4. Select a Pixel device (or similar)
5. Choose API level 34
6. **Important**: Name the emulator exactly **Pixel_5_Pro_API_34** to match our configuration
7. Set up **Android SDK path** by adding this to your shell profile (`.bashrc`, `.zshrc`, etc.):

   ```bash
   export ANDROID_SDK_ROOT="/Users/${USER}/Library/Android/sdk"
   ```

### Environment files

1. Copy the E2E environment variables from the example file:

   ```bash
   cp .e2e.env.example .e2e.env
   ```

2. Ensure your `.e2e.env` file contains the following prebuild paths:

   ```bash
   # E2E prebuild paths
   # These paths point to a gitignored root build folder, so you may need to create this folder.
   export PREBUILT_IOS_APP_PATH='build/MetaMask.app'
   export PREBUILT_ANDROID_APK_PATH='build/MetaMask.apk'
   export PREBUILT_ANDROID_TEST_APK_PATH='build/MetaMask-Test.apk'
   ```

3. Create the build directory if it doesn't exist:

   ```bash
   # In root of project
   mkdir build
   ```

4. Install dependencies

   ```bash
   # In root of project
   yarn setup:expo
   ```

### Build the app (optional)

Sometimes it is necessary to build the app locally, for example, to enable build-time feature flags (like GNS), to debug issues more effectively, or to identify and update element locators.

> **NOTE**: Building the app locally requires significant system resources.

Please follow the [native development guide](../../README.md#native-development) for more details.

```bash
# Build the app for testing
yarn test:e2e:ios:debug:build
yarn test:e2e:android:debug:build

# These commands are hardcoded to build for `main` build type and `e2e` environment based on the .detoxrc.js file
```

### Use Expo prebuilds (iOS Only)

You can use prebuilt app files instead of building the app locally.

#### iOS builds

1. **Download iOS simulator builds** from Runway/Bitrise/GitHub workflows (build jobs)

2. **Copy and rename the build**: Copy your downloaded .app file to the prebuild path

   ```bash
   # Copy your downloaded .app file to the prebuild path
   cp /path/to/your/downloaded/AAA.app build/MetaMask.app
   ```

3. **Start the build watcher**:

   ```bash
   source .e2e.env && yarn watch:clean
   ```

4. **Launch the iPhone 15 Pro simulator** from Xcode or in a new terminal by:

   ```bash
   xcrun simctl boot "iPhone 15 Pro"
   open -a Simulator # to open the simulator app GUI
   ```

### Run the E2E Tests

```bash
# Firstly, make sure the build watcher is running in a dedicated terminal for the logs
# and the emulators are up and running
# Ensure METAMASK_BUILD_TYPE is set to `main` and METAMASK_ENVIRONMENT is set to `e2e` in .js.env
source .e2e.env   # Ensure .js.env is sourced
yarn watch:clean  # First time or after dependency changes
yarn watch        # Subsequent runs

# Run all Tests
source .e2e.env && yarn test:e2e:ios:debug:run
source .e2e.env && yarn test:e2e:android:debug:run

# Run specific folder
source .e2e.env && yarn test:e2e:ios:debug:run e2e/specs/your-folder
source .e2e.env && yarn test:e2e:android:debug:run e2e/specs/your-folder

# Run specific test
source .e2e.env && yarn test:e2e:ios:debug:run e2e/specs/onboarding/create-wallet.spec.js
source .e2e.env && yarn test:e2e:android:debug:run e2e/specs/onboarding/create-wallet.spec.js

# Run tests by tag
source .e2e.env && yarn test:e2e:ios:debug:run --testNamePattern="Smoke"
source .e2e.env && yarn test:e2e:android:debug:run --testNamePattern="Smoke"
```

To know more about the E2E testing framework, see [E2E Testing Architecture and Framework](../../e2e/docs/README.md).

## Flask E2E Testing (Snaps Support)

Flask is a special build variant that enables wider Snaps support and other experimental features. Flask E2E tests require specific configuration to enable development APIs.

### Flask Prerequisites

Ensure you have completed the [Local environment setup](#local-environment-setup) steps first.

### Flask Build Commands

**Development with Hot Reload:**

```bash
# Start Metro bundler for Flask development
# Ensure METAMASK_BUILD_TYPE is set to `flask` and METAMASK_ENVIRONMENT is set to `e2e` in .js.env
source .e2e.env   # Ensure .js.env is sourced
yarn watch:clean  # First time or after dependency changes
yarn watch        # Subsequent runs
```

**Build for E2E Testing:**

```bash
# Build Flask app for E2E tests
yarn test:e2e:ios:flask:build
yarn test:e2e:android:flask:build
```

**Run Flask E2E Tests:**

```bash
# Run all Flask E2E tests
yarn test:e2e:ios:flask:run
yarn test:e2e:android:flask:run
# These commands are hardcoded to build for `flask` build type and `e2e` environment based on the .detoxrc.js file

# Run specific Flask test
yarn test:e2e:ios:flask:run e2e/specs/snaps/test-snap-jsx.spec.ts
yarn test:e2e:android:flask:run e2e/specs/snaps/test-snap-jsx.spec.ts
```

### Flask Configuration Details

Flask E2E builds use these key environment variables:

```bash
METAMASK_BUILD_TYPE=flask          # Enables Flask build variant
METAMASK_ENVIRONMENT=e2e           # Enables E2E-specific configurations
BRIDGE_USE_DEV_APIS=true          # Enables more snaps funcationality and dev APIs
```

**Build Script Architecture:**

- **Local builds**: Use `MODE=flaskDebugE2E` (debug APKs/apps)
- **CI builds**: Use `MODE=flask` (release APKs/apps)
- Both modes use `ENVIRONMENT=e2e` for E2E-specific setup

### Common Flask E2E Gotchas

#### 1. Hardcoded `.js.env` Values ⚠️

**Problem**: If your `.js.env` file has hardcoded `METAMASK_BUILD_TYPE` or `METAMASK_ENVIRONMENT`, it will override command-line environment variables and cause Flask features (like Snaps) to be disabled.

**Example of problematic `.js.env`:**

```bash
# ❌ DON'T: Hardcoded values override everything
export METAMASK_BUILD_TYPE=main
export METAMASK_ENVIRONMENT=production
```

**Solution**: Remove or comment out these lines in `.js.env`, or use conditional logic:

```bash
# ✅ DO: Allow override from command line
export METAMASK_BUILD_TYPE=${METAMASK_BUILD_TYPE:-main}
export METAMASK_ENVIRONMENT=${METAMASK_ENVIRONMENT:-production}
```

**Symptoms of this issue:**

- Error: "Installing Snaps is currently disabled in this version of MetaMask"
- Snaps tests work on CI but fail locally
- Flask features not available despite using Flask build commands

#### 2. Using Wrong Build for Tests ⚠️

**Problem**: Testing with a Main build instead of Flask build, or testing with an old Flask build that was built before environment variables were properly configured.

**How to verify you're testing the correct build:**

1. Check the app splash screen - it should show "Flask" logo/text
2. Check Metro bundler output - should show `METAMASK_BUILD_TYPE: flask`
3. Check build artifacts:
   - iOS: `ios/build/Build/Products/Debug-iphonesimulator/MetaMask-Flask.app`
   - Android: `android/app/build/outputs/apk/flask/debug/app-flask-debug.apk`

**Solution**: Always rebuild after changing environment variables or `.js.env`:

```bash
# Clean previous builds
yarn watch:clean

# Rebuild Flask app
yarn test:e2e:android:flask:build  # or iOS
```

#### 3. Metro Bundler Not Running ⚠️

**Problem**: Flask development builds require Metro bundler to be running with correct environment variables.

**Solution**: Always start Metro bundler first with Flask environment:

```bash
# Terminal 1: Start Metro bundler
yarn watch:clean

# Terminal 2: Reinstall and run Flask app
yarn test:e2e:android:flask:run
```

### Flask vs Main Build Differences

| Aspect            | Main Build                          | Flask Build                                  |
| ----------------- | ----------------------------------- | -------------------------------------------- |
| **Snaps Support** | ❌ Limited                          | ✅ Enabled (with `BRIDGE_USE_DEV_APIS=true`) |
| **Dev APIs**      | ❌ Limited                          | ✅ Full access                               |
| **App Icon**      | Standard MetaMask                   | Flask logo                                   |
| **Bundle ID**     | `io.metamask`                       | `io.metamask.flask`                          |
| **E2E Mode**      | `debugE2E`                          | `flaskDebugE2E`                              |
| **Detox Config**  | `android.emu.main` / `ios.sim.main` | `android.emu.flask` / `ios.sim.flask`        |

### Flask Troubleshooting

**"Installing Snaps is currently disabled" error:**

1. Check if `.js.env` has hardcoded `METAMASK_BUILD_TYPE` or `METAMASK_ENVIRONMENT` - remove them
2. Verify `BRIDGE_USE_DEV_APIS=true` is set during build
3. Rebuild the app with `yarn test:e2e:*:flask:build`
4. Verify Flask build by checking app icon/splash screen

**Metro bundler shows wrong `METAMASK_BUILD_TYPE`:**

1. Stop Metro bundler (Ctrl+C)
2. Clean bundler cache: `yarn watch:clean`
3. Restart Metro bundler: `yarn watch`

**App crashes or shows blank screen:**

1. Ensure emulator/simulator is running before building
2. Check Metro bundler logs for JavaScript errors
3. Try clean build: `yarn watch:clean && yarn test:e2e:*:flask:build`

**Tests timeout waiting for elements:**

1. Verify you're running Flask tests against Flask build (not Main build)
2. Check if app actually has Flask features enabled
3. Take screenshot to verify app state: `adb exec-out screencap -p > screenshot.png`

### Setup Troubleshooting

- **The application is not opening**: EXPO DOESN'T SUPPORT DETOX OUT OF THE BOX SO IT IS POSSIBLE THAT, IN SLOWER COMPUTERS, LOADING FROM THE BUNDLER TAKES TOO LONG WHICH MAKES THE VERY FIRST TEST FAIL. THE FAILED TEST WILL THEN AUTOMATICALLY RESTART AND IT SHOULD WORK FROM THEN ON.
- **Build folder doesn't exist**: Run `mkdir build` in your project root
- **Simulator/Emulator not found**: Ensure the device names match exactly as specified in prerequisites
- **Android SDK not found**: Verify `$ANDROID_SDK_ROOT` is set correctly with `echo $ANDROID_SDK_ROOT`
- **My Expo Application shows an error "Failed to connect to localhost/127.0.0.1:8081"**: The emulator may need to have the expo port forwarded. Try `adb reverse tcp:8081 tcp:8081` and rerun the test command.
- **Warning Logs**: Warning logs may sometimes cause test failures by interfering with automation interactions. To prevent this, disable warning logs during test execution.
- **Android notice**: with the implementation of Expo, mobile app will need to be manually loaded on emulator before running automated E2E tests.
  - install a build on the emulator
    - either install the apk or keep an existing install on the emulator
  - on the metro server hit 'a' on the keyboard as indicated by metro for launching emulator
  - if emulator fails to launch you can launch emulator in another terminal
    - `emulator -avd <emulator-name>`
    - on the metro server hit 'a' on the keyboard as indicated by metro for launching emulator
  - you don't need to repeat these steps unless emulator or metro server is restarted

## ~~Appium~~ (Deprecated)

> **⚠️ DEPRECATED**: The Appium/WebDriver.io/Cucumber test infrastructure has been removed. This section is kept for historical reference only.

~~We currently utilize [Appium](https://appium.io/), [Webdriver.io](http://webdriver.io/), and [Cucumber](https://cucumber.io/) to test the application launch times and the upgrade between different versions. As a brief explanation, webdriver.io is the test framework that uses Appium Server as a service. This is responsible for communicating between our tests and devices, and cucumber as the test framework.~~

**Current approach**: Performance testing is now handled by [Appwright](https://github.com/nickmaxwell10/appwright), a Playwright-based mobile testing framework. See the `appwright/` directory for performance tests including app launch times and feature-specific performance measurements.

**Test Location**: `appwright/tests/performance/`

---

<details>
<summary>Legacy Appium Documentation (for reference only)</summary>

**Supported Platform**: Android  
**Test Location**: `wdio`

## Configuration for Testing

We have two separate configurations for testing the different variants of our applications:

- **QA Variant (local)**: Runs in debug mode on your local machine.
- **QA Variant (production)**: Runs in production mode on BrowserStack.

We use the QA variant for Appium tests because of our screen-blocking mechanism, which would otherwise prevent tests from getting past the wallet setup screen.

### Capabilities Setup

We require two sets of capabilities to handle app upgrade tests, leading to the creation of two configurations: `defaultCapabilities` and `upgradeCapabilities`.

#### Default Capabilities

```javascript
const defaultCapabilities = [
  {
    platformName: 'Android',
    noReset: false,
    fullReset: false,
    maxInstances: 1,
    build: 'Android App Launch Times Tests',
    device: process.env.BROWSERSTACK_DEVICE || 'Google Pixel 6',
    os_version: process.env.BROWSERSTACK_OS_VERSION || '12.0',
    app: process.env.BROWSERSTACK_APP_URL,
    'browserstack.debug': true,
    'browserstack.local': true,
  },
];
```

This configuration is our standard, as it only requires one app per install.

#### Upgrade Capabilities

```javascript
const upgradeCapabilities = [
  {
    platformName: 'Android',
    noReset: false,
    fullReset: false,
    maxInstances: 1,
    build: 'Android App Upgrade Tests',
    device: process.env.BROWSERSTACK_DEVICE || 'Google Pixel 6',
    os_version: process.env.BROWSERSTACK_OS_VERSION || '12.0',
    app: process.env.PRODUCTION_APP_URL || process.env.BROWSERSTACK_APP_URL,
    'browserstack.debug': true,
    'browserstack.local': true,
    'browserstack.midSessionInstallApps': [process.env.BROWSERSTACK_APP_URL],
  },
];
```

This configuration requires two applications: the current production app and the app built from the branch.

**Note**: You can, if you choose to, run the tests against any one of the devices and operating systems mentioned in the browserstack device [list](https://www.browserstack.com/list-of-browsers-and-platforms/app_automate).

### Flag-Based Capability Selection

We use flags like `--performance` and `--upgrade` to determine which capabilities to use for specific tests.

```javascript
const { selectedCapabilities, defaultTagExpression } = (() => {
  if (isAppUpgrade) {
    return {
      selectedCapabilities: upgradeCapabilities,
      defaultTagExpression: '@upgrade and @androidApp',
    };
  } else if (isPerformance) {
    return {
      selectedCapabilities: defaultCapabilities,
      defaultTagExpression: '@performance and @androidApp',
    };
  } else {
    return {
      selectedCapabilities: defaultCapabilities,
      defaultTagExpression: '@smoke and @androidApp',
    };
  }
})();
```

## Running Tests Locally Against QA Build

You can run your E2E tests on local simulators either in development mode (with automatic code refresh) or without it.

Install dependencies:

```bash
yarn setup
```

Ensure that the bundler compiles all files before running the tests to avoid build breaks. Use:

```bash
yarn watch:clean
```

### iOS

To start an iOS QA build:

```bash
yarn start:ios:qa
```

### Android

To start an Android QA build:

```bash
yarn start:android:qa
```

Then, run the tests on the simulator:

### iOS

```bash
yarn test:wdio:ios
```

### Android

```bash
yarn test:wdio:android
```

To run specific tests, use the `--spec` option:

```bash
yarn test:wdio:android --spec ./wdio/features/performance/ColdStartLaunchTimes.feature
```

**Note**: Ensure that your installed simulator names match the configurations in `wdio/config/android.config.debug.js` and `wdio/config/ios.config.debug.js`.

## Running Tests on BrowserStack

To trigger tests locally on BrowserStack:

1. Retrieve your BrowserStack username and access key from the App Automate section.
2. Update `config.user` and `config.key` in `android.config.browserstack` with your BrowserStack credentials.
3. Upload your app to BrowserStack via the `create_qa_builds_pipeline`. Grab the `app_url` from `browserstack_uploaded_apps.json`.
4. Update `process.env.BROWSERSTACK_APP_URL` with the correct `app_url`.
5. Run your tests using the appropriate flag (e.g., for performance tests):

```bash
yarn test:wdio:android:browserstack --performance
```

## Running Appium Tests on CI (Bitrise)

You can also run Appium tests on CI using Bitrise pipelines:

- `app_launch_times_pipeline`
- `app_upgrade_pipeline`

For more details on our CI pipelines, see the [Bitrise Pipelines Overview](#bitrise-pipelines-overview).

</details>

### API Spec Tests

**Platform**: iOS  
**Test Location**: `e2e/api-specs/json-rpc-coverage.js`

The API Spec tests use the `@open-rpc/test-coverage` tool to generate tests from our [api-specs](https://github.com/MetaMask/api-specs) OpenRPC Document. These tests are currently executed only on iOS and use the same build as the Detox tests for iOS.

- **Test Coverage Tool**: The `test-coverage` tool uses `Rules` and `Reporters` to generate and report test results. These are passed as parameters in the test coverage tool call located in [e2e/api-specs/json-rpc-coverage.js](../../e2e/api-specs/json-rpc-coverage.js). For more details on `Rules` and `Reporters`, refer to the [OpenRPC test coverage documentation](https://github.com/open-rpc/test-coverage?tab=readme-ov-file#extending-with-a-rule).

#### Commands

1. **Build the App**:

   ```bash
   yarn test:e2e:ios:debug:build
   ```

2. **Run API Spec Tests**:

   ```bash
   yarn test:api-specs
   ```

### Appwright

This is a recent mobile framework which was built using appium and playwright. We adopted it to meet our need for running performance focused end to end tests on real iOS and Android devices through BrowserStack.

#### Running Tests Against BrowserStack Devices

You can get your BrowserStack username and access key from the Access key dropdown on the app automate screen in BrowserStack.

##### Set Environment Variables for BrowserStack

```bash
export BROWSERSTACK_USERNAME='your_username'
export BROWSERSTACK_ACCESS_KEY='your_access_key'
```

Update the config file with the appropriate BrowserStack app URL. You’ll need a BrowserStack URL first. To get it:

1. Run `create_qa_builds_pipeline` on Bitrise
2. Once done, open the **Artifacts** tab and find `browserstack_uploaded_apps.json` (from `build_android_qa` and `build_ios_qa`).

See this [build](https://app.bitrise.io/app/be69d4368ee7e86d/pipelines/de2bf4ee-b000-4a7c-bd5b-c995ae0f3b4d?tab=artifacts) as an example.

The first entry in that JSON will include your app’s URL (look for the bs:// prefix).

Add it to the config file by replacing `process.env.BROWSERSTACK_ANDROID_APP_URL` in the `buildPath` with the appropriate BrowserStack application URL:

```typescript
{
  name: 'browserstack-android',
  use: {
    platform: Platform.ANDROID,
    device: {
      provider: 'browserstack',
      name: process.env.BROWSERSTACK_DEVICE || 'Samsung Galaxy S23 Ultra', // this can be changed
      osVersion: process.env.BROWSERSTACK_OS_VERSION || '13.0', // this can be changed
    },
    buildPath: process.env.BROWSERSTACK_ANDROID_APP_URL, // Path to BrowserStack URL bs:// link
  },
}
```

You can repeat the same for iOS builds by replacing `process.env.BROWSERSTACK_IOS_APP_URL` in the config.

##### Run Android Tests on BrowserStack

```bash
yarn run-appwright:android-bs
```

##### Run iOS Tests on BrowserStack

```bash
yarn run-appwright:ios-bs
```

#### Testing Locally (Simulators/Emulators)

You need to make sure that the artifact is created. Download the binary from the [runway](https://github.com/MetaMask/metamask-mobile/tree/MMQA-521-part-2?tab=readme-ov-file#download-and-install-the-development-build) and place it in a folder accessible to Appwright.

Then update the build path in the `ios` or `android` config:

```typescript
{
  name: 'ios',
  use: {
    platform: Platform.IOS,
    device: {
      provider: 'emulator',
      osVersion: '16.0', // this can be changed to your simulator version
    },
    buildPath: 'PATH-TO-BUILD', // Path to your .app file
  },
}
```

##### Test on Your Local Android Emulator

```bash
yarn run-appwright:android
```

##### Test on Your Local iOS Simulator

```bash
yarn run-appwright:ios
```

**Important**: If the test fail to start, double check the OS version your simulator/emulator is running and make sure the config has the correct version.

### Bitrise Pipelines Overview

Our CI/CD process is automated through various Bitrise pipelines, each designed to streamline and optimize different aspects of our E2E testing.

#### **1. Release_e2e_Pipeline**

- **Workflows**:
  - **Build**: Creates iOS and Android artifacts.
  - **Test**: Executes regression tests across both platforms.
- **Manual Trigger**: Typically run on release branches but can be manually triggered in the Bitrise dashboard.

#### **2. App Launch Times Pipeline**

- **Function**: Measures and monitors app launch times on real devices using BrowserStack to ensure consistent performance over time.
- **Nightly**: Automatically runs on the main branch.
- **Manual Trigger**: Select the desired branch in the Bitrise dashboard and choose `app_upgrade_pipeline` from the pipeline dropdown menu.

#### **3. App Upgrade Pipeline**

- **Function**: Automates testing of app upgrades to verify smooth transitions between versions.
- **Configuration**: Requires the `PRODUCTION_APP_URL` environment variable to be set with the current production build's BrowserStack URL.You would need to search and update `PRODUCTION_APP_URL` in the bitrise.yml with the production browserstack build URL.
- **Manual Trigger**: Select the desired branch in the Bitrise dashboard and choose `app_upgrade_pipeline` from the pipeline dropdown menu.

### Test Reports in Bitrise

- **Detox Tests**: Test reports are displayed directly in the Bitrise UI, offering a visual representation of test results and execution details. Screenshots on test failures are also captured and stored in a zip file. You can download these screenshots from the `Artifacts` tab in Bitrise.
- **API Spec and Appium Tests**: HTML reporters generate and display test results. Access these HTML reports through the Bitrise build artifacts section for detailed analysis.

### Debugging Failed Tests

- **Example**:

  ```
  FAIL e2e/specs/swaps/swap-action-smoke.spec.js (232.814 s)
    SmokeSwaps Swap from Actions
      ✓ should Swap .05 'ETH' to 'USDT' (90488 ms)
      ✕ should Swap 100 'USDT' to 'ETH' (50549 ms)
    ● SmokeSwaps Swap from Actions › should Swap 100 'USDT' to 'ETH'
      Test Failed: Timed out while waiting for expectation: TOBEVISIBLE WITH MATCHER(id == “swap-quote-summary”) TIMEOUT(15s)
      HINT: To print view hierarchy on failed actions/matches, use log-level verbose or higher.
        163 |     return await waitFor(element(by.id(elementId)))
        164 |       .toBeVisible()
      > 165 |       .withTimeout(15000);
          |        ^
        166 |   }
        167 |
        168 |   static async checkIfNotVisible(elementId) {
      at Function.withTimeout (e2e/helpers.js:165:8)
      ...
  ```

  In this example, the test failed because the `swap-quote-summary` ID was not found. This issue could be due to a changed testID or the swap quotes not being visible.
  To confirm whether either case is true, we then look at the screenshots on failure.

  [Here](https://app.screencast.com/H2vVLK5jP4NHe) we can see that the swaps quotes in fact did not load hence why the tests failed.

### Smoke Tests Breakdown

- **Per Team**: Smoke tests are divided by team, allowing targeted verification of core functionalities pertinent to each team's responsibilities.
- **Benefits**:
  - **Faster Feedback**: Running a subset of tests on PRs provides quicker feedback, ensuring critical functionalities are validated without the overhead of executing all tests.
  - **Efficient Resource Use**: Limits resource consumption and test execution time, optimizing CI/CD pipeline performance.

### Framework Documentation

For detailed E2E framework documentation, patterns, and best practices, see:

- **[E2E Framework Guide](../../e2e/framework/README.md)** - Comprehensive guide to the TypeScript testing framework
- **[Mocking Guide](../../e2e/MOCKING.md)** - Guide on how to mock API call in tests
- **[General E2E Best Practices](https://github.com/MetaMask/contributor-docs/blob/main/docs/testing/e2e-testing.md)** - MetaMask-wide testing guidelines
