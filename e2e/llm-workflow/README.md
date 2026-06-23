# MetaMask Mobile LLM Workflow

CLI-based tooling for LLM agents to launch and interact with MetaMask Mobile on iOS simulators. Provides a complete feedback loop for implementing and validating UI changes through a persistent HTTP daemon and the `mm` CLI.

## Documentation Scope

This README covers architecture, quick start, and available commands for the mobile LLM workflow.

- For the full agent-facing command reference (targeting, scoping, batching, error recovery), see `.claude/skills/metamask-mobile-visual-testing/SKILL.md`.
- For the core package API and capability interfaces, see the `@metamask/client-mcp-core` README.

## Architecture

The system uses a **decoupled, daemon-based architecture** that separates the generic tool infrastructure from MetaMask-specific mobile logic.

```
LLM Agent / Dev
    │ mm CLI commands
    ▼
mm CLI (from @metamask/client-mcp-core)
    │ HTTP (127.0.0.1)
    ▼
HTTP Daemon (createServer)
   ├─ Package: tools, knowledge store, IOSPlatformDriver
   └─ Consumer: MetaMaskMobileSessionManager, capabilities, Metro attach
    │
    ▼
iOS Simulator + XCUITest Runner
```

### Key Components

| Component           | Location                        | Description                                                                         |
| ------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| **Daemon**          | `daemon.ts`                     | Entry point that starts the HTTP server and wires up mobile capabilities.           |
| **Session Manager** | `metamask-provider.ts`          | Manages the simulator lifecycle, app installation, and coordinates between tools.   |
| **Platform Driver** | `IOSPlatformDriver`             | Low-level driver that communicates with the XCUITest runner on the simulator.       |
| **Knowledge Store** | `test-artifacts/llm-knowledge/` | Persistent storage for session history, allowing agents to learn from past actions. |

### Communication Flow

1. The **LLM Agent** issues a command via the `mm` CLI (e.g., `mm click [e1]`).
2. The **CLI** discovers the local daemon port from `.mm-server` and forwards the request.
3. The **Daemon** validates the input and queues the task for execution.
4. The **Session Manager** uses the **Platform Driver** to send the command to the simulator.
5. The **XCUITest Runner** executes the action and returns the new UI state.
6. The **Daemon** records the step in the **Knowledge Store** and returns the result to the CLI.

---

## Quick Start

### Prerequisites

1. **Node.js**: Version 20.18.0 or higher.
2. **Yarn**: Version 4.14.1 or higher (Corepack enabled).
3. **Xcode**: Version 15+ with command line tools installed.
4. **Simulator**: At least one iOS Simulator created in Xcode.

### 1. Build the App (Manual Step)

The `mm` CLI does **not** build the mobile app. You must have a built `.app` bundle available in the standard build paths.

```bash
# Option A: Full native build (Slow, but accurate)
yarn setup && yarn start:ios

# Option B: Expo development (Fast, recommended for JS changes)
yarn setup:expo && yarn watch:clean
```

### 2. CLI Usage

The `mm` CLI is the primary interface. It automatically manages the background daemon.

```bash
# 1. Boot a simulator
# You can find UDIDs with: xcrun simctl list devices
xcrun simctl boot <UDID>

# 2. Launch a session (prod context — uses whatever app state is on the simulator)
mm launch

# Or launch with full E2E test infrastructure (Anvil, fixture server, mock server)
mm launch --context e2e

# 3. Interact
mm describe-screen
mm click [e1]
mm type [e2] "password"

# 4. Cleanup
# Stops the app and releases simulator resources
mm cleanup
```

### 3. Daemon Model

- **Auto-start**: `mm launch` starts the daemon if it's not running.
- **Worktree Isolation**: Each worktree has its own daemon, tracked in `.mm-server`.
- **Idle Timeout**: Daemon shuts down after 30 minutes of inactivity.
- **Logs**: Activity is logged to `.mm-daemon.log`.

---

## Available Commands

### Lifecycle

