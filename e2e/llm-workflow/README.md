# MetaMask Mobile LLM Workflow

MCP-based automation for MetaMask Mobile on iOS Simulator.

This workflow lets LLM agents build the app, launch a simulator session, interact with UI elements, and validate flows with screenshots and state snapshots.

## Architecture

The system follows a decoupled, capability-based architecture, split into a generic core and a mobile adapter layer:

- `@metamask/client-mcp-core`: MCP protocol handling, tool schemas, shared tool implementations, capability interfaces, iOS driver primitives.
- `e2e/llm-workflow/`: MetaMask Mobile-specific wiring (session manager, capabilities, launcher).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           LLM Agent                                     │
│                    (Claude, GPT, etc.)                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ MCP Protocol (stdio)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         MCP Server                                      │
│              e2e/llm-workflow/mcp-server/                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  @metamask/client-mcp-core (generic core)                │   │
│  │  - MCP server infrastructure                                    │   │
│  │  - Tool definitions (mm_click, mm_type, mm_screenshot, etc.)    │   │
│  │  - Knowledge store                                              │   │
│  │  - Capability interfaces                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                  │                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  MetaMask Mobile Capabilities (this directory)                  │   │
│  │  Prod context (default):                                        │   │
│  │  - BuildCapability: build + Metro watch mode                    │   │
│  │  - StateSnapshotCapability: mobile state detection              │   │
│  │  E2E context (requires env vars):                               │   │
│  │  - + FixtureCapability: wallet state management                 │   │
│  │  - + ChainCapability: Anvil blockchain                          │   │
│  │  - + ContractSeedingCapability: deploy test contracts           │   │
│  │  - + MockServerCapability: API mocking                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ IOSPlatformDriver (XCUITest)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        iOS Simulator                                    │
│                    + MetaMask Mobile App                                │
│                    + Anvil (e2e context only)                           │
└─────────────────────────────────────────────────────────────────────────┘
```

Key files in this repo:

- `e2e/llm-workflow/mcp-server/server.ts`: MCP entrypoint.
- `e2e/llm-workflow/mcp-server/start.mjs`: startup wrapper that auto-builds bundled server when stale.
- `e2e/llm-workflow/mcp-server/metamask-provider.ts`: mobile session manager + capability binding.
- `e2e/llm-workflow/app-launcher.ts`: simulator lifecycle, app launch, XCUITest runner boot and attach.
- `e2e/llm-workflow/capabilities/`: build/fixture/chain/seeding/state/mock capability adapters.

## Startup Model

Use `yarn mcp:start`.

What it does now:

1. Checks whether `e2e/llm-workflow/mcp-server/dist/server.mjs` is missing or stale.
2. Runs the local server bundling step only when needed.
3. Starts the MCP server.

You no longer need to run a manual `mcp:build` step in normal use.

## MCP Client Configuration

Add this server entry to your MCP client config:

```json
{
  "mcpServers": {
    "metamask-mobile": {
      "command": "yarn",
      "args": ["mcp:start"],
      "cwd": "/path/to/metamask-mobile"
    }
  }
}
```

## iOS Runner Artifact Resolution

`app-launcher` resolves the XCUITest runner derived data in this order:

1. `runnerDerivedDataPath` in launch input.
2. `MM_IOS_RUNNER_DERIVED_DATA_PATH` environment variable.
3. `node_modules/@metamask/client-mcp-core/ios-runner-derived-data`.
4. Local fallback `./ios-runner-derived-data`.
5. Auto-build via `client-mcp-core/scripts/build-ios-runner.sh` (if nearby repo is available).

This replaces the old manual symlink workflow.

## iOS Runtime Model (Runner + Fallback)

The iOS session uses an upstream-style runner architecture with explicit
recovery and discovery fallback:

```
mm_* tool
  -> IOSPlatformDriver
    -> XCUITest runner command (primary path)
      -> if snapshot is empty/degraded
        -> AXSnapshot fallback
          -> normalized discovery output
