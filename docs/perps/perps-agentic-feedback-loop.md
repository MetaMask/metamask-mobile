# Perps Agentic Toolkit

The agentic toolkit lets AI agents interact with a running MetaMask Mobile app via CDP (Chrome DevTools Protocol). Agents execute parameterized flows — JSON test sequences that navigate screens, press buttons, type values, and assert state — to verify their own code changes without human intervention.

The toolkit lives at `scripts/perps/agentic/`. It works on both iOS Simulator and Android Emulator.

---

## Architecture

```
Agent (Claude Code / Cursor / etc.)
  |
  v
validate-recipe.sh          # Orchestrates flow execution
  |
  +-- cdp-bridge.js         # CDP engine (WebSocket -> Metro -> Hermes)
  |     +-- lib/ws-client.js        # WebSocket connection
  |     +-- lib/target-discovery.js  # Find the right CDP target
  |     +-- lib/cdp-eval.js         # Eval sync/async via CDP
  |     +-- lib/config.js           # Port + env resolution
  |     +-- lib/assert.js           # Assertion operators
  |     +-- lib/registry.js         # Pre-condition registry
  |
  +-- teams/perps/
        +-- flows/           # 12 parameterized flow JSONs
        +-- evals/           # Hierarchical eval ref collections
        +-- evals.json       # Built-in eval refs
        +-- pre-conditions.js # Named pre-condition checks
```

---

## Quick Start

```bash
# 1. Check app + Metro + CDP are connected
yarn a:status

# 2. Run a built-in eval ref (single CDP eval)
bash scripts/perps/agentic/app-state.sh eval-ref perps/positions

# 3. Run a flow (multi-step UI sequence)
bash scripts/perps/agentic/validate-recipe.sh \
  scripts/perps/agentic/teams/perps/flows/market-discovery.json --skip-manual

# 4. Dry-run a flow (prints steps without executing)
bash scripts/perps/agentic/validate-recipe.sh \
  scripts/perps/agentic/teams/perps/flows/trade-open-market.json --dry-run

# 5. Run all flows (dry-run)
for f in scripts/perps/agentic/teams/perps/flows/*.json; do
  bash scripts/perps/agentic/validate-recipe.sh "$f" --dry-run --skip-manual
done
```

---

## Flows

A flow is a parameterized JSON file that `validate-recipe.sh` executes step-by-step against the live app. Each flow declares its parameters in an `inputs` block, its required app state in `pre_conditions`, and a sequence of `steps`.

### Parameter Templating

Flows use `{{param}}` tokens in titles, expressions, test_ids, and params. Defaults come from the `inputs` block:

```json
{
  "title": "Trade — market {{side}} {{symbol}} ${{usdAmount}}",
  "inputs": {
    "side": { "type": "string", "default": "long" },
    "symbol": { "type": "string", "default": "BTC" },
    "usdAmount": { "type": "string", "default": "10" }
  }
}
```

When run standalone, `inputs` defaults are applied. When called via `flow_ref`, the parent provides values that override defaults. Params without a default are required.

### Pre-Conditions

Pre-conditions gate flow execution. If any check fails, the runner aborts with a clear error and hint.

```json
"pre_conditions": [
  "wallet.unlocked",
  "perps.ready_to_trade",
  { "name": "perps.open_position", "symbol": "{{symbol}}" }
]
```

String form for simple checks, object form for parameterized checks. Shorthand `"perps.open_position(symbol={{symbol}})"` is also supported.

**Available pre-conditions** (from `teams/perps/pre-conditions.js`):

| Name                               | Description                                       |
| ---------------------------------- | ------------------------------------------------- |
| `wallet.unlocked`                  | Wallet is unlocked and navigable                  |
| `perps.feature_enabled`            | PerpsController is available                      |
| `perps.trading_flag`               | Perps trading remote flag is on                   |
| `perps.ready_to_trade`             | Provider is authenticated                         |
| `perps.sufficient_balance`         | Account has non-zero balance                      |
| `perps.open_position`              | Open position exists (optionally by symbol)       |
| `perps.open_position_tpsl`         | Position with TP/SL exists (optionally by symbol) |
| `perps.open_limit_order`           | Open limit order exists (optionally by symbol)    |
| `perps.not_in_watchlist`           | Symbol is not in watchlist                        |
| `ui.homepage_redesign_v1_enabled`  | Homepage redesign V1 flag is on                   |
| `ui.homepage_redesign_v1_disabled` | Homepage redesign V1 flag is off                  |

