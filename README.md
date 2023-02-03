![MetaMask logo](logo.png?raw=true)

# MetaMask

[![CI](https://github.com/MetaMask/metamask-mobile/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/MetaMask/metamask-mobile/actions/workflows/ci.yml) [![CLA](https://github.com/MetaMask/metamask-mobile/actions/workflows/cla.yml/badge.svg?branch=main)](https://github.com/MetaMask/metamask-mobile/actions/workflows/cla.yml)

MetaMask is a mobile wallet that provides easy access to websites that use the [Ethereum](https://ethereum.org/) blockchain.

For up to the minute news, follow our [Twitter](https://twitter.com/metamask) or [Medium](https://medium.com/metamask) pages.

To learn how to develop MetaMask-compatible applications, visit our [Developer Docs](https://docs.metamask.io).

## MetaMask Mobile


### Environment Setup

The code is built using React-Native and running code locally requires a Mac or Linux OS.

-   Install [sentry-cli](https://github.com/getsentry/sentry-cli) tools: `brew install getsentry/tools/sentry-cli`

-   Install [Node.js](https://nodejs.org) **version 14 (latest stable) and yarn@1 (latest)**

    -   If you are using [nvm](https://github.com/creationix/nvm#installation) (recommended) running `nvm use` will automatically choose the right node version for you.

-   Install yarn
-   Install the shared [React Native dependencies](https://reactnative.dev/docs/environment-setup#installing-dependencies) (`React Native CLI`, _not_ `Expo CLI`)

-   Install [cocoapods](https://guides.cocoapods.org/using/getting-started.html) by running:

```bash
sudo gem install cocoapods
```


### Device Environment Setup

#### Android

-   Install [Java](https://www.java.com/en/download/). To check if Java is already installed, run:
```
  java -version
```
-   Install the Android SDK, via [Android Studio](https://developer.android.com/studio).
    -   _MetaMask Only:_ To create production builds, you need to install Google Play Licensing Library via the SDK Manager in Android Studio.
-   Install the Android NDK (version `21.4.7075529`), via [Android Studio](https://developer.android.com/studio)'s SDK Manager.
    - Go to Preferences > Appearance & Behavior > System Settings > Android SDK
        - Shortcut: Selecting `More Actions` > `SDK Manager` from the "Welcome to Android Studio" page will also bring you here.
    - Select `SDK Tools` tab
    - Locate `NDK (Side-by-side)` option in the tools list
    - Check `Show Package Details` option below the tools list to show available versions
    - Check NDK version `21.4.7075529` 
    - Click "Apply" or "OK" to download
-   Linux only:
    -   Ensure that you have the `secret-tool` binary on your machine.
        -   Part of the [libsecret-tools](https://launchpad.net/ubuntu/bionic/+package/libsecret-tools) package on Debian/Ubuntu based distributions.
-   Install the correct emulator
    -   Follow the instructions at:
        -   [React Native Getting Started - Android](https://reactnative.dev/docs/environment-setup#installing-dependencies) _(React Native CLI Quickstart -> [your OS] -> Android)_
        -   More details can be found [on the Android Developer site](https://developer.android.com/studio/run/emulator)
    -   You should use the following:
        -   **Android OS Version:** Latest, unless told otherwise
        -   **Device:** Google Pixel 3
-   Finally, start the emulator from Android Studio:
    -   Open "Virtual Device Manager"
    -   Launch emulator for "Pixel 3 <relevant API version mentioned in [React Native Getting Started](https://reactnative.dev/docs/environment-setup#installing-dependencies)>"


#### iOS

-   Install the iOS dependencies
    -   [React Native Getting Started - iOS](https://reactnative.dev/docs/environment-setup#installing-dependencies) _(React Native CLI Quickstart -> [your OS] -> iOS)_
        -   You do **not** need CocoaPods
-   Install the correct simulator
    -   **iOS OS Version:** Latest, unless told otherwise
    -   **Device:** iPhone 11 Pro



### Building Locally

-   Clone this repo:
```bash
git clone ...
cd metamask-mobile
```

-   _MetaMask Only:_ Rename the `.*.env.example` files (remove the `.example`) in the root of the project and fill in the appropriate values for each key. Get the values from another MetaMask Mobile developer.
-   _Non-MetaMask Only:_ In the project root folder run
```
  cp .ios.env.example .ios.env && \
  cp .android.env.example .android.env && \
  cp .js.env.example .js.env
```
-   _Non-MetaMask Only:_ Create an account and generate your own API key at [Infura](https://infura.io) in order to connect to main and test nets. Fill `MM_INFURA_PROJECT_ID` in `.js.env`. (App will run without it, but will not be able to connect to actual network.)

-   Install the app:
```
yarn setup # not the usual install command, this will run a lengthy postinstall flow
cd ios && pod install && cd .. # install pods for iOS
```

-   Then, in one terminal, run:
```bash
yarn watch
```

#### Android
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

#### E2E Tests (iOS)

First, [follow the instructions here](https://github.com/wix/AppleSimulatorUtils) to install `applesimutils`. Then:

```bash
yarn test:e2e:ios
```

#### E2E Tests (Android)

```bash
yarn test:e2e:android
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

We have begun documenting our components using storybook please read the [Documentation Guidelines](./storybook/DOCUMENTATION_GUIDELINES.md) to get up and running.
