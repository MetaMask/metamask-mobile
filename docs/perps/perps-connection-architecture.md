# Perps Connection Architecture

## Overview

The Perps connection system uses a layered architecture where each layer has clear responsibilities and ownership boundaries.

## Layer Stack

```mermaid
graph TD
    UI[UI Components] -->|uses| Hook[usePerpsConnection]
    Hook -->|reads context from| Provider[PerpsConnectionProvider]
    Provider -->|delegates to| Manager[PerpsConnectionManager]
    Manager -->|orchestrates| Controller[PerpsController]
    Controller -->|manages| HP[HyperLiquidProvider]
    HP -->|REST API| API[HyperLiquid API]
    HP -->|WebSocket| WS[WebSocket Subscriptions]

    Provider -.polls state from.-> Manager
    Controller -.stores data in.-> Redux[Redux State]
```

## Layer Responsibilities

### Hook Layer: usePerpsConnection

**What it is**: React hook that provides access to connection state and methods for UI components

**Owns**:

- Nothing - it's a pure accessor hook

**Responsibilities**:

- Read connection context from PerpsConnectionProvider
- Provide type-safe access to connection state and methods
- Throw error if used outside of Provider

**Does NOT**:

- Store any state
- Perform any logic
- Know about Manager, Controller, or Provider implementation

**Key API**: Returns `{ isConnected, isConnecting, isInitialized, error, connect, disconnect, reconnectWithNewContext, resetError }`

**Usage**: Primary API for all UI components to interact with the connection system

---

### UI Layer: PerpsConnectionProvider

**What it is**: React Context provider that exposes connection state and methods to UI components

**Owns**:

- Local React state (polled from Manager)
- Polling interval for state synchronization
- UI-level error handling decisions (show error screen vs skeleton)
- Internal visibility lifecycle management (via `usePerpsConnectionLifecycle` hook)

**Responsibilities**:

- Translate singleton Manager state into React state
- Provide stable callback functions to UI
- Decide when to show loading skeleton vs error screen vs content
- Handle app/tab visibility changes (connect when visible, disconnect when hidden)
- Handle E2E mode with mock state

**Does NOT**:

- Manage actual connection lifecycle (delegates to Manager)
- Know about WebSockets or providers
- Handle race conditions or reconnection logic

**Exposes**: Connection context via `PerpsConnectionContext` that `usePerpsConnection` hook reads from

**Note**: Internally uses `usePerpsConnectionLifecycle` to automatically connect/disconnect based on app state and tab visibility (with 300ms stabilization delay on app foreground), but this is an implementation detail not exposed to UI components. Account and network change monitoring is handled by the Manager layer via Redux subscriptions, not by the Provider.

---

### Manager Layer: PerpsConnectionManager (Singleton)

**What it is**: Orchestrator that coordinates connection lifecycle and manages connection state

**Owns**:

- Connection state (`isConnected`, `isConnecting`, `isInitialized`, `error`)
- Race condition guards (`initPromise`, `pendingReconnectPromise`)
- Grace period timer (`CONNECTION_GRACE_PERIOD_MS` = 20s delay before disconnect)
- Connection timeout management (30s limit for connection attempts)
- Reference counting (tracks active provider instances)
- Stream manager caches (via PerpsStreamManager singleton - separate channels for prices, orders, positions, account state; provides instant cached data to subscribers; supports pause/resume for race condition prevention)
- Redux store subscription for account/network change monitoring

**Responsibilities**:

- Coordinate connect/disconnect based on provider reference counting
- Monitor Redux for account and network changes, trigger reconnection automatically
- Handle force flag logic (cancel pending operations vs wait, including timeout timers)
- Implement grace period (20s) to prevent flickering disconnects
- Enforce connection timeout (30s) to prevent indefinite hanging
- Clear stream caches during reconnection
- Delegate actual provider initialization to Controller
- Validate connection with WebSocket health checks via `provider.ping()` (replaces blocking HTTP calls)

**Does NOT**:

- Create or manage provider instances
- Know about specific exchange protocols
- Update Redux state
- Handle WebSocket connections directly

