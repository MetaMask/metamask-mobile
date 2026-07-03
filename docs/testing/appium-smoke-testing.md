# Appium Smoke E2E Tests

Appium smoke tests are the **Playwright + Appium** counterpart to Detox smoke tests. They share page objects, fixtures, and assertions with Detox via the cross-framework layer in `tests/framework/`.

|                         | Detox smoke                     | Appium smoke                                           |
| ----------------------- | ------------------------------- | ------------------------------------------------------ |
| **Specs**               | `tests/smoke/`                  | `tests/smoke-appium/` (same folder layout)             |
| **Runner**              | Detox + Jest                    | Playwright (`tests/playwright.smoke-appium.config.ts`) |
| **CI workflows**        | `e2e-smoke-tests-{android,ios}` | `appium-smoke-tests-{android,ios}`                     |
| **Build**               | Debug (Metro bundler required)  | **main-e2e release** (`HAS_TEST_OVERRIDES=true`)       |
| **Local yarn commands** | `yarn test:e2e:*`               | `yarn appium-smoke:ios` / `yarn appium-smoke:android`  |

Use Appium smoke when validating Appium framework changes, CI Appium jobs, or when adding smoke coverage that must run without Metro.

## Architecture

```
tests/smoke-appium/<feature>/*.spec.ts
        │
        ▼
Playwright fixture (appiumTest) + withFixtures + FixtureBuilder
        │
        ▼
Cross-framework Page Objects (Gestures, Assertions, Matchers)
        │
        ▼
EmulatorProvider → Appium → iOS Simulator / Android Emulator
```

- **Config:** `tests/playwright.smoke-appium.config.ts`
- **Tags:** Same `tests/tags.js` helpers as Detox (e.g. `SmokeAccounts`, `SmokePerps`). Filter with Playwright `--grep`.
- **Login:** `loginToAppPlaywright({ scenarioType: 'e2e' })` instead of Detox `loginToApp()`.
- **Fixture arg:** Pass `currentDeviceDetails` from the Playwright test into `withFixtures`.

