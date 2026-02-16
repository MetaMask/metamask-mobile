---
name: metamask-mobile-visual-testing
description: Launch and test MetaMask Mobile on iOS Simulator. Use for visual validation of UI changes, testing wallet flows, and capturing screenshots.
compatibility: opencode
metadata:
  location: e2e/llm-workflow/mcp-server
  type: ios-testing
---

## When to Use This Skill

Use this skill when you need to:

- Visually validate MetaMask Mobile UI changes
- Test app behavior on a real iOS Simulator
- Verify onboarding, unlock, send, or swap flows
- Capture screenshots for validation
- Debug UI state issues

## Prerequisites

Run from repository root (macOS only):

```bash
yarn setup          # Install dependencies + native builds
yarn setup:expo     # Or: Expo-only setup for JS development
```

Required tools:

- **Xcode**: Latest stable with iOS SDK
- **iOS Simulator**: At least one device configured (e.g., iPhone 16)
- **Node.js**: ^20.18.0
- **Yarn**: ^4.10.3

If ports are in use from previous runs:

```bash
lsof -ti:8545,12345,8000 | xargs kill -9
```

## MCP Server Setup

Bundle the server before first use (required once, re-run after server code changes):

```bash
yarn mcp:build
```

Then add to your MCP client configuration (Claude Desktop, OpenCode, etc.):

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

Or run manually: `yarn mcp:start`

## MCP Tools Overview

The MetaMask Mobile MCP server provides tools for iOS simulator automation:

| Tool                        | Description                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `mm_build`                  | Build the app using `yarn expo run:ios --no-install`. Call before `mm_launch` if not built |
| `mm_launch`                 | Launch MetaMask on iOS Simulator. Returns session info and initial state                   |
| `mm_cleanup`                | Stop the app, simulator services, Anvil, and all services. Always call when done           |
| `mm_get_state`              | Get current app state (screen, URL, balance, network, account address)                     |
| `mm_navigate`               | Navigate to a specific screen (home, settings, notification, or URL)                       |
| `mm_list_testids`           | List all visible data-testid attributes. Use to discover interaction targets               |
| `mm_accessibility_snapshot` | Get trimmed a11y tree with deterministic refs (e1, e2...) for interactions                 |
| `mm_describe_screen`        | Combined state + testIDs + a11y snapshot. Optional screenshot                              |
| `mm_screenshot`             | Take a screenshot and save to `test-artifacts/screenshots/`                                |
| `mm_click`                  | Click element by exactly one of: a11yRef, testId, or selector                              |
| `mm_type`                   | Type text into element by exactly one of: a11yRef, testId, or selector                     |
| `mm_wait_for`               | Wait for element to become visible by a11yRef, testId, or selector                         |
| `mm_seed_contract`          | Deploy a smart contract to local Anvil node                                                |
| `mm_seed_contracts`         | Deploy multiple smart contracts in sequence                                                |
| `mm_get_contract_address`   | Get deployed contract address                                                              |
| `mm_list_contracts`         | List all smart contracts deployed in this session                                          |
| `mm_knowledge_last`         | Get the last N step records from the knowledge store                                       |
| `mm_knowledge_search`       | Search step records by tool name, screen, testId, or a11y names                            |
| `mm_knowledge_summarize`    | Generate a recipe-like summary of steps taken in a session                                 |
| `mm_knowledge_sessions`     | List recent sessions with metadata for cross-session knowledge retrieval                   |
| `mm_run_steps`              | Execute multiple tools in sequence. Reduces round trips for multi-step flows               |
| `mm_set_context`            | Switch workflow context (e2e or prod). Cannot switch during active session                 |
| `mm_get_context`            | Get current context, available capabilities, and whether context can switch                |

### Not Supported on iOS

These tools exist in the core package but will throw `MM_TOOL_NOT_SUPPORTED_ON_PLATFORM` on iOS:

| Tool                       | Reason                                       |
| -------------------------- | -------------------------------------------- |
| `mm_clipboard`             | System clipboard not accessible via XCUITest |
| `mm_switch_to_tab`         | Single-app model, no browser tabs            |
| `mm_close_tab`             | Single-app model, no browser tabs            |
| `mm_wait_for_notification` | No notification popups (handled differently) |
| `mm_navigate`              | Not supported on iOS (no browser navigation) |

## Context Switching (prod vs e2e)

### Available Contexts

