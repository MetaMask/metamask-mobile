# MetaMask Connect E2E Tests

This directory contains Appwright-based E2E tests for MetaMask Connect flows.

## Test Files

| File                            | Description                                                 |
| ------------------------------- | ----------------------------------------------------------- |
| `connection-evm.spec.js`        | Legacy EVM connection via Browser Playground in Chrome      |
| `connection-multichain.spec.js` | Multichain API connection via Browser Playground in Chrome  |
| `connection-wagmi.spec.js`      | Wagmi connector via Browser Playground in Chrome            |
| `multichain-rn-connect.spec.js` | **Multichain + Solana via the React Native Playground APK** |

## React Native Playground Setup

The `multichain-rn-connect` test interacts with **two native Android apps** at the
same time — the MetaMask wallet and the React Native Playground
(`@metamask/react-native-playground`). The wallet APK is installed by Appwright;
the playground APK must be **built beforehand**. The test's `beforeAll` hook
automatically **uninstalls and reinstalls** it on the emulator every run.

### Prerequisites

| Requirement                 | Details                                                      |
| --------------------------- | ------------------------------------------------------------ |
| Android emulator            | Running and reachable via `adb`                              |
| MetaMask wallet APK         | Built or pointed to via `buildPath` in `appwright.config.ts` |
| `connect-monorepo` checkout | Cloned **next to** `metamask-mobile` (same parent directory) |

Expected directory layout:

```
Documents/MetaMask/          # or wherever you keep these repos
├── metamask-mobile/         # this repo
└── connect-monorepo/        # https://github.com/MetaMask/connect-monorepo
    └── playground/
        └── react-native-playground/
```

### Build the Playground APK

You must build the release APK **manually** before running the test, and
**rebuild** whenever you change the playground source code. The release variant
is required because the debug variant expects a Metro dev server at runtime.

#### First-time setup

Run all five steps below from your terminal. Each command is self-contained
(no implicit working directory from a previous step).

**Step 1 — Install monorepo dependencies:**

```bash
cd /path/to/connect-monorepo
yarn install
```

**Step 2 — Build all workspace packages** (so `@metamask/connect-evm`,
`@metamask/playground-ui`, etc. have their `dist/` output):

```bash
cd /path/to/connect-monorepo
yarn build
```

**Step 3 — Configure your Infura API key:**

The playground uses Infura RPC endpoints for blockchain requests. Copy the
example `.env` file and add your key:

```bash
cd /path/to/connect-monorepo/playground/react-native-playground
cp .env.example .env
```

Then edit `.env` and set your Infura API key:

```
EXPO_PUBLIC_INFURA_API_KEY=your_infura_api_key_here
```

> You can reuse the same key from `metamask-mobile/.js.env`
> (`MM_INFURA_PROJECT_ID`).

**Step 4 — Generate the native Android project** (only needed once, or after
deleting the `android/` directory):

```bash
cd /path/to/connect-monorepo/playground/react-native-playground
npx expo prebuild --platform android
```

**Step 5 — Build the release APK:**

```bash
cd /path/to/connect-monorepo/playground/react-native-playground/android
./gradlew assembleRelease
```

The first build takes ~7 minutes. Subsequent builds are incremental and much
faster. The output APK will be at:

```
connect-monorepo/playground/react-native-playground/android/app/build/outputs/apk/release/app-release.apk
```

#### Rebuilding after changes

When you edit the playground source, run the build command again:

```bash
cd /path/to/connect-monorepo/playground/react-native-playground/android
./gradlew assembleRelease
```

If you also changed shared workspace packages (e.g. `@metamask/playground-ui`),
rebuild those first:

```bash
cd /path/to/connect-monorepo
yarn build
```

Then run `./gradlew assembleRelease` as above.

### Automatic Install on Each Test Run

The test's `beforeAll` hook automatically **uninstalls** any existing version
of the playground from the emulator and **installs** the pre-built release APK.
This guarantees the device always has the latest APK you built, and avoids
stale debug-vs-release mismatches.