See [E2E testing guidelines](./e2e-testing.md#test-organization--detox-vs-appium-specs) for spec templates and cross-framework POM patterns.

## Required build

Appium smoke needs a **main-e2e release** binary with `HAS_TEST_OVERRIDES=true` compiled in. That enables fixture state from `/state.json` and `ReadOnlyNetworkStore`.

| Platform | CI artifact name        | Do **not** use                                                                                       |
| -------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| iOS      | `main-e2e-MetaMask.app` | Detox debug `.app`, Expo dev build                                                                   |
| Android  | `main-e2e-release.apk`  | `app-prod-debug.apk` (Expo dev launcher), `main-e2e-release-androidTest.apk` (Detox instrumentation) |

**Detox debug builds are wrong for Appium smoke** — Android debug opens the Connect-to-Metro screen; Appium config expects a standalone release e2e app.

### Download CI build (recommended)

From a successful [`build`](https://github.com/MetaMask/metamask-mobile/actions/workflows/build.yml) workflow on `main` or your PR branch:

```bash
mkdir -p build/ci-main-e2e

# List recent builds
gh run list --repo MetaMask/metamask-mobile --workflow build --branch main --limit 5

# iOS
gh run download RUN_ID --repo MetaMask/metamask-mobile \
  -n main-e2e-MetaMask.app -D build/ci-main-e2e

# Android (optional)
gh run download RUN_ID --repo MetaMask/metamask-mobile \
  -n main-e2e-release.apk -D build/ci-main-e2e
mv -f build/ci-main-e2e/main-e2e-release.apk build/ci-main-e2e/app-prod-release.apk
```

If `gh run download` extracts loose files instead of a bundle, assemble `build/ci-main-e2e/MetaMask.app/` and restore execute permissions:

```bash
chmod +x build/ci-main-e2e/MetaMask.app/MetaMask
```

### Build locally (when CI artifact unavailable)

```bash
# iOS simulator release e2e (~20–30+ min)
HAS_TEST_OVERRIDES=true METAMASK_ENVIRONMENT=e2e \
  CONFIGURATION=Release yarn build:ios:main:e2e

# Android release e2e (use BUILD_CONFIG_NAME=main-e2e on Mac for arm64)
BUILD_CONFIG_NAME=main-e2e HAS_TEST_OVERRIDES=true METAMASK_ENVIRONMENT=e2e \
  yarn build:android:main:e2e
```

## Environment variables

Loaded from `.e2e.env` (copy from `.e2e.env.example`). App path resolution in `playwright.smoke-appium.config.ts`:

1. `IOS_APP_PATH` / `ANDROID_APK_PATH` — explicit override (**use when running CI artifacts**)
2. `PREBUILT_IOS_APP_PATH` / `PREBUILT_ANDROID_APK_PATH` from `.e2e.env`
3. Default: `build/ci-main-e2e/MetaMask.app` / `build/ci-main-e2e/app-prod-release.apk`

`.e2e.env` often points `PREBUILT_*` at **debug** Detox paths. Set `IOS_APP_PATH` explicitly when using main-e2e CI builds.

| Variable             | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `IOS_APP_PATH`       | Path to `.app` bundle                                                 |
| `IOS_SIMULATOR_NAME` | Default `iPhone 16 Pro`                                               |
| `IOS_SIMULATOR_UDID` | Booted simulator UDID (recommended after `prepare-ios-appium-runner`) |
| `ANDROID_APK_PATH`   | Path to release APK                                                   |
| `ANDROID_AVD_NAME`   | Default `Pixel_5_Pro_API_34`                                          |
| `SKIP_APP_REINSTALL` | Skip adb/simctl reinstall when iterating (see `.e2e.env.example`)     |

## Running locally

### Prerequisites

```bash
cp .e2e.env.example .e2e.env   # if missing
yarn install
```

**iOS:** Xcode + iPhone 16 Pro simulator (matches CI).

**Android on Apple Silicon:** CI APKs are **x86_64** only — they fail on arm64 emulators with `INSTALL_FAILED_NO_MATCHING_ABIS`. Prefer **iOS** for local Appium runs on Mac, or build arm64 main-e2e locally.

### iOS (recommended on Mac)

```bash
# 1. Boot simulator
xcrun simctl boot "iPhone 16 Pro" 2>/dev/null || true
open -a Simulator

# 2. Prepare WDA + install app (first run can take several minutes)
IOS_APP_PATH=build/ci-main-e2e/MetaMask.app \
IOS_SIMULATOR_NAME="iPhone 16 Pro" \
node scripts/e2e/prepare-ios-appium-runner.mjs

# 3. Export UDID
export IOS_SIMULATOR_UDID=$(xcrun simctl list devices booted -j | node -e "
  const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
  const booted=Object.values(d.devices).flat().find(x=>x.state==='Booted');
  console.log(booted?.udid||'');
")

# 4. Run tests
IOS_APP_PATH=build/ci-main-e2e/MetaMask.app \
IOS_SIMULATOR_UDID="$IOS_SIMULATOR_UDID" \
yarn appium-smoke:ios
```

**Single spec or tag:**

```bash
IOS_APP_PATH=build/ci-main-e2e/MetaMask.app \
IOS_SIMULATOR_UDID="$IOS_SIMULATOR_UDID" \
yarn appium-smoke:ios --grep "Secret Recovery Phrase Reveal" \
  tests/smoke-appium/accounts/reveal-secret-recovery-phrase.spec.ts

# By smoke tag id (matches describe title)
yarn appium-smoke:ios --grep SmokePerps
```

### Android

```bash
ANDROID_APK_PATH=build/ci-main-e2e/app-prod-release.apk \
ANDROID_AVD_NAME=Pixel_5_Pro_API_34 \
yarn appium-smoke:android --grep SmokeAccounts
```

Ensure the emulator is running before starting tests.

## Yarn commands

| Command                     | Description                     |
| --------------------------- | ------------------------------- |
| `yarn appium-smoke:ios`     | Full iOS Appium smoke suite     |
| `yarn appium-smoke:android` | Full Android Appium smoke suite |

Both use `tests/playwright.smoke-appium.config.ts`. Pass standard Playwright flags: `--grep`, file paths, `--debug`, etc.

## Reports and artifacts

| Output                        | Path                                  |
| ----------------------------- | ------------------------------------- |
| HTML report                   | `test-reports/appium-smoke-report/`   |
| JUnit                         | `test-reports/appium-smoke-junit.xml` |
| Failure videos (when enabled) | `test-reports/appium-smoke-videos/`   |

CI uploads per-suite artifacts as `appium-smoke-report-<suite>` and `appium-smoke-videos-<suite>`.

## CI

- **Build:** `build` workflow produces `main-e2e-MetaMask.app` and `main-e2e-release.apk`.
- **Tests:** `appium-smoke-tests-ios` / `appium-smoke-tests-android` in PR CI (see [E2E decision tree](../../.github/guidelines/E2E_DECISION_TREE.md)).
- **Reusable job:** `.github/workflows/run-appium-e2e-workflow.yml` — downloads artifacts, runs `prepare-ios-appium-runner.mjs`, executes Playwright with `--grep` per smoke tag.

## Adding a new Appium smoke spec

1. Mirror the Detox smoke spec under `tests/smoke-appium/<feature>/`.
2. Use `appiumTest` from `tests/framework/fixtures/playwright/index.js`.
3. Pass `currentDeviceDetails` into `withFixtures`; use `loginToAppPlaywright`.
4. Reuse existing page objects — avoid Detox-only `device.*` calls.
5. Lint: `yarn lint tests/smoke-appium/<path> --fix` and `yarn lint:tsc`.
6. Run locally with main-e2e build before opening a PR.

## Troubleshooting

| Symptom                              | Fix                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Expo dev launcher / Connect to Metro | Wrong APK — use `main-e2e-release.apk`                                         |
| `INSTALL_FAILED_NO_MATCHING_ABIS`    | CI Android APK on arm64 Mac — use iOS or local arm64 build                     |
| WDA / `ECONNREFUSED 127.0.0.1:8100`  | Run `prepare-ios-appium-runner.mjs`; retry (framework has iOS terminate retry) |
| Fixture state not loading            | Build missing `HAS_TEST_OVERRIDES` — use main-e2e release only                 |
| Wrong app installed                  | Set `IOS_APP_PATH` / `ANDROID_APK_PATH` explicitly                             |

## Related docs

- [E2E testing guidelines](./e2e-testing.md) — POM, cross-framework patterns, Detox vs Appium specs
- [E2E setup (Detox)](../readme/e2e-testing.md) — Metro, debug builds, regression
- [Playwright local emulator](../../tests/docs/PLAYWRIGHT_LOCAL_EMULATOR.md) — `buildPath`, reinstall behavior
- [Unified E2E architecture](../../tests/docs/UNIFIED_E2E_ARCHITECTURE.md) — `resolve()`, `encapsulated()`
