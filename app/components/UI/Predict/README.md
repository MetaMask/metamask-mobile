# Prediction markets

The Predict feature enables users to participate in prediction markets within MetaMask Mobile. This document reflects the current implementation architecture and structure.

## Architecture Layers

```
┌─────────────────────────────────────┐
│           Components (UI)           │
├─────────────────────────────────────┤
│            Hooks (React)            │
├─────────────────────────────────────┤
│         Controller (Business)       │
├─────────────────────────────────────┤
│         Providers (Protocol)        │
└─────────────────────────────────────┘
```

## File Structure

```
/Predict
├── /components                  # Reusable UI components
│   ├── /MarketListContent       # Market list display component
│   ├── /MarketsWonCard          # Won markets display card
│   ├── /PredictHome             # Homepage components (positions, featured markets)
│   ├── /PredictMarket           # Market wrapper component (routes to single/multiple)
│   ├── /PredictMarketSingle     # Single outcome market card component
│   ├── /PredictMarketMultiple   # Multiple outcome market selection component
│   ├── /PredictNewButton        # New prediction creation button
│   ├── /PredictPosition         # Position display component
│   └── /SearchBox               # Market search component
├── /controllers                 # Controllers for PredictMarket
│   └── PredictController.ts     # Main controller with tests
├── /hooks                       # React integration hooks (6 hooks)
│   ├── usePredictBuy.ts         # Buy order placement hook
│   ├── usePredictSell.ts        # Sell order placement hook
│   ├── usePredictTrading.ts     # Core trading operations
│   ├── usePredictMarketData.tsx # Market data fetching with pagination
│   ├── usePredictPositions.ts   # User positions management
│   └── usePredictOrders.tsx     # Order state management and notifications
├── /mocks                       # Test mocks and fixtures
│   └── remoteFeatureFlagMocks.ts
├── /providers                   # Protocol implementations
│   ├── /polymarket              # Polymarket provider implementation
│   │   ├── PolymarketProvider.t s
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   └── types.ts                 # Provider interface definitions
├── /routes                      # Navigation route definitions
│   └── index.tsx
├── /selectors                   # Redux state selectors
│   └── /featureFlags            # Feature flag selectors
│       └── index.ts
├── /types                       # TypeScript type definitions
│   ├── index.ts                 # Core types and interfaces
│   └── navigation.ts            # Navigation type definitions
├── /utils                       # Utility functions
│   ├── format.ts                # Price, percentage, and volume formatting
│   └── orders.ts                # Order ID generation utilities
├── /views                       # Main screen components
│   ├── /PredictBuyWithAnyToken  # Buy/order flow (single-route architecture)
│   ├── /PredictCashOut          # Cash out/redeem positions screen
│   ├── /PredictMarketDetails    # Individual market details screen
│   ├── /PredictMarketList       # Market listing screen
│   └── /PredictTabView          # Main tabbed view container
└── index.ts                     # Main entry point
```

## Hooks - Current Implementation

### Trading Operations

- `usePredictBuy` - Buy order placement with loading states, callbacks, and toast notifications
- `usePredictSell` - Sell order placement with loading states, callbacks, and toast notifications
- `usePredictTrading` - Core trading operations (buy/sell/getPositions) via PredictController

### Data Management

- `usePredictMarketData` - Market data fetching with pagination, search, infinite scroll, and retry logic
- `usePredictPositions` - User positions management with focus refresh, loading states, and refresh capabilities
- `usePredictOrders` - Order state management with automatic toast notifications for status changes

### Implementation Details

#### Trading Hooks (`usePredictBuy`, `usePredictSell`)

- **Loading states**: `placing`, `completed`, `error`
- **Toast notifications**: Automatic notifications for order placement, completion, and failures
- **Callbacks**: `onComplete`, `onError`
- **Order tracking**: Real-time order status via Redux state selectors
- **Utilities**: `isOutcomeLoading()` for UI state, `reset()` for cleanup

#### Data Management Hooks

- **`usePredictMarketData`**: Supports category filtering, search, pagination with `fetchMore()`, and exponential backoff retry logic
- **`usePredictPositions`**: Implements `useFocusEffect` for screen refresh, separate loading states for initial load vs refresh
- **`usePredictOrders`**: Automatic toast notifications based on Redux state changes, manages notification queue

## Duplication Prevention

Before creating a new hook:

1. Check existing hooks in relevant category
2. Consider composing existing hooks
3. Follow naming: `usePredict[Feature][Action]`
4. Keep single responsibility

## Key Patterns

### Validation Flow

Provider validation (protocol rules) → Hook adds UI rules → Component displays errors

### Data Flow

Controller → Redux Store → Hooks → Components

### Real-time Updates

WebSocket → Controller → Redux → Hooks with subscription

### Form Management

Component input → Hook state → Validation → Controller action

