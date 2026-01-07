# AGENTS.md

This file provides guidance to AI coding agents (Claude, Cursor, Copilot, Windsurf, etc.) when working with code in this repository.

> **Note**: `CLAUDE.md` is a symlink to this file for tool compatibility.

## Project Overview

MetaMask Mobile is a React Native mobile wallet providing access to Ethereum blockchain networks. The app is available for both iOS and Android platforms.

## Essential Commands

### Setup & Installation

```bash
# Expo development (recommended for JS-only development)
yarn setup:expo         # Setup for Expo development
yarn watch              # Start Metro bundler

# Native development (required for native code changes)
yarn setup              # Full setup with native builds
yarn watch              # Start Metro bundler
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

### MANDATORY: Read Before Coding

1. `.github/guidelines/CODING_GUIDELINES.md`
2. `README.md`
3. Relevant documentation in `/docs`
4. `.cursor/rules/` for specific patterns

### TypeScript Requirements

- All new code MUST be TypeScript
- Use proper types (NO `any` type)
- Follow [MetaMask TypeScript Guidelines](https://github.com/MetaMask/contributor-docs/blob/main/docs/typescript.md)

### Component Development

**Component Hierarchy (STRICT ORDER)**:

1. **FIRST**: Use `@metamask/design-system-react-native` components
2. **SECOND**: Use `app/component-library` components
3. **LAST RESORT**: Custom components

**Styling Rules**:

- Use `const tw = useTailwind();` hook (NEVER `import tw from 'twrnc'`)
- Use `<Box>` instead of `<View>`
- Use `<Text variant={TextVariant.BodyMd}>` instead of raw `<Text>`
- Use `twClassName` prop for static styles
- Use design tokens: `bg-default`, `text-primary`, `border-muted`
- NEVER use StyleSheet.create()
- NEVER use arbitrary color values

### File Organization

```
ComponentName/
├── ComponentName.tsx           # Main component
├── ComponentName.types.ts      # TypeScript interfaces
├── ComponentName.constants.ts  # Constants
├── ComponentName.styles.ts     # Styles (if needed)
├── ComponentName.test.tsx      # Unit tests
├── ComponentName.stories.tsx   # Storybook stories
├── README.md                   # Component documentation
└── index.ts                    # Export
```

### Testing Requirements

**Unit Tests**:

- MANDATORY for all components and utilities
- NEVER use "should" in test names
- Use AAA pattern (Arrange, Act, Assert) with blank line separation
- Mock ALL external dependencies
- Use `act()` for async operations that update state
- Follow [Unit Testing Guidelines](https://github.com/MetaMask/contributor-docs/blob/main/docs/testing/unit-testing.md)

**E2E Tests**:

- ALWAYS use Page Object Model pattern
- Import framework utilities from `e2e/framework/index.ts`
- NEVER use `TestHelpers.delay()` - use proper assertions
- Use descriptive `description` parameters in all assertions/gestures
- Follow `/docs/readme/e2e-testing.md`

## Environment Setup

**Required Tools**:

- Node.js: ^20.18.0 (see `.nvmrc`)
- Yarn: ^4.10.3 (use corepack)
- Watchman (recommended)

**iOS**:

- Xcode (latest)
- Ruby (see `.ruby-version`)
- CocoaPods (via bundler)

**Android**:

- Android Studio
- JDK 17

**Configuration Files**:

- `.js.env` - Environment variables (copy from `.js.env.example`)
- Firebase setup required for FCM (see README.md)
- Infura Project ID required (`MM_INFURA_PROJECT_ID`)

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

### Async Operations

- Use Redux Saga for complex async flows
- Use `useCallback` with dependencies for component async handlers
- Always handle errors and loading states

## Build Types

The app supports multiple build types:

- `main`: Production MetaMask
- `flask`: Development/experimental features
- `qa`: QA testing builds

Use environment variable `METAMASK_BUILD_TYPE` to switch.

## Common Pitfalls

1. **NEVER use npm/npx** - always use yarn
2. **NEVER import twrnc directly** - use `useTailwind()` hook
3. **NEVER skip mocking in tests** - mock everything not under test
4. **NEVER use raw View/Text** - use Box/Text from design system
5. **NEVER commit without running tests** - `yarn test:unit`
6. **NEVER bypass git hooks** unless absolutely necessary

## Performance Considerations

- Use `useMemo` and `useCallback` for expensive computations
- Use FlatList/FlashList for large lists
- Follow performance guidelines in `/docs/readme/performance.md`
- Profile with Reassure for performance testing

## Security

- All sensitive data encrypted via SecureKeychain
- Vault encryption for keyring storage
- Hardware wallet support (Ledger, Keystone)
- Never log sensitive information
- Follow OWASP security guidelines

## Development workflow

If the user ask to implment a ticket directly from Jira

- You will get the details directly from the link
- Start a simulator
  - Ask which simulator they will like to open (Android or iOS)
  - You have scripts on the `package.json` to run both
    - First run `yarn setup`
    - Once the above finishes `yarn watch:clean`
    - Then on another terminal `yarn start:{ios|android}`
- Start implementing the ticket as it was a prompt from the user.
- If you need feedback you can make screenshots.

## Documentation References

- Architecture: `/docs/readme/architecture.md`
- Environment Setup: `/docs/readme/environment.md`
- E2E Testing: `/docs/readme/e2e-testing.md`
- Debugging: `/docs/readme/debugging.md`
- MetaMask Contributor Docs: https://github.com/MetaMask/contributor-docs
- Storybook: `/docs/readme/storybook.md`