| Context | Description                                                                        |
| ------- | ---------------------------------------------------------------------------------- |
| `prod`  | **Default.** Real networks, real wallet state. Build + state snapshot capabilities |
| `e2e`   | Local Anvil blockchain, pre-onboarded wallet, fixtures, contract seeding           |

### Prod Context Capabilities (Default)

- `build` - Build the iOS app + Metro bundler watch mode
- `stateSnapshot` - App state detection (screen, unlock status, account, network)

The app uses its standard configuration — no e2e env vars needed. Connects to real networks with real wallet state. **Watch mode is fully supported** for JS development.

### E2E Context Capabilities

- `build` - Build the iOS app
- `fixture` - Wallet state management with presets
- `chain` - Local Anvil blockchain (port 8545)
- `contractSeeding` - Deploy test contracts (ERC-20, NFTs, etc.)
- `stateSnapshot` - App state detection
- `mockServer` - Mock API responses (port 8000)

Requires `IS_TEST=true` or `METAMASK_ENVIRONMENT=e2e` env vars in `.js.env` for Metro to activate e2e module resolution.

### Switching Contexts

**Check current context:**

```
mm_get_context
```

**Switch to e2e context** (for fixture/chain/seeding testing):

```
mm_set_context { "context": "e2e" }
```

**Switch back to prod:**

```
mm_set_context { "context": "prod" }
```

### Context Switching Rules

1. **Cannot switch during active session** - Call `mm_cleanup` first
2. **Default context is prod** - On server startup, context is always prod
3. **Context persists** - Once switched, remains until changed or server restarts
4. **E2E requires env vars** - Set `IS_TEST=true` or `METAMASK_ENVIRONMENT=e2e` in `.js.env` before using e2e context

## Core Workflow

### 0. Reuse Existing Knowledge (REQUIRED)

Before attempting any non-trivial flow, query what worked previously.

```
mm_knowledge_search { "query": "send flow", "scope": "all", "filters": { "flowTag": "send", "sinceHours": 48 } }
```

If you need to discover which sessions exist:

```
mm_knowledge_sessions { "limit": 10, "filters": { "sinceHours": 48 } }
```

### 1. Build App (if needed)

```
mm_build
```

Options:

- `buildType`: `"expo run:ios --no-install"` (default, currently only supported value)
- `force`: `false` (default) — set to `true` to force rebuild even if a build exists

Builds the app using `yarn expo run:ios --no-install`. Skip if already built.

### 2. Launch App (ALWAYS TAG THE SESSION)

```
mm_launch
```

#### Launch Modes: Watch Mode vs Native Build

**Watch Mode (Recommended for JS development):**

Use `useWatchMode: true` when you're working on JavaScript/React Native code only. This starts a Metro dev server instead of doing a full native build, allowing fast JS bundle refreshes without rebuilding the native app. **The app must already be installed on the simulator.**

```json
{
  "platform": "ios",
  "simulatorDeviceId": "<UDID>",
  "appBundlePath": "/path/to/MetaMask.app",
  "useWatchMode": true,
  "watchModePort": 8081,
  "stateMode": "default",
  "goal": "Send flow smoke",
  "flowTags": ["send"]
}
```

**Native Build (for native code changes):**

Use `autoBuild: true` (the default) when you need a full native rebuild (e.g., after changing native modules, adding native dependencies).

```json
{
  "platform": "ios",
  "simulatorDeviceId": "<UDID>",
  "appBundlePath": "/path/to/MetaMask.app",
  "autoBuild": true,
  "stateMode": "default",
  "goal": "Send flow smoke",
  "flowTags": ["send"]
}
```

#### All mm_launch Options

