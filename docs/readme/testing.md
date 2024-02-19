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

Prerequisites for running tests:

- Make sure to install `detox-cli` by referring to the instructions mentioned [here](https://wix.github.io/Detox/docs/introduction/getting-started/#detox-prerequisites).
- Additionally, install `applesimutils` by following the guidelines provided [here](https://github.com/wix/AppleSimulatorUtils).
- Before running any tests, it's recommended to refer to the `iOS section` above and check the latest simulator device specified under `Install the correct simulator`.
- The default device for iOS is the iPhone 13 Pro and Android the Pixel 5. Ensure you have these set up.
- Make sure that Metro is running. Use this command to launch the metro server:

```bash
yarn watch
```

You can trigger the tests against a `release` or `debug` build. It recommended that you trigger the tests against a debug build.

To trigger the tests on a debug build run this command:

For iOS

```bash
yarn test:e2e:ios:debug
```

and on Android:

```bash
yarn test:e2e:android:debug
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
yarn test:e2e:ios:debug:single e2e/specs/TEST_NAME.spec.js
```

and on Android:

```bash
yarn test:e2e:android:debug:single e2e/specs/TEST_NAME.spec.js
```

To run tests associated with a certain tag, you can do so using the `--testNamePattern` flag. For example:

```bash
yarn test:e2e:ios:debug --testNamePattern="Smoke"
```

```bash
yarn test:e2e:android:debug --testNamePattern="Smoke"
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