**Key Methods**:

- `connect()` - Initialize connection if first provider instance
- `disconnect()` - Disconnect if last provider instance (after grace period)
- `reconnectWithNewContext(options?: ReconnectOptions)` - Coordinate full reconnection with optional force flag

---

## Subscription Warmup Process

After controller initialization, the ConnectionManager pre-warms WebSocket subscriptions to enable instant UI rendering.

### Warmup Sequence

```
PerpsConnectionManager.connect()
    └── preloadSubscriptions()
            ├── positions.prewarm() → webData3 subscription
            ├── orders.prewarm() → webData3 subscription
            ├── account.prewarm() → webData3 subscription
            ├── marketData.prewarm() → assetCtxs subscription
            ├── oiCaps.prewarm() → OI caps data
            ├── fills.prewarm() → Fill notifications
            └── prices.prewarm() → allMids for all markets (async)
```

### Channels Pre-warmed

| Channel    | Data                     | Subscription       |
| ---------- | ------------------------ | ------------------ |
| positions  | User positions           | webData3           |
| orders     | Open orders              | webData3           |
| account    | Account balance          | webData3           |
| marketData | Funding, OI, mark prices | assetCtxs per DEX  |
| oiCaps     | Open interest caps       | OI caps            |
| fills      | Trade fills              | Fill notifications |
| prices     | All market prices        | allMids per DEX    |

### Benefits

- **Instant data**: UI components receive cached data immediately on mount
- **Single subscription**: Components share pre-warmed subscriptions via reference counting
- **No throttle**: Pre-warm uses throttleMs=0 for fastest cache population

### Cleanup

Pre-warm subscriptions are cleaned up during:

- `disconnect()` - When last provider unmounts
- `reconnectWithNewContext()` - Before reinitializing
- Cache clearing - When account/network changes

---

### Controller Layer: PerpsController (Redux)

**What it is**: Redux controller that manages provider instances and exposes data methods

**Owns**:

- Provider instances (`Map<string, Provider>`)
- Redux state (account state, orders, positions, market data)
- Initialization flags (`isInitialized`, `isReinitializing`)
- Network configuration (testnet vs mainnet)

**Responsibilities**:

- Create and destroy provider instances
- Disconnect old providers and create new ones during reinitialization
- Expose data access methods (`getAccountState`, `placeOrder`, etc.)
- Update Redux state based on provider data
- Handle provider-level errors and log to Sentry

**Does NOT**:

