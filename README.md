<img alt="MetaMask logo" src="logo.png?raw=true" width="50" />

# MetaMask Mobile

[![CI](https://github.com/MetaMask/metamask-mobile/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/MetaMask/metamask-mobile/actions/workflows/ci.yml) [![CLA](https://github.com/MetaMask/metamask-mobile/actions/workflows/cla.yml/badge.svg?branch=main)](https://github.com/MetaMask/metamask-mobile/actions/workflows/cla.yml)

MetaMask is a mobile wallet that provides easy access to websites that use the [Ethereum](https://ethereum.org/) blockchain.

For up to the minute news, follow our [Twitter](https://twitter.com/metamask) or [Medium](https://medium.com/metamask) pages.

To learn how to develop MetaMask-compatible applications, visit our [Developer Docs](https://docs.metamask.io).

To learn how to contribute to the MetaMask codebase, visit our [Contributor Docs](https://github.com/MetaMask/contributor-docs).

## Documentation

- [Architecture](./docs/readme/architecture.md)
- [BigInt number migration](./docs/bigint-migration-guide.md) (deprecated `app/util/number/index.js` burndown and ESLint allowlist)
- [Expo Development Environment Setup](./docs/readme/expo-environment.md)
- [Native Development Environment Setup](./docs/readme/environment.md)
- [Build Troubleshooting](./docs/readme/troubleshooting.md)
- [Component View Testing](./docs/readme/component-view-testing.md)
- [E2E Testing](./docs/readme/e2e-testing.md)
- [On-Ramp Provider Manual Testing](./tests/docs/ONRAMP-PROVIDER-TESTING.md)
- [Debugging](./docs/readme/debugging.md)
- [Development Process](./docs/readme/development-process.md)
- [Performance](./docs/performance/)
- [Release Build Profiling](./docs/readme/release-build-profiler.md)
- [Storybook](./docs/readme/storybook.md)
- [Miscellaneous](./docs/readme/miscellaneous.md)
- [Reassure Performance Testing (pilot)](./docs/readme/reassure.md)

## Getting started

### Infura Project Setup

MetaMask Mobile requires an Infura project ID to connect to blockchain networks.

#### Internal Contributors

1. Grab the `.js.env` file from 1Password, ask around for the correct vault. This file contains the `MM_INFURA_PROJECT_ID`.

#### External Contributors

1. Go to [https://developer.metamask.io](https://developer.metamask.io) and create an account
2. Generate an API key
3. Add API key to `MM_INFURA_PROJECT_ID` in `.js.env.example`
4. Rename `.js.env.example` to `.js.env`
5. Rebuild the app

[!CAUTION]

> Without an Infura project ID, the app cannot connect to blockchain networks.

### Using Expo (recommended)

Expo is the fastest way to start developing. With the Expo framework, developers don't need to compile the native side of the application as before, hence no need for any native environment setup, developers only need to download a precompiled development build and run the javascript bundler. The development build will then connect with the bundler to load the javascript code.

#### Expo Environment Setup

[Install node, yarn v4 and watchman.](./docs/readme/expo-environment.md)

#### Clone the project

```bash
git clone git@github.com:MetaMask/metamask-mobile.git && \
cd metamask-mobile
```

#### Install dependencies

```bash
yarn setup:expo
```

#### Run the bundler

```bash
yarn watch
```

#### Download and install the development build

Expo development builds are produced by the [`Expo Dev Build`](https://github.com/MetaMask/metamask-mobile/actions/workflows/expo-dev-build.yml) GitHub Actions workflow on every push to `main`. Artifacts are stored as GitHub Actions artifacts (not Runway buckets).

**Prerequisites:** [GitHub CLI](https://cli.github.com/) (`gh`) authenticated with access to this repository (`gh auth login`).

**Recommended — install the latest build on a simulator/emulator:**

```bash
# iOS simulator
yarn install:ios:dev

# Android emulator or device
yarn install:android:dev
```

Download only (no install):

```bash
yarn install:ios:dev --skipInstall
yarn install:android:dev --skipInstall
```

Artifacts land under `build/` (`MetaMask.app` on iOS, `metamask-dev.apk` on Android). The workflow run id is saved to `build/expo-dev-build-run-id.txt`.

**Manual download from GitHub Actions:**

```bash
# List recent successful Expo Dev Build runs on main
gh run list --repo MetaMask/metamask-mobile --workflow expo-dev-build.yml --branch main --status success --limit 5

mkdir -p build

# iOS simulator (.zip artifact → extract to MetaMask.app)
gh run download RUN_ID --repo MetaMask/metamask-mobile \
  -n ios-app-main-dev-expo -D build
mkdir -p build/MetaMask.app
ditto -x -k build/metamask-simulator-*.zip build/MetaMask.app

# Android debug APK
gh run download RUN_ID --repo MetaMask/metamask-mobile \
  -n android-apk-main-dev-expo -D build
cp build/metamask-dev-main-*.apk build/metamask-dev.apk

# iOS physical device (.ipa — requires registered test device)
gh run download RUN_ID --repo MetaMask/metamask-mobile \
  -n ios-ipa-main-dev-expo -D build
```

Use a specific workflow run instead of the latest:

```bash
yarn install:ios:dev --run RUN_ID
yarn install:android:dev --run RUN_ID
```

(`--run-id` is also accepted.) Related: [MCWP-683](https://consensyssoftware.atlassian.net/browse/MCWP-683), supersedes [PR #29891](https://github.com/MetaMask/metamask-mobile/pull/29891).

#### Load the app

If on a simulator:

- use the initial expo screen that appears when starting the development to choose the bundler url
- OR press "a" for Android or "i" for iOS on the terminal where the bundler is running

If on a physical device:

- Use the camera app to scan the QR code presented by the bundler running on the terminal

That's it! This will work for any javascript development, if you need to develop or modify native code please see the next section.

### Native Development

If developing or modifying native code or installing any library that introduces or uses native code, it is not possible to use an Expo precompiled development build as you need to compile the native side of the application again. To do so, please follow the steps stated in this section.

#### Native Environment setup

Before running the app for native development, make sure your development environment has all the required tools. Several of these tools (ie Node and Ruby) may require specific versions in order to successfully build the app.

[Setup your development environment](./docs/readme/environment.md)

#### Building the app

**Clone the project**

```bash
git clone git@github.com:MetaMask/metamask-mobile.git && \
cd metamask-mobile
```

##### Firebase Messaging Setup

MetaMask uses Firebase Cloud Messaging (FCM) to enable app communications. To integrate FCM, you'll need configuration files for both iOS and Android platforms.

###### Internal Contributor instructions

1. Grab the `.js.env` file from 1Password, ask around for the correct vault. This file contains the `GOOGLE_SERVICES_B64_ANDROID` and `GOOGLE_SERVICES_B64_IOS` secrets that will be used to generate the relevant configuration files for IOS/Android.
2. [Install](./README.md#install-dependencies) and [run & start](./README.md#running-the-app) the application as documented below.

###### External Contributor instructions

As an external contributor, you need to provide your own Firebase project configuration files:

- **`GoogleService-Info.plist`** (iOS)
- **`google-services.json`** (Android)

1. Create a Free Firebase Project
   - Set up a Firebase project in the Firebase Console.
   - Configure the project with a client package name matching `io.metamask` (IMPORTANT).
2. Add Configuration Files
   - Create/Update the `google-services.json` and `GoogleService-Info.plist` files in:
   - `android/app/google-services.json` (for Android)
   - `ios/GoogleServices/GoogleService-Info.plist` directory (for iOS)
3. Create the correct base64 environments variables.

```bash
# Generate Android Base64 Version of Google Services
export GOOGLE_SERVICES_B64_ANDROID="$(base64 -w0 -i ./android/app/google-services.json)" && echo "export GOOGLE_SERVICES_B64_ANDROID=\"$GOOGLE_SERVICES_B64_ANDROID\"" | tee -a .js.env

# Generate IOS Base64 Version of Google Services
export GOOGLE_SERVICES_B64_IOS="$(base64 -w0 -i ./ios/GoogleServices/GoogleService-Info.plist)" && echo "export GOOGLE_SERVICES_B64_IOS=\"$GOOGLE_SERVICES_B64_IOS\"" | tee -a .js.env
```

[!CAUTION]

> In case you don't provide your own Firebase project config file or run the steps above, you will face the error `No matching client found for package name 'io.metamask'`.

In case of any doubt, please follow the instructions in the link below to get your Firebase project config file.
[Firebase Project Quickstart](https://firebaseopensource.com/projects/firebase/quickstart-js/messaging/readme/#getting_started)

##### Install dependencies

```bash
yarn setup
```

_Not the usual install command, this will run scripts and a lengthy postinstall flow_

#### Running the app for native development

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

## Development Tools

### AI Agent Skills (`yarn skills`)

AI coding agents (Cursor, Claude Code, Codex) consume shared skills from the [MetaMask/skills](https://github.com/MetaMask/skills) repo, with an optional private overlay from [Consensys/skills](https://github.com/Consensys/skills). Per [ADR #57](https://github.com/MetaMask/decisions/pull/162) this content is **not committed here** — `yarn skills` syncs it on demand into local-only paths under `.cursor/`, `.claude/`, and `.agents/`.

Zero-config setup:

```bash
yarn install # refreshes the MetaMask/skills cache via the shared @metamask/skills CLI
yarn skills  # syncs all default skills through metamask-skills sync
```

Optional local configuration:

```bash
cp .skills.local.example .skills.local
# edit .skills.local to set SKILLS_DOMAINS or override skills source paths
yarn skills --select                         # interactively pick domains
SKILLS_DOMAINS=perps,testing yarn skills      # one-off domain override
```

Use `.skills.local` for persistent skills configuration. Shell environment variables with the same names are supported for one-off or CI overrides and take precedence.

Skipping `yarn skills` is fine — it only affects agent tooling, not the app build. The repo uses the shared `@metamask/skills` package so sync/cache behavior stays uniform across MetaMask packages. To opt into best-effort regeneration during install/setup, set `SKILLS_AUTO_UPDATE=1` in your shell or `.skills.local`.

### Git Hooks (Husky)

This project uses [Husky](https://typicode.github.io/husky/) to run pre-commit hooks that automatically format and lint your code before commits. The pre-commit hook runs `lint-staged` which executes:

- **Prettier** - Code formatting for `*.{js,jsx,ts,tsx,json,feature}` files
- **ESLint** - Linting and auto-fixing for `*.{js,jsx,ts,tsx}` files

#### Disabling Husky Locally

If you need to disable Husky pre-commit hooks temporarily (e.g., for emergency commits or debugging), you have several options:

##### Option 1: Skip hooks for a single commit

```bash
git commit --no-verify -m "your commit message"
```

##### Option 2: Bypass hooks with environment variable

```bash
# Disable for current session
export HUSKY=0
git commit -m "your commit message"

# Or disable for a single command
HUSKY=0 git commit -m "your commit message"
```

**Note:** While these methods allow you to bypass the pre-commit hooks, remember that the CI/CD pipeline will still run linting checks. It's recommended to fix linting issues before pushing your changes to avoid build failures.