### Authoring Rules

Enforced by `node scripts/perps/agentic/validate-flow-schema.js`:

1. **Eval steps must assert.** Every `eval_sync`, `eval_async`, `eval_ref` step needs an `"assert"` block. Use `{"operator":"not_null"}` at minimum.
2. **Terminal step must assert.** The last step must be an asserting eval or a `log_watch`. Never end on `wait`, `navigate`, or `press`.
3. **No unknown actions.** Only recognized action types are allowed.
4. **Inputs must match params.** Every `{{param}}` in steps must have a matching key in `inputs`.

Full schema: `scripts/perps/agentic/schemas/flow.schema.json`

### Available Flows

| Flow                   | Inputs (defaults)                                                             | Pre-conditions                                                  |
| ---------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `activity-view`        | `tab` ("trades")                                                              | wallet.unlocked, perps.feature_enabled                          |
| `market-discovery`     | `symbol` ("BTC")                                                              | wallet.unlocked, perps.feature_enabled                          |
| `market-watchlist`     | `symbol` ("BTC")                                                              | wallet.unlocked, perps.feature_enabled, perps.not_in_watchlist  |
| `order-limit-cancel`   | `symbol` (required)                                                           | wallet.unlocked, perps.open_limit_order                         |
| `order-limit-place`    | `side` ("long"), `symbol` ("BTC"), `usdAmount` ("10"), `limitPrice` ("60000") | wallet.unlocked, perps.ready_to_trade                           |
| `position-add-margin`  | `symbol` (required), `marginAmount` (required)                                | wallet.unlocked, perps.open_position                            |
| `setup-account`        | `address` (required)                                                          | wallet.unlocked                                                 |
| `setup-testnet`        | _(none)_                                                                      | wallet.unlocked, perps.feature_enabled                          |
| `tpsl-create`          | `symbol` (required), `tpPreset` ("25"), `slPreset` ("-10")                    | wallet.unlocked, perps.open_position                            |
| `tpsl-edit`            | `symbol` (required), `tpPreset` ("50"), `slPreset` ("-25")                    | wallet.unlocked, perps.open_position_tpsl                       |
| `trade-close-position` | `symbol` (required)                                                           | wallet.unlocked, perps.open_position                            |
| `trade-open-market`    | `side` ("long"), `symbol` ("BTC"), `usdAmount` ("10")                         | wallet.unlocked, perps.ready_to_trade, perps.sufficient_balance |

---

## Eval Refs

Eval refs are named CDP eval expressions in `teams/perps/evals.json` and `teams/perps/evals/*.json`. Unlike flows (multi-step UI sequences), eval refs are single eval calls.

```bash
# List all eval refs
bash scripts/perps/agentic/app-state.sh eval-ref --list

# Run an eval ref
bash scripts/perps/agentic/app-state.sh eval-ref perps/positions
bash scripts/perps/agentic/app-state.sh eval-ref perps/core/watchlist
bash scripts/perps/agentic/app-state.sh eval-ref perps/setup/testnet-mode
```

**Built-in eval refs** (`perps/`): positions, auth, balances, markets, orders, state, providers, pre-trade, post-trade, place-order

**Extended eval refs** (`perps/core/`): pump-market, tpsl-orders, positions-by-symbol, leverage-config, watchlist

**Setup eval refs** (`perps/setup/`): testnet-mode, current-provider

### eval_ref in Flows

Use `eval_ref` inside a flow to run a built-in eval ref and assert on its result:

```json
{
  "id": "check-pos",
  "action": "eval_ref",
  "ref": "positions",
  "assert": { "operator": "length_gt", "field": "positions", "value": 0 }
}
```

---

## CDP Commands

All CDP commands go through `cdp-bridge.js` or `app-state.sh` wrappers:

```bash
CDP="node scripts/perps/agentic/cdp-bridge.js"
AS="bash scripts/perps/agentic/app-state.sh"

$CDP status                     # Route + account snapshot
$CDP get-route                  # Current route name
$CDP eval "<expression>"        # Sync JS eval (ES5 only)
$CDP eval-async "<expression>"  # Async eval (Promise, use .then())
$CDP eval-ref perps/positions    # Run a named eval ref
$CDP check-pre-conditions '<json>'  # Validate pre-conditions
$CDP press-test-id <testId>     # Press by testID
$CDP scroll-view --test-id <id> # Scroll a view
$CDP set-input <testId> "val"   # Type into input
```