| Parameter           | Type                                    | Default     | Required         | Description                                                                                                                               |
| ------------------- | --------------------------------------- | ----------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `platform`          | `'browser' \| 'ios'`                    | `'browser'` | No               | Platform to launch on. Use `'ios'` for mobile testing                                                                                     |
| `simulatorDeviceId` | `string`                                | —           | **Yes (if iOS)** | iOS Simulator device UDID                                                                                                                 |
| `appBundlePath`     | `string`                                | —           | **Yes (if iOS)** | Path to MetaMask Mobile `.app` bundle                                                                                                     |
| `useWatchMode`      | `boolean`                               | `false`     | No               | Start a Metro dev server instead of a native build. Requires the app to already be installed. Skips native rebuild                        |
| `watchModePort`     | `number` (1-65535)                      | —           | No               | Port for the dev server. When `useWatchMode=true`, starts dev server on this port. When `false`, assumes dev server already running on it |
| `autoBuild`         | `boolean`                               | `true`      | No               | Automatically run build if app is not found                                                                                               |
| `stateMode`         | `'default' \| 'onboarding' \| 'custom'` | `'default'` | No               | Wallet state: `default` = pre-onboarded with 25 ETH, `onboarding` = fresh wallet, `custom` = use provided fixture                         |
| `fixturePreset`     | `string`                                | —           | No               | Preset fixture name (e.g., `"withMultipleAccounts"`, `"withERC20Tokens"`). Only for `stateMode=custom`                                    |
| `fixture`           | `Record<string, unknown>`               | —           | No               | Direct fixture object for `stateMode=custom`                                                                                              |
| `ports`             | `{ anvil?, fixtureServer? }`            | —           | No               | Custom ports: `anvil` (default: 8545), `fixtureServer` (default: 12345)                                                                   |
| `seedContracts`     | `SmartContractName[]`                   | —           | No               | Smart contracts to deploy on launch (before app loads)                                                                                    |
| `slowMo`            | `number` (0-10000)                      | `0`         | No               | Slow down actions by N milliseconds (for debugging)                                                                                       |
| `extensionPath`     | `string`                                | —           | No               | Custom path to built extension directory                                                                                                  |
| `goal`              | `string`                                | —           | No               | Goal or task description for this session (stored in knowledge store)                                                                     |
| `flowTags`          | `string[]`                              | —           | No               | Flow categorization (e.g., `["send"]`, `["swap", "confirmation"]`). Used for cross-session knowledge retrieval                            |
| `tags`              | `string[]`                              | —           | No               | Free-form tags for ad-hoc filtering (e.g., `["smoke"]`, `["regression"]`)                                                                 |

#### Launch Examples

```json
// Watch mode — JS-only development (RECOMMENDED)
{
  "platform": "ios",
  "simulatorDeviceId": "<UDID>",
  "appBundlePath": "/path/to/MetaMask.app",
  "useWatchMode": true,
  "watchModePort": 8081,
  "stateMode": "default",
  "goal": "Send flow smoke",
  "flowTags": ["send"],
  "tags": ["smoke"]
}

// Fresh wallet requiring onboarding
{
  "platform": "ios",
  "simulatorDeviceId": "<UDID>",
  "appBundlePath": "/path/to/MetaMask.app",
  "useWatchMode": true,
  "watchModePort": 8081,
  "stateMode": "onboarding",
  "goal": "Onboarding flow",
  "flowTags": ["onboarding"],
  "tags": ["smoke"]
}

// Custom fixture preset
{
  "platform": "ios",
  "simulatorDeviceId": "<UDID>",
  "appBundlePath": "/path/to/MetaMask.app",
  "useWatchMode": true,
  "watchModePort": 8081,
  "stateMode": "custom",
  "fixturePreset": "with-tokens",
  "goal": "Token display validation",
  "flowTags": ["tokens"],
  "tags": ["regression"]
}

// With contract seeding
{
  "platform": "ios",
  "simulatorDeviceId": "<UDID>",
  "appBundlePath": "/path/to/MetaMask.app",
  "useWatchMode": true,
  "watchModePort": 8081,
  "stateMode": "default",
  "seedContracts": ["hst", "nfts"],
  "goal": "Token and NFT display",
  "flowTags": ["tokens", "nfts"]
}
```

### 3. Describe Current Screen

```
mm_describe_screen
```

Options:

- `includeScreenshot`: `false` (default) — capture and include a screenshot
- `screenshotName`: Name for the screenshot file (without extension)
- `includeScreenshotBase64`: `false` (default) — include base64-encoded screenshot in response

Returns combined state information:

- Current screen (home, unlock, onboarding-welcome, settings, unknown)
- Visible testIDs
- Accessibility tree with refs (e1, e2, ...)
- Optional prior knowledge from similar flows

### 4. Interact with UI

Use one of two targeting methods (exactly ONE required):

**By a11yRef** (from accessibility snapshot):

```
mm_click { "a11yRef": "e5" }
```

**By testId** (data-testid attribute):

```
mm_click { "testId": "unlock-submit" }
```

**Note:** CSS selectors are NOT supported on iOS. Use `a11yRef` or `testId` only.

