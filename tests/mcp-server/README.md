# MetaMask Test Infrastructure MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that exposes MetaMask Mobile's E2E test infrastructure as tools. It enables AI agents (Claude Code, Cursor, etc.) and Maestro to spin up mock servers, fixture servers, local blockchain nodes, and other test resources — without writing Detox specs.

## Architecture

This MCP server is a **thin orchestration layer** over the real test infrastructure classes in metamask-mobile:

| MCP Tool                 | Real Class                         | Source                          |
| ------------------------ | ---------------------------------- | ------------------------------- |
| `start_fixture_server`   | `FixtureServer` + `FixtureBuilder` | `tests/framework/fixtures/`     |
| `start_local_node`       | `AnvilManager`                     | `tests/seeder/anvil-manager.ts` |
| `start_websocket_server` | `LocalWebSocketServer`             | `tests/websocket/server.ts`     |

The server imports the real classes directly — no reimplementation. A `register.js` shim stubs out `detox`, `react-native`, and `@metamask/native-utils` at require-time since they're not needed for server-side resource management.

## Setup

### Prerequisites

- Node.js 20+
- MetaMask Mobile repo with dependencies installed (`yarn install`)
- `@modelcontextprotocol/sdk` and `zod` installed (`yarn add -D @modelcontextprotocol/sdk zod`)

### Claude Code

Add to `~/.claude/.mcp.json`:

```json
{
  "mcpServers": {
    "metamask-test-infra": {
      "command": "/path/to/metamask-mobile/tests/mcp-server/start.sh",
      "args": []
    }
  }
}
```

Then restart Claude Code or run `/mcp` to connect.

### Manual Testing

```bash
# Test the MCP handshake
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | ./tests/mcp-server/start.sh
```

## Available Tools

### Resource Lifecycle

| Tool                     | Description                                                                                                       | Default Port |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------ |
| `start_fixture_server`   | Start a Koa server serving app state at `GET /state.json`. Accepts FixtureBuilder recipe steps or raw state JSON. | 12345        |
| `start_local_node`       | Start a local Anvil Ethereum node for transaction testing. Configurable chainId, hardfork, balance.               | 8545         |
| `start_websocket_server` | Start a WebSocket server for push notification mocking.                                                           | 8089         |
| `stop_resource`          | Stop a single running resource by name.                                                                           | —            |
| `stop_all`               | Stop all running resources. **Always call before starting new resources.**                                        | —            |
| `list_resources`         | List all managed resources with their status and port.                                                            | —            |

### Fixture Builder

| Tool                   | Description                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `start_fixture_server` | Uses the **real** `FixtureBuilder` class with all 53+ `with*` methods.             |
| `list_recipes`         | Lists all available `FixtureBuilder` methods dynamically from the class prototype. |

**Recipe format** — array of method names or `{method, args}` objects:

```json
{
  "recipe": [
    "withMetaMetricsOptIn",
    { "method": "withNetworkController", "args": "anvil" }
  ]
}
```

`withNetworkController` accepts either a **preset name** (string) or a full config object. Use `list_network_presets` to see all available presets.

### Network Presets

| Tool                   | Description                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| `list_network_presets` | Lists all available presets with chainId, name, and whether they're dynamic. |

| Preset              | ChainId  | Description                                                                 |
| ------------------- | -------- | --------------------------------------------------------------------------- |
| `anvil`             | 0x539    | Local Anvil node — **auto-detects port** from running `local-node` resource |
| `sepolia`           | 0xaa36a7 | Sepolia testnet via Infura                                                  |
| `linea-sepolia`     | 0xe705   | Linea Sepolia testnet via Infura                                            |
| `tenderly-mainnet`  | 0x1      | Tenderly fork of Ethereum mainnet                                           |
| `tenderly-linea`    | 0xe708   | Tenderly fork of Linea                                                      |
| `tenderly-optimism` | 0xa      | Tenderly fork of Optimism                                                   |
| `tenderly-polygon`  | 0x89     | Tenderly fork of Polygon                                                    |
| `mainnet`           | 0x1      | Ethereum mainnet via public RPC                                             |
| `optimism`          | 0xa      | OP Mainnet                                                                  |
| `base`              | 0x2105   | Base                                                                        |
| `polygon`           | 0x89     | Polygon Mainnet                                                             |
| `avalanche`         | 0xa86a   | Avalanche C-Chain                                                           |
| `bnb`               | 0x38     | BNB Smart Chain                                                             |
| `linea`             | 0xe708   | Linea mainnet                                                               |

