![MetaMask logo](logo.png?raw=true)

# MetaMask

[![CI](https://github.com/MetaMask/metamask-mobile/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/MetaMask/metamask-mobile/actions/workflows/ci.yml) [![CLA](https://github.com/MetaMask/metamask-mobile/actions/workflows/cla.yml/badge.svg?branch=develop)](https://github.com/MetaMask/metamask-mobile/actions/workflows/cla.yml)

MetaMask is a mobile web browser that provides easy access to websites that use the [Ethereum](https://ethereum.org/) blockchain.

For up to the minute news, follow our [Twitter](https://twitter.com/metamask) or [Medium](https://medium.com/metamask) pages.

To learn how to develop MetaMask-compatible applications, visit our [Developer Docs](https://docs.metamask.io).

## MetaMask Mobile

### Building Locally

The code is built using React-Native and running code locally requires a Mac or Linux OS.

-   Install [sentry-cli](https://github.com/getsentry/sentry-cli) tools: `brew install getsentry/tools/sentry-cli`

-   Install [Node.js](https://nodejs.org) **version 14 (latest stable) and yarn@1 (latest)**

    -   If you are using [nvm](https://github.com/creationix/nvm#installation) (recommended) running `nvm use` will automatically choose the right node version for you.

-   Install the shared [React Native dependencies](https://reactnative.dev/docs/environment-setup#installing-dependencies) (`React Native CLI`, _not_ `Expo CLI`)

-   Install [cocoapods](https://guides.cocoapods.org/using/getting-started.html) by running:

```bash
sudo gem install cocoapods
```

-   _MetaMask Only:_ Rename the `.*.env.example` files (remove the `.example`) in the root of the project and fill in the appropriate values for each key. Get the values from another MetaMask Mobile developer.

-   Clone this repo and install our dependencies:

```bash
git clone ...
cd metamask-mobile
yarn setup # not the usual install command, this will run a lengthy postinstall flow
cd ios && pod install && cd .. # install pods for iOS
```

-   _Non-MetaMask Only:_ In the project root folder run

```
  cp .ios.env.example .ios.env && \
  cp .android.env.example .android.env && \
  cp .js.env.example .js.env
```

-   _Non-MetaMask Only:_ Create an account and generate your own API key at [Infura](https://infura.io) in order to connect to main and test nets. Fill `MM_INFURA_PROJECT_ID` in `.js.env`. (App will run without it, but will not be able to connect to actual network.)

-   Then, in one terminal, run:

```bash
yarn watch
```

#### Android

-   Install the Android SDK, via [Android Studio](https://developer.android.com/studio).
    -   _MetaMask Only:_ To create production builds, you need to install Google Play Licensing Library via the SDK Manager in Android Studio.
-   Install the Android NDK, via [Android Studio](https://developer.android.com/studio)'s SDK Manager.
    -   In the SDK Manager, select the `SDK Tools` tab and install NDK version `17.2.4988734`. You'll need to click "Show Package Details" in order to select the appropriate version.
        -   In the `android` directory, update the `local.properties` file by adding line:
        ```
        ndk.dir=/Users/YOUR_HOME_DIRECTORY/Library/Android/sdk/ndk/17.2.4988734
        ```
        _(You may have to create local.properties if it doesn't exist.)_
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
-   Finally, start the emulator from Android Studio, and run:

```bash
yarn start:android
```

#### iOS

-   Install the iOS dependencies
    -   [React Native Getting Started - iOS](https://reactnative.dev/docs/environment-setup#installing-dependencies) _(React Native CLI Quickstart -> [your OS] -> iOS)_
        -   You do **not** need CocoaPods
-   Install the correct simulator
    -   **iOS OS Version:** Latest, unless told otherwise
    -   **Device:** iPhone 11 Pro

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

Next, check that the React Native Debugger is working:

-   Open your emulator or simulator, and select `Debug JS Remotely` (or something similar) from its developer menu
-   To open the developer menu:
    -   iOS Simulator: `Cmd + D`
    -   Android Emulator
        -   macOS: `Cmd + M` - Windows, Linux: `Ctrl + M`
-   If it doesn't open automatically, try navigating to this URL in Chrome: http://localhost:8081/debugger-ui/
-   If these steps do not take you to the React Native Debugger, something is wrong

#### Debugging iOS (macOS Only)

For more details, see [this page](https://medium.com/@mattcroak718/debugging-your-iphone-mobile-web-app-using-safari-development-tools-71240657c487).

-   You should be able to inspect the mobile app using the console in the React Native Debugger in Chrome
-   To debug a website (dapp) in the browser:
    -   Navigate to the website in the app's browser
    -   Open Safari
        -   Go to: _Preferences -> Advanced_ and select `Show Develop menu in menu bar`
    -   Select `Develop` in the menu bar
        -   Find your simulator in the second section from the top
        -   Select the relevant WebView from the list
            -   The simulator will highlight the WebView when you hover over it in Safari

#### Debugging Android

For more details, see [this page](https://developers.google.com/web/tools/chrome-devtools/remote-debugging/webviews).

-   You should be able to inspect the mobile app using the console in the React Native Debugger in Chrome
-   To debug a website (dapp) in the browser:
    -   Navigate to the website in the app's browser
    -   Go to chrome://inspect
    -   Select the relevant WebView under **Remote Target**

#### Miscellaneous

-   [Troubleshooting for React Native](https://facebook.github.io/react-native/docs/troubleshooting#content)

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

* `yarn.lock`:
  * Run `yarn setup` again after your changes to ensure `yarn.lock` has been properly updated.
* The `allow-scripts` configuration in `package.json`
  * Run `yarn allow-scripts auto` to update the `allow-scripts` configuration automatically. This config determines whether the package's install/postinstall scripts are allowed to run. Review each new package to determine whether the install script needs to run or not, testing if necessary.
  * Unfortunately, `yarn allow-scripts auto` will behave inconsistently on different platforms. macOS and Windows users may see extraneous changes relating to optional dependencies.

### Architecture

To get a better understanding of the internal architecture of this app take a look at [this diagram](https://github.com/MetaMask/metamask-mobile/blob/develop/architecture.svg).
