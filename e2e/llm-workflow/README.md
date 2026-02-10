# MetaMask Mobile LLM Workflow

MCP-based tooling for LLM agents to build, launch, and interact with MetaMask Mobile on iOS simulators. This integration enables a complete feedback loop for implementing and validating mobile UI changes using LLM agents.

## Architecture

The system follows a decoupled, capability-based architecture consistent with the MetaMask Extension:

- **Generic Core**: `@metamask/client-mcp-core` provides the MCP server infrastructure, tool definitions, and capability interfaces.
- **Mobile Implementation**: This directory implements mobile-specific capabilities that wrap existing E2E infrastructure.

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
│  │  - BuildCapability: yarn build:ios:main:dev                     │   │
│  │  - FixtureCapability: wallet state management                   │   │
│  │  - ChainCapability: Anvil blockchain                            │   │
│  │  - ContractSeedingCapability: deploy test contracts             │   │
│  │  - StateSnapshotCapability: mobile state detection              │   │
│  │  - MockServerCapability: API mocking                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ IOSPlatformDriver (XCUITest)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        iOS Simulator                                    │
│                    + MetaMask Mobile App                                │
│                    + Anvil (local blockchain)                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component           | Location                          | Description                                        |
| ------------------- | --------------------------------- | -------------------------------------------------- |
| **MCP Server**      | `mcp-server/server.ts`            | Entry point, wires capabilities to core            |
| **Session Manager** | `mcp-server/metamask-provider.ts` | Manages mobile session, capability coordination    |
| **Capabilities**    | `capabilities/`                   | Mobile-specific implementations wrapping E2E infra |
| **App Launcher**    | `app-launcher.ts`                 | Core iOS simulator/app launcher                    |

---

## Quick Start

### 1. Configure MCP Client

Add to your MCP client configuration (e.g., Claude Desktop, OpenCode):

```json
{
  "mcpServers": {
    "metamask-mobile": {
      "command": "npx",
      "args": ["tsx", "e2e/llm-workflow/mcp-server/server.ts"],
      "cwd": "/path/to/metamask-mobile"
    }
  }
}
```

### 2. Use the Tools

Once configured, the LLM agent can use tools like:

```
mm_build      → Build the iOS app
mm_launch     → Launch iOS simulator with MetaMask
mm_click      → Click UI elements
mm_type       → Type into inputs
mm_screenshot → Capture screenshots
mm_cleanup    → Stop simulator and services
```

---

## Configuration

### Prerequisites

- **Node.js**: ^20.18.0
- **Xcode**: Latest stable version with iOS SDK
- **iOS Simulator**: Configured and ready
- **Built App**: `.app` bundle (can be generated via `mm_build`)

### Environment Variables

Ensure your environment is set up for MetaMask Mobile development (see [root README](../../README.md)).

---

## Available Tools

The mobile integration supports 30+ tools from the core package. For detailed documentation on each tool, refer to the [client-core-mcp README](https://github.com/MetaMask/client-mcp-core).

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

### Smart Contract Seeding

- `mm_seed_contract`: Deploy a smart contract to local Anvil.
- `mm_seed_contracts`: Deploy multiple contracts.
- `mm_list_contracts`: List deployed contracts.

---

## Capabilities

The mobile implementation provides 6 core capabilities:

| Capability           | Description                      | Existing Infra Wrapped                |
| -------------------- | -------------------------------- | ------------------------------------- |
| **Build**            | Builds the iOS app bundle        | `yarn build:ios:main:dev`             |
| **Fixture**          | Manages wallet state fixtures    | Mobile E2E fixture server             |
| **Chain**            | Manages local Anvil blockchain   | Anvil / `metamask-extension` patterns |
| **Contract Seeding** | Deploys test contracts           | `AnvilSeeder`                         |
| **State Snapshot**   | Detects current screen and state | Mobile state detection logic          |
| **Mock Server**      | Mocks external API responses     | Mobile E2E mock server                |

---

## Platform Support

| Platform    | Support Level     | Notes                       |
| ----------- | ----------------- | --------------------------- |
| **iOS**     | ✅ Supported (v1) | Primary focus for v1        |
| **Android** | ❌ Not Supported  | Planned for future versions |

### Tool Support Matrix (iOS)

Most tools are supported, with the following exceptions:

- `mm_clipboard`: ❌ Not supported on iOS
- `mm_switch_to_tab`: ❌ Not supported (single-app model)
- `mm_close_tab`: ❌ Not supported
- `mm_wait_for_notification`: ❌ Not supported (popups handled differently)

---

## Troubleshooting

### Common Issues

- **Simulator not running**: Ensure Xcode is properly installed and a simulator is available.
- **Build failures**: Run `yarn setup` and ensure all native dependencies are installed.
- **ios-runner issues**: The MCP server relies on a stable connection to the simulator; restart the simulator if interactions hang.
- **App not found**: Ensure `appBundlePath` is correct or use `mm_build` to generate it.

---

## See Also

- **Core Package**: `@metamask/client-mcp-core` - Generic MCP infrastructure.
- **Mobile E2E Docs**: [docs/readme/e2e-testing.md](../../docs/readme/e2e-testing.md) - General E2E testing guide.
