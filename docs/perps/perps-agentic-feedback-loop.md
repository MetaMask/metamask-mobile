# Perps Agentic Feedback Loop

> **Status: WIP** — This document is under active development. The toolkit scripts and workflow are functional but the guide may evolve as we validate across more feature areas and gather feedback from the team.
>
> **Location note:** The agentic toolkit currently lives under `scripts/perps/agentic/` while being validated as part of the perps workflow. Once the pattern is proven and adopted by other feature teams, the intent is to promote it to `scripts/agentic/` as general-purpose infrastructure.

<!--
  ## What is this document?

  This is a reference guide for AI coding agents (Claude Code, Cursor, Copilot, etc.)
  working on the MetaMask Mobile perps feature. It teaches agents how to build a
  closed-loop feedback cycle: make a code change → verify it in the running app →
  iterate until correct.

  ## Who is this for?

  - **AI agents** — this doc is designed to be consumed as context by LLM-based
    coding tools. It uses structured sections, tables, and copy-pasteable commands
    so agents can follow the workflow autonomously.
  - **Developers** — useful as a quick reference for the agentic toolkit scripts
    and how they interact with the app via CDP (Chrome DevTools Protocol).

  ## How to use this with your AI agent

  Point your agent at this file as context. For example:
  - **Claude Code**: The doc is auto-discovered via the `docs/` directory.
  - **Cursor / Copilot**: Add this file to your project context or reference it
    in your prompt (e.g., "follow the workflow in docs/perps/perps-agentic-feedback-loop.md").
  - **Custom agents**: Include the file contents in your system prompt or tool context.

  The toolkit scripts in `scripts/perps/agentic/` are platform-agnostic and work on both
  iOS Simulator and Android Emulator/device. They communicate with the running app
  through Metro's Hermes CDP WebSocket — no native bridge or test framework required.

  ## Sharing with the org

  This document and the `scripts/perps/agentic/` toolkit are designed to be portable.
  To adopt this pattern in another feature area:
  1. Copy `scripts/perps/agentic/` into the target repo (the CDP bridge is generic).
  2. Ensure `NavigationService.ts` installs the `__AGENTIC__` bridge in `__DEV__` mode.
  3. Adapt the route table and state paths in this doc to the new feature's screens.
  4. Share this doc as the onboarding reference for agents working on that feature.
-->

How AI agents use the agentic toolkit to verify their own code changes against a running MetaMask Mobile app.

## Prerequisites

- App running on **iOS Simulator** or **Android Emulator/device**
- Metro bundler active (`scripts/perps/agentic/start-metro.sh`)
- The `__AGENTIC__` bridge is auto-installed on `globalThis` by `app/core/NavigationService/NavigationService.ts` in `__DEV__` mode
- The Redux store is exposed on `globalThis.store` for state queries (set up alongside `__AGENTIC__` in dev mode)
- **iOS**: Xcode command-line tools (`xcrun simctl`)
- **Android**: Android SDK with `adb` on PATH

---

## 1. Environment Setup

### Start Metro

```bash
scripts/perps/agentic/start-metro.sh
```

Reuses an existing Metro process or starts a new one. Logs go to `.agent/metro.log`. Port is controlled by `WATCHER_PORT` in `.js.env` (default `8081`).

### Verify the app is reachable

```bash
scripts/perps/agentic/app-state.sh route
```

Should return the current route name. If it fails, check: device booted (`xcrun simctl list devices booted` / `adb devices`), Metro running (`lsof -i :${WATCHER_PORT:-8081}`), app installed (take a screenshot).

### Android-specific setup

Android devices need extra steps to reach Metro:

```bash
# 1. Port-forward so the device can reach Metro on localhost
adb -s <serial> reverse tcp:${WATCHER_PORT:-8081} tcp:${WATCHER_PORT:-8081}

# 2. Launch the app
adb -s <serial> shell am start -n io.metamask/.MainActivity

# 3. If the Expo dev launcher appears, tap the localhost:${WATCHER_PORT:-8081} entry
adb -s <serial> shell input tap 540 600

# 4. Wait ~15s for JS bundle, then verify CDP targets
curl -s http://localhost:${WATCHER_PORT:-8081}/json/list | python3 -c \
  "import json,sys; [print(t['deviceName'],t['title']) for t in json.load(sys.stdin)]"
```

The installed APK must be a debug build connected to Metro for CDP to work.

---

## 2. Toolkit Reference

