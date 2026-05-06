# Playwright: local emulator app install and `use.app.buildPath`

This applies to **local** Android / iOS runs using [`EmulatorProvider`](../framework/services/providers/emulator/EmulatorProvider.ts) and [`EmulatorConfigBuilder`](../framework/services/providers/emulator/EmulatorConfigBuilder.ts) (e.g. projects in [`tests/playwright.config.ts`](../playwright.config.ts) with `device.provider: emulator` / iOS simulator).

## Summary

| `use.app.buildPath`                             | Global setup                                                                                                                                                                                                                                                                                                                                                                                                                      | Appium capabilities (local emulator)                                                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Set** (path to a local `.apk` or `.app` file) | Fails if the path does **not** exist. Then **reinstalls** from that path with CLI tools (so the disk artifact always wins over any existing install): **Android** `adb uninstall` (best-effort) + `adb install`; **iOS** `xcrun simctl uninstall` (best-effort) + `xcrun simctl install`. Requires Android `use.app.packageName` and `use.device` for adb targeting; iOS `use.app.appId` and `use.device.name` for the simulator. | Sets `appium:app` to that path for the session.                                                                                          |
| **Unset**                                       | Does **not** install anything. Fails if the app is **not** already on the device/sim.                                                                                                                                                                                                                                                                                                                                             | **Omits** `appium:app`. Android: uses `appium:appPackage` + `appium:appActivity`. iOS: `appium:bundleId` + `use.device` sim name / UDID. |

`buildPath` is the same field name used for remote URLs on BrowserStack. **EmulatorProvider** is intended for local paths: remote URLs are not a valid on-disk build for this flow.

## Skip CLI reinstall

Set the environment variable **`SKIP_APP_REINSTALL`** so global setup does **not** run `adb` / `xcrun simctl` uninstall+install (useful to speed up local runs when the sim/emulator already has a good build).

- **Skip reinstall:** `true`, `1`, or `yes` (case-insensitive)
- **Default (reinstall):** unset, or `false`, `0`, or `no`

Path validation for `buildPath` still runs. The Appium session can still use `appium:app` pointing at the same path; only the **explicit** uninstall+install step in `EmulatorProvider.globalSetup` is skipped. See [`.e2e.env.example`](../../.e2e.env.example).

## `fullReset` and `noReset` (local emulator)

We keep Appium’s reset flags **mild** in [`EmulatorConfigBuilder`](../framework/services/providers/emulator/EmulatorConfigBuilder.ts):

- `appium:fullReset`: `false`
- `appium:noReset`: `true`

**Reinstall / “clean” from `buildPath`** is handled in **`globalSetup`** with `adb` / `xcrun simctl`, not by toggling `fullReset`, to avoid the flaky sim/emulator behavior seen with driver-driven full reset.

> **Note:** `noReset: true` for the **Appium session** still means the driver is not asked to wipe app data on its own. After `globalSetup`’s explicit uninstall+install, the app is freshly installed for that run.

## Android device targeting

For Android, the adb serial is resolved from `use.device.name` (AVD name) or `use.device.udid` — see [`resolveAndroidAdbUdid`](../framework/services/providers/emulator/android/resolveAndroidAdbUdid.ts) and the `EmulatorConfig` JSDoc in [`types.ts`](../framework/types.ts).

## Related code

- [`reinstallLocalBuildFromPath`](../framework/services/providers/emulator/reinstallLocalBuildFromPath.ts) — `adb` / `simctl` install helpers.
- `EmulatorProvider.globalSetup` — path check, then reinstall when `buildPath` is set; or `isAppInstalled()` when unset.
- `EmulatorProvider.getDriver` / `EmulatorConfigBuilder.build` — capabilities including `appium:app` when `buildPath` is set.
