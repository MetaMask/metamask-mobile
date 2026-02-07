# Architecture

To get a better understanding of the internal architecture of this app take a look at [this diagram](https://github.com/MetaMask/metamask-mobile/blob/main/architecture.svg).

## Overview

### Core components

- **Engine** (`app/core/Engine/`) — Central coordinator that manages all controllers. Handles blockchain interactions, wallet management, and state coordination. Controllers follow MetaMask's controller architecture pattern.

- **Redux Store** (`app/store/`) — Application state management with Redux and Redux Saga for side effects. Persistence is handled by redux-persist with filesystem storage.

- **Controllers** — Each controller manages a specific domain (e.g. `KeyringController`, `NetworkController`, `TransactionController`, `AssetsController`, `PermissionController`, `AccountsController`, and 60+ others). They follow the BaseController pattern; events and state flow through the messenger system. The Engine coordinates all controller interactions; controllers are composable via ComposableController.

- **BackgroundBridge** (`app/core/BackgroundBridge/`) — Communication layer between the app and dApps, using a bridge pattern similar to browser extensions.

### Directory structure (app)

```
app/
├── actions/              # Redux action creators
├── component-library/    # Design system components (use first)
├── components/           # Feature-specific components (use second)
├── constants/            # App-wide constants
├── core/                 # Engine, Analytics, BackgroundBridge, etc.
├── reducers/             # Redux reducers
├── selectors/            # Redux selectors (use reselect)
├── util/                 # Utility functions
├── hooks/                # Custom React hooks
└── styles/               # Global styles
```

### Navigation

- React Navigation v5; Stack and Bottom Tab navigators. Navigation service: `app/core/NavigationService/`.

For more detail, see the [architecture diagram](https://github.com/MetaMask/metamask-mobile/blob/main/architecture.svg) and [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs).