All tools work on **both iOS and Android**. Platform is auto-detected (see Section 7 for overrides).

```
scripts/perps/agentic/app-navigate.sh <Route> [params-json]   # navigate + auto-screenshot
scripts/perps/agentic/app-state.sh route                        # current route + params
scripts/perps/agentic/app-state.sh state <dot.path>            # Redux state at path
scripts/perps/agentic/app-state.sh eval "<js-expression>"       # run JS in app context
scripts/perps/agentic/app-state.sh nav                          # full navigation tree
scripts/perps/agentic/app-state.sh can-go-back                  # check if can go back
scripts/perps/agentic/app-state.sh go-back                      # navigate back
scripts/perps/agentic/screenshot.sh [label]                     # take screenshot, returns path
scripts/perps/agentic/start-metro.sh                            # ensure Metro is running
scripts/perps/agentic/stop-metro.sh                             # stop Metro background process
scripts/perps/agentic/reload-metro.sh                            # trigger hot-reload on all connected apps
```

**Metro log**: `.agent/metro.log` — grep for errors after changes.

**Architecture**:

```
scripts/perps/agentic/
├── cdp-bridge.js       # CDP engine: WebSocket client, target discovery, eval, navigate
├── app-navigate.sh     # Navigate wrapper (calls cdp-bridge + auto-screenshot)
├── app-state.sh        # State/route/eval wrapper (calls cdp-bridge)
├── screenshot.sh       # Cross-platform screenshot (iOS simctl / Android adb)
├── start-metro.sh      # Start Metro (or attach to existing)
├── stop-metro.sh       # Stop Metro background process
└── reload-metro.sh     # Trigger hot-reload on all connected apps
```

The `__AGENTIC__` bridge on `globalThis` exposes: `navigate()`, `getRoute()`, `getState()`, `canGoBack()`, `goBack()`. These work identically on both platforms via Metro's Hermes CDP.

> **Platform targeting**: CDP-based commands (navigate, state, eval, go-back) are platform-agnostic — they go through Metro's WebSocket and reach whichever app is connected. Screenshots require direct device access (`xcrun simctl` or `adb`), so `screenshot.sh` auto-detects the platform. When both iOS and Android devices are connected, set `PLATFORM=android` or `PLATFORM=ios` to disambiguate. Since `app-navigate.sh` takes a verification screenshot, pass `PLATFORM` when needed:
>
> ```bash
> PLATFORM=android scripts/perps/agentic/app-navigate.sh PerpsMarketListView
> ```

---

## 3. Feedback Loop

After code changes, Metro hot-reloads automatically. Then:

1. **Recover navigation** — hot-reload may reset to home:
   ```bash
   scripts/perps/agentic/app-navigate.sh WalletTabHome
   scripts/perps/agentic/app-navigate.sh <TargetScreen> '<params>'
   ```
2. **Verify route**: `scripts/perps/agentic/app-state.sh route`
3. **Inspect state**: `scripts/perps/agentic/app-state.sh state engine.backgroundState.PerpsController`
4. **Screenshot**: `scripts/perps/agentic/screenshot.sh after-fix`
5. **Check Metro logs**: `grep -iE 'ERROR|error' .agent/metro.log | tail -20`
6. **Iterate** — if something is wrong, fix code, wait for hot-reload, repeat 1-5.

---

## 4. Advanced Patterns

**Console.log to Metro** — logs appear in `.agent/metro.log`:

```bash
scripts/perps/agentic/app-state.sh eval "console.log('AGENTIC: checkpoint reached'); 'logged'"
```

**Custom `__DEV__` helpers** — for interactions beyond navigation/Redux:

```javascript
if (__DEV__) {
  globalThis.__AGENTIC_CUSTOM__ = {
    triggerTrade: () => {
      /* call internal handlers */
    },
    setAmount: (val) => {
      /* set input state */
    },
  };
}
```

Then: `scripts/perps/agentic/app-state.sh eval "globalThis.__AGENTIC_CUSTOM__?.triggerTrade()"`

**Chaining nav + verify**:

```bash
scripts/perps/agentic/app-navigate.sh PerpsMarketDetails '{"market":{"symbol":"BTC","name":"BTC","price":"0","change24h":"0","change24hPercent":"0","volume":"0","maxLeverage":"100"}}'
scripts/perps/agentic/app-state.sh route
```

---

## 5. State Paths & Routes

### Common perps state paths

