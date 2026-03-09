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
- The `Engine` singleton is exposed on `globalThis.Engine` for direct controller access (see Section 4: Engine & Controller Access)
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
scripts/perps/agentic/app-state.sh eval "<js-expression>"       # run JS in app context (sync)
scripts/perps/agentic/app-state.sh eval-async "<js-expression>" # run JS returning a Promise (async)
scripts/perps/agentic/app-state.sh nav                          # full navigation tree
scripts/perps/agentic/app-state.sh can-go-back                  # check if can go back
scripts/perps/agentic/app-state.sh go-back                      # navigate back
scripts/perps/agentic/app-state.sh accounts                     # list all accounts
scripts/perps/agentic/app-state.sh account                      # get selected account
scripts/perps/agentic/app-state.sh switch-account <addr>        # switch to account by address
scripts/perps/agentic/app-state.sh press <testId>               # press a component by testID
scripts/perps/agentic/app-state.sh scroll [--test-id <id>] [--offset <n>]  # scroll a ScrollView/FlatList
scripts/perps/agentic/app-state.sh unlock <password>            # unlock wallet via fiber tree
scripts/perps/agentic/app-state.sh sentry-debug [enable|disable] # patch Sentry to log to console
scripts/perps/agentic/app-state.sh recipe <team/name>           # run a recipe (e.g. perps/positions)
scripts/perps/agentic/app-state.sh recipe --list                # list all available recipes
scripts/perps/agentic/screenshot.sh [label]                     # take screenshot, returns path
scripts/perps/agentic/unlock-wallet.sh <password>               # unlock wallet (standalone script)
scripts/perps/agentic/interactive-start.sh [--port <port>]      # interactive session with keyboard shortcuts
scripts/perps/agentic/start-metro.sh                            # ensure Metro is running
scripts/perps/agentic/stop-metro.sh                             # stop Metro background process
scripts/perps/agentic/reload-metro.sh                           # trigger hot-reload on all connected apps
```

**yarn shortcuts** (human-friendly aliases):

```bash
yarn a:start      # start/attach Metro
yarn a:stop       # stop Metro
yarn a:status     # current route
yarn a:reload     # hot-reload all connected apps
yarn a:navigate   # navigate to a screen (pass route + optional params)
```

**Metro log**: `.agent/metro.log` — grep for errors after changes.

**Architecture**:

```
scripts/perps/agentic/
├── cdp-bridge.js          # CDP engine: WebSocket client, target discovery, eval, navigate
├── app-navigate.sh        # Navigate wrapper (calls cdp-bridge + auto-screenshot)
├── app-state.sh           # State/route/eval/accounts/recipe/press/scroll/unlock wrapper
├── screenshot.sh          # Cross-platform screenshot (iOS simctl / Android adb)
├── unlock-wallet.sh       # Standalone wallet unlock script
├── interactive-start.sh   # Interactive session with keyboard shortcuts
├── start-metro.sh         # Start Metro (or attach to existing)
├── stop-metro.sh          # Stop Metro background process
├── reload-metro.sh        # Trigger hot-reload on all connected apps
└── recipes/               # Per-team recipe files (see recipes/README.md)
    ├── perps.json          # Perps team recipes (positions, auth, balances, markets, trade-flow, etc.)
    └── README.md           # How to add recipes for your team
```

The `__AGENTIC__` bridge on `globalThis` exposes: `navigate()`, `getRoute()`, `getState()`, `canGoBack()`, `goBack()`, `listAccounts()`, `getSelectedAccount()`, `switchAccount()`, `pressTestId()`, `scrollView()`. These work identically on both platforms via Metro's Hermes CDP.

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

### Engine & Controller Access

In `__DEV__` mode, `NavigationService.ts` exposes the `Engine` singleton on `globalThis.Engine` (alongside `__AGENTIC__` and `store`). This gives CDP-based agents direct access to every controller registered on the Engine.

**Sync vs async evaluation:**

```bash
# Sync (non-promise) — use eval
scripts/perps/agentic/app-state.sh eval "Engine.context.PerpsController.state"

# Async (returns promise) — use eval-async
scripts/perps/agentic/app-state.sh eval-async \
  "Engine.context.PerpsController.getPositions().then(function(r) { return JSON.stringify(r); })"
