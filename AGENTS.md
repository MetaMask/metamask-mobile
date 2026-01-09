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

e2e/                      # Detox E2E tests
docs/                     # Documentation
scripts/                  # Build and automation scripts
```

## Development Guidelines

**Detailed guidelines are in `.cursor/rules/`** - these are automatically applied by Cursor:

| Rule File                         | Scope                                                |
| --------------------------------- | ---------------------------------------------------- |
| `general-coding-guidelines.mdc`   | Always applied - coding standards, file organization |
| `ui-development-guidelines.mdc`   | UI components - design system, Tailwind, styling     |
| `unit-testing-guidelines.mdc`     | `*.test.*` files - test patterns, mocking, AAA       |
| `e2e-testing-guidelines.mdc`      | Always applied - E2E patterns, Page Objects          |
| `component-view-testing.mdc`      | Component testing with presets/renderers             |
| `deeplink-handler-guidelines.mdc` | Deeplink handler implementation                      |
| `pr-creation-guidelines.mdc`      | Pull request standards                               |

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
- `qa`: QA testing builds

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
