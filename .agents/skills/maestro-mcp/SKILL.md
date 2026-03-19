---
name: maestro-mcp
description: Use when running UI tests or interacting with MetaMask Mobile via Maestro MCP — tapping elements, inputting text, navigating flows, taking screenshots, or running YAML test flows on iOS simulators or Android emulators. Use when the user says "use maestro", "tap on", "run a flow", "take a screenshot", or wants to automate the app UI without Detox.
---

# Maestro MCP — MetaMask Mobile

> Drive MetaMask Mobile UI via Maestro MCP tools. Works with iOS simulators and Android emulators.

## Approach: Pre-Made Flows First, Explore Only When Needed

**For known flows, always use `run_flow_files` first.** Pre-made YAML files in `tests/mcp-server/flows/` encode proven sequences (correct selectors, correct order, conditional handling). Only fall back to individual `tap_on`/`take_screenshot` when exploring unknown UI or debugging failures.

**Try first, inspect only when something fails.** Don't inspect the hierarchy before every action — it's slow and expensive. Use `run_flow` with `when: visible:` conditions to handle optional screens (dev screens, modals). Only call `inspect_view_hierarchy` when a step fails and you need to understand why.

**Learn from previous runs.** If a flow has been run before in this session (e.g., unlock → dismiss perps → send), reuse the same sequence. Don't re-inspect what you already know works.

### Cost optimization

Maestro flows are mechanical — no complex reasoning needed. When dispatching Maestro test execution, **use a `sonnet` or `haiku` subagent** to reduce cost:

```
Agent(model: "sonnet", prompt: "Run this Maestro flow on device X...")
```

### On failure — fallback diagnosis

When a `run_flow` or `tap_on` fails:

1. Call `inspect_view_hierarchy` (cheap, text-based) to understand what's on screen
2. If hierarchy isn't enough, use `take_screenshot` as last resort
3. Check for these common blockers:
   - **"Development servers" screen** → Metro may not be running. Check if the server URL shows a green indicator. If not, tell the user: _"Metro bundler is not running. Please start it with `yarn start`."_
   - **Login screen still showing** → Wallet didn't unlock. Re-enter password `123123123`.
   - **Networks modal** → Custom network triggered the add-network sheet. Dismiss with X.

## Standard Launch Flow

Use `run_flow` with conditional blocks. These handle all optional screens without pre-inspecting:

### Android

```yaml
appId: io.metamask
---
# Dev screens (conditional — skipped if not present)
- runFlow:
    when:
      visible: 'Development servers'
    commands:
      - tapOn: 'http://10.0.2.2:8081'

- runFlow:
    when:
      visible: 'Continue'
    commands:
      - tapOn: 'Continue'
      - extendedWaitUntil:
          visible:
            id: 'fast-refresh'
          timeout: 5000
      - tapOn:
          id: 'fast-refresh'

# Unlock (conditional — skipped if already unlocked)
- runFlow:
    when:
      visible: 'Enter password'
    commands:
      - tapOn: 'Enter password'
      - inputText: '123123123'
      - tapOn: 'Unlock'

# Dismiss Perps modal (conditional)
- runFlow:
    when:
      visible: 'Not now'
    commands:
      - tapOn: 'Not now'

# Dismiss Networks modal (conditional)
- runFlow:
    when:
      visible: 'Networks'
    commands:
      - tapOn:
          point: '93%,4%'

- waitForAnimationToEnd:
    timeout: 5000
```

### iOS

Same flow but with:

- Dev server URL: `"metamask http://localhost:8081"` (or tap by text)
- `appId: io.metamask.MetaMask`

**Skip the launch flow for onboarding tests** — when using `withOnboardingFixture`, the app starts in onboarding mode with no wallet to unlock.

## Pre-Made Flow Files (Fast Path)

Reusable YAML flows live in `tests/mcp-server/flows/`. **Always use `run_flow_files` with these first.** Only fall back to individual `tap_on`/`take_screenshot` when exploring unknown UI or debugging failures.

| Flow File                        | Purpose                                                         | Env Vars                           |
| -------------------------------- | --------------------------------------------------------------- | ---------------------------------- |
| `ios-launch-and-unlock.yaml`     | Clear state, launch iOS app, dismiss dev screens, unlock wallet | —                                  |
| `android-launch-and-unlock.yaml` | Dismiss dev screens, unlock wallet (Android)                    | —                                  |
| `send-eth-to-account.yaml`       | Send ETH to a named account                                     | `AMOUNT`, `ACCOUNT_NAME`, `APP_ID` |
| `send-eth-full-ios.yaml`         | Launch + unlock + send ETH (iOS composite)                      | `AMOUNT`, `ACCOUNT_NAME`           |
| `send-eth-full-android.yaml`     | Launch + unlock + send ETH (Android composite)                  | `AMOUNT`, `ACCOUNT_NAME`           |
| `assert-screenshot.yaml`         | Assert current screen matches a reference image                 | `REFERENCE_IMAGE`, `APP_ID`        |

