# AGENTS.md

This file provides guidance to AI coding agents (Claude, Cursor, Copilot, Windsurf, etc.) when working with code in this repository.

## Project Overview

MetaMask Mobile is a React Native mobile wallet providing access to Ethereum blockchain networks. The app is available for both iOS and Android platforms.

## Essential Commands

### Setup & Installation

```bash
# Expo development (recommended for JS-only development)
yarn setup:expo         # Setup for Expo development
yarn watch:clean        # Start Metro bundler

# Native development (required for native code changes)
yarn setup              # Full setup with native builds
yarn watch:clean        # Start Metro bundler
yarn start:ios          # Run iOS app
yarn start:android      # Run Android app
```

### Testing

```bash
# Unit tests
yarn test:unit                          # Run all unit tests
yarn jest <filename>                    # Run specific test file
yarn jest <filename> -t "<pattern>"     # Run specific test case

# E2E tests
yarn test:e2e:ios:debug:build           # Build iOS E2E app
yarn test:e2e:ios:debug:run             # Run iOS E2E tests
yarn test:e2e:android:debug:build       # Build Android E2E app
yarn test:e2e:android:debug:run         # Run Android E2E tests
```

### Code Quality

```bash
yarn lint              # Run ESLint
yarn lint:fix          # Auto-fix ESLint issues
yarn lint:tsc          # Run TypeScript type checking
yarn format            # Format code with Prettier
yarn format:check      # Check formatting
```

### Build Commands

```bash
yarn build:android:main:dev             # Build Android dev
yarn build:ios:main:dev                 # Build iOS dev
yarn build:android:main:prod            # Build Android production
yarn build:ios:main:prod                # Build iOS production
```

## Architecture

### Core Components

**Engine (`app/core/Engine/`)**: Central coordinator that manages all controllers. This is the heart of the application where blockchain interactions, wallet management, and state coordination happen. Controllers are based on MetaMask's controller architecture pattern.

**Redux Store (`app/store/`)**: Application state management using Redux with Redux Saga for side effects. Persistence handled by redux-persist with filesystem storage.

**Controllers**: MetaMask uses a controller-based architecture where each controller manages a specific domain:

- `KeyringController`: Manages accounts and signing
- `NetworkController`: Manages blockchain network connections
- `TransactionController`: Handles transaction lifecycle
- `AssetsController`: Manages tokens and NFTs
- `PermissionController`: Manages dApp permissions
- `AccountsController`: Manages user accounts
- And 60+ other specialized controllers

**BackgroundBridge (`app/core/BackgroundBridge/`)**: Communication layer between the app and dApps using a bridge pattern similar to browser extensions.

### Directory Structure

```
app/
├── actions/              # Redux action creators
├── component-library/    # Design system components (use FIRST)
├── components/           # Feature-specific components (use SECOND)
├── constants/            # App-wide constants
├── core/                 # Core services (Engine, Analytics, etc.)
├── reducers/             # Redux reducers
├── selectors/            # Redux selectors (use reselect)
├── util/                 # Utility functions
├── hooks/                # Custom React hooks
└── styles/               # Global styles

tests/smoke               # Detox Smoke E2E tests
tests/regression          # Detox Regression E2E tests
docs/                     # Documentation
scripts/                  # Build and automation scripts
```

## Development Guidelines

**Detailed guidelines are in `docs/testing/`** (canonical, in-repo) and the `mms-*` skill set installed via `yarn skills` (Cursor / Codex / Claude harnesses):

| Guide                                                                          | Scope                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------- |
| [`docs/testing/unit-testing.md`](docs/testing/unit-testing.md)                 | `*.test.*` files — test patterns, mocking, AAA    |
| [`docs/testing/e2e-testing.md`](docs/testing/e2e-testing.md)                   | Detox smoke/regression — Page Objects, gestures   |
| [`docs/testing/component-view-tests.md`](docs/testing/component-view-tests.md) | `*.view.test.tsx` — framework, presets, renderers |

General coding, UI, deeplink-handler, and PR-creation guidance now lives in the centralized `mms-*` skill set installed via `yarn skills` (see `.agents/skills/mms-*` after sync).

### Quick Reference

- **TypeScript**: All new code MUST be TypeScript, NO `any` type
- **Components**: Design system first → `component-library` second → custom last
- **Styling**: Use `useTailwind()` hook, `Box`/`Text` components, design tokens
- **Testing**: Mandatory for all code, AAA pattern, mock everything external
- **Commands**: ONLY use yarn (never npm/npx)

## Environment Setup

See detailed setup documentation:

- **Expo (recommended)**: [docs/readme/expo-environment.md](./docs/readme/expo-environment.md)
- **Native development**: [docs/readme/environment.md](./docs/readme/environment.md)
- **Infura & Firebase**: [README.md](./README.md#getting-started)

**Required Tools**: Node.js ^20.18.0 • Yarn ^4.10.3 • Watchman

### AI Tooling — Developer Usage Collection

All three agent harnesses (Yarn, Claude Code, Cursor) automatically record tool/skill usage to a local SQLite database at `~/.tool-usage-collection/events.db`. This is developer-only, stored locally, and never sent anywhere.

To opt out, set `TOOL_USAGE_COLLECTION_OPT_IN=false` in your shell profile. Collection is also automatically disabled in CI (`CI` env var set).

| Path              | Mechanism                                                                                       | Tokens |
| ----------------- | ----------------------------------------------------------------------------------------------- | ------ |
| `yarn <script>`   | Yarn Berry plugin (`wrapScriptExecution`)                                                       | 0      |
| Claude Code skill | `PreToolUse` hook in `.claude/skills/<skill>/SKILL.md` frontmatter                              | 0      |
| Cursor skill      | `beforeReadFile` hook in `.cursor/hooks.json` → `scripts/tooling/cursor-hook-skill-tracking.ts` | 0      |

Inspect your local activity:

```bash
yarn tooling:report
# or directly:
sqlite3 ~/.tool-usage-collection/events.db \
  "SELECT tool_name, event_type, agent_vendor, created_at FROM events ORDER BY created_at DESC LIMIT 10;"
```

See [`scripts/tooling/README.md`](./scripts/tooling/README.md) for full implementation details.

## Key Patterns

### State Management

- Use Redux for global state
- Use Redux Saga for side effects
- Use reselect for selectors with memoization
- Redux store is persisted to filesystem

### Navigation

- React Navigation v5
- Stack and Bottom Tab navigators
- Navigation service in `app/core/NavigationService/`

### MetaMask Controllers

- Controllers follow MetaMask's BaseController pattern
- Events and state changes flow through messenger system
- Engine coordinates all controller interactions
- Controllers are composable via ComposableController

## Build Types

The app supports multiple build types:

- `main`: Production MetaMask
- `flask`: Development/experimental features

Use environment variable `METAMASK_BUILD_TYPE` to switch.

## Security

- All sensitive data encrypted via SecureKeychain
- Vault encryption for keyring storage
- Hardware wallet support (Ledger, Keystone)
- Never log sensitive information
- Follow OWASP security guidelines

## Development Workflow

If the user asks to implement a ticket directly from Jira:

1. Get the details directly from the link
2. Start a simulator (ask which platform: iOS or Android)
3. Run setup: `yarn setup` → `yarn watch:clean` → `yarn start:{ios|android}`
4. Implement the ticket as prompted
5. Use screenshots for feedback if needed

## Documentation References

| Documentation             | Path                                         |
| ------------------------- | -------------------------------------------- |
| Architecture              | `/docs/readme/architecture.md`               |
| Environment Setup         | `/docs/readme/environment.md`                |
| E2E Testing               | `/docs/readme/e2e-testing.md`                |
| Debugging                 | `/docs/readme/debugging.md`                  |
| Performance               | `/docs/readme/performance.md`                |
| Storybook                 | `/docs/readme/storybook.md`                  |
| Troubleshooting           | `/docs/readme/troubleshooting.md`            |
| MetaMask Contributor Docs | https://github.com/MetaMask/contributor-docs |
| E2E CI Decision Tree      | `.github/guidelines/E2E_DECISION_TREE.md`    |

## Test Guidelines

Three test types coexist in this repo:

- **Unit tests** (`*.test.tsx`)
- **Component view tests** (`*.view.test.tsx`)
- **E2E tests** (`tests/smoke/`, `tests/regression/`)

For conventions and skill references for each type, read `tests/AGENTS.md`.

## A/B Testing Agent Standard

For A/B test implementation or review tasks, use the canonical standard:

- `docs/ab-testing.md` (`Agent Execution Standard (SSOT)`)

Codex skill entrypoint:

- `.agents/skills/ab-testing-implementation/SKILL.md` (`$ab-testing-implementation`)

Harness entrypoints:

- Claude: `.claude/commands/create-ab-test.md` (`/create-ab-test`)
- Cursor: `.cursor/commands/create-ab-test.md` (`/create-ab-test`) shim to Claude command
- Windsurf and other harnesses: start prompts with `Follow docs/ab-testing.md section "Agent Execution Standard (SSOT)".`

Compliance check command:

```bash
bash scripts/check-ab-testing-compliance.sh --staged
```

If no files are staged, the checker automatically falls back to changed working-tree files.