#### Click Element

```
mm_click { "testId": "unlock-submit" }
mm_click { "a11yRef": "e12" }
```

#### Type Text

```
mm_type { "testId": "unlock-password", "text": "correct horse battery staple" }
```

#### Wait for Element

```
mm_wait_for { "testId": "home-balance", "timeoutMs": 10000 }
```

### 5. Take Screenshots

```
mm_screenshot { "name": "after-unlock" }
```

Options:

- `name`: Screenshot filename (required, without extension)
- `fullPage`: Capture full page or just viewport (default: `true`)
- `selector`: CSS selector to capture a specific element (optional)
- `includeBase64`: Include base64-encoded image in response (default: `false`)

### 6. Navigate

Mobile navigation is limited to the main tab bar:

```
mm_navigate { "screen": "home" }
mm_navigate { "screen": "settings" }
```

**Note:** URL navigation is NOT supported on iOS (no browser tabs).

### 7. Cleanup (Always Required)

```
mm_cleanup
```

Stops the app, simulator services, Anvil, fixture server, and mock server.

## Typical Workflow Example (Knowledge-First)

### JS Development (Watch Mode — Recommended)

```
0. mm_knowledge_search { "query": "unlock", "scope": "all", "filters": { "sinceHours": 48 } }
1. mm_launch { "platform": "ios", "simulatorDeviceId": "<UDID>", "appBundlePath": "/path/to/MetaMask.app", "useWatchMode": true, "watchModePort": 8081, "stateMode": "default", "goal": "Unlock smoke", "flowTags": ["unlock"], "tags": ["smoke"] }
2. mm_describe_screen
3. mm_type { "testId": "unlock-password", "text": "correct horse battery staple" }
4. mm_click { "testId": "unlock-submit" }
5. mm_describe_screen
6. mm_screenshot { "name": "home-validated" }
7. mm_cleanup
```

### Native Development (Full Build)

```
0. mm_knowledge_search { "query": "unlock", "scope": "all", "filters": { "sinceHours": 48 } }
1. mm_build
2. mm_launch { "platform": "ios", "simulatorDeviceId": "<UDID>", "appBundlePath": "/path/to/MetaMask.app", "autoBuild": true, "stateMode": "default", "goal": "Unlock smoke", "flowTags": ["unlock"], "tags": ["smoke"] }
3. mm_describe_screen
4. mm_type { "testId": "unlock-password", "text": "correct horse battery staple" }
5. mm_click { "testId": "unlock-submit" }
6. mm_describe_screen
7. mm_screenshot { "name": "home-validated" }
8. mm_cleanup
```

Notes:

- Prefer `mm_describe_screen` as your main feedback loop tool.
- Prefer `mm_knowledge_search` early, before exploring.
- Prefer `flowTags` on launch so future searches can filter.
- Use `testId` targets (not `a11yRef`) when running known flows.

## Batching with mm_run_steps

Use `mm_run_steps` to execute multiple tools in a single call when you **already know** the exact sequence of steps.

### When to Use Batching

| Use mm_run_steps                              | Use Individual Calls                        |
| --------------------------------------------- | ------------------------------------------- |
| Known flows from prior knowledge              | First-time exploration                      |
| Deterministic sequences (wizard steps)        | Decisions based on intermediate state       |
| Repetitive patterns (fill form, click submit) | Debugging or investigating issues           |
| Replaying a successful flow                   | When you need to inspect each step's result |

### Example: Batched Unlock Flow

```
mm_run_steps {
  "steps": [
    { "tool": "mm_type", "args": { "testId": "unlock-password", "text": "correct horse battery staple" } },
    { "tool": "mm_click", "args": { "testId": "unlock-submit" } },
    { "tool": "mm_wait_for", "args": { "testId": "wallet-overview", "timeoutMs": 10000 } }
  ],
  "stopOnError": true
}
```

### Observation Modes (includeObservations)

| Value      | Behavior                                                  | Use When                            |
| ---------- | --------------------------------------------------------- | ----------------------------------- |
| `all`      | Full observation (state + testIds + a11y) after each step | Default. Exploration, debugging     |
| `none`     | Minimal observation (state only) - fastest                | Known deterministic flows           |
| `failures` | Minimal on success, full on failure - balanced            | Production flows with error capture |