```

Runner protocol highlights:

- `ping`: health check that avoids discovery side effects.
- `bind`: app context binding without forcing a snapshot.
- `fill`: resilient text entry command used when direct typing is unstable.

The external MCP contract is unchanged (`mm_click`, `mm_type`, `mm_wait_for`),
but text interactions are routed to the most reliable runner command internally.

## Recovery Lifecycle

Recovery is intentionally narrow and state-aware:

1. Detect transport/runner failure.
2. Restart and rebind runner command channel.
3. Retry polling-based interaction on transient recovery errors.

Key behavior: readiness checks rely on `ping` instead of snapshot requests,
which reduces simulator UI churn during recovery windows.

Error codes you may see while recovery/fallback is active:

- `MM_IOS_RUNNER_RECOVERING`
- `MM_IOS_EMPTY_SNAPSHOT`
- `MM_IOS_AX_PERMISSION_REQUIRED`
- `MM_IOS_AX_BINARY_MISSING`
- `MM_IOS_AX_SNAPSHOT_FAILED`

## Core Agent Flow

Recommended flow for agents:

1. `mm_build` (or rely on `mm_launch` with `autoBuild: true`).
2. `mm_launch` with `goal`, `flowTags`, and optional `tags`.
3. `mm_describe_screen` before interacting.
4. Use `mm_click`/`mm_type`/`mm_wait_for` with `testId` first.
5. Capture evidence via `mm_screenshot` when validating UI.
6. End with `mm_cleanup`.

Knowledge-first flow is preferred:

- `mm_knowledge_search` before exploratory interaction.
- `mm_knowledge_sessions` or `mm_knowledge_summarize` to reuse known-good flows.

## Contexts: Prod vs E2E

The MCP server starts in **prod context** by default. Most developers and testers use this mode since it matches the app's standard configuration.

| Context | Default? | Capabilities                                | Requirements                                              |
| ------- | -------- | ------------------------------------------- | --------------------------------------------------------- |
| `prod`  | **Yes**  | build, stateSnapshot                        | None (standard app config)                                |
| `e2e`   | No       | build, fixture, chain, seeding, state, mock | `IS_TEST=true` or `METAMASK_ENVIRONMENT=e2e` in `.js.env` |

Switch contexts with `mm_set_context`:

```
mm_set_context { "context": "e2e" }   # Enable fixture/chain/seeding
mm_set_context { "context": "prod" }  # Back to production mode
```

E2E context is for testing flows that require a local Anvil blockchain, pre-loaded wallet fixtures, or contract seeding. You must set the e2e env vars in `.js.env` and rebuild/restart Metro for the app to recognize e2e module resolution.

---

## Available Tools

The mobile integration supports 30+ tools from the core package. For detailed documentation on each tool, refer to the [client-mcp-core README](https://github.com/MetaMask/client-mcp-core).

### Build & Session Management

- `mm_build`: Build the iOS app bundle.
- `mm_launch`: Launch the app on a simulator.
- `mm_cleanup`: Stop the app, simulator, and all services.

### State & Discovery

- `mm_get_state`: Get current app state (screen, balance, network).
- `mm_list_testids`: List visible `testID` attributes.
- `mm_accessibility_snapshot`: Get accessibility tree with refs (e1, e2...).
- `mm_describe_screen`: Combined state + testIDs + a11y snapshot.

### Interaction

- `mm_click`: Click element by a11yRef, testID, or selector.
- `mm_type`: Type text into element.
- `mm_wait_for`: Wait for element to become visible.
- `mm_screenshot`: Take and save screenshot.

### Smart Contract Seeding (e2e context only)

- `mm_seed_contract`: Deploy a smart contract to local Anvil.
- `mm_seed_contracts`: Deploy multiple contracts.
- `mm_list_contracts`: List deployed contracts.

---

## Supported vs Unsupported (iOS)

Supported and commonly used:

- `mm_build`, `mm_launch`, `mm_cleanup`
- `mm_get_state`, `mm_describe_screen`, `mm_list_testids`, `mm_accessibility_snapshot`
- `mm_click`, `mm_type`, `mm_wait_for`, `mm_screenshot`
- `mm_seed_contract`, `mm_seed_contracts`, `mm_get_contract_address`, `mm_list_contracts`
- `mm_knowledge_*`, `mm_run_steps`, `mm_get_context`, `mm_set_context`

Not supported on iOS sessions:

- `mm_clipboard`
- `mm_switch_to_tab`
- `mm_close_tab`
- `mm_wait_for_notification`
- URL-style `mm_navigate`

## Troubleshooting

- Simulator unavailable: verify Xcode install and available simulators.
- App bundle missing: run `mm_build` or provide valid `appBundlePath`.
- Runner artifact missing: set `MM_IOS_RUNNER_DERIVED_DATA_PATH` or ensure local `client-mcp-core` is available for auto-build.
- Empty discovery after unlock/navigation: this can indicate degraded XCTest
  snapshots; run `mm_describe_screen` again to allow AX fallback path to
  repopulate discovery data.
- Frequent runner recovery loops: inspect `test-artifacts/ios-runner-logs` for
  startup/runtime failures and validate simulator accessibility permissions.
- Stale behavior after server code changes: restart MCP server process.
- Port collisions (`8545`, `12345`, `8000`): stop conflicting local processes.

---

## See Also

- **Core Package**: `@metamask/client-mcp-core` - Generic MCP infrastructure.