**Preset example:**

```json
{ "method": "withNetworkController", "args": "anvil" }
```

**Full config example (when no preset fits):**

```json
{
  "method": "withNetworkController",
  "args": {
    "chainId": "0x539",
    "rpcUrl": "http://localhost:8546",
    "type": "custom",
    "nickname": "My Custom Node",
    "ticker": "ETH"
  }
}
```

### Local Node (Anvil)

| Tool                | Description                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `start_local_node`  | Start Anvil with configurable chainId (default: 1337), hardfork, and initial balance (default: 1000 ETH). |
| `node_get_accounts` | List all accounts on the running node (10 deterministic accounts from the test mnemonic).                 |
| `node_get_balance`  | Get ETH balance for an account (defaults to first account).                                               |
| `node_set_balance`  | Set ETH balance for an account.                                                                           |

The default mnemonic matches the fixture's `DEFAULT_FIXTURE_ACCOUNT` (`0x76cf1CdD...`), so fixture state and blockchain state are consistent.

### Platform Helpers

| Tool                            | Description                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `get_ios_launch_args`           | Returns a JSON map of launch arg keys → ports for all running resources. Use with `xcrun simctl launch`. |
| `get_android_launch_args`       | Same as iOS, for future Android launch arg support.                                                      |
| `setup_android_port_forwarding` | Runs `adb reverse` for all running resources so the Android emulator can reach `localhost` servers.      |

## Typical Test Flow

```
# 1. Clean slate
stop_all

# 2. Start infrastructure
start_local_node        (port: 8546)
start_fixture_server    (recipe: [withNetworkController({...})])

# 3. Platform wiring
setup_android_port_forwarding           # Android
# or: get_ios_launch_args               # iOS

# 4. Launch app
# Android:
#   adb shell pm clear io.metamask
#   adb shell am start -n io.metamask/.MainActivity --ei fixtureServerPort 12345
# iOS:
#   xcrun simctl terminate <device_id> io.metamask.MetaMask
#   xcrun simctl launch <device_id> io.metamask.MetaMask --fixtureServerPort 12345

# 5. Interact via Maestro MCP (dismiss dev screens, unlock, test steps)

# 6. Cleanup
stop_all
```

## App IDs

| Build | Android             | iOS                          |
| ----- | ------------------- | ---------------------------- |
| Main  | `io.metamask`       | `io.metamask.MetaMask`       |
| Flask | `io.metamask.flask` | `io.metamask.MetaMask-Flask` |

## How It Works

### Module Stubbing (`register.js`)

The test infrastructure classes import from `tests/framework/types.ts`, which transitively imports `detox` and `react-native`. These packages contain Flow syntax and native module references that Node.js/tsx cannot parse outside of a React Native bundler.

`register.js` intercepts `require()` calls for these packages and returns an empty module stub. This is safe because:

- `detox` is only used for type definitions (`LanguageAndLocale`) — not called at runtime
- `react-native` is never used by the server-side infrastructure classes
- `@metamask/native-utils` requires native Nitro modules — not available outside the app

### FixtureBuilder Integration

The `start_fixture_server` tool instantiates the real `FixtureBuilder`, calls each recipe method in sequence via reflection, then calls `.build()` to produce the fixture JSON. This means:

- All 53+ builder methods are automatically available
- New methods added to `FixtureBuilder` are instantly usable — no MCP server changes needed
- The fixture JSON is identical to what Detox tests produce

### Port Management

Resources use fixed default ports (12345, 8545, 8089) rather than dynamic allocation via `PortManager`. This simplifies the MCP flow — ports are predictable and can be hardcoded in launch args and Maestro flows.

## Development

### Adding a New Tool

1. Add the tool definition in `server.ts` using `server.tool(name, description, schema, handler)`
2. Import the real class from the test infrastructure
3. If the class has transitive detox/react-native imports, they're already handled by `register.js`

### Adding a New Module Stub

If a new transitive dependency fails to parse, add it to the condition in `register.js`:

```js
if (
  request === 'detox' ||
  request.startsWith('react-native') ||
  request.startsWith('@metamask/native-utils') ||
  request === 'new-problematic-package' // <-- add here
) {
  return require.resolve('./stubs/empty.js');
}
```