- `mm launch`: Starts the daemon and iOS session. Defaults to prod context. Use `--context e2e` for full test infrastructure. Supports `--state` (default, onboarding, custom) and `--device <UDID>`.
- `mm cleanup`: Stops the app and services. Use `--shutdown` to stop the daemon process.
- `mm status`: Shows the current daemon PID, port, and session status.
- `mm stop`: Stops the daemon process. Use `--force` to clear stale state.

### Interaction

- `mm click <ref>`: Clicks an element by its accessibility reference (e.g., `[e1]`).
- `mm type <ref> <text>`: Types text into an input field. Clears existing text first.
- `mm describe-screen`: The primary observation tool. Returns the UI tree, state, and test IDs.
- `mm screenshot`: Captures a PNG of the current simulator screen.
- `mm wait-for <ref>`: Blocks until an element becomes visible.
- `mm get-text <ref>`: Reads the text content of a specific element.

### Navigation

- `mm navigate-home`: Navigates the app to the main wallet screen.
- `mm navigate-settings`: Navigates the app to the settings menu.

### Knowledge Store

- `mm knowledge-search <query>`: Search for successful steps from previous sessions.
- `mm knowledge-last`: Get the last N steps from the current session.
- `mm knowledge-sessions`: List all recorded sessions with their goals and tags.
- `mm knowledge-summarize`: Generate a human-readable summary of a session.

---

## Launch Contexts

The daemon supports two contexts, controlled via `--context`:

### Prod (default)

Launches the app as-is, using whatever state is already on the simulator. No test infrastructure is started. Useful for interacting with a real wallet or a manually configured app.

```bash
mm launch
```

### E2E

Launches with full test infrastructure: local Anvil chain, fixture server, and mock server. Use `--state` to control the initial wallet state.

```bash
# Pre-onboarded wallet with 25 ETH on local Anvil (default state)
mm launch --context e2e --state default

# Fresh wallet at the "Get Started" screen
mm launch --context e2e --state onboarding

# Specific state preset for targeted testing
mm launch --context e2e --state custom --preset withMultipleAccounts
```

**Default password** (E2E): `correct horse battery staple`

---

## Watch-Mode Dev Loop

When working with Expo or a running Metro bundler, you can attach the CLI to the running Metro process. This allows the app to load the latest JS changes without a full rebuild.

1. Start Metro: `yarn watch:clean` (usually on port 8081)
2. Launch with the port environment variable:

   ```bash
   # Prod context (existing app state, live JS reload)
   MM_METRO_PORT=8081 mm launch

   # E2E context (test infrastructure + live JS reload)
   MM_METRO_PORT=8081 mm launch --context e2e
   ```

The daemon will attempt to attach to the Metro bundler. If successful, the app will load the JS bundle from your local machine.

---

## Troubleshooting

### Common Error Codes

| Code                       | Meaning                    | Resolution                                         |
| -------------------------- | -------------------------- | -------------------------------------------------- |
| `MM_IOS_RUNNER_NOT_READY`  | Simulator or runner failed | Check if simulator is booted and app is installed. |
| `MM_IOS_EMPTY_SNAPSHOT`    | UI tree capture failed     | Re-run `mm describe-screen`.                       |
| `MM_IOS_RUNNER_RECOVERING` | Runner is restarting       | Wait 5-10 seconds and retry.                       |
| `MM_NO_ACTIVE_SESSION`     | No app running             | Run `mm launch` first.                             |
| `MM_TARGET_NOT_FOUND`      | Element ref is stale       | Run `mm describe-screen` to get fresh refs.        |

### Daemon Issues

If the CLI hangs or returns connection errors:

1. Check if a daemon is running: `mm status`
2. Force stop it: `mm stop --force`
3. Check logs for errors: `tail -f .mm-daemon.log`
4. Restart: `mm launch`

---

## Directory Structure

| Path                   | Description                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `daemon.ts`            | The entry point for the HTTP daemon. It initializes the session manager and capabilities. |
| `metamask-provider.ts` | Implements `ISessionManager` for mobile. Handles simulator and app lifecycle.             |
| `capabilities/`        | Mobile-specific capabilities like `IOSPlatformDriver` and `MetroAttach`.                  |
| `fixtures/`            | Wallet state presets used for `--state custom`.                                           |
| `utils/`               | Helper functions for simulator management and port allocation.                            |
| `README.md`            | This file.                                                                                |

