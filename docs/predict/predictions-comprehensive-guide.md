# Predictions (Polymarket) - Comprehensive Feature Guide

This document is the single entry point for understanding the Predictions feature in MetaMask Mobile. It covers what the feature does, how users interact with it, the full technical architecture, data flow, and pointers to all related documentation.

For refactoring plans, implementation patterns, and task tracking, see the [Related Documentation](#related-documentation) section at the bottom.

## Table of Contents

- [What It Is](#what-it-is)
- [Entry Points](#entry-points)
- [User Flow](#user-flow)
- [High-Level Architecture](#high-level-architecture)
- [Directory Structure](#directory-structure)
- [Navigation Structure](#navigation-structure)
- [Controller Layer](#controller-layer)
- [Provider Layer](#provider-layer)
- [Data Flow](#data-flow)
- [Feature Flags](#feature-flags)
- [Analytics](#analytics)
- [BottomSheet Component](#bottomsheet-component)
- [Collateral and Chain Details](#collateral-and-chain-details)
- [Live Sports (NFL)](#live-sports-nfl)
- [Performance Tracking](#performance-tracking)
- [Testing](#testing)
- [Localization](#localization)
- [Related Documentation](#related-documentation)

---

## What It Is

The **Predictions** feature allows MetaMask Mobile users to participate in prediction markets via **Polymarket**, a decentralized prediction market protocol on **Polygon**. Users can:

- Browse prediction markets across categories (trending, new, sports, crypto, politics)
- Buy outcome shares (bet on an outcome) priced in **USDC.e**
- Sell positions (cash out) before market resolution
- Claim winnings when a market resolves in their favor
- Deposit and withdraw funds (USDC.e on Polygon)
- Pay with any ERC-20 token (feature-flagged, auto-swaps to USDC.e)
- View live sports scores and real-time price updates via WebSocket

The feature is designed with a **provider abstraction** so additional prediction market protocols could be integrated in the future, though Polymarket is currently the only implementation.

---

## Entry Points

Users can reach Predictions from multiple places in the app:

### 1. Explore Page (Primary)

The Explore feed (`app/components/Views/TrendingView/TrendingView.tsx`) renders a "Predictions" section configured in `app/components/Views/TrendingView/sections.config.tsx`. Users can:

- Tap the **Predictions quick-action chip** (speedometer icon) in the horizontal scroll at the top
- Tap **"View all"** on the Predictions section header
- Tap an **individual market card** to go directly to that market's details

The Predictions section uses `usePredictMarketData` with `category: 'trending'` to fetch 6 markets (or 20 when searching) and renders them via `PredictMarketRowItem`.

### 2. Homepage Predictions Section

`app/components/Views/Homepage/Sections/Predictions/PredictionsSection.tsx` shows prediction markets on the wallet homepage. This section is gated behind `selectPredictEnabledFlag`.

### 3. Wallet Actions

A "Predict" button in `app/components/UI/Trade/TradeWalletActions.tsx` navigates to `Routes.PREDICT.ROOT` with `screen: Routes.PREDICT.MARKET_LIST`.

### 4. Deep Links

`ACTIONS.PREDICT` in `app/constants/deeplinks.ts` enables deep linking into the Predictions feature. Handled by `handleUniversalLink` with analytics tracked via `DeepLinkRoute.PREDICT`.

### 5. In-App Browser

`BrowserTab.tsx` supports deep navigation to `Routes.PREDICT.MARKET_DETAILS` from the in-app browser.

### 6. GTM Modal

`app/components/Views/Wallet/index.tsx` can trigger the Predict GTM onboarding modal via `Routes.PREDICT.MODALS.GTM_MODAL`.

---

## User Flow

A typical user journey through the Predictions feature:

```
1. Discover Markets
   User opens Explore → sees Predictions section → taps "View all" or a market card

2. Browse Markets (PredictFeed)
   Tabbed feed with categories (trending, new, sports, crypto, politics)
   Search overlay for finding specific markets
   Balance display at top
   Infinite scroll with pagination

3. View Market Details (PredictMarketDetails)
   Market title, status, resolution info
   Price chart with timeframe selector
   Tabs: Positions | Outcomes | About
   Buy/Sell/Claim action buttons at bottom
   For sports markets: live scoreboard, team gradients

4. Buy an Outcome
   a. Eligibility check (geo-block guard via usePredictActionGuard)
   b. If eligible → navigate to buy preview
   c. Enter dollar amount via keypad
   d. See order preview (shares, fees, potential winnings)
   e. Place order → on-chain transaction confirmation
   f. If insufficient balance → deposit flow (or pay-with-any-token)

5. Manage Positions
   View active positions on market details or Predict tab
   Cash out (sell) at current market price
   Claim winnings when market resolves favorably

6. Funds Management
   Deposit USDC.e to Predict balance
   Withdraw USDC.e back to wallet
   Pay with any ERC-20 token (auto-swap via deposit-and-order batch)
```

---

## High-Level Architecture

The feature follows a layered architecture where each layer has a clear responsibility:

```
┌──────────────────────────────────────────────────────────────────┐
│                        ENTRY POINTS                              │
│  Explore Page | Homepage | Wallet Actions | Deep Links | Browser │
├──────────────────────────────────────────────────────────────────┤
│                     NAVIGATION STACKS                            │
│  PredictScreenStack (main)  |  PredictModalStack (overlays)     │
├──────────────────────────────────────────────────────────────────┤
│                     VIEWS (Screen Components)                    │
│  PredictFeed | PredictMarketDetails | PredictBuyPreview         │
│  PredictSellPreview | PredictTabView | PredictTransactionsView  │
├──────────────────────────────────────────────────────────────────┤
│                     COMPONENTS (60+ UI Components)               │
│  Market Cards | Positions | Charts | Sheets | Skeletons | GTM   │
├──────────────────────────────────────────────────────────────────┤
│                     HOOKS (31 Custom Hooks)                      │
│  Trading | Data Fetching | Real-time | UI State | Toast         │
├──────────────────────────────────────────────────────────────────┤
│                     TANSTACK QUERY (8 Query Domains)             │
│  market | positions | balance | activity | priceHistory | ...   │
├──────────────────────────────────────────────────────────────────┤
│                     CONTROLLER (Business Logic)                  │
│  PredictController (orchestration, state, analytics, tx events) │
├──────────────────────────────────────────────────────────────────┤
│                     PROVIDER (Protocol Implementation)           │
│  PredictProvider interface → PolymarketProvider                  │
│  WebSocketManager | GameCache | TeamsCache                      │
├──────────────────────────────────────────────────────────────────┤
│                     EXTERNAL SYSTEMS                             │
│  Polymarket APIs | Polygon Chain | TransactionController        │
│  KeyringController | RemoteFeatureFlagController | Redux/Engine │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow (Unidirectional)

```
User Action → Component → Hook → TanStack Query → PredictController → PolymarketProvider
                                                                              │
                                                                    ┌─────────┴─────────┐
                                                                    │                   │
                                                              Polymarket APIs    Polygon Chain
                                                                    │                   │
                                                                    └─────────┬─────────┘
                                                                              │
                                                                    Response / State Update
                                                                              │
                                        ┌─────────────────────────────────────┘
                                        │
                                        ▼
                             Redux (engine.backgroundState.PredictController)
                                        │
                                        ▼
                                  Selectors (memoized)
                                        │
                                        ▼
                              useSelector → Component Re-render
```

### Transaction Flow (Side Effects)

```
PredictController.placeOrder() / depositWithConfirmation() / claimWithConfirmation()
        │
        ▼
addTransactionBatch() → TransactionController
        │
        ▼
TransactionController:transactionStatusUpdated (event)
        │
        ▼
PredictController.handleTransactionSideEffects()
        │
        ├── deposit confirmed → clear pending, refresh balance
        ├── depositAndOrder confirmed → execute deferred placeOrder
        ├── claim confirmed → confirmClaim, refresh claimable
        └── any failure → reset order state, fire error events
        │
        ▼
PredictController:transactionStatusChanged (custom event)
        │
        ▼
usePredictToastRegistrations() → Toast notifications
```

---

## Directory Structure

```
app/components/UI/Predict/
├── controllers/
│   └── PredictController.ts          # Central orchestration (~2,400 lines)
├── providers/
│   ├── types.ts                      # PredictProvider interface
│   └── polymarket/
│       ├── PolymarketProvider.ts      # Polymarket-specific implementation
│       ├── WebSocketManager.ts        # Singleton WebSocket connection manager
│       ├── GameCache.ts               # Live game data cache (5-min TTL)
│       ├── TeamsCache.ts              # Persistent team data cache
│       ├── utils.ts                   # API endpoints, signing, parsing
│       ├── types.ts                   # Polymarket-specific types
│       ├── constants/                 # Slippage, endpoints, etc.
│       └── safe/                      # Safe/multisig helpers
├── routes/
│   └── index.tsx                     # React Navigation stacks
├── views/
│   ├── PredictFeed/                  # Market list with tabs, search, balance
│   ├── PredictMarketDetails/         # Single market: chart, positions, outcomes
│   ├── PredictBuyPreview/            # Buy flow with USD balance
│   ├── PredictBuyWithAnyToken/       # Buy flow with any ERC-20 token
│   ├── PredictSellPreview/           # Sell/cash-out flow
│   ├── PredictTabView/              # Wallet tab: positions + add funds
│   ├── PredictTransactionsView/     # Activity/transaction history
│   ├── PredictUnavailableModal/     # Geo-block / product unavailable
│   └── PredictAddFundsModal/        # Add funds sheet
├── hooks/                           # ~31 custom hooks
│   ├── usePredictTrading.ts          # Thin facade over controller trading
│   ├── usePredictPlaceOrder.ts       # Full place-order UX lifecycle
│   ├── usePredictOrderPreview.ts     # Debounced order preview
│   ├── usePredictDeposit.ts          # Deposit flow
│   ├── usePredictClaim.ts            # Claim flow
│   ├── usePredictWithdraw.ts         # Withdraw flow
│   ├── usePredictBalance.ts          # Balance with Polygon management
│   ├── usePredictPositions.ts        # Positions with optional filters
│   ├── usePredictMarketData.tsx      # Manual pagination for feed
│   ├── usePredictMarket.tsx          # Single market query
│   ├── usePredictEligibility.ts      # Geo-eligibility + refresh manager
│   ├── usePredictActionGuard.ts      # Blocks actions if not eligible
│   ├── usePredictNavigation.ts       # Navigation helpers
│   ├── usePredictActiveOrder.ts      # Active order state machine
│   ├── usePredictPaymentToken.ts     # Payment token management
│   ├── usePredictBottomSheet.ts      # BottomSheet open/close helpers
│   ├── useLiveGameUpdates.ts         # WebSocket: live game scores
│   ├── useLiveMarketPrices.ts        # WebSocket: live price updates
│   ├── usePredictLivePositions.ts    # Live prices + positions
│   ├── usePredictToastRegistrations.ts # Toast for tx status events
│   ├── usePredictMeasurement.ts      # Sentry performance tracking
│   └── ...
├── queries/                         # TanStack Query wrappers
│   ├── accountState.ts               # Account state (staleTime: 10s)
│   ├── activity.ts                   # Activity by address
│   ├── balance.ts                    # Balance by address (staleTime: 10s)
│   ├── market.ts                     # Market by ID (staleTime: 10s)
│   ├── orderPreview.ts               # Order preview (no retry)
│   ├── positions.ts                  # Positions by address (staleTime: 5s)
│   ├── priceHistory.ts               # Price history (staleTime: 5s)
│   └── unrealizedPnL.ts              # Unrealized PnL (staleTime: 10s)
├── selectors/
│   ├── featureFlags/                # Remote feature flag selectors
│   │   └── index.ts
│   └── predictController/           # Redux selectors for controller state
│       └── index.ts
├── components/                      # 60+ shared UI components
│   ├── PredictMarket*/              # Market display variants
│   ├── PredictPosition*/            # Position management
│   ├── PredictGame*/                # Sports-specific components
│   ├── PredictDetails*/             # Detail screen components
│   ├── PredictFeeBreakdownSheet/    # Fee details BottomSheet
│   ├── PredictAddFundsSheet/        # Deposit BottomSheet
│   ├── PredictOrderRetrySheet/      # Retry failed orders BottomSheet
│   ├── PredictUnavailable/          # Geo-block BottomSheet
│   └── ...
├── types/
│   ├── index.ts                     # Core types (~410 lines)
│   ├── navigation.ts                # Navigation param types
│   └── flags.ts                     # Feature flag types
├── constants/                       # Configuration and error codes
├── utils/                           # Utility functions (formatting, orders)
├── schemas/                         # Validation schemas
├── services/
│   └── PredictFeedSessionManager.ts # Feed session analytics
├── mocks/                           # Test fixtures
└── index.ts                         # Public exports
```

### Related Locations Outside `Predict/`

| Purpose                | Path                                                      |
| ---------------------- | --------------------------------------------------------- |
| Engine wiring          | `app/core/Engine/controllers/predict-controller/index.ts` |
| Confirmation UI        | `app/components/Views/confirmations/components/predict-*` |
| Confirmation constants | `app/components/Views/confirmations/constants/predict.ts` |
| Route constants        | `app/constants/navigation/Routes.ts` (`PREDICT.*`)        |
| Navigator registration | `app/components/Nav/Main/MainNavigator.js`                |
| Explore section config | `app/components/Views/TrendingView/sections.config.tsx`   |
| Homepage section       | `app/components/Views/Homepage/Sections/Predictions/`     |
| Wallet actions         | `app/components/UI/Trade/TradeWalletActions.tsx`          |
| Deep links             | `app/constants/deeplinks.ts`                              |
| Analytics events       | `app/core/Analytics/MetaMetrics.events.ts`                |
| Toast registrations    | `app/components/Nav/App/App.tsx`                          |
| Sentry trace names     | `app/util/trace.ts`                                       |

---

## Navigation Structure

### Route Constants

Defined in `app/constants/navigation/Routes.ts`:

```typescript
PREDICT: {
  ROOT: 'Predict',
  MARKET_LIST: 'PredictMarketList',
  MARKET_DETAILS: 'PredictMarketDetails',
  ACTIVITY_DETAIL: 'PredictActivityDetail',
  MODALS: {
    ROOT: 'PredictModals',
    BUY_PREVIEW: 'PredictBuyPreview',
    SELL_PREVIEW: 'PredictSellPreview',
    UNAVAILABLE: 'PredictUnavailable',
    ADD_FUNDS_SHEET: 'PredictAddFundsSheet',
    GTM_MODAL: 'PredictGTMModal',
  },
}
```

### Two Navigation Stacks

Defined in `app/components/UI/Predict/routes/index.tsx`:

**PredictScreenStack** (main, card-style transitions):

- `MARKET_LIST` → `PredictFeed` (initial route)
- `MARKET_DETAILS` → `PredictMarketDetails`
- `MODALS.BUY_PREVIEW` → `PredictBuyPreview` OR `PredictBuyWithAnyToken` (depends on `selectPredictWithAnyTokenEnabledFlag`)
- `MODALS.SELL_PREVIEW` → `PredictSellPreview`
- Full-screen confirmation screens for transaction signing

**PredictModalStack** (transparent modal overlay):

- `MODALS.UNAVAILABLE` → `PredictUnavailableModal`
- `MODALS.GTM_MODAL` → `PredictGTMModal`
- `MODALS.ADD_FUNDS_SHEET` → `PredictAddFundsModal`
- `ACTIVITY_DETAIL` → `PredictActivityDetail`

Both stacks are conditionally registered in `MainNavigator.js` when `selectPredictEnabledFlag` is `true`.

### Component Tree

```
PredictScreenStack
├── PredictFeed
│   ├── HeaderCompactStandard (back + search)
│   ├── PredictBalance (animated header)
│   ├── TabsBar (category tabs)
│   ├── PagerView → PredictTabContent per tab
│   │   └── AnimatedFlashList
│   │       └── PredictMarket (polymorphic)
│   │           ├── PredictMarketSingle
│   │           ├── PredictMarketMultiple
│   │           └── PredictMarketSportCard
│   └── PredictSearchOverlay
├── PredictMarketDetails
│   ├── Market header, status, resolution
│   ├── PredictDetailsChart (or PredictGameChart for sports)
│   ├── Tab bar (Positions | Outcomes | About)
│   ├── Tab content sections
│   ├── Action buttons (Buy / Sell / Claim)
│   └── PredictGameDetailsContent (if market.game exists)
├── PredictBuyPreview / PredictBuyWithAnyToken
│   ├── PredictKeypad
│   ├── PredictFeeSummary
│   └── Action button
└── PredictSellPreview
    ├── Position info + PnL
    ├── PredictFeeSummary
    └── Cash out button

PredictModalStack
├── PredictUnavailableModal → BottomSheet
├── PredictGTMModal → Onboarding flow
├── PredictAddFundsModal → BottomSheet with deposit
└── PredictActivityDetail → Transaction detail
```

---

## Controller Layer

### PredictController

**File:** `app/components/UI/Predict/controllers/PredictController.ts`

A `@metamask/base-controller` subclass that serves as the central orchestration hub. It:

- Instantiates and delegates to a single `PolymarketProvider`
- Manages all mutable state (eligibility, balances, orders, deposits, claims)
- Subscribes to `TransactionController:transactionStatusUpdated` for side effects
- Emits `PredictController:transactionStatusChanged` for toast notifications
- Handles all analytics via `track*` methods
- Reads feature flags from `RemoteFeatureFlagController`
- Provides signing capabilities via the Keyring messenger

### State Shape (`PredictControllerState`)

```typescript
{
  eligibility: { eligible: boolean; country?: string };
  lastError: string | null;
  lastUpdateTimestamp: number;
  balances: { [address: string]: PredictBalance };
  claimablePositions: { [address: string]: PredictPosition[] };
  pendingDeposits: { [address: string]: string };
  pendingClaims: { [address: string]: string };
  withdrawTransaction: PredictWithdraw | null;
  activeBuyOrders: {
    [address: string]: {
      transactionId?: string;
      state: ActiveOrderState;
      error?: string;
    };
  };
  selectedPaymentToken: { address: string; chainId: string; symbol?: string } | null;
  accountMeta: { [providerId: string]: { [address: string]: PredictAccountMeta } };
}
```

Only `accountMeta` has `persist: true` in the state metadata -- everything else is ephemeral.

### Key Methods

| Category           | Methods                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market data        | `getMarkets`, `getMarket`, `getPriceHistory`, `getPrices`                                                                                                           |
| Account data       | `getPositions`, `getActivity`, `getUnrealizedPnL`, `getAccountState`, `getBalance`                                                                                  |
| Trading            | `previewOrder`, `placeOrder`                                                                                                                                        |
| Funds              | `depositWithConfirmation`, `initPayWithAnyToken`, `claimWithConfirmation`, `prepareWithdraw`, `beforeSign`                                                          |
| Eligibility        | `refreshEligibility`                                                                                                                                                |
| Live data          | `subscribeToGameUpdates`, `subscribeToMarketPrices`, `getConnectionStatus`                                                                                          |
| Pay-with-any-token | `selectPaymentToken`, `clearOrderError`, `onPlaceOrderSuccess`, `clearActiveOrderTransactionId`, `setSelectedPaymentToken`, `clearActiveOrder`                      |
| Analytics          | `trackPredictOrderEvent`, `trackMarketDetailsOpened`, `trackPositionViewed`, `trackActivityViewed`, `trackGeoBlockTriggered`, `trackFeedViewed`, `trackShareAction` |

### Active Order State Machine

The `activeBuyOrders` map tracks the full lifecycle of buy orders per account address:

```
PREVIEW ──────────────────────► PLACING_ORDER ──► SUCCESS ──► PREVIEW (reset)
    │                                │
    ▼                                ▼
PAY_WITH_ANY_TOKEN ──► DEPOSITING ──► PLACING_ORDER (via deferred placeOrder)
    │                       │
    └───── (on failure) ────┘
```

- `PREVIEW`: User editing amount on keypad
- `PAY_WITH_ANY_TOKEN`: External token selected, deposit-and-order tx prepared
- `DEPOSITING`: Deposit transaction in progress
- `PLACING_ORDER`: Order submission in flight
- `SUCCESS`: Order completed, about to reset

The active order persists across navigation. When a user places a deposit-and-order bet and navigates away, the order state is preserved. The controller stores the preview in an in-memory `pendingOrderPreviews` map and automatically chains the `placeOrder` call when the deposit transaction confirms.

### Messenger Events and Actions

- **Actions consumed:** AccountsController, NetworkController, TransactionController (gas estimation), KeyringController (signing), RemoteFeatureFlagController
- **Events consumed:** `TransactionController:transactionStatusUpdated`, `RemoteFeatureFlagController:stateChange`
- **Custom event emitted:** `PredictController:transactionStatusChanged` with payload containing transaction type (deposit/depositAndOrder/claim/withdraw/order), status (approved/confirmed/failed/rejected), and optional metadata

---

## Provider Layer

### PredictProvider Interface

**File:** `app/components/UI/Predict/providers/types.ts`

A protocol-agnostic contract that any prediction market provider must implement:

```typescript
interface PredictProvider {
  readonly providerId: string;
  readonly name: string;
  readonly chainId: number;

  // Market data
  getMarkets(params): Promise<PredictMarket[]>;
  getMarketsByIds?(marketIds: string[]): Promise<PredictMarket[]>;
  getMarketDetails(params: { marketId: string }): Promise<PredictMarket>;
  getPriceHistory(params): Promise<PredictPriceHistoryPoint[]>;
  getPrices(params): Promise<GetPriceResponse>;

  // Account data
  getPositions(params): Promise<PredictPosition[]>;
  getActivity(params: { address: string }): Promise<PredictActivity[]>;
  getUnrealizedPnL(params: { address: string }): Promise<UnrealizedPnL>;

  // Trading
  previewOrder(params): Promise<OrderPreview>;
  placeOrder(params): Promise<OrderResult>;

  // Funds
  prepareClaim(params): Promise<ClaimOrderResponse>;
  confirmClaim?(params): void;
  isEligible(): Promise<GeoBlockResponse>;
  prepareDeposit(params): Promise<PrepareDepositResponse>;
  getAccountState(params): Promise<AccountState>;
  prepareWithdraw(params): Promise<PrepareWithdrawResponse>;
  signWithdraw?(params): Promise<SignWithdrawResponse>;
  getBalance(params): Promise<number>;

  // Live data (optional)
  subscribeToGameUpdates?(gameId, callback): () => void;
  subscribeToMarketPrices?(tokenIds, callback): () => void;
  getConnectionStatus?(): ConnectionStatus;
}
```

### PolymarketProvider

**File:** `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts`

The sole implementation of `PredictProvider`. Communicates with:

| Endpoint                                               | Purpose                                            |
| ------------------------------------------------------ | -------------------------------------------------- |
| `https://gamma-api.polymarket.com`                     | Market data (listings, details, categories)        |
| `https://clob.polymarket.com`                          | Order book / Central Limit Order Book (CLOB)       |
| `https://data-api.polymarket.com`                      | Analytics, positions, activity, P&L                |
| `https://polymarket.com/api/geoblock`                  | Geo-eligibility checks                             |
| `wss://sports-api.polymarket.com/ws`                   | Live game score updates (WebSocket)                |
| `wss://ws-subscriptions-clob.polymarket.com/ws/market` | Live market price updates (WebSocket)              |
| Polygon chain (RPC)                                    | USDC.e transfers, PERMIT2, Safe-based transactions |

---

## Data Flow

### TanStack Query Layer

**Directory:** `app/components/UI/Predict/queries/`

Eight query domains, each with key factories and `queryFn` calling `Engine.context.PredictController`:

| Domain          | Query Key                              | Stale Time | Controller Method  |
| --------------- | -------------------------------------- | ---------- | ------------------ |
| `accountState`  | `['predict','accountState']`           | 10s        | `getAccountState`  |
| `activity`      | `['predict','activity', address]`      | --         | `getActivity`      |
| `balance`       | `['predict','balance', address]`       | 10s        | `getBalance`       |
| `market`        | `['predict','market', marketId]`       | 10s        | `getMarket`        |
| `orderPreview`  | `['predict','orderPreview', ...]`      | --         | `previewOrder`     |
| `positions`     | `['predict','positions', address]`     | 5s         | `getPositions`     |
| `priceHistory`  | `['predict','priceHistory', ...]`      | 5s         | `getPriceHistory`  |
| `unrealizedPnL` | `['predict','unrealizedPnL', address]` | 10s        | `getUnrealizedPnL` |

UI hooks consume these via `useQuery({ ...predictQueries.*.options(...) })`. The controller's `invalidateQueryCache` method nudges the block tracker on the Predict chain to keep nonce-dependent queries consistent.

The market feed (`usePredictMarketData`) bypasses these query modules and calls `getMarkets` directly for manual pagination with `fetchMore` / `hasMore` support.

### Hooks Summary

The ~31 hooks are organized by category:

| Category          | Hooks                                                                                                                                                                                     | Purpose                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Trading (6)       | `usePredictTrading`, `usePredictPlaceOrder`, `usePredictOrderPreview`, `usePredictDeposit`, `usePredictClaim`, `usePredictWithdraw`                                                       | Order placement, claims, deposits, withdrawals |
| Data Fetching (8) | `usePredictMarketData`, `usePredictMarket`, `usePredictPositions`, `usePredictBalance`, `usePredictActivity`, `usePredictPriceHistory`, `usePredictAccountState`, `useUnrealizedPnL`      | Markets, positions, prices, history            |
| Real-time (3)     | `useLiveGameUpdates`, `useLiveMarketPrices`, `usePredictLivePositions`                                                                                                                    | WebSocket-driven live data                     |
| UI State (8)      | `usePredictBottomSheet`, `usePredictTabs`, `usePredictSearch`, `useFeedScrollManager`, `usePredictNavigation`, `usePredictActiveOrder`, `usePredictPaymentToken`, `usePredictMeasurement` | Bottom sheets, scroll, measurements            |
| Toast (5)         | `usePredictToastRegistrations`, plus 4 individual toast hooks                                                                                                                             | Transaction feedback                           |
| Guards (2)        | `usePredictEligibility`, `usePredictActionGuard`                                                                                                                                          | Eligibility + action gating                    |

### State Management

| State Type        | Location                                           | Examples                                       |
| ----------------- | -------------------------------------------------- | ---------------------------------------------- |
| Global Persistent | Redux (`engine.backgroundState.PredictController`) | Balances, positions, claims, eligibility       |
| Real-time         | Local hook state                                   | Live prices, game scores                       |
| UI-specific       | Component state                                    | Search query, active tab, expanded sections    |
| Shared UI         | Context                                            | Scroll position, layout measurements           |
| Cache             | In-memory objects                                  | GameCache (5-min TTL), TeamsCache (persistent) |
| Query cache       | TanStack Query                                     | Market data, positions, activity               |

### Redux Selectors

**File:** `app/components/UI/Predict/selectors/predictController/index.ts`

Key selectors include:

- `selectPredictControllerState` -- full controller state
- `selectPredictBalanceByAddress` -- balance for current account
- `selectPredictClaimablePositions` -- claimable positions
- `selectPredictWonPositions` -- won positions with P&L
- `selectPredictPendingDeposits` / `selectPredictPendingClaims`
- `selectPredictActiveBuyOrder` -- active order for current account
- `selectPredictSelectedPaymentToken` -- pay-with-any-token selection
- `selectPredictAccountMeta` -- persisted account metadata

---

## Feature Flags

**File:** `app/components/UI/Predict/selectors/featureFlags/index.ts`

All flags are read from `RemoteFeatureFlagController` via `selectRemoteFeatureFlags` and can be overridden locally with `MM_PREDICT_*` environment variables.

| Flag                               | Purpose                                                                     | Default                        |
| ---------------------------------- | --------------------------------------------------------------------------- | ------------------------------ |
| `predictTradingEnabled`            | Main gate: controls whether Predict screens are registered in the navigator | `true` (if remote unavailable) |
| `predictGtmOnboardingModalEnabled` | GTM onboarding modal display                                                | --                             |
| `predictHomeFeaturedVariant`       | Homepage featured markets variant                                           | --                             |
| `predictHotTab`                    | "Hot" tab in the feed                                                       | --                             |
| `predictFeeCollection`             | Fee collection toggle                                                       | --                             |
| `predictFakOrders`                 | Fill-and-kill order mode                                                    | --                             |
| `predictWithAnyToken`              | Pay-with-any-token flow (swaps buy preview component on same route)         | --                             |
| `predictLiveNflEnabled`            | Live NFL sports feature with WebSocket updates                              | --                             |

The main `predictTradingEnabled` flag is version-gated (`VersionGatedFeatureFlag`) and gates:

- Screen registration in `MainNavigator.js`
- Homepage Predictions section visibility
- Wallet action button visibility

---

## Analytics

### MetaMetrics Events

Defined in `app/core/Analytics/MetaMetrics.events.ts`:

| Event                           | Description                                       |
| ------------------------------- | ------------------------------------------------- |
| `PREDICT_TRADE_TRANSACTION`     | Order placed/confirmed/failed (full trade funnel) |
| `PREDICT_MARKET_DETAILS_OPENED` | Market detail viewed (with tab attribution)       |
| `PREDICT_POSITION_VIEWED`       | Position detail viewed                            |
| `PREDICT_ACTIVITY_VIEWED`       | Activity list viewed                              |
| `PREDICT_GEO_BLOCKED_TRIGGERED` | Geo-block encountered                             |
| `PREDICT_FEED_VIEWED`           | Feed session tracking                             |

All events are emitted centrally from `PredictController.track*` methods. Feed sessions are managed by `PredictFeedSessionManager` which calls `PredictController.trackFeedViewed`.

### Trade Event Properties

The `trackPredictOrderEvent` method tracks the full trade funnel with status:

- `INITIATED` -- user entered buy/sell preview
- `SUBMITTED` -- order placed
- `CONFIRMED` -- on-chain confirmation
- `FAILED` -- order failure

Properties include market ID, outcome, side (BUY/SELL), amount, entry point, and provider info.

### Deep Link Analytics

Deep links to Predict are tracked via `DeepLinkRoute.PREDICT` in `app/core/Analytics/deepLinkAnalytics.ts`.

---

## BottomSheet Component

The Predictions feature uses `BottomSheet` from `app/component-library/components/BottomSheets/`. This is a **custom-built** component -- the app does **not** use `@gorhom/bottom-sheet`.

### Architecture

```
BottomSheet
├── KeyboardAvoidingView (optional)
├── BottomSheetOverlay → Overlay component (tap-to-dismiss)
└── BottomSheetDialog
    ├── PanGestureHandler (react-native-gesture-handler) → swipe-to-dismiss
    ├── Reanimated (translateY, withTiming, useAnimatedStyle) → animation
    └── Children
        ├── BottomSheetHeader (optional)
        ├── Content
        └── BottomSheetFooter (optional)
```

### Key Dependencies

- **`react-native-reanimated`**: Sheet open/close animation via `translateY`, `withTiming`, `useAnimatedGestureHandler`, `useAnimatedStyle`, `runOnJS`
- **`react-native-gesture-handler`**: `PanGestureHandler` for drag-to-dismiss gestures
- **`react-native-safe-area-context`**: Insets and frame for proper sizing
- **Android `BackHandler`**: Hardware back button closes sheet when focused
- **`@react-navigation/native`**: `useNavigation` for optional `goBack()` on close

### Props

| Prop                          | Type                          | Default | Description                                    |
| ----------------------------- | ----------------------------- | ------- | ---------------------------------------------- |
| `children`                    | `ReactNode`                   | --      | Sheet content                                  |
| `isFullscreen`                | `boolean`                     | `false` | Expand to full height                          |
| `isInteractable`              | `boolean`                     | `true`  | Enable/disable gestures and overlay tap        |
| `keyboardAvoidingViewEnabled` | `boolean`                     | `true`  | Keyboard handling                              |
| `shouldNavigateBack`          | `boolean`                     | `true`  | Whether closing triggers `navigation.goBack()` |
| `onClose`                     | `(hasPendingAction?) => void` | --      | Close callback                                 |
| `onOpen`                      | `(hasPendingAction?) => void` | --      | Open callback                                  |

### Imperative API (`BottomSheetRef`)

```typescript
ref.onOpenBottomSheet(callback?)   // Open with optional post-open callback
ref.onCloseBottomSheet(callback?)  // Close with optional post-close callback
```

### Usage in Predictions

The feature uses a shared hook `usePredictBottomSheet` (in `hooks/usePredictBottomSheet.ts`) that wraps `BottomSheetRef` with visibility state and `onDismiss` handling.

Key bottom sheets in the Predictions feature:

| Sheet                      | File                                   | Purpose                                    |
| -------------------------- | -------------------------------------- | ------------------------------------------ |
| `PredictFeeBreakdownSheet` | `components/PredictFeeBreakdownSheet/` | Fee details (`shouldNavigateBack={false}`) |
| `PredictAddFundsSheet`     | `components/PredictAddFundsSheet/`     | Deposit flow (Header + Footer)             |
| `PredictOrderRetrySheet`   | `components/PredictOrderRetrySheet/`   | Retry failed orders                        |
| `PredictUnavailable`       | `components/PredictUnavailable/`       | Geo-block / unavailable                    |
| `PredictGameAboutSheet`    | `components/PredictGameDetailsFooter/` | Game info                                  |

### Deprecation Note

The component-library BottomSheet classes are marked `@deprecated` in favor of a future `@metamask/design-system-react-native` BottomSheet. Migration has not happened yet -- all current Predict code uses the component-library version.

---

## Collateral and Chain Details

| Detail               | Value                                                              |
| -------------------- | ------------------------------------------------------------------ |
| Chain                | Polygon                                                            |
| Collateral token     | USDC.e (`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`, 6 decimals)  |
| Currency             | USD                                                                |
| Minimum deposit      | $0.01                                                              |
| Transaction batching | `addTransactionBatch` from transaction-controller utilities        |
| Network management   | `usePredictNetworkManagement` ensures Polygon is added and enabled |

Defined in `app/components/Views/confirmations/constants/predict.ts`:

```typescript
export const PREDICT_CURRENCY = 'usd';
export const PREDICT_MINIMUM_DEPOSIT = 0.01;
export const POLYGON_USDCE = {
  address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Hex,
  decimals: 6,
  name: 'USD Coin (PoS)',
  symbol: 'USDC.e',
};
```

---

## Live Sports (NFL)

The Predictions feature includes real-time sports market support, currently for NFL games. See `docs/predict/live-nfl-architecture.md` for the full architecture.

### Key Points

- **Feature flag:** `predictLiveNflEnabled`
- **WebSocket connections:** Singleton `WebSocketManager` in `PolymarketProvider` manages two WebSocket channels:
  - Sports WebSocket (`wss://sports-api.polymarket.com/ws`) for live game scores
  - Market WebSocket (`wss://ws-subscriptions-clob.polymarket.com/ws/market`) for live prices
- **GameCache:** Overlays live game data onto API responses (5-minute TTL), so feed cards show live scores without individual WebSocket subscriptions
- **Granular subscriptions:** Each component subscribes only to the data it needs to minimize re-renders:
  - `GameScoreboard` → `useLiveGameUpdates(gameId)`
  - `PredictGameChart` → `useLiveMarketPrices(tokenIds)`
  - `PredictGamePosition` (each row) → `useLiveTokenPrice(tokenId)`
- **No separate route:** `PredictMarketDetails` renders `PredictGameDetailsContent` when `market.game` exists
- **Connection lifecycle:** Lazy connect on first subscription, reference counting, auto-disconnect when no subscribers, AppState-aware (disconnect on background), exponential backoff reconnection

---

## Performance Tracking

The feature uses Sentry performance monitoring following the same patterns as the Perps feature. See `docs/predict/predict-sentry-performance.md` for full details.

### Two-Tiered Tracing

1. **`usePredictMeasurement` hook** -- declarative UI screen load performance tracking with conditional completion
2. **Direct `trace()` / `endTrace()`** -- imperative business logic and API operation tracking

### Tracked Operations

- **UI screens (6):** Feed, Market Details, Buy Preview, Sell Preview, Tab View, Transaction History
- **Toast notifications (4):** Order submission/confirmation, Cashout submission/confirmation
- **Controller operations (11):** Place order, Get markets/market/positions/activity/balance/accountState/priceHistory/prices/unrealizedPnL, Claim

All traces include `feature: 'Predict'` tag for filtering in Sentry.

---

## Testing

### E2E Tests (Smoke)

**Directory:** `tests/smoke/predict/`

- `predict-existing-polymarket-balance.spec.ts` -- core prediction flow
- Helpers in `predict-helpers.ts`
- Tag: `SmokePredictions` in `tests/tags.js`

### Component-View Tests

**Presets:** `tests/component-view/presets/predict.ts`
**Renderers:** `tests/component-view/presets/renderers/predict*.tsx`

### Mock API Responses

**Directory:** `tests/api-mocking/mock-responses/polymarket/`

Mock data for feeds, positions, activity, order book, RPC, and geoblock responses. Default mocks in `tests/api-mocking/mock-responses/defaults/polymarket-apis.ts`.

### Page Objects

- `tests/page-objects/Trending/TrendingView.ts`
- `tests/page-objects/Transactions/predictionsActivityDetails.ts`

---

## Localization

Prediction strings use `predict_*` keys in locale files (`locales/languages/*.json`), including:

- UI labels (feed, market details, buy/sell flows)
- Error messages and status notifications
- Polymarket disclaimers and terms of service references (`https://polymarket.com/tos`)
- Toast notification messages

---

## Related Documentation

| Document              | Path                                         | Description                                                                      |
| --------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| Architecture Overview | `docs/predict/architecture-overview.md`      | Current vs target architecture, component hierarchy, data flow, state management |
| Implementation Guide  | `docs/predict/implementation-guide.md`       | Code patterns, anti-patterns, migration examples, testing patterns               |
| Live NFL Architecture | `docs/predict/live-nfl-architecture.md`      | WebSocket manager, GameCache, sports-specific components                         |
| Sentry Performance    | `docs/predict/predict-sentry-performance.md` | Performance tracking implementation, trace catalog                               |
| Refactoring Tasks     | `docs/predict/refactoring-tasks.md`          | Prioritized task breakdown with progress tracking                                |
| Live NFL Tasks        | `docs/predict/tasks/README.md`               | Implementation plan for Live NFL feature                                         |
| Feature README        | `app/components/UI/Predict/README.md`        | In-code README with hooks guide                                                  |
