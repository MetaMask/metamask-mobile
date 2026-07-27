# MetaMask Mobile LLM Workflow

Local CLI tooling for LLM agents to launch and interact with MetaMask Mobile on an iOS Simulator. The workflow uses the `mm` CLI and a persistent local HTTP daemon from `@metamask/client-mcp-core`.

This MVP supports **prod only**. It operates on the app and wallet state already installed on the simulator. It does not start test infrastructure or create wallet state.

## Architecture

```text
LLM Agent / Developer
    │ yarn mm commands
    ▼
@metamask/client-mcp-core CLI and daemon
    │
    ├─ MetaMaskMobileSessionManager
    ├─ MobilePlatformDriver
    └─ KnowledgeStore
    │
    ▼
iOS Simulator + @metamask/device-mcp
```

| Component       | Location                         | Responsibility                                                                      |
| --------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| Daemon          | `daemon.ts`                      | Starts the local server and creates the prod workflow context.                      |
| Session manager | `metamask-provider.ts`           | Resolves the simulator/app, manages launch and cleanup, and exposes mobile drivers. |
| Prerequisites   | `ios/prerequisites.ts`           | Validates Xcode, simulator, app identity, install safety, and optional Metro.       |
| State snapshot  | `capabilities/state-snapshot.ts` | Reports current app state through the mobile platform driver.                       |

## Prerequisites

- Node.js and Yarn versions required by this repository
- Xcode with command-line tools
- An iOS Simulator
- `idb-companion` (`brew install idb-companion`)
- MetaMask already installed on the target simulator

`mm launch` does not build MetaMask and does not search local build outputs or Xcode DerivedData. You must install the app separately on the simulator before launching.

## Basic Workflow

```bash
# Boot a simulator if needed
xcrun simctl boot <UDID>

# Launch the installed app while preserving its current state
yarn mm launch

# Optionally choose a simulator
yarn mm launch --device-id <UDID>

# Observe and interact
yarn mm describe-screen
yarn mm click e1
yarn mm type e2 "text"
yarn mm screenshot --name "result"

# Cleanup
yarn mm cleanup
yarn mm cleanup --shutdown
```

There is no alternate launch context. Supplying `--context e2e` is rejected clearly.

## Installed-App Safety

- The already-installed MetaMask app is reused without installation or data reset.
- If no app is installed on the simulator, launch fails with instructions to install one before launching.
- When launching, the workflow performs internal safety checks on the app's identity. If an identity mismatch is detected, you should reuse the existing installed app or install a matching app outside of the `mm` workflow.

## Metro Watch Mode

Metro attachment remains available for development builds. Start Metro and provide its port:

```bash
yarn watch:clean
MM_METRO_PORT=8081 yarn mm launch
```

On Node 20, CDP WebSocket use may require:

```bash
NODE_OPTIONS="--experimental-websocket" MM_METRO_PORT=8081 yarn mm launch
```

## Commands

### Lifecycle

- `yarn mm launch`: launch the installed app in its current state
- `yarn mm cleanup`: terminate the app and clear the active session
- `yarn mm status`: inspect daemon/session status
- `yarn mm stop`: stop the daemon

### Interaction

- `yarn mm describe-screen`
- `yarn mm click <a11yRef>` or `--testid <id>`
- `yarn mm type <a11yRef> <text>` or `--testid <id>`
- `yarn mm wait-for`
- `yarn mm get-text`
- `yarn mm screenshot`
- `yarn mm run-steps '<json>'`
- `yarn mm cdp Runtime.evaluate '<json>'` when attached to Metro

### Knowledge Store

- `yarn mm knowledge-search <query>`
- `yarn mm knowledge-last`
- `yarn mm knowledge-sessions`
- `yarn mm knowledge-summarize`

## Operational Notes

- The daemon binds only to `127.0.0.1` and records its worktree-local state in `.mm-server`.
- The daemon shuts down after 30 minutes of inactivity and writes logs to `.mm-daemon.log`.
- Android and browser-only navigation/tab APIs are not supported by this mobile workflow.
- Accessibility references are ephemeral; call `describe-screen` again after navigation or major UI changes.
- Preserve sensitive installed wallet state. The workflow operates purely by reusing the installed app.

## Troubleshooting

| Error                          | Resolution                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `MM_IOS_RUNNER_NOT_READY`      | Verify Xcode, boot a simulator, and install MetaMask before launching.          |
| `MM_IOS_APP_IDENTITY_MISMATCH` | Reuse the installed app or install a matching app outside of the `mm` workflow. |
| `MM_NO_ACTIVE_SESSION`         | Run `yarn mm launch`.                                                           |
| `MM_TARGET_NOT_FOUND`          | Run `yarn mm describe-screen` and use fresh refs.                               |

For the complete agent-facing interaction guide, see `.claude/skills/metamask-mobile-visual-testing/SKILL.md`. Mobile platform support is part of `@metamask/client-mcp-core`; `@metamask/device-mcp` supplies the device backend.