```

> `eval-async` works by storing the promise result on a temporary `globalThis` key and polling until it resolves. The default timeout is 30 seconds. The `.then(function(r) { return JSON.stringify(r); })` pattern is needed for complex return values — CDP's `returnByValue` can only serialize primitives and plain objects.

**Useful PerpsController methods:**

| Method                      | Returns                     | Description                    |
| --------------------------- | --------------------------- | ------------------------------ |
| `getPositions()`            | `Promise<Position[]>`       | Open positions                 |
| `getAccountState()`         | `Promise<AccountState>`     | Balances, margin, withdrawable |
| `getMarketDataWithPrices()` | `Promise<Market[]>`         | All markets with live prices   |
| `validateOrder(params)`     | `Promise<ValidationResult>` | Pre-flight order check         |
| `placeOrder(params)`        | `Promise<OrderResult>`      | Submit an order                |
| `closePosition({symbol})`   | `Promise<CloseResult>`      | Close a position by symbol     |
| `getOpenOrders()`           | `Promise<Order[]>`          | Active limit/stop orders       |
| `getTradeConfiguration()`   | `Promise<TradeConfig>`      | Leverage limits, fee tiers     |

**Order params shape:**

```javascript
{
  symbol: 'BTC',           // market symbol
  isBuy: true,             // true = long, false = short
  orderType: 'market',     // 'market' | 'limit'
  size: '0.0001',          // position size in base asset
  leverage: 2,             // leverage multiplier
  usdAmount: '10',         // notional USD value
  priceAtCalculation: 65000, // current price (for slippage calc)
  maxSlippageBps: 500,     // max slippage in basis points
}
```

### Trade Flow Validation

The trade flow validation pattern uses three recipes in `recipes/perps.json` to capture pre/post state around an order. This replaces a shell script with composable `eval-async` calls that an agent can orchestrate directly.

**Recipes:**

| Recipe              | Description                                        |
| ------------------- | -------------------------------------------------- |
| `perps/pre-trade`   | Position count + balance snapshot before the trade |
| `perps/place-order` | **TEMPLATE** — market buy BTC $10 at 2x leverage   |
| `perps/post-trade`  | Same snapshot shape as pre-trade for comparison    |

**Orchestration pattern:**

```bash
# 1. Capture baseline
scripts/perps/agentic/app-state.sh recipe perps/pre-trade

# 2. Place order (template — edit the expression or use eval-async for custom params)
scripts/perps/agentic/app-state.sh recipe perps/place-order

# 3. Wait for WebSocket updates
sleep 5

# 4. Capture post-trade state
scripts/perps/agentic/app-state.sh recipe perps/post-trade
```

**Custom order via `eval-async`** (substitute your own params):

```bash
scripts/perps/agentic/app-state.sh eval-async \
  "Engine.context.PerpsController.placeOrder({symbol:'ETH',isBuy:false,orderType:'market',size:'0.01',leverage:3,usdAmount:'20',maxSlippageBps:500}).then(function(r){return JSON.stringify(r)})"
```

> **Important:** `perps/place-order` places a real order. It is labeled as a template/example. Always verify auth state (`perps/auth`) and balances (`perps/balances`) before running.

### Metro Log Debugging

Perps code uses a `[PERPS_DEBUG]` prefix convention for structured debug logs in Metro. These logs are written to `.agent/metro.log` and are invaluable for diagnosing WebSocket, state, and connection issues.

**Useful grep patterns:**

```bash
# All perps debug logs (recent)
grep PERPS_DEBUG .agent/metro.log | tail -30

# Position WS updates — confirms data flowing from Hyperliquid
grep 'PositionStreamChannel: WS callback' .agent/metro.log | tail -10

# Price stream initialization — confirms market data arriving
grep 'FIRST WS data' .agent/metro.log

# Connection state changes — ensureReady() and reconnection logic
grep 'ensureReady' .agent/metro.log | tail -20

# Order lifecycle — placement, fills, errors
grep 'PERPS_DEBUG.*order' .agent/metro.log | tail -20

# Cache invalidation — stale data clearing
grep 'PERPS_DEBUG.*cache' .agent/metro.log | tail -20
```

> When debugging WS issues, the key signal is whether `PositionStreamChannel: WS callback` appears after placing an order. If it doesn't, the WebSocket subscription may be stale — check `ensureReady` logs for connection state.

### Account Management

The `__AGENTIC__` bridge exposes account methods at the root level. These are available via `cdp-bridge.js` commands or `app-state.sh` wrappers.

```bash
# List all accounts (id, address, name)
scripts/perps/agentic/app-state.sh accounts

# Get the currently selected account
scripts/perps/agentic/app-state.sh account

# Switch to a different account by address
scripts/perps/agentic/app-state.sh switch-account 0x1234...abcd
```

Useful for auth scoping validation — switch accounts and verify that controller state (e.g. perps auth) updates correctly. Combine with `recipe perps/auth` to check auth state after switching.

### Wallet Unlock

Agents cannot interact with the lock screen via standard navigation. The unlock flow uses the React fiber tree to programmatically inject the password and press the login button.

```bash
# Via standalone script (accepts password as arg or MM_PASSWORD env var)
scripts/perps/agentic/unlock-wallet.sh myPassword123
MM_PASSWORD=myPassword123 scripts/perps/agentic/unlock-wallet.sh

# Via CDP bridge directly
node scripts/perps/agentic/cdp-bridge.js unlock myPassword123