**ES5 only.** No arrow functions, no `const`/`let`, no template literals, no top-level `await`.

```bash
# Good:
$CDP eval "var x = Engine.context.PerpsController.state; JSON.stringify(x)"
$CDP eval-async "Engine.context.PerpsController.getPositions().then(function(r){ return JSON.stringify(r) })"

# Bad:
$CDP eval "const x = () => Engine.context"       # arrow + const
$CDP eval-async "await Engine.context.getPos()"   # top-level await
```

---

## Shell Commands

| Command                                                                                      | Purpose                                                        |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `app-state.sh status\|route\|eval\|eval-async\|eval-ref\|accounts\|press\|scroll\|set-input` | State queries and UI interaction                               |
| `app-navigate.sh <Route> [params-json]`                                                      | Navigate + auto-screenshot. `--list` discovers all live routes |
| `screenshot.sh [label]`                                                                      | Cross-platform screenshot (iOS simctl / Android adb)           |
| `validate-recipe.sh <path> [--dry-run] [--skip-manual] [--step <id>]`                        | Execute a flow/recipe against the live app                     |
| `validate-flow-schema.js`                                                                    | Validate all flows against authoring rules                     |
| `validate-pre-conditions.js`                                                                 | Verify pre-condition expressions and assertions                |
| `start-metro.sh --platform ios\|android`                                                     | Start or attach to Metro                                       |
| `setup-wallet.sh`                                                                            | Seed wallet from `.agent/wallet-fixture.json`                  |

---

## Assertions

Every asserting step includes `"assert": { "operator": "<op>", "field": "<path>", "value": <expected> }`.

| Operator       | Passes when                                   |
| -------------- | --------------------------------------------- |
| `not_null`     | `actual != null`                              |
| `eq`           | `actual === expected`                         |
| `gt`           | `actual > expected` (number)                  |
| `length_eq`    | `actual.length === expected`                  |
| `length_gt`    | `actual.length > expected`                    |
| `contains`     | `actual.includes(expected)` (string or array) |
| `not_contains` | `!actual.includes(expected)`                  |

`field` is a dot-path into the result JSON (e.g. `"route"`, `"positions.0.symbol"`). Omit or set to `null` to assert on the entire result. Double-encoded JSON strings are automatically unwrapped.

---

## UI Interactions

The toolkit interacts with React components by `testID` — no coordinates needed. Under the hood, it walks the React fiber tree via `__REACT_DEVTOOLS_GLOBAL_HOOK__`.

```bash
bash app-state.sh press <testId>                         # tap a button
bash app-state.sh scroll --test-id <testId> --offset 300 # scroll down
bash app-state.sh set-input <testId> "0.5"               # type into input
```

In flows, use `press`, `scroll`, `set_input`, `type_keypad`, `clear_keypad`, and `wait_for` actions.

**Keypad pattern:** Always clear before typing — use `clear_keypad` (count: 8) before `type_keypad` to wipe any pre-filled value. Assert the displayed amount matches before submitting.

---

## Gherkin to Flow Translation

Gherkin maps naturally to flow JSON:

| Gherkin                     | Flow equivalent                                                   |
| --------------------------- | ----------------------------------------------------------------- |
| **Given** (preconditions)   | `pre_conditions` array                                            |
| **When** (user actions)     | `navigate`, `press`, `set_input`, `type_keypad`, `wait_for` steps |
| **Then** (expected outcome) | `eval_sync`/`eval_async` steps with `assert`                      |

**Example:**

```gherkin
Given the wallet is unlocked
  And BTC has an open position
When the user navigates to BTC market detail
  And presses the Close Position button
Then the close position screen is shown
```

```json
{
  "title": "Close BTC position",
  "inputs": {
    "symbol": { "type": "string", "description": "Market symbol" }
  },
  "validate": {
    "runtime": {
      "pre_conditions": [
        "wallet.unlocked",
        { "name": "perps.open_position", "symbol": "{{symbol}}" }
      ],
      "steps": [
        {
          "id": "nav",
          "action": "navigate",
          "target": "PerpsMarketDetails",
          "params": {
            "market": {
              "symbol": "{{symbol}}",
              "name": "{{symbol}}",
              "price": "0",
              "change24h": "0",
              "change24hPercent": "0",
              "volume": "0",
              "maxLeverage": "100"
            }
          }
        },
        {
          "id": "wait-market",
          "action": "wait_for",
          "route": "PerpsMarketDetails"
        },
        {
          "id": "press-close",
          "action": "press",
          "test_id": "perps-market-details-close-button"
        },
        {
          "id": "wait-close-screen",
          "action": "wait_for",
          "route": "PerpsClosePosition"
        }
      ]
    }
  }
}
```

