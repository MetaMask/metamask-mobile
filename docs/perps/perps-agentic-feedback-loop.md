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
scripts/perps/agentic/app-state.sh status                       # route + selected account snapshot
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
scripts/perps/agentic/app-state.sh press <testId>               # press component by testID
scripts/perps/agentic/app-state.sh scroll [--test-id <id>] [--offset <n>]  # scroll a view
scripts/perps/agentic/app-state.sh sentry-debug [enable|disable] # patch Sentry to log to console
scripts/perps/agentic/app-state.sh unlock <password>            # unlock wallet via fiber tree
scripts/perps/agentic/app-state.sh recipe <team/name>           # run a recipe (e.g. perps/positions)
scripts/perps/agentic/app-state.sh recipe --list                # list all available recipes
scripts/perps/agentic/screenshot.sh [label]                     # take screenshot, returns path
scripts/perps/agentic/start-metro.sh                            # ensure Metro is running
scripts/perps/agentic/stop-metro.sh                             # stop Metro background process
scripts/perps/agentic/reload-metro.sh                           # trigger hot-reload on all connected apps
```

**yarn shortcuts** (human-friendly aliases):

```bash
yarn a:start            # start/attach Metro (no app launch)
yarn a:stop             # stop Metro
yarn a:status           # current route + account snapshot
yarn a:reload           # hot-reload all connected apps
yarn a:navigate         # navigate to a screen
yarn a:ios              # boot sim → Metro → launch app → wallet setup → CDP ready
yarn a:android          # boot device → Metro → launch app → wallet setup → CDP ready
yarn a:setup:ios        # clean build: yarn setup → build → install → Metro → wallet
yarn a:setup:android    # clean build: same for Android
```

**Fast relaunch** (skip wallet import, ~10-15s faster — `yarn` aliases coming soon):

```bash
scripts/perps/agentic/preflight.sh --platform ios      # boot sim → Metro → launch → CDP ready
scripts/perps/agentic/preflight.sh --platform android   # boot device → Metro → launch → CDP ready
```

> **Which command?** First time → `yarn a:setup:ios`. Daily restart → `preflight.sh --platform ios` (no wallet). Wallet corrupted → `yarn a:ios`.

**Metro log**: `.agent/metro.log` — grep for errors after changes.

**Architecture**:

```
scripts/perps/agentic/
├── cdp-bridge.js          # CDP engine: WebSocket client, target discovery, eval, navigate
├── app-navigate.sh        # Navigate wrapper (calls cdp-bridge + auto-screenshot)
├── app-state.sh           # State/route/eval/accounts/recipe wrapper (calls cdp-bridge)
├── screenshot.sh          # Cross-platform screenshot (iOS simctl / Android adb)
├── start-metro.sh         # Start Metro (or attach to existing)
├── stop-metro.sh          # Stop Metro background process
├── reload-metro.sh        # Trigger hot-reload on all connected apps
├── preflight.sh           # Full env setup: build → Metro → CDP → wallet seed
├── setup-wallet.sh        # Seed wallet from .agent/wallet-fixture.json via CDP
├── unlock-wallet.sh       # Unlock wallet on lock screen
├── interactive-start.sh   # Interactive guided setup
├── validate-recipe.sh     # Run a recipe folder against the live app (supports flow_ref)
├── validate-myx.sh        # MYX-specific validation
├── recipes/               # Per-team CDP expression recipes (see recipes/README.md)
│   ├── perps.json          # Core perps recipes (positions, auth, balances, markets, etc.)
│   ├── perps/
│   │   └── core.json       # Extended perps recipes (pump-market, tpsl-orders, watchlist, etc.)
│   └── README.md
└── flows/                 # Multi-step UI workflow files (see flows/README.md)
    ├── market-discovery.json
    ├── market-watchlist.json
    ├── trade-open-market.json
    ├── trade-close-position.json
    ├── tpsl-create.json
    ├── tpsl-edit.json
    ├── position-add-margin.json
    ├── order-limit-place.json
    ├── order-limit-cancel.json
    ├── activity-view.json
    └── README.md
```

The `__AGENTIC__` bridge on `globalThis` exposes: `navigate()`, `getRoute()`, `getState()`, `canGoBack()`, `goBack()`, `listAccounts()`, `getSelectedAccount()`, `switchAccount()`. These work identically on both platforms via Metro's Hermes CDP.

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

### Recipes

Recipes are per-team JSON files in `scripts/perps/agentic/recipes/` that define reusable CDP expressions. This keeps domain-specific helpers in the scripts layer rather than the app source — any controller method accessible via `Engine.context` can be a recipe.

```bash
# Run a recipe (flat: recipes/perps.json)
scripts/perps/agentic/app-state.sh recipe perps/positions
scripts/perps/agentic/app-state.sh recipe perps/auth
scripts/perps/agentic/app-state.sh recipe perps/markets