## Quick Hook Selection Guide

| Need                     | Use Hook                 | Key Features                                                                     |
| ------------------------ | ------------------------ | -------------------------------------------------------------------------------- |
| Place buy orders         | `usePredictBuy`          | Loading states, toast notifications, callbacks                                   |
| Place sell orders        | `usePredictSell`         | Loading states, toast notifications, callbacks                                   |
| Direct controller access | `usePredictTrading`      | Core buy/sell/getPositions operations                                            |
| Market data with search  | `usePredictMarketData`   | Pagination, infinite scroll, category filtering                                  |
| User positions           | `usePredictPositions`    | Focus refresh, loading states, account-based                                     |
| Market data              | `usePredictMarket`       | Market data fetching with pagination, search, infinite scroll, and retry logic   |
| Price history            | `usePredictPriceHistory` | Price history fetching with pagination, search, infinite scroll, and retry logic |
| Order notifications      | `usePredictOrders`       | Automatic toast notifications, status tracking                                   |

## PredictBuyWithAnyToken

The buy/order flow lives in `views/PredictBuyWithAnyToken/`. This is the primary screen where users place prediction market orders. Everything — direct orders, deposit-and-order flows, and pay-with-any-token flows — happens on a **single route** without navigation redirects.

### Single-Route Architecture

All order states (preview, token selection, deposit, order placement) are managed by `PredictController` and rendered inline within `PredictBuyWithAnyToken`. The confirmation transaction (`PredictPayWithAnyTokenInfo`) is mounted as a headless component that syncs deposit amounts and payment tokens via effects, rather than living on a separate navigation screen. When an external payment token is selected, `initPayWithAnyToken()` fires on the initial `transitionEnd` event to prepare the deposit-and-order batch in the background.

Flow logic (deposit → order chaining, error handling, state transitions) lives in `PredictController` — hooks react to `activeOrder.state` changes via effects rather than driving transitions themselves.

### Components

| Component                    | Description                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `PredictBuyActionButton`     | Main CTA button with loading/disabled states tied to order lifecycle                                                                       |
| `PredictBuyAmountSection`    | Keypad and amount input for entering bet size; disables input interaction while order is placing                                           |
| `PredictBuyBottomContent`    | Bottom area layout (fee summary, action button)                                                                                            |
| `PredictBuyError`            | Generic error display for all buy-flow errors (minimum bet, insufficient balance, order failures, insufficient pay token balance)          |
| `PredictBuyPreviewHeader`    | Header showing market/outcome info with `outcomeToken` prop for direct token resolution (falls back to route param token, not first token) |
| `PredictFeeSummary`          | Breakdown of MetaMask fee, provider fee, deposit fee, and total                                                                            |
| `PredictPayWithAnyTokenInfo` | Headless component that syncs deposit amount and payment token to the confirmation transaction; renders only when `transactionMeta` exists |
| `PredictPayWithRow`          | Payment token selector row — always visible (Predict balance or external tokens); falls back to Predict balance when payToken is null      |

### Hooks

| Hook                            | Description                                                                                                                                                                                                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `usePredictBuyActions`          | Orchestrates buy flow lifecycle: analytics tracking on mount, `transitionEnd` initialization for `initPayWithAnyToken()`, back-navigation cleanup, confirm/deposit/order logic, and SUCCESS → dismiss. Returns `handleConfirm` and `placeOrder`                                                                |
| `usePredictBuyConditions`       | Derives boolean flags (`canPlaceBet`, `isBelowMinimum`, `isInsufficientBalance`, `isInsufficientPayTokenBalance`, `isRateLimited`, `maxBetAmount`, `isPayFeesLoading`, `isBalancePulsing`, etc.) from order and preview state. Includes stale-quote detection to bridge `TransactionPayController` timing gaps |
| `usePredictBuyError`            | Derives error messages from active order state, preview errors, minimum bet violations, insufficient balance, and insufficient pay token balance. Detects order-not-filled errors for the retry flow                                                                                                           |
| `usePredictBuyInfo`             | Computes display values (`toWin`, `metamaskFee`, `providerFee`, `depositFee`, `depositAmount`, `total`, `rewardsFeeAmount`) from preview, `TransactionPayController` totals, and Predict balance                                                                                                               |
| `usePredictBuyInputState`       | Manages keypad input value, user-change tracking, input focus state, and `isConfirming` flag. Clears active order errors on user input change                                                                                                                                                                  |
| `usePredictBuyAvailableBalance` | Resolves the available balance as a raw number — Predict balance when using balance, or Predict balance + external token balance when using an external token                                                                                                                                                  |

## Active Order Lifecycle

The `activeOrder` in `PredictControllerState` tracks the full lifecycle of a single order from preview to completion. Only one order can be active at a time. All state transitions are owned by `PredictController` methods — hooks react to state changes via effects rather than driving transitions themselves.

