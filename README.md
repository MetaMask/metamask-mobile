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

**Clone the project**

```bash
git clone git@github.com:MetaMask/metamask-mobile.git && \
cd metamask-mobile
```

### **Firebase Messaging Setup**

MetaMask uses Firebase Cloud Messaging (FCM) to enable app communications. To integrate FCM, you’ll need configuration files for both iOS and Android platforms.

#### **Configuration Files Required**
- **`GoogleService-Info.plist`** (iOS)
- **`google-services.json`** (Android)

These files are essential for FCM integration and are automatically generated when running: `yarn start:ios` or `yarn start:android`

**External Contributors**

As an external contributor, you need to provide your own Firebase project configuration files:

1.	Create a Free Firebase Project
    * Set up a Firebase project in the Firebase Console.
	* Configure the project with a client package name matching `io.metamask`.
2.	Add Configuration Files
	* Update the `google-services.json` and `GoogleService-Info.plist` files in:
	* `android/app` (for Android)
	* `ios` directory (for iOS)

In case you don't have FCM account, you can reference the instructions below. These instructions will generate the required `GOOGLE_SERVICES_B64_ANDROID` or `GOOGLE_SERVICES_B64_IOS` environment variables found in: `.ios.env`, `.js.env`, `.android.env`. They can be locally generated from examples files.

**Internal Contributors**

As an internal contributor, you can access the shared Firebase project config file from 1Password. Ask around for the correct vault.

The values you should provide to `GOOGLE_SERVICES_B64_ANDROID` or `GOOGLE_SERVICES_B64_IOS` are the base64 encoded versions of the example Firebase project config files. These can also be generated locally:

**For Android**
```bash
export GOOGLE_SERVICES_B64_ANDROID="$(base64 -w0 -i ./android/app/google-services-example.json)" && echo "export GOOGLE_SERVICES_B64_ANDROID=\"$GOOGLE_SERVICES_B64_ANDROID\"" | tee -a .js.env .ios.env
```

**For iOS**
```bash
export GOOGLE_SERVICES_B64_IOS="$(base64 -w0 -i ./ios/GoogleServices/GoogleService-Info-example.plist)" && echo "export GOOGLE_SERVICES_B64_IOS=\"$GOOGLE_SERVICES_B64_IOS\"" | tee -a .js.env .ios.env
```

[!CAUTION]
> In case you don't provide your own Firebase project config file or run the steps above, you will face the error `No matching client found for package name 'io.metamask'`.

In case of any doubt, please follow the instructions in the link below to get your Firebase project config file.
[Firebase Project Quickstart](https://firebaseopensource.com/projects/firebase/quickstart-js/messaging/readme/#getting_started)

**Install dependencies**

```bash
yarn setup
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