# Run a recipe (hierarchical: recipes/perps/core.json)
scripts/perps/agentic/app-state.sh recipe perps/core/watchlist
scripts/perps/agentic/app-state.sh recipe perps/core/tpsl-orders
scripts/perps/agentic/app-state.sh recipe perps/core/pump-market

# List all available recipes (includes subdirectory files)
scripts/perps/agentic/app-state.sh recipe --list
```

**Hierarchical recipe files:** Create `recipes/<team>/<subfile>.json` for extended collections. Reference as `<team>/<subfile>/<name>` (3-part path). The top-level `recipes/<team>.json` stays for backward compat.

**Available `perps/core` recipes:**

| Recipe                           | Description                                |
| -------------------------------- | ------------------------------------------ |
| `perps/core/pump-market`         | PUMP market data with live price           |
| `perps/core/tpsl-orders`         | Open TP/SL trigger orders                  |
| `perps/core/positions-by-symbol` | Find position by symbol (template)         |
| `perps/core/leverage-config`     | Trade configurations from controller state |
| `perps/core/watchlist`           | Watchlist markets from controller state    |

### Flows

Flows are multi-step UI workflows in `scripts/perps/agentic/flows/` that combine navigation, press, input, and assertion steps. Unlike recipe expressions (single CDP eval), flows walk the user through a complete screen sequence.

**Run a flow directly:**

```bash
bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/flows/tpsl-create.json --skip-manual
bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/flows/market-discovery.json --skip-manual
```

**Embed a flow in a task recipe using `flow_ref`:**

```json
{
  "id": "check_tpsl",
  "action": "flow_ref",
  "ref": "tpsl-create",
  "params": {
    "symbol": "PUMP",
    "takeProfitPrice": "0.001500",
    "stopLossPrice": "0.001000"
  }
}
```

`validate-recipe.sh` loads `flows/tpsl-create.json`, substitutes `{{takeProfitPrice}}` → `0.001500` etc., then runs the sub-steps inline. If any sub-step fails, the parent recipe fails immediately.

**Available flows:**

| Flow                   | Params                                       | Description                                              |
| ---------------------- | -------------------------------------------- | -------------------------------------------------------- |
| `market-discovery`     | `symbol`                                     | Navigate to market list, find symbol, verify price loads |
| `market-watchlist`     | `symbol`                                     | Toggle symbol on/off watchlist, assert state changes     |
| `trade-open-market`    | `symbol`, `side`, `usdAmount`, `leverage`    | Fill market order form (does NOT submit)                 |
| `trade-close-position` | `symbol`                                     | Navigate to close position form, assert summary shown    |
| `tpsl-create`          | `symbol`, `takeProfitPrice`, `stopLossPrice` | Set TP/SL inputs, assert accepted                        |
| `tpsl-edit`            | `symbol`, `newTakeProfitPrice`               | Open existing TP/SL, update TP value                     |
| `position-add-margin`  | `symbol`, `marginAmount`                     | Open add-margin form, enter amount                       |
| `order-limit-place`    | `symbol`, `side`, `usdAmount`, `limitPrice`  | Fill limit order form, assert values                     |
| `order-limit-cancel`   | `symbol`                                     | Cancel first open limit order, assert removed            |
| `activity-view`        | _(none)_                                     | Navigate to activity, assert trades list loads           |

**Example: TAT-2403 style recipe using flow_ref:**

```json
{
  "title": "Verify TP/SL updates correctly — TAT-2403",
  "pr": "12345",
  "validate": {
    "runtime": {
      "pre_conditions": ["Wallet unlocked", "Open position for PUMP"],
      "steps": [
        {
          "id": "verify-tpsl-create",
          "action": "flow_ref",
          "ref": "tpsl-create",
          "params": {
            "symbol": "PUMP",
            "takeProfitPrice": "0.001500",
            "stopLossPrice": "0.001000"
          }
        },
        {
          "id": "assert-orders-created",
          "action": "recipe_ref",
          "ref": "perps/core/tpsl-orders",
          "assert": { "operator": "length_gt", "field": null, "value": 0 }
        }
      ]
    }
  }
}
```

**Adding recipes for your team:** Create `recipes/<team>.json` (flat) or `recipes/<team>/<subfile>.json` (hierarchical) — see `recipes/README.md`. **Adding flows:** Create `flows/<name>.json` using the full recipe JSON schema with `{{param}}` placeholders — see `flows/README.md`.

### Pre-conditions & Setup

Recipes can declare required app state in a top-level `initial_conditions` block. `validate-recipe.sh` reads this block and applies the state before running any steps — no manual setup needed between sessions.

**`initial_conditions` fields:**

| Field      | Type      | Description                                                                    |
| ---------- | --------- | ------------------------------------------------------------------------------ |
| `account`  | `string`  | Ethereum address to switch to before the recipe runs                           |
| `testnet`  | `boolean` | Set testnet mode (`true`/`false`). No-op if already in the desired state       |
| `provider` | `string`  | Active provider to switch to. Valid values: `hyperliquid`, `myx`, `aggregated` |

**Example recipe with `initial_conditions`:**

```json
{
  "title": "Verify position flow on testnet",
  "initial_conditions": {
    "testnet": true,
    "provider": "hyperliquid",
    "account": "0xabc123..."
  },
  "validate": {
    "runtime": {
      "steps": [...]
    }
  }
}
```

**CLI overrides** (useful for ad-hoc runs without editing the recipe):

```bash
# Force testnet mode
bash scripts/perps/agentic/validate-recipe.sh flows/my-flow.json --testnet