| Path                                                                | Contents                    |
| ------------------------------------------------------------------- | --------------------------- |
| `engine.backgroundState.PerpsController`                            | Positions, orders, balances |
| `engine.backgroundState.RemoteFeatureFlagController`                | Feature flags               |
| `engine.backgroundState.NetworkController.selectedNetworkClientId`  | Active network              |
| `engine.backgroundState.AccountTrackerController.accountsByChainId` | Account balances by chain   |

### Perps routes

All routes are in `app/constants/navigation/Routes.ts`. Nested routes are handled automatically by `cdp-bridge.js`.

> Perps routes are nested under the `Perps` parent navigator. The mapping is defined in `cdp-bridge.js` (`NESTED_ROUTE_PARENTS`). When adding new Perps routes, add them to this map.

> **Note**: Route strings don't always match component names. `PerpsMarketListView` is the **home** screen route (renders PerpsHomeView). The actual market list component is at route `PerpsTrendingView`.

| Route                 | Description                                              | Params                                                                                                                         |
| --------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `PerpsMarketListView` | Perps home (positions, orders, watchlist)                |                                                                                                                                |
| `PerpsTrendingView`   | Market list (all markets, full view)                     |                                                                                                                                |
| `PerpsMarketDetails`  | Market detail view                                       | `{"market":{"symbol":"BTC","name":"BTC","price":"0","change24h":"0","change24hPercent":"0","volume":"0","maxLeverage":"100"}}` |
| `PerpsTradingView`    | Redirect: navigates to wallet home and selects perps tab |                                                                                                                                |
| `PerpsPositions`      | Open positions                                           |                                                                                                                                |
| `PerpsActivity`       | Activity history                                         |                                                                                                                                |

All perps route constants are in `app/constants/navigation/Routes.ts` under `Routes.PERPS`. For the full list of navigable routes, check `NESTED_ROUTE_PARENTS` in `cdp-bridge.js`.

Other useful routes: `WalletTabHome`, `SettingsView`, `DeveloperOptions`, `BrowserTabHome`.

---

## 6. Error Recovery

| Problem                      | Solution                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| Metro crash / stale PID      | `scripts/perps/agentic/stop-metro.sh` then `scripts/perps/agentic/start-metro.sh`                     |
| CDP connection failure       | Check Metro running + device booted (iOS: `xcrun simctl list devices booted`, Android: `adb devices`) |
| Hot-reload resets app        | `app-navigate.sh WalletTabHome` then target screen                                                    |
| App crash                    | Rebuild: `yarn start:ios` or `yarn start:android`, then navigate                                      |
| Device not running (iOS)     | `xcrun simctl boot <UDID>`                                                                            |
| Device not running (Android) | Start emulator from Android Studio or `emulator -avd <AVD_NAME>`                                      |
| adb issues                   | Ensure `platform-tools` on PATH; try `adb kill-server && adb start-server`                            |
| Route not found              | Check route name in Section 5; `cdp-bridge.js` handles nested routing automatically                   |

---

## 7. Multi-Device Support

### Platform override

```bash
PLATFORM=android scripts/perps/agentic/screenshot.sh my-label
PLATFORM=ios scripts/perps/agentic/screenshot.sh my-label
```

Without `PLATFORM`, auto-detection priority: booted iOS simulator → connected Android device → default iOS.

> `PLATFORM` only affects `screenshot.sh` (and `app-navigate.sh`'s verification screenshot). CDP-based commands (`app-state.sh`, `cdp-bridge.js`, `reload-metro.sh`) are platform-agnostic and ignore `PLATFORM`.

### Targeting specific devices

| Env var          | Purpose                                                    | Example                  |
| ---------------- | ---------------------------------------------------------- | ------------------------ |
| `PLATFORM`       | Force platform for screenshot + navigate (screenshot step) | `android`, `ios`         |
| `IOS_SIMULATOR`  | CDP target filtering by simulator name                     | `iPhone16Pro-Alpha`      |
| `ANDROID_DEVICE` | CDP target filtering by device name                        | `Pixel 6a - 16 - API 36` |
| `ADB_SERIAL`     | adb serial for Android screenshots                         | `emulator-5554`          |
| `WATCHER_PORT`   | Metro port (default `8081`)                                | `8082`                   |

Set these in `.js.env` or pass as env vars. The CDP bridge filters Metro's `/json/list` targets by `deviceName` when `IOS_SIMULATOR` or `ANDROID_DEVICE` is set, ensuring commands reach the correct app instance.