## Detailed Command Reference

### Lifecycle Commands

- **`mm launch`**:
  - `--context <mode>`: `prod` (default) or `e2e`. Prod uses existing app state; E2E starts Anvil, fixture server, and mock server.
  - `--state <mode>`: `default` (pre-onboarded), `onboarding` (fresh), `custom` (fixture). Only applies in E2E context.
  - `--preset <name>`: The name of the fixture to use when `--state custom` is set. Requires E2E context.
  - `--device <udid>`: Target a specific simulator by its UDID.
  - `--goal <text>`: A descriptive goal for the session (recorded in knowledge store).
  - `--flow-tags <tags>`: Comma-separated tags (e.g., `send,swap`) for categorization.
  - `--force`: Kill any existing session and start a new one.

- **`mm cleanup`**:
  - `--shutdown`: Also stops the background daemon process. Recommended when finished with a work session.

- **`mm status`**:
  - Displays the daemon's PID, uptime, and the ports allocated for sub-services (Anvil, etc.).

### Interaction Commands

- **`mm describe-screen`**:
  - Captures the current UI state. Returns a JSON object containing:
    - `state`: Current screen name, network, and account info.
    - `a11y`: The accessibility tree with deterministic refs (`e1`, `e2`).
    - `testIds`: A list of visible `data-testid` attributes.
    - `priorKnowledge`: Suggestions based on previous successful actions on this screen.

- **`mm click <ref>`**:
  - `--timeout <ms>`: How long to wait for the element to appear and the click to resolve.
  - `--within <scope>`: Scope the search to a parent element (e.g., `testid:container`).

- **`mm type <ref> <text>`**:
  - Clears the target field and types the provided text.
  - `--timeout <ms>`: Total time budget for the operation.

### Knowledge Store Commands

- **`mm knowledge-search <query>`**:
  - Uses fuzzy matching to find relevant steps from past sessions. Useful for discovering how to navigate complex flows.

- **`mm knowledge-summarize`**:
  - `--session <id>`: Generates a step-by-step "recipe" of what happened in a specific session.

---

## Best Practices for LLM Agents

To ensure reliable and efficient interactions with MetaMask Mobile, agents should follow these guidelines:

1. **Always `describe-screen` first**: The UI tree can change unexpectedly due to background updates or animations. Always get a fresh snapshot before interacting.
2. **Use `testId` when available**: While accessibility refs (`e1`, `e2`) are convenient, `testId` values are more stable across different builds and screen sizes.
3. **Handle Loading States**: Mobile apps often have transitions. If an element isn't found, use `mm wait-for` with a reasonable timeout (e.g., 10-15s).
4. **Batch Actions**: Use `mm run-steps` for sequences like entering a password and clicking unlock. This reduces the overhead of multiple CLI calls.
5. **Verify Outcomes**: After a mutating action (like a click), verify that the screen changed as expected by checking the `observations.state.screen` or calling `describe-screen`.
6. **Clean Up**: Always run `mm cleanup` at the end of a session to free up simulator resources and stop background services.

## Security Considerations

- **Redaction**: The `mm` CLI automatically redacts sensitive input (like passwords) in the knowledge store. However, avoid logging sensitive information in your own logs.
- **Local Only**: The daemon listens only on `127.0.0.1`. Do not expose this port to the network.
- **Worktree Isolation**: Daemons are isolated by worktree. Ensure you are running the CLI from the correct directory to avoid interacting with the wrong build.

---

## See Also

- **Agent Skill**: `.claude/skills/metamask-mobile-visual-testing/SKILL.md` - Concise command reference for agents.
- **Core Package**: `@metamask/client-mcp-core` - Generic daemon infrastructure.
- **Mobile Support**: `@metamask/client-mcp-core-mobile-support` - iOS driver implementation.
