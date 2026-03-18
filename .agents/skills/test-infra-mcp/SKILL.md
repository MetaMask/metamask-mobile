---
name: test-infra-mcp
description: Use when spinning up test infrastructure outside of Detox withFixtures — mock servers, fixture servers, dapp servers, local blockchain nodes, or WebSocket servers. Use when running ad-hoc tests, Maestro tests, ralph-loop experiments, or any scenario that needs API mocking, app state, or a local Ethereum node without a Detox spec file.
---

# Test Infrastructure MCP Server

> Standalone test infrastructure management via MCP tools. Decoupled from Detox — works with Maestro, ralph-loop, manual QA, or any test runner.

## When to Use

- Spinning up a MockServer, FixtureServer, or local Anvil node **outside** of a Detox spec
- Running ad-hoc test flows in a ralph-loop (no spec file needed)
- Writing Maestro YAML tests that need backend mocking
- Manual QA that needs deterministic API responses or app state
- Any test scenario where you manage infrastructure separately from the test runner

**When NOT to use:** Writing a standard Detox E2E spec — use `withFixtures` via the `e2e-test` skill instead.

## Quick Reference

| Tool                                                          | Purpose                                                      | Default Port |
| ------------------------------------------------------------- | ------------------------------------------------------------ | ------------ |
| `start_mock_server`                                           | Proxy mock — matches real API URLs via `/proxy?url=` pattern | 8000         |
| `start_fixture_server`                                        | Serves app state at `/state.json`                            | 12345        |
| `start_dapp_server`                                           | Static file server for test dapps                            | 8085         |
| `start_websocket_server`                                      | WebSocket server for push notifications                      | 8089         |
| `start_local_node`                                            | Anvil Ethereum node                                          | 8545         |
| `stop_resource` / `stop_all`                                  | Cleanup                                                      | —            |
| `add_mock_route`                                              | Add route to running mock server                             | —            |
| `load_fixture`                                                | Load/replace state on running fixture server                 | —            |
| `send_ws_message`                                             | Broadcast to WebSocket clients                               | —            |
| `node_get_accounts` / `node_get_balance` / `node_set_balance` | Query/modify local node                                      | —            |
| `get_ios_launch_args` / `get_android_launch_args`             | Port map for app launch                                      | —            |
| `setup_android_port_forwarding`                               | Run `adb reverse` for all resources                          | —            |
| `list_resources`                                              | Show all running resources                                   | —            |
| `list_recipes`                                                | Show available FixtureBuilder recipes                        | —            |
| `get_server_url` / `get_mock_hits`                            | Query running resources                                      | —            |

## Fresh Instances (CRITICAL)

**Always `stop_all()` before starting new resources.** Every test run must begin with a clean slate — no leftover routes, state, or connections from a previous run. When the user asks to "start a mock server" or "spin up infrastructure", kill all existing resources first, then start fresh.

```
stop_all()  →  start_mock_server(...)  →  start_fixture_server(...)
```

## Startup Order

Resources have preconditions. Follow this order when starting multiple:

```
1. stop_all()                        — always first, kill previous resources
2. Local node (if needed)            — no preconditions
3. Dapp server (if needed)           — no preconditions
4. Mock server                       — no preconditions
5. WebSocket server                  — no preconditions
6. Fixture server                    — start LAST (state references ports of other resources)
```

Each `start_*` tool validates preconditions and returns a clear error if unmet.

## Mock Server: Proxy Pattern

**CRITICAL:** The app does NOT call `localhost:8000/v2/prices`. It uses a proxy pattern:

```
App request:  http://localhost:8000/proxy?url=https%3A%2F%2Fprice-api.metafi.codefi.network%2Fv2%2Fchains%2F1%2Fspot-prices
Mock matches: https://price-api.metafi.codefi.network/v2/chains/1/spot-prices
```

**Always use real API URLs** when defining routes:

```
// CORRECT — real API URL
{ url: "https://price-api.metafi.codefi.network/v2/chains/1/spot-prices", response: {...} }

// WRONG — localhost path
{ url: "/v2/prices", response: {...} }
```

Wildcard matching works: `"https://gas.api.cx.metamask.io/networks/*/suggestedGasFees"`

## Common Patterns

### Minimal setup (most tests)

```
start_mock_server → start_fixture_server(recipe: ["withMetaMetricsOptIn"])
```

### Swap/Bridge test

```
start_mock_server(routes: [
  { url: "https://price-api.metafi.codefi.network/v2/chains/1/spot-prices", response: { ETH: { usd: 3500 } } },
  { url: "https://swap.api.cx.metamask.io/networks/1/trades*", response: { ... } }
])
start_fixture_server(recipe: [
  { method: "withNetworkController", args: { selectedNetworkClientId: "mainnet" } },
  "withDisabledSmartTransactions",
  "withMetaMetricsOptIn"
])
```

### Dapp interaction test

```
start_local_node()
start_dapp_server(rootDirectory: "<metamask-mobile>/test-dapp")
start_mock_server()
start_fixture_server(recipe: [
  "withPermissionControllerConnectedToTestDapp",
  "withGanacheNetwork"
])
```

### Ad-hoc flow in ralph-loop

No spec file — just call tools and interact with the app:

```
1. start_mock_server(routes: [{url: "https://...", response: {...}}])
2. start_fixture_server(recipe: [...])
3. get_ios_launch_args()  →  use to launch app
4. [interact with app via Maestro MCP or manually]
5. get_mock_hits("spot-prices")  →  verify API was called (filters by real URL)
6. stop_all()
```

## Fixture Recipes

Use `list_recipes` to see all available methods. Common ones:

| Recipe                                        | What it does                                    |
| --------------------------------------------- | ----------------------------------------------- |
| `withMetaMetricsOptIn`                        | Enable analytics                                |
| `withPopularNetworks`                         | Enable Optimism, BSC, Polygon, etc.             |
| `withImportedAccountKeyringController`        | Add imported account                            |
| `withPermissionControllerConnectedToTestDapp` | Pre-connect to test dapp                        |
| `withDisabledSmartTransactions`               | Turn off STX                                    |
| `withNetworkController(config)`               | Custom network setup                            |
| `withGanacheNetwork`                          | Enable local test network                       |
| `withOnboardingFixture`                       | Start from onboarding (not-yet-onboarded state) |

Recipes accept either strings (no args) or `{ method, args }` objects:

```json
["withMetaMetricsOptIn", { "method": "withDetectedGeolocation", "args": "US" }]
```

The `metamaskMobilePath` defaults to `/Users/cferreira/Developer/MetaMask/metamask-mobile` — override only if your repo is elsewhere.

## App IDs

When launching the app (e.g., via Maestro), use the correct appId:

| Build | Android             | iOS                          |
| ----- | ------------------- | ---------------------------- |
| Main  | `io.metamask`       | `io.metamask.MetaMask`       |
| Flask | `io.metamask.flask` | `io.metamask.MetaMask-Flask` |

## Platform Wiring

After starting resources, the app needs to know where they are:

**iOS:** Call `get_ios_launch_args()` → pass result as launch arguments when starting the app.

**Android (current):** Call `setup_android_port_forwarding()` → runs `adb reverse` for all running resources.

**Android (future):** Call `get_android_launch_args()` → for when Android supports launch arg port injection.

## Always Clean Up

Call `stop_all()` when done. Resources hold ports and child processes (Anvil). If a session ends without cleanup, you may need to manually kill processes on those ports.
