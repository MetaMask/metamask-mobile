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
