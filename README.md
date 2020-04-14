![MetaMask logo](logo.png?raw=true)

# MetaMask

[![CircleCI](https://circleci.com/gh/MetaMask/metamask-mobile/tree/develop.svg?style=shield)](https://circleci.com/gh/MetaMask/metamask-mobile/tree/develop)

MetaMask is a mobile web browser that provides easy access to websites that use the [Ethereum](https://ethereum.org/) blockchain.

For up to the minute news, follow our [Twitter](https://twitter.com/metamask_io) or [Medium](https://medium.com/metamask) pages.

To learn how to develop MetaMask-compatible applications, visit our [Developer Docs](https://metamask.github.io/metamask-docs/).

## MetaMask Mobile

### Building Locally

The code is built using React-Native and running code locally requires a Mac or Linux OS.

- Install [Node.js](https://nodejs.org) **version 10 (latest stable) and yarn@1 (latest)**
  - If you are using [nvm](https://github.com/creationix/nvm#installation) (recommended) running `nvm use` will automatically choose the right node version for you.

- Install the shared React Native dependencies (`React Native CLI`, _not_ `Expo CLI`)
  - [macOS](https://facebook.github.io/react-native/docs/getting-started.html#installing-dependencies-1)
  - [Linux](https://facebook.github.io/react-native/docs/getting-started.html#installing-dependencies-2)

- Install [cocoapods](https://guides.cocoapods.org/using/getting-started.html) by running:

```bash 
sudo gem install cocoapods
```

- _MetaMask Only:_ Rename the `.*.env.example` files (remove the `.example`) in the root of the project and fill in the appropriate values for each key. Get the values from another MetaMask Mobile developer.

- Clone this repo and install our dependencies:

```bash
git clone ...
cd metamask-mobile
yarn install # this will run a lengthy postinstall flow
cd ios && pod install && cd .. # install pods for iOS
```

- Then, in one terminal, run:

```bash
yarn watch
```

#### Android

- Install the Android SDK, via [Android Studio](https://developer.android.com/studio).
  - _MetaMask Only:_ To create production builds, you need to install Google Play Licensing Library via the SDK Manager in Android Studio.
- Linux only:
  - Ensure that you have the `secret-tool` binary on your machine.
    - Part of the [libsecret-tools](https://launchpad.net/ubuntu/bionic/+package/libsecret-tools) package on Debian/Ubuntu based distributions.
- Install the correct emulator
  - Follow the instructions at:
    - [React Native Getting Started - Android](https://facebook.github.io/react-native/docs/getting-started.html#installing-dependencies-1) _(React Native CLI Quickstart -> [your OS] -> Android)_
    - More details can be found [on the Android Developer site](https://developer.android.com/studio/run/emulator)
  - You should use the following:
    - **Android OS Version:** Latest, unless told otherwise
    - **Device:** Google Pixel 3
- Finally, start the emulator from Android Studio, and run:

```bash
yarn start:android
```

#### iOS

- Install the iOS dependencies
  - [React Native Getting Started - iOS](https://facebook.github.io/react-native/docs/getting-started.html#installing-dependencies-1) _(React Native CLI Quickstart -> [your OS] -> iOS)_
    - You do **not** need CocoaPods
- Install the correct simulator
  - **iOS OS Version:** Latest, unless told otherwise
  - **Device:** iPhone 11 Pro

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

- `yarn watch`
- Your Android emulator or iOS simulator
- `yarn start:android` or `yarn start:ios`

Next, check that the React Native Debugger is working:

- Open your emulator or simulator, and select `Debug JS Remotely` (or something similar) from its developer menu
- To open the developer menu:
  - iOS Simulator: `Cmd + D`
  - Android Emulator
    - macOS: `Cmd + M`
	- Windows, Linux: `Ctrl + M`
- If it doesn't open automatically, try navigating to this URL in Chrome: http://localhost:8081/debugger-ui/
- If these steps do not take you to the React Native Debugger, something is wrong

#### Debugging iOS (macOS Only)

For more details, see [this page](https://medium.com/@mattcroak718/debugging-your-iphone-mobile-web-app-using-safari-development-tools-71240657c487).

- You should be able to inspect the mobile app using the console in the React Native Debugger in Chrome
- To debug a website (dapp) in the browser:
  - Navigate to the website in the app's browser
  - Open Safari
    - Go to: _Preferences -> Advanced_ and select `Show Develop menu in menu bar`
  - Select `Develop` in the menu bar
    - Find your simulator in the second section from the top
    - Select the relevant WebView from the list
      - The simulator will highlight the WebView when you hover over it in Safari

#### Debugging Android

For more details, see [this page](https://developers.google.com/web/tools/chrome-devtools/remote-debugging/webviews).

- You should be able to inspect the mobile app using the console in the React Native Debugger in Chrome
- To debug a website (dapp) in the browser:
  - Navigate to the website in the app's browser
  - Go to chrome://inspect
  - Select the relevant WebView under **Remote Target**

#### Miscellaneous

- [Troubleshooting for React Native](https://facebook.github.io/react-native/docs/troubleshooting#content)

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

### Architecture

To get a better understanding of the internal architecture of this app take a look at [this diagram](https://github.com/MetaMask/metamask-mobile/blob/develop/architecture.svg).

## License

MetaMask Mobile is an exciting development for our team and our ecosystem. We've always been proud to offer the MetaMask browser extension under the MIT open source software license. We are still working through licensing considerations for the mobile application in light of a new delivery medium and our business goals. We are exploring many models, all with a significant open component, but we have not made any final decisions.

The source code for this beta is currently viewable under the below copyright. A license to use the mobile version will be distributed along with the mobile application. We believe it is important for our users to be able inspect and verify our code for trustworthiness, but we also wish to preserve our licensing options until we're certain what is best for MetaMask, our community, and our ecosystem. If you have any questions or comments, we would really appreciate hearing your feedback – you can reach us at mobile@metamask.io

© ConsenSys AG, 2016-2019

You are granted a limited non-exclusive license to inspect and study the code in this repository. There is no associated right to reproduction granted under this license except where reproduction is necessary for inspection and study of the code. You may not otherwise reproduce, distribute, modify or create derivative works of the code without our prior consent. All other rights are expressly reserved.