### 4-Call Fast Path (instead of 25-30 calls)

```
# 1. Setup everything in one call (test-infra-mcp)
setup_test_environment(platform: "ios", networkPreset: "anvil")

# 2. Launch and unlock
run_flow_files("tests/mcp-server/flows/ios-launch-and-unlock.yaml")

# 3. Run test flow
run_flow_files("tests/mcp-server/flows/send-eth-to-account.yaml",
  env: { AMOUNT: "1", ACCOUNT_NAME: "Account 3", APP_ID: "io.metamask.MetaMask" })

# 4. Assert screenshot
run_flow_files("tests/mcp-server/flows/assert-screenshot.yaml",
  env: { REFERENCE_IMAGE: "/absolute/path/to/activity-good.png", APP_ID: "io.metamask.MetaMask" })
```

Total: 4 tool calls vs. 25-30 individual taps/screenshots.

## Quick Reference — MCP Tools

| Tool                     | Purpose                                                                |
| ------------------------ | ---------------------------------------------------------------------- |
| `list_devices`           | Find connected devices (emulators/simulators)                          |
| `start_device`           | Start an emulator/simulator by ID or platform                          |
| `launch_app`             | Launch app by bundle/package ID                                        |
| `stop_app`               | Stop a running app                                                     |
| `inspect_view_hierarchy` | Get current screen elements (CSV) — **always call before interacting** |
| `take_screenshot`        | Capture current screen                                                 |
| `tap_on`                 | Tap element by text, ID, or index                                      |
| `input_text`             | Type text into focused field                                           |
| `back`                   | Press back button (Android)                                            |
| `run_flow`               | Execute inline YAML flow commands                                      |
| `run_flow_files`         | Execute YAML flow files from disk                                      |
| `check_flow_syntax`      | Validate YAML syntax before running                                    |
| `cheat_sheet`            | Full Maestro command reference                                         |
| `query_docs`             | Search Maestro documentation                                           |

## App IDs

| Build | Android             | iOS                          |
| ----- | ------------------- | ---------------------------- |
| Main  | `io.metamask`       | `io.metamask.MetaMask`       |
| Flask | `io.metamask.flask` | `io.metamask.MetaMask-Flask` |

**Always confirm with the user which build they're using** if unclear. The appId determines which app gets launched, stopped, and cleared. Using the wrong one will silently launch a different app or fail.

## Launching the App

### Prerequisites — ALWAYS do these before launching

1. **Start a fixture server** via `test-infra-mcp` (if not already running). If the user didn't specify a fixture, use the default: `start_fixture_server(recipe: [])`. A fixture server is **always required for Maestro flows** — the app loads state from it on startup. Without it, a clean launch goes to onboarding with no wallet.
2. **Set up port forwarding** — `setup_android_port_forwarding()` for Android. iOS doesn't need port forwarding (localhost is shared).
3. **Clear app data and launch with fixture port:**

**Android:**

```bash
adb shell pm clear <appId>
adb shell am start -n <appId>/.MainActivity --ei fixtureServerPort 12345
```

**iOS — use Maestro's `launchApp` with `clearState` and `clearKeychain`:**

```yaml
- clearKeychain
- launchApp:
    appId: io.metamask.MetaMask
    clearState: true
    clearKeychain: true
```

Then pass the fixture server port via environment or rely on the default fallback port (12345).

`clearKeychain` wipes stored credentials so the app behaves like a fresh install — equivalent to `pm clear` on Android.

### NEVER uninstall the app

**Do NOT use `xcrun simctl uninstall`, `adb uninstall`, or any command that removes the app.** The app must remain installed at all times. Use `pm clear` (Android) or `clearState + clearKeychain` (iOS) to reset state without removing the app.

### Wallet password

The password to unlock MetaMask is always **`123123123`**. Never ask the user for it.

## assertScreenshot — Visual Regression

Compare the current screen against a reference PNG. **Default threshold: 95% similarity.**

```yaml
- assertScreenshot:
    path: '/absolute/path/to/reference.png'
```

- **Only property**: `path` (absolute path to reference PNG). No `threshold`, `tolerance`, or `reference` properties exist.
- **Dimensions must match exactly** — if the reference is 1179px wide but the device produces 1178px, the assertion fails with "Screenshot size mismatch". Resize with: `sips -z <height> <width> <image.png>`
- **Use the pre-made flow** `assert-screenshot.yaml` with env var `REFERENCE_IMAGE`:
  ```
  run_flow_files("tests/mcp-server/flows/assert-screenshot.yaml",
    env: { REFERENCE_IMAGE: "/absolute/path/to/ref.png", APP_ID: "io.metamask.MetaMask" })
  ```

