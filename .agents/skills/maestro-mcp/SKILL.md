---
name: maestro-mcp
description: Use when running UI tests or interacting with MetaMask Mobile via Maestro MCP — tapping elements, inputting text, navigating flows, taking screenshots, or running YAML test flows on iOS simulators or Android emulators. Use when the user says "use maestro", "tap on", "run a flow", "take a screenshot", or wants to automate the app UI without Detox.
---

# Maestro MCP — MetaMask Mobile

> Drive MetaMask Mobile UI via Maestro MCP tools. Works with iOS simulators and Android emulators.

## Before Any Interaction

### 1. Always check for a connected device first

Call `list_devices` to find a connected device. If none is connected, call `start_device` with the target platform, or ask the user to start one.

### 2. Always inspect before acting

Call `inspect_view_hierarchy` before tapping or interacting. **Never guess** element IDs or text — the hierarchy tells you exactly what's on screen.

### 3. Dev build screens (CRITICAL)

Local/dev builds show extra screens on launch that must be dismissed before the app is usable. **Check for their presence** before attempting to dismiss — they don't appear on release builds.

#### Dev Server Selection Screen

On first launch of a dev build, a "Development servers" screen appears asking which metro bundler to connect to.

- **iOS**: The server URL is `http://localhost:<PORT>` (default PORT: 8081)
- **Android**: The server URL is `http://10.0.2.2:<PORT>` (default PORT: 8081)

**How to handle:**

```yaml
# Check if dev server screen is present, then tap the correct server
- runFlow:
    when:
      visible: 'Development servers'
    commands:
      - tapOn: 'http://10.0.2.2:8081' # Android
      # - tapOn: "http://localhost:8081"  # iOS
```

Or via MCP tools: inspect hierarchy, check for "Development servers" text, then `tap_on` the matching server URL.

#### Developer Menu Onboarding

After selecting a server, a "Developer Menu" onboarding screen may appear with a "Continue" button, followed by the dev menu options list.

**How to handle:**

```yaml
- runFlow:
    when:
      visible: 'Continue'
    commands:
      - tapOn: 'Continue'
      # Dev menu options list appears — dismiss by tapping Fast Refresh toggle
      - tapOn:
          id: 'fast-refresh'
```

#### Combined dismiss flow (copy-paste ready)

```yaml
# Dismiss dev server selection (Android)
- runFlow:
    when:
      visible: 'Development servers'
    commands:
      - tapOn: 'http://10.0.2.2:8081'

# Dismiss dev menu onboarding
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
```

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

1. **Start a fixture server** via `test-infra-mcp` (if not already running). If the user didn't specify a fixture, use the default: `start_fixture_server(recipe: [])`. The app MUST have a fixture server to load state from — without it, a clean launch goes to onboarding with no wallet.
2. **Set up port forwarding** — `setup_android_port_forwarding()` for Android or `get_ios_launch_args()` for iOS.
3. **Clear app data and launch with fixture port** — on Android use `adb`:
   ```bash
   adb shell pm clear <appId>
   adb shell am start -n <appId>/.MainActivity --ei fixtureServerPort 12345
   ```
   This ensures deterministic state: app data is wiped, then the app loads fresh state from the fixture server.

### Wallet password

The password to unlock MetaMask is always **`123123123`**. Never ask the user for it.

## Common Flows

### Unlock wallet

```yaml
- extendedWaitUntil:
    visible:
      id: 'login-password-input'
    timeout: 20000
- tapOn:
    id: 'login-password-input'
- inputText: '123123123'
- tapOn:
    id: 'log-in-button'
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
    visible:
      id: 'login-password-input'
    timeout: 20000

- tapOn:
    id: 'login-password-input'
- inputText: '123123123'
- tapOn:
    id: 'log-in-button'
```

## Best Practices

1. **Inspect before acting** — always call `inspect_view_hierarchy` to see what's on screen. Element IDs and text change between versions.

2. **Use `runFlow` with `when` for conditional steps** — dev screens, modals, and banners may or may not appear. Use `when: visible:` to handle them gracefully.

3. **Use element IDs over text when available** — IDs like `login-password-input` are stable; display text may change with localization.

4. **Use `extendedWaitUntil` for timing** — never assume elements are immediately visible after navigation. Wait with a timeout.

5. **One action at a time when exploring** — use individual MCP tool calls (`tap_on`, `input_text`) when debugging. Use `run_flow` with full YAML when running a known sequence.

6. **Platform differences** — Android uses `back` button for navigation; iOS does not. Dev server host differs (`10.0.2.2` vs `localhost`). Always check platform from `list_devices` result.

## Integration with test-infra-mcp

Every Maestro test follows this sequence:

```
# 1. Infrastructure (test-infra-mcp)
stop_all()
start_mock_server(routes: [...])                          # optional — only if mocking APIs
start_fixture_server(recipe: [...])                       # ALWAYS — default [] if user didn't specify
setup_android_port_forwarding()                           # Android
  OR get_ios_launch_args()                                # iOS

# 2. Launch app (adb — Android)
adb shell pm clear io.metamask
adb shell am start -n io.metamask/.MainActivity --ei fixtureServerPort 12345

# 3. UI flow (maestro)
[dismiss dev screens if present]
[unlock wallet with password 123123123]
[interact with app — the actual test]

# 4. Verify & cleanup (test-infra-mcp)
get_mock_hits("...")                                      # optional — verify API calls
stop_all()
```

The fixture server is **never optional** — it's what gives the app a wallet to unlock.
