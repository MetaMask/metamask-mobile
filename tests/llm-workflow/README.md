# MetaMask Mobile LLM Workflow

Local CLI tooling for LLM agents to launch and interact with MetaMask Mobile on an iOS Simulator or an already-running Android emulator. The workflow uses the `mm` CLI and a persistent local HTTP daemon from `@metamask/client-mcp-core`.

This workflow supports **prod context only**. It reuses the app and wallet state already installed on the selected device. It does not build or install MetaMask, start test infrastructure, initialize fixtures, seed contracts, or create wallet state.

## Platform Support

- Omitted `--platform`, `--platform browser`, and `--platform ios` use iOS for backward compatibility.
- Only explicit `--platform android` uses Android.
- iOS uses an iOS Simulator and the existing IDB-backed lifecycle.
- Android supports running Android emulators whose serial matches `emulator-*`; physical devices are not supported.

The shared session manager delegates prerequisite resolution, driver creation, app launch, cleanup, and owned-resource cleanup to platform adapters. Both platforms use `MobilePlatformDriver` for accessibility-based interaction.

## Prerequisites

### iOS

- Xcode command-line tools
- An iOS Simulator
- `idb` and `idb-companion`
- MetaMask already installed on the target simulator

Install the IDB tooling with:

```bash
brew tap facebook/fb && brew install idb-companion && pip3 install fb-idb
```

Run `yarn mm:doctor` to verify the iOS toolchain. `mm launch` does not search build outputs or DerivedData. Install the app separately before launching.

### Android

- Android SDK Platform-Tools with `adb` on `PATH`
- Exactly one running, authorized, online emulator, or an explicit online `emulator-*` serial
- Exactly `io.metamask` installed for the emulator's current user
- `io.metamask/io.metamask.MainActivity` available as the launcher activity
- No worktree/current-directory `.device-session` override, because Android requires the ADB backend rather than Appium

The Android workflow never starts, stops, restarts, clears, wipes, or deletes an emulator. It never installs, uninstalls, replaces, or clears app data. The core CLI launch option `--extension-path` is rejected on Android because this workflow has no APK lifecycle. Programmatic iOS lifecycle fields such as `reinstall`, `resetAppData`, `appBundlePath`, and `allowFoxCodeMismatch` are also rejected by the Android adapter; they are not core 0.8.0 launch flags.

During an active Android session, the workflow temporarily sets the emulator's three global system animation scales to zero to make UiAutomator idle-state snapshots more reliable. Cleanup restores every value changed by the session, including after partial-launch and cleanup failures.

## Basic Workflow

```bash
# iOS (default)
yarn mm launch
yarn mm launch --platform ios --device-id <SIMULATOR-UDID>

# Android
yarn mm launch --platform android
yarn mm launch --platform android --device-id emulator-5554

# Install a specific build before launching
yarn mm launch --app-bundle ios/build/MetaMask.app

# Observe and interact
yarn mm describe-screen
yarn mm click e1
yarn mm type e2 "text"
yarn mm screenshot --name "result"

# Force-stop the selected app and clear the active workflow session
yarn mm cleanup

# Also request simulator shutdown when using the supported iOS cleanup option
yarn mm cleanup --shutdown

# Replace an active session in one step instead of running cleanup first
yarn mm launch --force
```

Launching while a session is already active fails with `MM_SESSION_ALREADY_RUNNING`. Run `yarn mm cleanup` first, or pass `--force` to clean up the active session and launch in a single step.

There is no alternate launch context. Supplying `--context e2e`, non-default state initialization, fixtures, contract seeding, or E2E ports is rejected.

## Installed-State Safety

- The existing installed app and wallet state are reused.
- Android verifies emulator eligibility, completed boot, exact `io.metamask` installation for the current user, and the launch activity before creating the driver.
- Android cleanup force-stops only `io.metamask`. It does not stop or mutate the emulator.
- iOS retains its existing optional install/reinstall behavior and destructive safeguards. Android has no APK lifecycle.

## Metro Watch Mode

Metro attachment remains available for development builds. Start Metro and provide its port with either the flag or the environment variable (the flag wins when both are set):

```bash
yarn watch:clean
yarn mm launch --metro-port 8081

# iOS
MM_METRO_PORT=8081 yarn mm launch --platform ios

# Android
MM_METRO_PORT=8081 yarn mm launch --platform android
```