**Important:** When using `includeObservations: "none"` or `"failures"`, the a11y snapshot is not collected and `refMap` is not refreshed. This means `a11yRef` targets (e.g., `e5`) become stale. **Prefer `testId` targets in fast mode.** If you need `a11yRef`, call `mm_accessibility_snapshot` or `mm_describe_screen` first.

## Error Recovery

### On Failure

1. Call `mm_describe_screen` to see current state
2. Use the built-in `result.priorKnowledge` (when present) to guide next action
3. If still stuck, query prior runs:

```
mm_knowledge_search { "query": "send", "scope": "all", "filters": { "sinceHours": 48 } }
```

4. Check the `state.currentScreen` value:
   - `unlock` - Type password and click submit
   - `home` - Already ready, check for modals
   - `onboarding-welcome` - Complete onboarding flow
   - `settings` - Navigate back to home
   - `unknown` - Take screenshot, investigate

5. Use `mm_knowledge_last { "n": 10 }` to review immediate history (current session)

### IMPORTANT: Restart MCP server after code changes

The MCP server is a long-lived process. If you update the MCP server code, restart the MCP server so new sessions use the updated code.

### Error Codes

| Code                                | Meaning                                           |
| ----------------------------------- | ------------------------------------------------- |
| `MM_BUILD_FAILED`                   | Build command failed                              |
| `MM_DEPENDENCIES_MISSING`           | Required dependencies not installed               |
| `MM_SESSION_ALREADY_RUNNING`        | Session exists, call mm_cleanup first             |
| `MM_NO_ACTIVE_SESSION`              | No session, call mm_launch first                  |
| `MM_PAGE_CLOSED`                    | The page/app was closed unexpectedly              |
| `MM_LAUNCH_FAILED`                  | App launch failed                                 |
| `MM_INVALID_CONFIG`                 | Invalid configuration                             |
| `MM_INVALID_INPUT`                  | Invalid tool parameters                           |
| `MM_PORT_IN_USE`                    | Required port already in use                      |
| `MM_NAVIGATION_FAILED`              | Navigation operation failed                       |
| `MM_NOTIFICATION_TIMEOUT`           | Notification popup timed out                      |
| `MM_TARGET_NOT_FOUND`               | Element not found                                 |
| `MM_CLICK_FAILED`                   | Click operation failed                            |
| `MM_TYPE_FAILED`                    | Type operation failed                             |
| `MM_WAIT_TIMEOUT`                   | Wait timeout exceeded                             |
| `MM_SCREENSHOT_FAILED`              | Screenshot capture failed                         |
| `MM_DISCOVERY_FAILED`               | TestID or a11y snapshot discovery failed          |
| `MM_STATE_FAILED`                   | App state retrieval failed                        |
| `MM_KNOWLEDGE_ERROR`                | Knowledge store operation failed                  |
| `MM_SEED_FAILED`                    | Contract deployment failed                        |
| `MM_CONTRACT_NOT_FOUND`             | Requested contract not deployed                   |
| `MM_TAB_NOT_FOUND`                  | Tab not found (browser only)                      |
| `MM_CAPABILITY_NOT_AVAILABLE`       | Requested capability not available in context     |
| `MM_CONTEXT_SWITCH_BLOCKED`         | Cannot switch context during active session       |
| `MM_SET_CONTEXT_FAILED`             | Context switch failed                             |
| `MM_TOOL_NOT_SUPPORTED_ON_PLATFORM` | Tool not supported on current platform (e.g. iOS) |
| `MM_IOS_RUNNER_NOT_READY`           | XCUITest runner not ready                         |
| `MM_IOS_ELEMENT_NOT_FOUND`          | Element not found on iOS                          |
| `MM_IOS_SNAPSHOT_FAILED`            | iOS accessibility snapshot failed                 |
| `MM_UNKNOWN_TOOL`                   | Unknown tool name                                 |
| `MM_INTERNAL_ERROR`                 | Internal server error                             |

## Knowledge Store

Every tool invocation is recorded to `test-artifacts/llm-knowledge/<sessionId>/steps/`.

### Recommended usage patterns

**Before starting a flow (cross-session search):**

```
mm_knowledge_search { "query": "send flow", "scope": "all", "filters": { "flowTag": "send", "sinceHours": 48 } }
```

**Find recent sessions for a flow:**

```
mm_knowledge_sessions { "limit": 10, "filters": { "flowTag": "send", "sinceHours": 48 } }
```

**Summarize a specific prior session:**

