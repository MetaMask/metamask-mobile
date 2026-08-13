# Capturing Hermes CPU profiles in Appium E2E tests

The Appium profiler is opt-in. It records one Hermes `.cpuprofile` per test
when `APPIUM_CAPTURE_PROFILER=true`.

The E2E build exposes a test-only profiler control. It uses the same
`react-native-release-profiler` Start and Stop actions as the release profiler
menu, but does not depend on injecting accelerometer events into Android or
iOS.

## Local run

Build an E2E app and run a selected suite:

```bash
yarn build:android:main:e2e

APPIUM_CAPTURE_PROFILER=true \
APPIUM_PROFILER_OUTPUT_DIRECTORY=tests/test-reports/appium-profiles/local \
ANDROID_APK_PATH=android/app/build/outputs/apk/prod/release/app-prod-release.apk \
yarn playwright test \
  --config tests/playwright.smoke-appium.config.ts \
  --project android-smoke \
  --grep SmokeAccounts
```

For iOS, use the matching E2E `.app` and `--project ios-smoke`.

Profiles are written below:

```text
tests/test-reports/appium-profiles/<project>/*.cpuprofile
```

The fixture stops the profiler and extracts the file before the Appium session
is destroyed, including when the test fails. Android profiles are pulled from
`/sdcard/Download`; iOS profiles are copied from the simulator app data
container.

## CI run

The smoke workflows include a small dedicated profiler job for Android and
iOS. It runs only the `Wallet details` and `Secret Recovery Phrase Reveal`
tests and passes:

```yaml
with:
  capture-profiler: true
```

The reusable workflow also accepts `profiler-test-grep` when a different
subset is needed. It uploads `appium-profiler-<suite>` even when the test fails.
BrowserStack is not supported because the runner does not expose `adb` or
`simctl`.

## Viewing a profile

Convert a profile for Chrome tracing:

```bash
yarn react-native-release-profiler --local path/to/profile.cpuprofile
```

The raw profile can also be opened in SpeedScope.
