## E2E Tests Overview

Our end-to-end (E2E) testing strategy leverages a combination of technologies to ensure robust test coverage for our mobile applications. We use Wix/Detox for the majority of our automation tests, Appium for specific non-functional testing like app upgrades and launch times, and Bitrise as our CI platform. All tests are written in JavaScript using Jest and Cucumber frameworks.

### Wix/Detox Tests

Detox serves as our primary mobile automation framework, with most of our tests written using it. Learn more about Wix/Detox [here](https://wix.github.io/Detox/).

**Supported Platforms**: iOS and Android  
**Test Location**: `e2e/specs`

#### Setup and Execution

- **Test Wallet**: Requires a wallet with access to testnet and mainnet. On Bitrise CI, this wallet is created using a secret recovery phrase from environment variables. For local testing, retrieve the phrase from the `.e2e.env` file.
- **Environment Variable**: Set `IS_TEST='true'` to enable the test environment. Refer to the `.e2e.env` file in the mobile 1Password vault for the complete list of environment variables.
- **Warning Logs**: Warning logs may sometimes cause test failures by interfering with automation interactions. To prevent this, disable warning logs during test execution.

#### Default Devices

- **iOS**: iPhone 15 Pro
- **Android**: Pixel 5 API 34

Ensure that these devices are set up. You can change the default devices at any time by updating the `device.type` in the Detox config located at `e2e/.detoxrc.js`.

#### Commands

- **Start Metro Server**: Ensure the Metro server is running before executing tests:

    ```bash
    yarn watch:clean
    ```

- **Build the Apps for Testing**:
  - **iOS Debug**: 

    ```bash
    yarn test:e2e:ios:debug:build
    ```

  - **Android Debug**: 

    ```bash
    yarn test:e2e:android:debug:build
    ```

- **Run All Tests Locally**:
  - **iOS Debug**:

    ```bash
    yarn test:e2e:ios:debug:run
    ```

  - **Android Debug**:

    ```bash
    yarn test:e2e:android:debug:run
    ```

- **Run Specific Tests**:
  - **iOS**:

    ```bash
    yarn test:e2e:ios:debug:run e2e/specs/TEST_NAME.spec.js
    ```

  - **Android**:

    ```bash
    yarn test:e2e:android:debug:run e2e/specs/TEST_NAME.spec.js
    ```

- **Run Tests by Tag (e.g., Smoke)**:
  - **iOS**:

    ```bash
    yarn test:e2e:ios:debug:run --testNamePattern="Smoke"
    ```

  - **Android**:

    ```bash
    yarn test:e2e:android:debug:run --testNamePattern="Smoke"
    ```

### Appium Tests

**Platform**: Android  
**Test Location**: `wdio`

#### Setup and Execution

- **Default Emulator**:
  - **Name**: Android 11 - Pixel 4a API 31
  - **API Level**: 30 (Android 11)
- **Configuring Emulator**: Update `deviceName` and `platformVersion` in `wdio/config/android.config.debug.js` to match your emulator configuration.

#### Commands

1. **Create a Test Build**:

    ```bash
    yarn start:android:qa
    ```

2. **Run All Tests**:

    ```bash
    yarn test:wdio:android
    ```

3. **Run Specific Tests**:

    ```bash
    yarn test:wdio:android --spec ./wdio/features/Onboarding/CreateNewWallet.feature
    ```

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

### Bitrise Pipelines Overview

Our CI/CD process is automated through various Bitrise pipelines, each designed to streamline and optimize different aspects of our E2E testing.

#### **1. PR_Smoke_e2e_Pipeline**

- **Triggers**: 
  - **When "Run Smoke E2E" label is applied to a Pull request**: Automatically runs smoke tests.
- **Manual Trigger**: Select the desired branch in the Bitrise dashboard and choose `pr_smoke_e2e_pipeline` from the pipeline dropdown menu.

#### **2. PR_Regression_e2e_Pipeline**

- **Triggers**: 
  - **Nightly**: Automatically runs all regression tests against main branch.
- **Manual Trigger**: Select the main branch (or another branch of choice) in the Bitrise dashboard and choose `pr_regression_e2e_pipeline` from the pipeline dropdown menu.

#### **3. Release_e2e_Pipeline**

- **Workflows**:
  - **Build**: Creates iOS and Android artifacts.
  - **Test**: Executes regression tests across both platforms.
- **Manual Trigger**: Typically run on release branches but can be manually triggered in the Bitrise dashboard.

#### **4. App Launch Times Pipeline**

- **Function**: Measures and monitors app launch times on real devices using BrowserStack to ensure consistent performance over time.
- **Nightly**: Automatically runs on the main branch.
- **Manual Trigger**: Select the desired branch in the Bitrise dashboard and choose `app_upgrade_pipeline` from the pipeline dropdown menu. 

#### **5. App Upgrade Pipeline**

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

### Best Practices

For more guidelines and best practices, refer to our [Best Practices Document](https://github.com/MetaMask/contributor-docs/blob/main/docs/e2e-testing.md).