```
mm_knowledge_summarize { "scope": { "sessionId": "mm-ios-..." } }
```

**Review current-session history (debugging):**

```
mm_knowledge_last { "n": 10 }
```

### Practical guidance

- Use `mm_knowledge_search` early (before exploring UI) to reduce rediscovery.
- Always pass `flowTags` on `mm_launch` so filters work.
- Prefer testIDs that were successful in recent sessions.

## Default Credentials

| Property | Value                          |
| -------- | ------------------------------ |
| Password | `correct horse battery staple` |
| Chain ID | `1337`                         |
| Balance  | 25 ETH                         |

## Response Format

All tool responses follow this structure:

```json
{
  "ok": true,
  "result": { ... },
  "meta": {
    "timestamp": "2026-01-15T15:30:00.000Z",
    "sessionId": "mm-ios-abc123-xyz789",
    "durationMs": 150
  }
}
```

Error responses:

```json
{
  "ok": false,
  "error": {
    "code": "MM_TARGET_NOT_FOUND",
    "message": "Element not found",
    "details": { ... }
  },
  "meta": { ... }
}
```

## Known Limitations

1. **iOS only**: Android is not supported (planned for future).
2. **Headed mode only**: Requires visible iOS Simulator (no headless).
3. **Single session**: Only one app session at a time. Call `mm_cleanup` before `mm_launch`.
4. **macOS only**: iOS Simulator requires macOS.
5. **No clipboard**: `mm_clipboard` is not available on iOS (`MM_TOOL_NOT_SUPPORTED_ON_PLATFORM`).
6. **No tabs/notifications**: Single-app model — `mm_switch_to_tab`, `mm_close_tab`, `mm_wait_for_notification` throw on iOS.
7. **No navigation**: `mm_navigate` is not supported on iOS.
8. **No CSS selectors**: Use `a11yRef` or `testId` only for element targeting on iOS.
9. **iOS-required params**: When `platform='ios'`, both `simulatorDeviceId` and `appBundlePath` are **required**.

## Common Failures and Solutions

| Symptom                             | Likely Cause                   | Solution                                         |
| ----------------------------------- | ------------------------------ | ------------------------------------------------ |
| `MM_SESSION_ALREADY_RUNNING`        | Previous session not cleaned   | Call `mm_cleanup` first                          |
| `MM_NO_ACTIVE_SESSION`              | No app running                 | Call `mm_launch` first                           |
| App not found on simulator          | App not built                  | Call `mm_build` or use `autoBuild: true`         |
| `MM_PORT_IN_USE` / `EADDRINUSE`     | Orphan processes               | `lsof -ti:8545,12345,8000,8081 \| xargs kill -9` |
| `MM_TARGET_NOT_FOUND`               | Element not visible            | Use `mm_describe_screen` to check state          |
| `MM_IOS_ELEMENT_NOT_FOUND`          | Element not found on iOS       | Verify testId exists via `mm_list_testids`       |
| `MM_WAIT_TIMEOUT`                   | Slow simulator or UI change    | Increase timeout, check screenshot               |
| `MM_CONTEXT_SWITCH_BLOCKED`         | Switching during session       | Call `mm_cleanup` before `mm_set_context`        |
| `MM_TOOL_NOT_SUPPORTED_ON_PLATFORM` | Browser-only tool on iOS       | Use supported iOS tools only (see table above)   |
| `MM_IOS_RUNNER_NOT_READY`           | XCUITest runner not ready      | Rebuild the XCUITest runner                      |
| `MM_IOS_SNAPSHOT_FAILED`            | A11y snapshot failed on iOS    | Retry or restart session                         |
| `MM_CAPABILITY_NOT_AVAILABLE`       | Feature not in current context | Switch context with `mm_set_context`             |
| Simulator not booting               | Xcode/simulator issue          | Open Xcode, verify simulator is available        |

## Key Files

| File                                               | Purpose                |
| -------------------------------------------------- | ---------------------- |
| `e2e/llm-workflow/mcp-server/server.ts`            | MCP server entrypoint  |
| `e2e/llm-workflow/mcp-server/metamask-provider.ts` | Session manager        |
| `e2e/llm-workflow/app-launcher.ts`                 | iOS simulator launcher |
| `e2e/llm-workflow/capabilities/`                   | 6 capability modules   |
| `e2e/llm-workflow/README.md`                       | Full documentation     |