On Node 20, Hermes/CDP WebSocket access may require the experimental WebSocket flag:

```bash
NODE_OPTIONS="--experimental-websocket" yarn mm launch --platform ios --metro-port 8081
```

## Destructive Launch Flags

`--reinstall` and `--reset-app-data` replace the installed app and destroy the wallet state it holds. `--allow-fox-code-mismatch` bypasses the app-identity guard and may make existing wallet/keychain data unreadable. This workflow is prod-only, so all three are guarded:

- `--reinstall` and `--reset-app-data` are rejected unless `--app-bundle` is also supplied, because the installed app is otherwise the only copy and would be destroyed by the uninstall step.
- Installing a bundle whose `fox_code` differs from the installed app is rejected unless `--reinstall` or `--allow-fox-code-mismatch` is passed.
- A warning is printed to stderr whenever a destructive flag is honored.

```bash
# Replace the installed app with a local build, discarding wallet state
yarn mm launch --app-bundle ios/build/MetaMask.app --reinstall
```

For Android, the workflow first validates `http://localhost:<port>/status`. It then inspects the selected emulator's ADB reverse mappings:

- An identical `tcp:<port> -> tcp:<port>` mapping is reused and left untouched.
- A conflicting mapping for the selected device port causes launch to fail; it is never overwritten.
- An absent mapping is created and owned by the session.
- Cleanup removes an owned mapping only if it still matches. External or changed mappings remain untouched; `reverse --remove-all` is never used.

The Android development-client URL passes only the Metro origin (for example, `http://localhost:8081`) in Expo's `url` parameter, keeps `disableOnboarding=1` as a separate Expo parameter, and opens `io.metamask/io.metamask.MainActivity` with `android.intent.action.VIEW`. Expo constructs the Android bundle URL itself; passing a pre-built `/index.bundle?...` URL breaks Metro asset resolution for custom assets such as `.riv` files.

Android launch readiness is verified rather than inferred from process liveness. Direct launches require the exact resumed `io.metamask/io.metamask.MainActivity` and a recognized MetaMask startup screen — a locked marker (`login`, `onboarding-screen`, `onboarding-carousel-screen`) or an unlocked marker (`wallet-screen`, `tab-bar-item-Wallet`, `account-overview`); locked markers take precedence when both appear. Metro launches additionally require an unambiguous `io.metamask` Hermes target selection. Multiple stale/fresh targets are accepted when device-mcp resolves them to one logical device and supplies a `chosen` target. A running process, Metro `/status`, the resumed activity, or a fixed delay is not sufficient by itself, so an Expo Dev Launcher screen (which exposes none of these markers) cannot be reported as a successful MetaMask launch.

## Commands

### Lifecycle

- `yarn mm launch`
- `yarn mm cleanup`
- `yarn mm cleanup --shutdown`: clean up and request iOS simulator shutdown
- `yarn mm status`
- `yarn mm stop`

### Interaction

- `yarn mm describe-screen`
- `yarn mm list-testids`
- `yarn mm click <a11yRef>` or `--testid <id>`
- `yarn mm type <a11yRef> <text>` or `--testid <id>`
- `yarn mm wait-for`
- `yarn mm get-text`
- `yarn mm screenshot`
- `yarn mm run-steps '<json>'`
- `yarn mm cdp Runtime.evaluate '<json>'` when attached to a compatible Metro development build

## Android Limitations and Validation Status