# Via app-state shorthand
scripts/perps/agentic/app-state.sh unlock myPassword123
```

How it works:

1. Walks the React fiber tree via `__REACT_DEVTOOLS_GLOBAL_HOOK__` (dev mode only)
2. Finds `login-password-input` (testID), calls its `onChangeText` with the password
3. Finds `log-in-button` (testID), calls its `onPress` (deferred by 100ms for state update)
4. The standalone script then waits 4s and verifies the route changed

### UI Interaction (Press / Scroll by testID)

Press and scroll work by walking the React fiber tree in dev mode. These are exposed both on the `__AGENTIC__` bridge in the app and as CDP bridge commands.

```bash
# Press a button by testID
scripts/perps/agentic/app-state.sh press log-in-button
node scripts/perps/agentic/cdp-bridge.js press-test-id log-in-button
# -> { "ok": true, "testId": "log-in-button" }

# Scroll a ScrollView by testID
scripts/perps/agentic/app-state.sh scroll --test-id my-scroll-view --offset 500
node scripts/perps/agentic/cdp-bridge.js scroll-view --test-id my-scroll-view --offset 500
# -> { "ok": true, "testId": "my-scroll-view", "offset": 500, "animated": false }

# Scroll the first scrollable view (no testID filter)
scripts/perps/agentic/app-state.sh scroll --offset 300
```

Uses `__REACT_DEVTOOLS_GLOBAL_HOOK__` to walk the fiber tree. Works with ScrollView, FlatList, and any component that exposes `scrollTo` or `scrollToOffset` on its stateNode.

**Known testIDs (Login screen):**

| testID                 | Component | Prop           |
| ---------------------- | --------- | -------------- |
| `login-password-input` | TextField | `onChangeText` |
| `log-in-button`        | Button    | `onPress`      |
| `login`                | Container | -              |
| `reset-wallet-button`  | Link      | `onPress`      |

To discover testIDs in the codebase:

```bash
grep -r "testID=" app/components/ --include="*.tsx" | grep -oP "testID=['\"]([^'\"]+)" | sort -u
```

### Sentry Debug Mode

Patches `Sentry.captureException` and `Sentry.captureMessage` to also log to console with `[SENTRY-DEBUG]` prefix. Agents can monitor which errors would hit Sentry in real-time via Metro logs.

```bash
# Enable (patches Sentry)
scripts/perps/agentic/app-state.sh sentry-debug enable
# -> { "ok": true, "patched": true }

# Disable (restores original functions)
scripts/perps/agentic/app-state.sh sentry-debug disable
# -> { "ok": true, "unpatched": true }
```

After enabling, any `Sentry.captureException(err)` call will also produce:

```
WARN [SENTRY-DEBUG] captureException: Something went wrong
WARN [SENTRY-DEBUG] stack: Error: Something went wrong at ...
```

Grep for Sentry events in Metro logs:

```bash
grep SENTRY-DEBUG .agent/metro.log | tail -20
```

### Interactive Session

`interactive-start.sh` provides a keyboard-driven session that combines Metro log tailing with quick access to all agentic commands:

```bash
scripts/perps/agentic/interactive-start.sh [--port 8081]
```

| Key | Action                    |
| --- | ------------------------- |
| `r` | Reload JS bundle          |
| `s` | Take screenshot           |
| `u` | Unlock wallet             |
| `n` | Navigate to route         |
| `e` | Eval JS expression        |
| `p` | Press testID              |
| `t` | Status (route + account)  |
| `d` | Toggle Sentry debug mode  |
| `l` | Show last 50 lines of log |
| `c` | Clear screen              |
| `?` | Help                      |
| `q` | Quit (stops Metro)        |

### Recipes

Recipes are per-team JSON files in `scripts/perps/agentic/recipes/` that define reusable CDP expressions. This keeps domain-specific helpers in the scripts layer rather than the app source — any controller method accessible via `Engine.context` can be a recipe.

```bash
# Run a recipe
scripts/perps/agentic/app-state.sh recipe perps/positions
scripts/perps/agentic/app-state.sh recipe perps/auth
scripts/perps/agentic/app-state.sh recipe perps/markets

# List all available recipes
scripts/perps/agentic/app-state.sh recipe --list
```

**Adding recipes for your team:** Create `recipes/<team>.json` — see `recipes/README.md` for the format. Each recipe has a description, a JS expression, and an `async` flag.

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
| App stuck on lock screen     | `scripts/perps/agentic/unlock-wallet.sh <password>` or `app-state.sh unlock <password>`               |
| `{ ok: false }` on press     | Wrong testID or component not on current screen; use `grep testID= app/components/` to find valid IDs |
| `No React DevTools hook`     | Not in dev mode; React DevTools hook is only available in `__DEV__` builds                            |
| Sentry errors not visible    | Enable Sentry debug: `app-state.sh sentry-debug enable`, then grep `SENTRY-DEBUG` in logs             |

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
| `MM_PASSWORD`    | Wallet password for `unlock-wallet.sh`                     | `myPassword123`          |
| `WATCHER_PORT`   | Metro port (default `8081`)                                | `8082`                   |

Set these in `.js.env` or pass as env vars. The CDP bridge filters Metro's `/json/list` targets by `deviceName` when `IOS_SIMULATOR` or `ANDROID_DEVICE` is set, ensuring commands reach the correct app instance.