# Switch to a specific account
bash scripts/perps/agentic/validate-recipe.sh flows/my-flow.json --account 0xabc123...

# Combine
bash scripts/perps/agentic/validate-recipe.sh flows/my-flow.json --testnet --account 0xabc123...
```

**Setup step actions** (use inside `steps[]` for in-flow state changes):

| Action            | Key param                        | Description                                                 |
| ----------------- | -------------------------------- | ----------------------------------------------------------- |
| `select_account`  | `address`                        | Switch to account by Ethereum address                       |
| `toggle_testnet`  | `enabled` (bool, default `true`) | Enable or disable testnet mode; no-op if already correct    |
| `switch_provider` | `provider`                       | Switch active provider (`hyperliquid`, `myx`, `aggregated`) |

**Setup flows** (`flows/setup-*.json`) wrap these actions for reuse via `flow_ref`:

```json
{ "id": "go-testnet", "action": "flow_ref", "ref": "setup-testnet" }
{ "id": "switch-acct", "action": "flow_ref", "ref": "setup-account", "params": { "address": "0xabc..." } }
```

**Setup recipes** (`recipes/perps/setup.json`) provide quick state reads:

```bash
# Check current testnet mode
scripts/perps/agentic/app-state.sh recipe perps/setup/testnet-mode

# Check active provider
scripts/perps/agentic/app-state.sh recipe perps/setup/current-provider
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

| Route                           | Description                                              | Params                                                                                                                         |
| ------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `PerpsMarketListView`           | Perps home (positions, orders, watchlist)                |                                                                                                                                |
| `PerpsTrendingView`             | Market list (all markets, full view)                     |                                                                                                                                |
| `PerpsMarketDetails`            | Market detail view                                       | `{"market":{"symbol":"BTC","name":"BTC","price":"0","change24h":"0","change24hPercent":"0","volume":"0","maxLeverage":"100"}}` |
| `PerpsTradingView`              | Redirect: navigates to wallet home and selects perps tab |                                                                                                                                |
| `PerpsPositions`                | Open positions                                           |                                                                                                                                |
| `PerpsActivity`                 | Activity history                                         |                                                                                                                                |
| `PerpsWithdraw`                 | Withdraw funds                                           |                                                                                                                                |
| `PerpsTutorial`                 | Onboarding tutorial                                      |                                                                                                                                |
| `PerpsClosePosition`            | Close a position                                         |                                                                                                                                |
| `PerpsTPSL`                     | Take-profit / stop-loss                                  |                                                                                                                                |
| `PerpsAdjustMargin`             | Adjust position margin                                   |                                                                                                                                |
| `PerpsSelectModifyAction`       | Select modify action sheet                               |                                                                                                                                |
| `PerpsSelectAdjustMarginAction` | Select adjust margin action                              |                                                                                                                                |
| `PerpsSelectOrderType`          | Select order type                                        |                                                                                                                                |
| `PerpsOrderDetailsView`         | Order detail view                                        |                                                                                                                                |
| `PerpsOrderBook`                | Full order book depth view                               |                                                                                                                                |
| `PerpsPnlHeroCard`              | PnL hero card                                            |                                                                                                                                |
| `PerpsHIP3Debug`                | HIP3 debug view                                          |                                                                                                                                |

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
