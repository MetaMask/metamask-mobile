![MetaMask logo](logo.png?raw=true)

# MetaMask

[![CI](https://github.com/MetaMask/metamask-mobile/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/MetaMask/metamask-mobile/actions/workflows/ci.yml) [![CLA](https://github.com/MetaMask/metamask-mobile/actions/workflows/cla.yml/badge.svg?branch=main)](https://github.com/MetaMask/metamask-mobile/actions/workflows/cla.yml)

MetaMask is a mobile wallet that provides easy access to websites that use the [Ethereum](https://ethereum.org/) blockchain.

For up to the minute news, follow our [Twitter](https://twitter.com/metamask) or [Medium](https://medium.com/metamask) pages.

To learn how to develop MetaMask-compatible applications, visit our [Developer Docs](https://docs.metamask.io).

## Getting started

### [Environment setup](./docs/readme/environment.md)

Make sure your development environment has all the tools needed to run this project

### Building the app

**Clone the project**
```bash
git clone git@github.com:MetaMask/metamask-mobile.git && \
cd metamask-mobile
```

**Install dependencies**

```bash
yarn setup
```
_Not the usual install command, this will run scripts and a lengthy postinstall flow_

**Setup environment variables**
```bash
cp .ios.env.example .ios.env && \
cp .android.env.example .android.env && \
cp .js.env.example .js.env
```

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

## [Running Tests](./docs/readme/testing.md)
_TODO: Add description_

## [Build Troubleshooting](./docs/readme/troubleshooting.md)
_TODO: Add description_

## [Debugging](./docs/readme/debugging.md)
_TODO: Add description_

## [Architecture](./docs/readme/architecture.md)
_TODO: Add description_

## [Storybook](./docs/readme/storybook.md)
_TODO: Add description_

## [Miscellaneous](./docs/readme/miscellaneous.md)
_TODO: Add description_