- Handle reconnection orchestration (Manager's job)
- Know about force flags or pending operations
- Manage UI state or React lifecycle
- Implement grace periods or reference counting

**Key Methods**:

- `initializeProviders()` - Disconnect old providers, create new ones
- `disconnect()` - Disconnect provider and reset initialization state
- `getAccountState()`, `placeOrder()`, etc. - Data access methods

---

### Provider Layer: HyperLiquidProvider

**What it is**: Exchange-specific implementation of the provider interface

**Owns**:

- REST API clients (InfoClient for queries, ExchangeClient for trading)
- WebSocket connection for real-time subscriptions
- Exchange-specific API request formatting
- Protocol-specific message handling
- Subscription management

**Responsibilities**:

- Make REST API calls for trading operations (place/cancel/edit orders)
- Make REST API calls for data queries (account state, positions, market info)
- Establish and maintain WebSocket connection for real-time subscriptions
- Provide `ping()` for WebSocket health checks (5s timeout) - used by Manager for connection validation
- Format requests according to exchange protocol
- Parse responses and normalize data
- Handle exchange-specific errors
- Manage subscriptions (prices, order fills, position updates)

**Does NOT**:

- Know about Redux or React
- Handle reconnection logic
- Implement grace periods or timeouts
- Manage multiple provider instances

**Communication Methods**:

- **REST API**: Account queries, order placement/cancellation, balance checks, market data
- **WebSocket**: Real-time price updates, order fill notifications, position changes, health checks

**Key Methods**:

- `connect()` - Initialize REST clients and WebSocket connection
- `disconnect()` - Close WebSocket and cleanup clients
- `ping()` - WebSocket health check to validate connection responsiveness
- `placeOrder()`, `cancelOrder()` - Trading via REST API
- `getAccountState()`, `getPositions()` - Data queries via REST API
- `subscribeToPrices()`, `subscribeToOrders()` - Real-time updates via WebSocket

---

## Design Principles

- **Manager Orchestrates, Controller Provides Primitives**: Manager coordinates "when" and "why" to reconnect; Controller provides "how" to initialize/disconnect providers
- **Provider is Exchange-Agnostic Interface**: Controller doesn't know about HyperLiquid specifics; easy to add new providers
- **UI Layer is Presentation Only**: Provider (React) polls state from Manager (singleton); no business logic in React components
- **Clear Ownership Boundaries**: Each layer owns specific concerns; no cross-layer state management; dependencies flow downward only

---

## Key Methods by Layer

### Manager Layer Methods

| Method                      | Signature                                       | Purpose                                         |
| --------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| `connect()`                 | `() => Promise<void>`                           | Initialize connection if first provider         |
| `disconnect()`              | `() => Promise<void>`                           | Disconnect if last provider (with grace period) |
| `reconnectWithNewContext()` | `(options?: ReconnectOptions) => Promise<void>` | Coordinate full reconnection                    |
| `getConnectionState()`      | `() => ConnectionState`                         | Get current connection state (for polling)      |
| `resetError()`              | `() => void`                                    | Clear error state                               |

### Controller Layer Methods

| Method                  | Signature                     | Purpose                              |
| ----------------------- | ----------------------------- | ------------------------------------ |
| `initializeProviders()` | `() => Promise<void>`         | Disconnect old, create new providers |
| `disconnect()`          | `() => Promise<void>`         | Disconnect provider, reset flags     |
| `getAccountState()`     | `() => Promise<AccountState>` | Fetch account data                   |
| `placeOrder()`          | `(order) => Promise<void>`    | Submit order                         |

### Provider Layer Methods (React)

| Method                      | Signature                     | Purpose              |
| --------------------------- | ----------------------------- | -------------------- |
| `connect()`                 | `() => Promise<void>`         | Delegates to Manager |
| `disconnect()`              | `() => Promise<void>`         | Delegates to Manager |
| `reconnectWithNewContext()` | `(options?) => Promise<void>` | Delegates to Manager |
| `resetError()`              | `() => void`                  | Delegates to Manager |

---

## ReconnectOptions

```typescript
interface ReconnectOptions {
  force?: boolean; // default: false
}
```

**Only used at Manager layer** - Controls pending operation handling:

- `force: false` (default): Waits for pending operations → safe for automatic reconnects
- `force: true`: Cancels pending operations AND clears connection timeout timer → user-initiated retry

**Why Controller doesn't need it**: Manager calls `initializeProviders()` directly which always does full reinitialization with provider disconnect/recreate.

**Additional Effects of force: true**:

- Cancels grace period immediately
- Clears connection timeout timer
- Clears all pending promises: `initPromise`, `pendingReconnectPromise`

---

## Flow Scenarios

### User Retry (force: true)

**Why each layer is involved**:

- **UI**: User clicks retry button → Provider.reconnectWithNewContext({ force: true })
- **Provider (React)**: Delegates to Manager singleton
- **Manager**: Cancels pending promises, clears caches, calls Controller.initializeProviders()
- **Controller**: Disconnects old provider, creates new one
- **Provider (Exchange)**: Closes WebSocket, establishes new connection

```mermaid
sequenceDiagram
    participant UI as UI Component
    participant RP as React Provider
    participant M as Manager
    participant C as Controller
    participant P as Exchange Provider
    participant W as WebSocket

    UI->>RP: onClick retry
    RP->>M: reconnectWithNewContext({force: true})
    M->>M: Cancel pending promises
    M->>M: Clear stream caches
    M->>C: initializeProviders()
    C->>P: disconnect()
    P->>W: close()
    C->>C: Create new provider
    C->>P: (implicit connect via getAccountState)
    P->>W: establish connection
    W-->>UI: Connected
```

### Account Switch (force: false)

**Why each layer is involved**:

- **UI**: Account changed → Lifecycle hook calls reconnect
- **Provider (React)**: Delegates to Manager
- **Manager**: Waits for pending operations, then reinitializes
- **Controller**: Disconnects old provider (old account), creates new one
- **Provider (Exchange)**: Closes WebSocket, establishes new connection with new account context

```mermaid
sequenceDiagram
    participant UI as UI Component
    participant RP as React Provider
    participant M as Manager
    participant C as Controller
    participant P as Exchange Provider

    UI->>RP: Account changed
    RP->>M: reconnectWithNewContext()
    M->>M: Wait for pending operations
    M->>M: Clear stream caches
    M->>C: initializeProviders()
    C->>P: disconnect old provider
    C->>C: create new provider
    P-->>UI: Connected with new account
```

---

## Race Condition Guards

Each layer protects against its own concurrency concerns:

| Guard                     | Location   | Purpose                           | Why This Layer                     |
| ------------------------- | ---------- | --------------------------------- | ---------------------------------- |
| `initPromise`             | Manager    | Prevents concurrent connect()     | Manager owns connection lifecycle  |
| `pendingReconnectPromise` | Manager    | Prevents concurrent reconnects    | Manager coordinates reconnection   |
| `isReinitializing`        | Controller | Prevents concurrent provider init | Controller owns provider instances |

### Rapid Account Switch Protection

**Scenario**: User rapidly switches Account A → B → C

The Manager's `pendingReconnectPromise` ensures only one reconnection happens at a time:

1. **A → B**: Triggers `reconnectWithNewContext()` → creates `pendingReconnectPromise`
2. **B → C** (during B reconnection): Calls `reconnectWithNewContext()` again
3. **Manager**: Returns existing `pendingReconnectPromise` (doesn't start new reconnection)
4. **When B completes**: Promise is cleared, state is updated
5. **C change detected**: New reconnection starts with fresh promise

**Result**: The final account (C) will be correctly connected because:

- Each reconnection fetches account address fresh at execution time
- Redux subscription in Manager detects every account change and queues reconnection
- `pendingReconnectPromise` serializes reconnections to prevent race conditions
- The last account change always triggers a reconnection after previous one completes
- Stream caches are cleared immediately on account change to prevent old data from showing

---

## When to Use What

| Scenario          | Method                      | Options           | Which Layer Decides                        | Notes                                         |
| ----------------- | --------------------------- | ----------------- | ------------------------------------------ | --------------------------------------------- |
| Initial load      | `connect()`                 | -                 | Manager (via Provider hook)                | Uses WebSocket ping for validation            |
| User retry button | `reconnectWithNewContext()` | `{ force: true }` | UI → Provider → Manager                    | Cancels pending operations + timeout timer    |
| Account switch    | `reconnectWithNewContext()` | default           | Manager (automatic via Redux subscription) | Clears caches immediately before reconnection |
| Network switch    | `reconnectWithNewContext()` | default           | Manager (automatic via Redux subscription) | Same as account switch                        |
| App background    | `disconnect()`              | -                 | Provider lifecycle hook → Manager          | Grace period (20s) before actual disconnect   |
| App foreground    | `connect()`                 | -                 | Provider lifecycle hook → Manager          | 300ms stabilization delay to prevent races    |

---

## Error Handling by Layer

Each layer handles errors at its own level:

1. **Provider Layer (Exchange)**:
   - Catches WebSocket errors, logs to Sentry
   - Returns error state to Controller

2. **Controller Layer**:
   - Catches provider errors, logs to Sentry
   - Updates Redux error state
   - Throws to Manager

3. **Manager Layer**:
   - Catches Controller errors, logs to DevLogger
   - Sets local error state
   - Does NOT throw (prevents crash)

4. **Provider Layer (React)**:
   - Catches Manager errors, logs to Sentry
   - Polls error state from Manager
   - Decides UI presentation (error screen vs retry button)

**All layers update state regardless of error to keep UI in sync.**