### State Shape

```typescript
activeOrder?: {
  batchId?: string;                                // Transaction batch ID (for deposit-and-order flow)
  state: ActiveOrderState;                         // Current lifecycle state
  error?: string;                                  // Error message from failed operations
  analyticsProperties?: PlaceOrderParams['analyticsProperties']; // Preserved for deposit → order chaining
} | null;
```

### ActiveOrderState

```typescript
enum ActiveOrderState {
  PREVIEW = 'preview', // User is editing amount on the keypad
  PAY_WITH_ANY_TOKEN = 'pay_with_any_token', // External token selected, deposit-and-order tx prepared in background
  DEPOSITING = 'depositing', // Deposit transaction in progress (set by placeOrder when state is PAY_WITH_ANY_TOKEN)
  PLACING_ORDER = 'placing_order', // Order submission in flight
  SUCCESS = 'success', // Order completed, about to dismiss
}
```

### State Machine

```mermaid
stateDiagram-v2
    [*] --> PREVIEW: initPayWithAnyToken()

    PREVIEW --> PAY_WITH_ANY_TOKEN: selectPaymentToken(external token)
    PAY_WITH_ANY_TOKEN --> PREVIEW: selectPaymentToken(balance token)

    PREVIEW --> PLACING_ORDER: placeOrder() [balance selected]
    PAY_WITH_ANY_TOKEN --> DEPOSITING: placeOrder() [external token selected]

    DEPOSITING --> PLACING_ORDER: handleTransactionSideEffects(depositAndOrder confirmed) → placeOrder()
    DEPOSITING --> PREVIEW: handleTransactionSideEffects(depositAndOrder failed) [sets error, retries initPayWithAnyToken]

    PLACING_ORDER --> SUCCESS: placeOrder() succeeds
    PLACING_ORDER --> PREVIEW: placeOrder() fails [sets error, clears payment token]

    SUCCESS --> [*]: onPlaceOrderEnd() + navigation pop
```

Notes:

- Back navigation or approval rejection triggers `onPlaceOrderEnd()`, which clears the active order, payment token, and deposit preview.
- Deposit failure resets to `PREVIEW`, stores the error on `activeOrder.error`, deletes `batchId`, and automatically retries `initPayWithAnyToken()`.
- The `transitionEnd` listener in `usePredictBuyActions` triggers `initPayWithAnyToken()` once on initial mount to prepare the deposit-and-order batch when an external token is selected.
- Transaction status events (`TransactionController:transactionStatusUpdated`) for `predictDepositAndOrder` are handled by `handleTransactionSideEffects()` in the controller, which chains deposit confirmation into `placeOrder()` automatically.
- When `placeOrder()` is called while the active order state is `PAY_WITH_ANY_TOKEN`, it transitions to `DEPOSITING` and stores the preview for later use after deposit confirmation. The actual order placement happens when the deposit transaction confirms.

### Controller Methods (State Transitions)

| Method                      | Transition                         | Notes                                                                                                                        |
| --------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `initPayWithAnyToken()`     | Sets `batchId` on active order     | Prepares deposit-and-order batch via provider; initializes to `PREVIEW` if no active order exists; guards against duplicates |
| `selectPaymentToken()`      | `PREVIEW ↔ PAY_WITH_ANY_TOKEN`    | Toggles between balance and external token; sets/clears `selectedPaymentToken` and clears error                              |
| `placeOrder()`              | `PAY_WITH_ANY_TOKEN -> DEPOSITING` | When external token selected: stores preview, transitions to `DEPOSITING`, returns early                                     |
| `placeOrder()`              | `PREVIEW -> PLACING_ORDER`         | When balance selected: submits order directly to provider                                                                    |
| `placeOrder()`              | `PLACING_ORDER -> SUCCESS`         | On successful order completion; optimistically updates balance                                                               |
| `placeOrder()`              | `PLACING_ORDER -> PREVIEW`         | On order failure; stores error, clears payment token                                                                         |
| `onPlaceOrderEnd()`         | `-> null`                          | Clears active order, payment token, and deposit preview                                                                      |
| `clearOrderError()`         | (no state change)                  | Removes error from active order                                                                                              |
| `setSelectedPaymentToken()` | (no state change)                  | Directly sets or clears the selected payment token in state                                                                  |

## Core Types and Utilities

### Key Types (`/types/index.ts`)

- `PredictMarket` - Market data structure with outcomes, status, categories
- `PredictPosition` - User position with P&L calculations and status
- `PredictOrder` - Order structure with status tracking and trade parameters
- `BuyParams` / `SellParams` - Trading operation parameters

### Utility Functions (`/utils/`)

- **`format.ts`**: Price, percentage, and volume formatting with locale support
- **`orders.ts`**: Unique order ID generation utilities