### Running the Test

```bash
# From the metamask-mobile root
yarn run-appwright:mm-connect-android-local
```

Or run only the RN playground spec:

```bash
npx appwright test tests/performance/mm-connect/multichain-rn-connect.spec.js \
  --project mm-connect-android-local \
  --config tests/appwright.config.ts
```

### What the Test Covers

The `multichain-rn-connect` test validates five areas of the multichain
MetaMask Connect flow:

1. **Simultaneous multi-chain connection** — connects to Ethereum, Linea,
   Polygon, and Solana in a single session and verifies all scope cards appear.

2. **Read request routing** — invokes `eth_blockNumber` on each EVM chain and
   `getGenesisHash` on Solana. These are handled directly by the RPC layer
   without opening MetaMask.

3. **Write request routing** — invokes `personal_sign` on each EVM chain and
   `signMessage` on Solana. Each write request opens MetaMask for approval,
   allowing the test to verify the request was routed to the correct network.

4. **Session termination** — disconnects via the Multichain SDK
   (`sdk.disconnect()`, the equivalent of `wallet_revokeSession`) and verifies
   the session is fully terminated on both the dApp and wallet sides.

### How It Works

Unlike the browser-based tests (which serve a web dApp in Chrome and use
WebView context switching), this test operates with **two native Android apps**:

```
┌──────────────────┐   deeplink    ┌──────────────────┐
│  RN Playground   │ ───────────►  │  MetaMask Wallet  │
│  (separate APK)  │ ◄────────── │  (app under test) │
│                  │   callback    │                   │
└──────────────────┘   deeplink    └──────────────────┘
```

- Both apps stay in the `NATIVE_APP` Appium context (no WebView switching).
- `device.activateApp(packageId)` switches focus between the two apps.
- The playground calls `Linking.openURL(metamask://…)` to open MetaMask;
  MetaMask sends a callback deeplink (`multichainrn://…`) to return.

### Troubleshooting

**`Unable to resolve the launchable activity of 'com.anonymous.multichainrnplayground'`**

The playground APK is not installed on the emulator. Follow the
[Build the Playground APK](#build-the-playground-apk) steps above.

**`Unable to load script. Make sure you're running Metro...`**

You installed the **debug** APK instead of the **release** APK. Debug builds
require a live Metro dev server. Rebuild with `./gradlew assembleRelease` and
reinstall (`adb install app/build/outputs/apk/release/app-release.apk`).

**`RPCErr50: 401 on https://mainnet.infura.io/v3/ for method POST`**

The Infura API key is missing or was not inlined during the APK build. Make
sure the `.env` file in `connect-monorepo/playground/react-native-playground/`
contains a valid `EXPO_PUBLIC_INFURA_API_KEY`. After updating the key you must
clear the build cache and rebuild:

```bash
cd /path/to/connect-monorepo/playground/react-native-playground
rm -rf android/app/build
cd android && ./gradlew assembleRelease
```

**Playground APK is installed but the test can't interact with it**

Make sure only one emulator is running (`adb devices` should show a single
entry). If multiple devices are connected, prefix commands with
`-s emulator-5554` or similar.

**Picker dropdown doesn't select the right method**

The test selects methods by exact text match (`getElementByText`). If the
method list in the playground changes, update the method names in the spec
(e.g., `personal_sign`, `getGenesisHash`, `signMessage`).

**MetaMask auto-locks during the test**

The `unlockIfLockScreenVisible` helper detects the lock screen and re-enters
the password. If the test consistently fails at a late step, consider
increasing the wallet's auto-lock timeout in Settings before running.

## Browser Playground Tests

The other three spec files (`connection-evm`, `connection-multichain`,
`connection-wagmi`) use a **local web server** that serves the Browser
Playground dApp in Chrome. These tests do not require a separate APK — the dApp
server is started automatically in `test.beforeAll`.

See the [parent README](../README.md) for details on BrowserStack Local setup
and other run configurations.