---

## Recipes

Recipes compose multiple flows via `flow_ref` for integration-level validation. They live in `scripts/perps/agentic/teams/<team>/recipes/` and prove that end-to-end scenarios work across flow boundaries.

See `teams/perps/recipes/full-trade-lifecycle.json` for an example that chains: wallet home → mainnet → perps → testnet → clear position → open market → TP/SL (presets) → close — all via `flow_ref`.

```bash
# Run a recipe
bash scripts/perps/agentic/validate-recipe.sh \
  scripts/perps/agentic/teams/perps/recipes/full-trade-lifecycle.json

# Dry-run
bash scripts/perps/agentic/validate-recipe.sh \
  scripts/perps/agentic/teams/perps/recipes/full-trade-lifecycle.json --dry-run
```

---

## Error Recovery

| Symptom                  | Fix                                                                               |
| ------------------------ | --------------------------------------------------------------------------------- |
| Metro crash / no output  | `bash start-metro.sh --platform <p>`                                              |
| CDP "not connected"      | Check Metro running + device booted. Poll for `__AGENTIC__` (5-120s after unlock) |
| Hot reload resets app    | `app-navigate.sh WalletTabHome` then target screen                                |
| App crash / white screen | `bash preflight.sh --platform <p>`                                                |
| eval returns undefined   | Use `eval-async` with `.then(function(r){ return JSON.stringify(r) })`            |
| "SyntaxError" in eval    | ES5 violation — check for arrow functions, const/let, template literals           |
| Eval ref assertion fails | Check `eval-ref --list` for correct name; re-read the eval ref JSON               |
| adb reverse lost         | `adb reverse tcp:PORT tcp:PORT`                                                   |
| Route not found          | Check route name in the table below; cdp-bridge handles nested routing            |

---

## Routes and State Paths

### Perps Routes

| Route                   | Description                               | Params                                                                                                                         |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `PerpsMarketListView`   | Perps home (positions, orders, watchlist) |                                                                                                                                |
| `PerpsTrendingView`     | Market list (all markets)                 |                                                                                                                                |
| `PerpsMarketDetails`    | Market detail view                        | `{"market":{"symbol":"BTC","name":"BTC","price":"0","change24h":"0","change24hPercent":"0","volume":"0","maxLeverage":"100"}}` |
| `PerpsActivity`         | Activity history                          | `{"redirectToPerpsTransactions":true}`                                                                                         |
| `PerpsClosePosition`    | Close a position                          |                                                                                                                                |
| `PerpsTPSL`             | Take-profit / stop-loss                   |                                                                                                                                |
| `PerpsAdjustMargin`     | Adjust position margin                    |                                                                                                                                |
| `PerpsOrderDetailsView` | Order detail view                         |                                                                                                                                |
| `PerpsOrderBook`        | Order book depth                          |                                                                                                                                |
| `PerpsWithdraw`         | Withdraw funds                            |                                                                                                                                |
| `PerpsTutorial`         | Onboarding tutorial                       |                                                                                                                                |

Other useful routes: `WalletTabHome`, `SettingsView`, `DeveloperOptions`, `BrowserTabHome`.

### Engine Controller Paths

```bash
Engine.context.PerpsController.state              # Positions, orders, balances, config
Engine.context.NetworkController.state             # Network selection
Engine.context.AccountsController.state            # Accounts, selected account
Engine.context.RemoteFeatureFlagController.state   # Feature flags
Engine.context.PreferencesController.state         # User preferences
```

### Common PerpsController Methods

| Method                      | Returns                 | Description              |
| --------------------------- | ----------------------- | ------------------------ |
| `getPositions()`            | `Promise<Position[]>`   | Open positions           |
| `getAccountState()`         | `Promise<AccountState>` | Balances, margin         |
| `getMarketDataWithPrices()` | `Promise<Market[]>`     | Markets with live prices |
| `getOpenOrders()`           | `Promise<Order[]>`      | Active limit/stop orders |
| `getTradeConfiguration()`   | `Promise<TradeConfig>`  | Leverage limits, fees    |
| `placeOrder(params)`        | `Promise<OrderResult>`  | Submit an order          |
| `closePosition({symbol})`   | `Promise<CloseResult>`  | Close by symbol          |
