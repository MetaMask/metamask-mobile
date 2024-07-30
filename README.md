![MetaMask logo](logo.png?raw=true)

# MetaMask

[![CI](https://github.com/MetaMask/metamask-mobile/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/MetaMask/metamask-mobile/actions/workflows/ci.yml) [![CLA](https://github.com/MetaMask/metamask-mobile/actions/workflows/cla.yml/badge.svg?branch=main)](https://github.com/MetaMask/metamask-mobile/actions/workflows/cla.yml)

MetaMask is a mobile wallet that provides easy access to websites that use the [Ethereum](https://ethereum.org/) blockchain.

For up to the minute news, follow our [Twitter](https://twitter.com/metamask) or [Medium](https://medium.com/metamask) pages.

To learn how to develop MetaMask-compatible applications, visit our [Developer Docs](https://docs.metamask.io).

To learn how to contribute to the MetaMask codebase, visit our [Contributor Docs](https://github.com/MetaMask/contributor-docs).

## Documentation

- [Architecture](./docs/readme/architecture.md)
- [Development Environment Setup](./docs/readme/environment.md)
- [Build Troubleshooting](./docs/readme/troubleshooting.md)
- [Testing](./docs/readme/testing.md)
- [Debugging](./docs/readme/debugging.md)
- [Storybook](./docs/readme/storybook.md)
- [Miscellaneous](./docs/readme/miscellaneous.md)

## Getting started

### Environment setup

Before running the app, make sure your development environment has all the required tools. Several of these tools (ie Node and Ruby) may require specific versions in order to successfully build the app.

[Setup your development environment](./docs/readme/environment.md)

### Building the app

    -   If you are using [nvm](https://github.com/creationix/nvm#installation) (recommended) running `nvm use` will automatically choose the right node version for you.

-   Install [Yarn v1](https://yarnpkg.com/en/docs/install)

    One way to install Yarn v1 is by using brew:
    ```bash
    brew install yarn@1.22.19
    ```

    To check you've installed the right version:

    ```bash
    yarn --version
    ```

-   Install the shared [React Native dependencies](https://reactnative.dev/docs/environment-setup#installing-dependencies) (`React Native CLI`, _not_ `Expo CLI`)
    -   XCode version `15.0.1` or below

-   Install [cocoapods](https://guides.cocoapods.org/using/getting-started.html) by running:

    ```bash
    sudo gem install cocoapods -v 1.12.1
    ```

-   Install [Python](https://www.python.org/downloads/) **version ^3.10**
    - _Note_: M1 User might need to stay with **version 3.10**

### Device Environment Setup

#### Android

-   Install [Java](https://www.java.com/en/download/). To check if Java is already installed, run:
    ```
    java -version
    ```
-   Install the Android SDK, via [Android Studio](https://developer.android.com/studio).
    -   _MetaMask Only:_ To create production builds, you need to install Google Play Licensing Library via the SDK Manager in Android Studio.
-   Install the Android NDK (version `21.4.7075529`), via [Android Studio](https://developer.android.com/studio)'s SDK Manager.
    - Go to Settings > Appearance & Behavior > System Settings > Android SDK
        - Shortcut: Selecting `More Actions` > `SDK Manager` from the "Welcome to Android Studio" page will also bring you here.
    - Select `SDK Tools` tab
    - Check `Show Package Details` option below the tools list to show available versions
    - Locate `NDK (Side-by-side)` option in the tools list
    - Check NDK version `21.4.7075529`
    - Locate `CMake` option in the tools list
    - Check CMake version `3.22.1`
    - Click "Apply" or "OK" to download
-   Linux only:
    -   Ensure that you have the `secret-tool` binary on your machine.
        -   Part of the [libsecret-tools](https://launchpad.net/ubuntu/bionic/+package/libsecret-tools) package on Debian/Ubuntu based distributions.
-   Install the correct emulator
    -   Follow the instructions at:
        -   [React Native Getting Started - Android](https://reactnative.dev/docs/environment-setup#installing-dependencies) _(React Native CLI Quickstart -> [your OS] -> Android)_
        -   FYI: as of today (7/18/23) there is currently an issue when running detox on android 12 and 13 (API 32/33) which prevents the tests from running. The issue is, the tap() action is treated like a tapAndHold() action. See the open issue in wix/detox [here](https://github.com/wix/Detox/issues/3762)
        -   More details can be found [on the Android Developer site](https://developer.android.com/studio/run/emulator)
    -   You should use the following:
        -   **Android OS Version:** Latest, unless told otherwise
        -   **Device:** Google Pixel 5
-   Finally, start the emulator from Android Studio:
    -   Open "Virtual Device Manager"
    -   Launch emulator for "Pixel 5 <relevant API version mentioned in [React Native Getting Started](https://reactnative.dev/docs/environment-setup#installing-dependencies)>"


#### iOS

-   Install the iOS dependencies
    -   [React Native Getting Started - iOS](https://reactnative.dev/docs/environment-setup#installing-dependencies) _(React Native CLI Quickstart -> [your OS] -> iOS)_
-   Install the correct simulator
    -   **iOS OS Version:** Latest, unless told otherwise
    -   **Device:** iPhone 13 Pro


### Building Locally

-   Clone this repo:
```bash
git clone git@github.com:MetaMask/metamask-mobile.git && \
cd metamask-mobile
```

**Firebase Messaging Setup**

Before running the app, keep in mind that MetaMask uses FCM (Firebase Cloud Message) to empower communications. Based on this, would be preferable that you provide your own Firebase project config file and update your `google-services.json` file in the `android/app` directory as well your .env files (ios.env, js.env, android.env), adding GOOGLE_SERVICES_B64 variable depending on the environment you are running the app (ios/android).

ATTENTION: In case you don't provide your own Firebase project config file, you can make usage of a mock file at `android/app/google-services-example.json`, following the steps below from the root of the project:

```bash
base64 -i ./android/app/google-services-example.json
```

Copy the result to your clipboard and paste it in the GOOGLE_SERVICES_B64 variable in the .env file you are running the app.

In case of any doubt, please follow the instructions in the link below to get your Firebase project config file.

[Firebase Project Quickstart](https://firebaseopensource.com/projects/firebase/quickstart-js/messaging/readme/#getting_started)

**Install dependencies**

-   Choose your Build Type
Metamask has currently two build types: `main` and `flask`. The `main` build type is the _default_ one and is used for production builds. The `flask` build type is used for a canary release, mainly used for development and testing of new/beta features purposes. To change the build type, set the `METAMASK_BUILD_TYPE` environment variable to either `main` or `flask`. For example:

```bash
export METAMASK_BUILD_TYPE="main"
```

-   Choose your Environment Type
Metamask has currently three environment types: `production`, `prerelease`, and `local`. The 'production' is used for a production release, 'prerelease' for a pre-release, or 'local' otherwise. To change the environment type, set the `METAMASK_ENVIRONMENT` environment variable to either `production`, `prerelease`, or `local`. For example:

```bash
export METAMASK_ENVIRONMENT="main"

```

-   Install the app:
```

_Not the usual install command, this will run scripts and a lengthy postinstall flow_

### Running the app

**Run Metro bundler**

```bash
yarn watch
```

_Like a local server for the app_

**Run on a iOS device**

```bash
yarn start:ios
```

**Run on an Android device**

```bash
yarn start:android
```

#### iOS
```bash
yarn start:ios
```


#### Build Troubleshooting

Unfortunately, the build system may fail to pick up local changes, such as installing new NPM packages or `yarn link`ing a dependency.
If the app is behaving strangely or not picking up your local changes, it may be due to build issues.
To ensure that you're starting with a clean slate, close all emulators/simulators, stop the `yarn watch` process, and run:

```bash
yarn clean

# if you're going to `yarn link` any packages,
# do that here, before the next command

yarn watch:clean

# ...and then, in another terminal

yarn start:ios

# or

yarn start:android
```

If `yarn link` fails after going through these steps, try directly `yarn add`ing the local files instead.

### Debugging

First, make sure you have the following running:

-   `yarn watch`
-   Your Android emulator or iOS simulator
-   `yarn start:android` or `yarn start:ios`

Next, install the [Flipper](https://fbflipper.com/) desktop app (verified working with v0.127.0)

-   Once Flipper is installed, configure your system as follows:
    -   Install react-devtools: `npm i -g react-devtools@4.22.1`
    -   Update Android SDK location settings by accessing Flipper's settings via the `Gear Icon` -> `Settings`
        -   Example SDK path: `/Users/<USER_NAME>/Library/Android/sdk`

Finally, check that the debugger is working:

-   Open your emulator or simulator alongside the Flipper app
-   Flipper should auto-detect the device and the application to debug
-   You should now be able to access features such as `Logs`

#### Debugging Physical iOS devices

-   Debugging physical iOS devices requires `idb` to be installed, which consists of 2 parts
-   Install the two idb parts:
    1. `brew tap facebook/fb` & `brew install idb-companion`
    2. `pip3.9 install fb-idb` (This step may require that you install python3 via `python -m pip3 install --upgrade pip`)

#### Debug a website inside the WebView (in-app browser)

Android

-   Run the app in debug mode (for example, in a simulator)
-   Open Chrome on your desktop
-   Go to `chrome://inspect/#devices`
-   Look for the device and click inspect

iOS

-   Run the app in debug mode (for example, in a simulator)
-   Open Safari on your desktop
-   Go to the menu Develop -> [Your device] -> [Website]

You should see the console for the website that is running inside the WebView

#### Miscellaneous

-   [Troubleshooting for React Native](https://facebook.github.io/react-native/docs/troubleshooting#content)
-   [Flipper Documentation](https://fbflipper.com/docs/features/react-native/)

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

### Changing dependencies

Whenever you change dependencies (adding, removing, or updating, either in `package.json` or `yarn.lock`), there are various files that must be kept up-to-date.

-   `yarn.lock`:
    -   Run `yarn setup` again after your changes to ensure `yarn.lock` has been properly updated.
-   The `allow-scripts` configuration in `package.json`
    -   Run `yarn allow-scripts auto` to update the `allow-scripts` configuration automatically. This config determines whether the package's install/postinstall scripts are allowed to run. Review each new package to determine whether the install script needs to run or not, testing if necessary.
    -   Unfortunately, `yarn allow-scripts auto` will behave inconsistently on different platforms. macOS and Windows users may see extraneous changes relating to optional dependencies.

### Architecture

To get a better understanding of the internal architecture of this app take a look at [this diagram](https://github.com/MetaMask/metamask-mobile/blob/main/architecture.svg).

### Storybook

We have begun documenting our components using Storybook. Please read the [Documentation Guidelines](./storybook/DOCUMENTATION_GUIDELINES.md) to get up and running.

### Code Fencing

When creating builds that support different features, it is desirable to exclude unsupported features, files, and dependencies at build time. This is exactly what Code Fences does. You can find more details about this [HERE](https://github.com/MetaMask/metamask-mobile/blob/main/app/transforms/README.md)

### Other Docs

- [Adding Confirmations](./docs/confirmations.md)