## Common Flows

### Unlock wallet

Use **text matching** — testIDs (`login-password-input`, `log-in-button`) don't resolve reliably on iOS because accessibility labels override them.

```yaml
- extendedWaitUntil:
    visible: 'Enter password'
    timeout: 20000
- tapOn: 'Enter password'
- inputText: '123123123'
- tapOn: 'Unlock'
```

### Full end-to-end launch (Android)

Before running this flow, ensure:

1. `stop_all()` → `start_fixture_server(recipe: [])` → `setup_android_port_forwarding()`
2. `adb shell pm clear io.metamask && adb shell am start -n io.metamask/.MainActivity --ei fixtureServerPort 12345`

Then run this Maestro flow:

```yaml
appId: io.metamask
---
# Dismiss dev screens if present
- runFlow:
    when:
      visible: 'Development servers'
    commands:
      - tapOn: 'http://10.0.2.2:8081'

- runFlow:
    when:
      visible: 'Continue'
    commands:
      - tapOn: 'Continue'
      - extendedWaitUntil:
          visible:
            id: 'fast-refresh'
          timeout: 5000
      - tapOn:
          id: 'fast-refresh'

# Unlock wallet
- extendedWaitUntil:
    visible: 'Enter password'
    timeout: 20000
- tapOn: 'Enter password'
- inputText: '123123123'
- tapOn: 'Unlock'
```

## Best Practices

1. **Wait before conditional checks after screen transitions** — `runFlow: when: visible:` checks **once, instantly**. After `launchApp`, navigation, or any action that triggers a new screen, the UI may not have rendered yet. Always add `extendedWaitUntil` with `optional: true` before the conditional:

   ```yaml
   # WRONG — condition checked before screen renders, always skipped
   - launchApp: ...
   - runFlow:
       when:
         visible: 'Continue'
       commands: ...

   # RIGHT — wait for screen to render, then check
   - launchApp: ...
   - extendedWaitUntil:
       visible: 'Continue'
       timeout: 30000
       optional: true
   - runFlow:
       when:
         visible: 'Continue'
       commands: ...
   ```

2. **Use `runFlow` with `when` for conditional steps** — dev screens, modals, and banners may or may not appear. Use `when: visible:` to handle them gracefully (but remember rule 1 — wait first).

3. **Prefer text matching on iOS, IDs on Android** — iOS accessibility labels often override testIDs, making ID selectors unreliable. Text like `"Enter password"` and `"Unlock"` works on both platforms. Use IDs only when text matching is ambiguous (e.g., `id: "fast-refresh"`).

4. **Use `extendedWaitUntil` for timing** — never assume elements are immediately visible after navigation. Wait with a timeout.

5. **One action at a time when exploring** — use individual MCP tool calls (`tap_on`, `input_text`) when debugging. Use `run_flow` with full YAML when running a known sequence.

6. **Platform differences** — Android uses `back` button for navigation; iOS does not. Dev server host differs (`10.0.2.2` vs `localhost`). Always check platform from `list_devices` result.

7. **iOS merges list item text** — On iOS, elements like token rows ("Ethereum", "ETH", "$2,127,578.70") are combined into a single accessibility label. `tapOn: "Ethereum"` won't match. Use `tapOn: point: "50%,36%"` to tap the first item in a list, or use `inspect_view_hierarchy` to find the correct approach.

## Integration with test-infra-mcp

Every Maestro test follows this sequence:

```
# 1. Infrastructure (test-infra-mcp)
stop_all()
start_mock_server(routes: [...])                          # optional — only if mocking APIs
start_fixture_server(recipe: [...])                       # ALWAYS — default [] if user didn't specify
setup_android_port_forwarding()                           # Android only

# 2. Launch app
# Android:
adb shell pm clear io.metamask
adb shell am start -n io.metamask/.MainActivity --ei fixtureServerPort 12345
# iOS (via Maestro):
- clearKeychain
- launchApp: { appId: io.metamask.MetaMask, clearState: true, clearKeychain: true }

# 3. UI flow (maestro)
[dismiss dev screens if present]
  - Android dev server: http://10.0.2.2:8081
  - iOS dev server: http://localhost:8081
[unlock wallet with password 123123123]
[interact with app — the actual test]

# 4. Verify & cleanup (test-infra-mcp)
get_mock_hits("...")                                      # optional — verify API calls
stop_all()
```

The fixture server is **never optional** — it's what gives the app a wallet to unlock.
**Never uninstall the app** — only clear data or terminate + relaunch.
