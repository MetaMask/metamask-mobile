### Running Tests

#### Unit Tests

```bash
yarn test:unit
```

#### E2E Tests

##### Platforms

For both iOS and Android platforms, our chosen E2E test framework is Detox. We also utilize Appium for Android (wdio folder).

##### Test wallet

E2E tests use a wallet able to access testnet and mainnet.
On Bitrise CI, the wallet is created using the secret recovery phrase from secret env var.
For local testing, the wallet is created using the secret recovery phrase from the `.e2e.env` file.

##### Detox

All tests live within the e2e/specs folder.

### iOS

Prerequisites for running tests

- Before running tests:
    - Homebrew is a pre-requisite for `applesimutils`, please ensure that homebrew is installed. Read more [here](environment.md#package-manager).

    -  Ensure that the `applesimutils` is installed on your machine by typing `applesimutils` command in your terminal. Please note that `applesimutils` is essential for running the iOS tests. If you don't have `applesimutils` installed, please use the guidelines provided [here](https://github.com/wix/AppleSimulatorUtils) to install it.

    - To ensure that the detox-cli is properly installed, please verify its presence by running the command `detox` in your terminal. The detox-cli serves as a convenient script that facilitates running commands through a local Detox executable located at node_modules/.bin/detox. Its purpose is to simplify the operation of Detox from the command line. For example, you can execute commands like `detox test -c ios.sim.debug` with ease using detox-cli. In case the detox-cli is not installed, please refer to the instructions provided [here](https://wix.github.io/Detox/docs/introduction/environment-setup/#1-command-line-tools-detox-cli) for detailed guidance. 
- The default device for iOS is the iPhone 13 Pro and Android the Pixel 5. Ensure you have these set up. You can change the default devices at anytime by updating the `device.type` in the detox config `e2e/.detoxrc.js`
- Make sure that Metro is running. Use this command to launch the metro server:

```bash
yarn watch
```

You can trigger the tests against a `release` or `debug` build. It recommended that you trigger the tests against a debug build.

To build the app for testing on an iOS debug build run this command:

```bash
yarn test:e2e:ios:debug:build
```

To build the app for testing on an android debug build run this command:

```bash
yarn test:e2e:android:debug:build
```

To run the tests on a debug build run this command:

For iOS

```bash
yarn test:e2e:ios:debug:run
```


and on Android:

```bash
yarn test:e2e:android:debug:run
```

If you choose to run tests against a release build, you can do so by running this command:

For iOS

```bash
yarn test:e2e:ios
```

and on Android:

```bash
yarn test:e2e:android
```

If you have already built the application for Detox and want to run a specific test from the test folder, you can use this command:

For iOS

```bash
yarn test:e2e:ios:debug:run e2e/specs/TEST_NAME.spec.js
```

and on Android:

```bash
yarn test:e2e:android:debug:run e2e/specs/TEST_NAME.spec.js
```

To run tests associated with a certain tag, you can do so using the `--testNamePattern` flag. For example:

```bash
yarn test:e2e:ios:debug:run --testNamePattern="Smoke"
```

```bash
yarn test:e2e:android:debug:run --testNamePattern="Smoke"
```

This runs all tests that are tagged "Smoke"

##### Appium

The appium tests lives within the wdio/feature folder.

By default the tests use an avd named `Android 11 - Pixel 4a API 31`, with API `Level 30` (Android 11). You can modify the emulator and platform version by navigating to `wdio/config/android.config.debug.js` and adjusting the values of `deviceName` to match your emulator's name, and `platformVersion` to match your operating system's version. Make sure to verify that the config file accurately represents your emulator settings before executing any tests.

The sequence in which you should run tests:

create a test build using this command:

```bash
yarn start:android:qa
```

Then run tests using this command:

```bash
yarn test:wdio:android
```

If you want to run a specific test, you can include the `--spec` flag in the aforementioned command. For example:

```bash
yarn test:wdio:android --spec ./wdio/features/Onboarding/CreateNewWallet.feature
```

##### API Spec Tests

The API Spec tests use the `@open-rpc/test-coverage` tool to generate tests from our [api-specs](https://github.com/MetaMask/api-specs) OpenRPC Document.
Currently, the API Spec tests only run on iOS and uses the same build as the Detox tests for iOS.

The `test-coverage` tool uses `Rules` and `Reporters` to generate tests and report the results. The `Rules` and `Reporters` are passed in via params to the test coverage tool call in [e2e/api-specs/json-rpc-coverage.js](../../e2e/api-specs/json-rpc-coverage.js). You can read more about the `Rules` and `Reporters` [here](https://github.com/open-rpc/test-coverage?tab=readme-ov-file#extending-with-a-rule).

To run the API Spec tests, run these commands:

```bash
yarn test:e2e:ios:debug:build
yarn test:api-specs
````