- Emulator-only; no physical-device support.
- No emulator lifecycle management, APK discovery/build/install, app-data reset, Appium fallback, clipboard, WebView switching, Flask-specific handling, or CI support.
- Android UI snapshots are locally serialized because `@metamask/device-mcp` 0.3.3 uses a shared `/sdcard/window_dump.xml`. One retry is performed only for recognized transient UiAutomator idle-state, killed/exit-137, or missing-dump failures. The upstream package should eventually provide unique dump paths and single-snapshot composite discovery.
- Live validation was completed on AVD `Medium_Phone_API_36.1` (`emulator-5554`) with installed package `io.metamask`. Explicit Android launch succeeded and returned a loaded state with `extensionId: io.metamask` after activity resolution was updated to normalize Android's `io.metamask/.MainActivity` shorthand exactly.
- The live unlock-screen session validated `describe-screen`, `list-testids`, `get-state`, screenshots, `type --testid`, `get-text --testid`, `wait-for`, valid `run-steps`, and `click --testid`. A screenshot path was returned. An intentionally invalid credential was used only to exercise typing and clicking; successful wallet unlock and home-screen navigation were not attempted.
- Android resource IDs and app test IDs were observable and usable. Test IDs including `login`, `login-password-input`, and `log-in-button` worked without changes to `SCREEN_DETECTION_MAP`.
- Live cleanup succeeded, left no `io.metamask` process, and left no reverse mapping. Metro reverse ownership and development-client deep linking were exercised during follow-up debugging; the readiness gate correctly rejected the Expo Dev Launcher when the React root did not mount. The original pre-built `/index.bundle?...` deep link reproduced `Invalid Rive resource` because Rive received an empty asset URI. Switching the deep link to the Metro origin fixed asset resolution, and a cold `yarn mm` Metro launch rendered MetaMask's welcome/onboarding UI without errors, exposed a recognized startup-screen marker along with the observed accessibility controls and Rive `TextureView`, and registered one `io.metamask` Hermes target. An induced real-device partial-launch failure was not performed.
- Android prerequisite, routing, launch verification, cleanup/failure teardown, and ADB reverse ownership edge cases remain covered by mocked unit tests in addition to the live checks above.
- **Hermes device ownership:** Android Hermes discovery is scoped by Metro port and app ID, not by the selected ADB serial. Readiness rejects Metro reports that are down, missing, invalid, or ambiguous across logical devices, and accepts multiple stale/fresh targets only when device-mcp selects one logical device. If the selected emulator has no target while another emulator is the only `io.metamask` client of the same Metro, that target is indistinguishable and may be selected; the driver's later logical-device pin prevents target switching but does not prove ADB ownership. Until upstream provides device-scoped discovery or a trusted ADB-serial-to-`logicalDeviceId` mapping, connect only the selected emulator's MetaMask instance to that Metro when using Android Hermes/CDP.

## Operational Notes

- The daemon binds only to `127.0.0.1`, records worktree-local state in `.mm-server`, and allows up to 180 seconds for requests. Android readiness uses up to 90 seconds, kept below the CLI's 120s request timeout so a real failure surfaces as `MM_ANDROID_RUNNER_NOT_READY` rather than a bare timeout.
- The daemon shuts down after 30 minutes of inactivity and writes `.mm-daemon.log`.
- Browser-only navigation and tab APIs are unavailable on mobile sessions.
- Accessibility references are ephemeral; call `describe-screen` again after navigation or major UI changes.
- Generated agent skills are synced by `yarn skills` and intentionally are not committed in this repository. This committed README is the source for workflow-specific setup and safety notes.

## Troubleshooting

Launch errors use the core `ErrorCode` set, because `@metamask/client-mcp-core` only preserves a consumer-thrown code when it is a known core code and collapses anything else into `MM_LAUNCH_FAILED`. The iOS-specific detail is carried in the message and remediation text.

| Error                     | Resolution                                                                                                                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MM_DEPENDENCIES_MISSING` | Xcode command-line tools or `idb` are missing. Run `yarn mm:doctor`, then install `idb` with `brew tap facebook/fb && brew install idb-companion && pip3 install fb-idb`.                                                                                         |
| `MM_DEVICE_NOT_AVAILABLE` | No simulator is booted, the given UDID does not exist, or `simctl` failed. Run `xcrun simctl list devices` and boot one.                                                                                                                                          |
| `MM_INVALID_CONFIG`       | The launch options are not usable: no app installed and no `--app-bundle`, a destructive flag without `--app-bundle`, a `fox_code` mismatch, an unreachable Metro port, or an E2E-only option in this prod-only workflow. Read the remediation text in the error. |
| `MM_LAUNCH_FAILED`        | The app or platform driver failed to start. Run `yarn mm cleanup` and retry.                                                                                                                                                                                      |
| `MM_NO_ACTIVE_SESSION`    | Run `yarn mm launch`.                                                                                                                                                                                                                                             |
| `MM_TARGET_NOT_FOUND`     | Run `yarn mm describe-screen` and use fresh refs.                                                                                                                                                                                                                 |

Mobile platform support comes from `@metamask/client-mcp-core` 0.8.0; `@metamask/device-mcp` 0.3.3 supplies the device backends. The Android adapter identifies the ADB backend via `@metamask/device-mcp`'s public `DeviceBackend.kind` discriminator (added in 0.3.3).
