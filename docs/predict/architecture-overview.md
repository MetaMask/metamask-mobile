# Predict Feature Architecture Overview

This document provides a comprehensive overview of the Predict feature architecture, including current state analysis, target architecture, and key architectural decisions.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Current Architecture](#current-architecture)
- [Target Architecture](#target-architecture)
- [Component Hierarchy](#component-hierarchy)
- [Data Flow Patterns](#data-flow-patterns)
- [State Management](#state-management)
- [Hooks Organization](#hooks-organization)
- [Type System](#type-system)
- [Key Architectural Decisions](#key-architectural-decisions)

---

## Executive Summary

### Codebase Statistics

| Metric        | Value                |
| ------------- | -------------------- |
| Total Files   | 308 TypeScript files |
| Lines of Code | ~44,000+ lines       |
| Components    | 60+ UI components    |
| Custom Hooks  | 31 hooks             |
| Test Files    | 116 test files       |
| Test Coverage | ~59%                 |

### Key Findings

- **Strengths**: Well-organized hooks, comprehensive type system, layered architecture, real-time WebSocket support
- **Weaknesses**: Some overly complex components, legacy StyleSheet usage, duplicate types, prop drilling in places
- **Priority Areas**: Component decomposition, styling migration, type consolidation, memoization improvements

---

## Current Architecture

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        VIEWS (Screens)                           │
│  PredictFeed (738 lines) | PredictMarketDetails (1,391 lines)   │
│  PredictBuyPreview | PredictSellPreview | PredictTabView        │
├─────────────────────────────────────────────────────────────────┤
│                      COMPONENTS (60+)                            │
│  Market Cards | Positions | Charts | Action Buttons | Skeletons │
├─────────────────────────────────────────────────────────────────┤
│                       HOOKS (31 custom)                          │
│  Trading | Data Fetching | Real-time | UI State | Toast         │
├─────────────────────────────────────────────────────────────────┤
│                     CONTROLLERS (Business Logic)                 │
│  PredictController (2,401 lines) - State + API orchestration    │
├─────────────────────────────────────────────────────────────────┤
│                    PROVIDERS (Protocol Layer)                    │
│  PolymarketProvider | WebSocketManager | GameCache | TeamsCache │
├─────────────────────────────────────────────────────────────────┤
│                      EXTERNAL (MetaMask Core)                    │
│  Engine | TransactionController | KeyringController | Redux     │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
app/components/UI/Predict/
├── components/           # 60+ reusable UI components
│   ├── PredictMarket*/   # Market display variants
│   ├── PredictPosition*/ # Position management
│   ├── PredictGame*/     # Sports-specific components
│   ├── PredictDetails*/  # Detail screen components
│   └── Predict*/         # Other UI components
├── controllers/          # Business logic
│   └── PredictController.ts (2,401 lines)
├── hooks/                # 31 custom React hooks
│   ├── usePredictTrading.ts
│   ├── usePredictPositions.ts
│   ├── usePredictMarket.tsx
│   └── ...
├── providers/            # Protocol implementations
│   └── polymarket/
│       ├── PolymarketProvider.ts
│       ├── WebSocketManager.ts
│       ├── GameCache.ts
│       └── TeamsCache.ts
├── types/                # TypeScript definitions
│   ├── index.ts          # Core types (410 lines)
│   ├── navigation.ts     # Navigation types
│   └── flags.ts          # Feature flag types
├── selectors/            # Redux selectors
│   ├── featureFlags/
│   └── predictController/
├── views/                # Screen components
│   ├── PredictFeed/
│   ├── PredictMarketDetails/
│   ├── PredictBuyPreview/
│   ├── PredictSellPreview/
│   └── PredictTabView/
├── constants/            # Configuration
├── utils/                # Utility functions
├── services/             # Service classes
├── routes/               # Navigation configuration
└── mocks/                # Test fixtures
```

### Current Issues

#### 1. Overly Complex Components

| File                     | Lines | Hooks | Issues                                           |
| ------------------------ | ----- | ----- | ------------------------------------------------ |
| PredictMarketDetails.tsx | 1,391 | 30+   | 7 unmemoized render functions, deeply nested JSX |
| PredictFeed.tsx          | 738   | 16+   | Multiple nested components, prop drilling        |
| PredictController.ts     | 2,401 | N/A   | 15+ repeated error handling patterns             |

#### 2. Legacy Styling (10 files)

Files using `StyleSheet.create()` instead of Tailwind:

- PredictMarketOutcome.styles.ts
- PredictMarketSingle.styles.ts
- PredictPosition.styles.ts
- PredictPositionEmpty.styles.ts
- PredictPositionResolved.styles.ts
- PredictOffline.styles.ts
- PredictGTMModal.styles.ts
- PredictMarketRowItem.styles.ts
- PredictMarketMultiple.styles.ts
- PredictSellPreview.styles.ts

#### 3. Duplicate Types

- `ChartSeries` in PredictDetailsChart.tsx
- `GameChartSeries` in PredictGameChart.types.ts
- Tooltip types duplicated across chart components

#### 4. Technical Debt (TODO Comments)

1. `PredictController.ts:127` - "change to be per-account basis"
2. `usePredictClaim.ts:35` - "remove once navigation stack is fixed"
3. `polymarket/utils.ts:662` - "remove this temporary fix for Super Bowl LX"
4. `PredictPositions.tsx:123` - "Sort positions in controller"

#### 5. Toast Event Subscription Issues (Critical)

**Problem**: Toast hooks (`usePredictDepositToasts`, `usePredictClaimToasts`, `usePredictWithdrawToasts`) are mounted only in `PredictTabView`. When the user navigates away from the Predict tab, these hooks unmount and unsubscribe from `TransactionController:transactionStatusUpdated` events.

**Impact**: If a transaction completes while the user is on a different tab, the toast notification is never shown.

**Current Mounting Location**:

```typescript
// PredictTabView.tsx (lines 39-41)
const PredictTabView = () => {
  usePredictDepositToasts(); // Mounted here only
  usePredictClaimToasts(); // Unmounts when tab switches
  usePredictWithdrawToasts(); // Events are missed
  // ...
};
```

**Subscription Pattern**:

```typescript
// usePredictToasts.tsx (lines 202-255)
useEffect(() => {
  Engine.controllerMessenger.subscribe(
    'TransactionController:transactionStatusUpdated',
    handleTransactionStatusUpdate,
  );
  return () => {
    // Cleanup runs when component unmounts (tab switch)
    Engine.controllerMessenger.unsubscribe(...);
  };
}, [...]);
```

#### 6. No Centralized Data Fetching Layer

**Problem**: Data fetching is scattered across 12+ hooks with inconsistent patterns:

| Pattern                   | Used In                                | Issues                                  |
| ------------------------- | -------------------------------------- | --------------------------------------- |
| Direct controller calls   | usePredictMarket, usePredictPositions  | No caching, duplicate requests possible |
| Ref-based deduplication   | usePredictBalance                      | Manual, error-prone                     |
| Exponential backoff retry | usePredictMarketData                   | Not shared across hooks                 |
| Focus-based refresh       | usePredictPositions, usePredictBalance | Duplicated logic                        |

**Current Caching**:

- **GameCache**: 5-minute TTL for game updates (provider-level)
- **TeamsCache**: Persistent with request deduplication (provider-level)
- **Redux selectors**: For balance and claimable positions only
- **No general-purpose cache**: Most data refetched on every mount

**Missing Features**:

- Request deduplication across components
- Stale-while-revalidate pattern
- Automatic garbage collection
- Unified loading/error states

---

## Target Architecture

### Improved Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     APP-LEVEL PROVIDERS (New)                    │
│  PredictProvider (global event subscriptions)                   │
│  PredictQueryProvider (data fetching cache layer)               │
├─────────────────────────────────────────────────────────────────┤
│                        VIEWS (Screens)                           │
│  Each <500 lines, orchestration only, minimal hooks             │
├─────────────────────────────────────────────────────────────────┤
│                    VIEW COMPONENTS (New Layer)                   │
│  Screen-specific components, focused, <300 lines each           │
├─────────────────────────────────────────────────────────────────┤
│                   SHARED COMPONENTS (Reusable)                   │
│  Design system compliant, Tailwind styling, memoized            │
├─────────────────────────────────────────────────────────────────┤
│                         HOOKS (Unified)                          │
│  usePredictQuery (data fetching), usePredictToast (unified)     │
├─────────────────────────────────────────────────────────────────┤
│                      CONTEXT (State Sharing)                     │
│  PredictFeedContext, PredictQueryContext                        │
├─────────────────────────────────────────────────────────────────┤
│                    CONTROLLERS (Refactored)                      │
│  Extracted error handling, <2,000 lines, domain separation      │
├─────────────────────────────────────────────────────────────────┤
│                    PROVIDERS (Protocol Layer)                    │
│  PolymarketProvider | WebSocketManager | Caches                 │
└─────────────────────────────────────────────────────────────────┘
```

### New: App-Level Provider Hierarchy

The Predict feature will introduce providers that mount at the app level to solve event subscription and data caching issues:

```
Root (app/components/Views/Root/index.tsx)
└── SafeAreaProvider
    └── Redux Provider
        └── PersistGate
            └── ThemeProvider
                └── NavigationProvider
                    └── ControllersGate
                        └── ToastContextWrapper
                            └── ErrorBoundary
                                └── App
                                    └── PredictProvider (NEW - global subscriptions)
                                        └── PredictQueryProvider (NEW - data cache)
                                            └── AppFlow
```

**Why App-Level?**

- **PredictProvider**: Must persist across all navigation to catch transaction events
- **PredictQueryProvider**: Cache should survive tab switches for instant data on return

### Target Directory Structure

```
app/components/UI/Predict/
├── context/                       # NEW: App-level providers
│   ├── PredictProvider/           # Global event subscriptions
│   │   ├── PredictProvider.tsx
│   │   ├── PredictProvider.test.tsx
│   │   └── index.ts
│   ├── PredictQueryProvider/      # Data fetching cache layer
│   │   ├── PredictQueryProvider.tsx
│   │   ├── PredictQueryClient.ts  # Cache management
│   │   ├── usePredictQuery.ts     # Main hook
│   │   ├── usePredictMutation.ts  # Mutation hook
│   │   └── index.ts
│   └── index.ts
├── components/                    # Shared, reusable components
│   └── [Component]/
│       ├── Component.tsx          # Implementation (Box/Text, Tailwind)
│       ├── Component.test.tsx     # Tests
│       ├── Component.types.ts     # Types (if needed)
│       └── index.ts               # Exports
├── views/
│   └── [ViewName]/
│       ├── ViewName.tsx           # Container (<500 lines)
│       ├── ViewName.test.tsx      # Tests
│       ├── components/            # View-specific components
│       │   └── [SubComponent]/    # <300 lines each
│       ├── ViewNameContext.tsx    # Context (if needed)
│       └── index.ts
├── hooks/
│   ├── usePredictToast.ts         # Unified toast hook (replaces 4 hooks)
│   └── ...                        # Other hooks unchanged
├── types/
│   ├── index.ts                   # Core types
│   ├── chart.ts                   # NEW: Consolidated chart types
│   ├── query.ts                   # NEW: Query types (React Query compatible)
│   └── navigation.ts              # Navigation types
├── utils/
│   └── controllerErrorHandler.ts  # NEW: Extracted error handling
└── ...
```

### Target Metrics

| Metric                   | Current          | Target                                    |
| ------------------------ | ---------------- | ----------------------------------------- |
| PredictMarketDetails.tsx | 1,391 lines      | <500 lines                                |
| PredictFeed.tsx          | 738 lines        | <400 lines                                |
| PredictController.ts     | 2,401 lines      | <2,000 lines                              |
| StyleSheet files         | 10               | 0                                         |
| Duplicate chart types    | 2                | 1 (unified)                               |
| Toast hooks              | 4 separate       | 1 unified                                 |
| App-level providers      | 0                | 2 (PredictProvider, PredictQueryProvider) |
| Data fetching hooks      | 12+ inconsistent | All using usePredictQuery                 |

---

## Component Hierarchy

### Current Component Tree

```
PredictScreenStack
├── PredictFeed
│   ├── PredictFeedHeader
│   │   └── PredictBalance
│   ├── PredictFeedTabBar (TabsBar)
│   ├── PredictFeedTabs (PagerView)
│   │   └── PredictTabContent
│   │       └── AnimatedFlashList
│   │           └── PredictMarket (polymorphic)
│   │               ├── PredictMarketSingle
│   │               ├── PredictMarketMultiple
│   │               └── PredictMarketSportCard
│   └── PredictSearchOverlay
├── PredictMarketDetails
│   ├── renderHeader() [inline]
│   ├── renderMarketStatus() [inline]
│   ├── PredictDetailsChart
│   ├── renderCustomTabBar() [inline]
│   ├── renderTabContent() [inline]
│   │   ├── renderPositionsSection() [inline]
│   │   ├── renderOutcomesContent() [inline]
│   │   └── renderAboutSection() [inline]
│   ├── renderActionButtons() [inline]
│   └── PredictGameDetailsContent (if market.game)
├── PredictBuyPreview
│   ├── PredictKeypad
│   ├── PredictFeeSummary
│   └── ActionButtons
└── PredictSellPreview
    ├── PredictKeypad
    ├── PredictFeeSummary
    └── ActionButtons

PredictModalStack
├── PredictUnavailableModal
├── PredictGTMModal
├── PredictAddFundsModal
└── PredictActivityDetail
```

### Target Component Tree (After Refactoring)

```
PredictScreenStack
├── PredictFeed                    # Container only (<400 lines)
│   ├── PredictFeedContext         # NEW: Scroll state provider
│   └── components/
│       ├── PredictFeedHeader
│       ├── PredictFeedTabs
│       ├── PredictFeedList
│       ├── PredictFeedEmpty
│       └── PredictFeedSearch
├── PredictMarketDetails           # Container only (<500 lines)
│   └── components/
│       ├── PredictMarketDetailsHeader
│       ├── PredictMarketDetailsChart
│       ├── PredictMarketDetailsTabs
│       ├── PredictMarketDetailsPositions
│       ├── PredictMarketDetailsOutcomes
│       ├── PredictMarketDetailsAbout
│       └── PredictMarketDetailsActions
└── ... (other views unchanged)
```

---

## Data Flow Patterns

### Unidirectional Data Flow

```
┌─────────────────┐
│   User Action   │
└────────┬────────┘
         ▼
┌─────────────────┐
│    Component    │ ──── calls ────┐
└────────┬────────┘                │
         │                         ▼
         │                 ┌───────────────┐
         │                 │     Hook      │ ──── wraps ────┐
         │                 └───────────────┘                │
         │                                                  ▼
         │                                         ┌────────────────┐
         │                                         │  Controller    │
         │                                         └───────┬────────┘
         │                                                 │
         │                                                 ▼
         │                                         ┌────────────────┐
         │                                         │   Provider     │
         │                                         └───────┬────────┘
         │                                                 │
         │                                                 ▼
         │                                         ┌────────────────┐
         │                                         │ API/Blockchain │
         │                                         └───────┬────────┘
         │                                                 │
         │    ┌────────────────────────────────────────────┘
         │    │ Response
         │    ▼
         │ ┌────────────────┐
         │ │  Redux Store   │
         │ └───────┬────────┘
         │         │
         │         ▼
         │ ┌────────────────┐
         │ │   Selector     │ (memoized)
         │ └───────┬────────┘
         │         │
         │         ▼
         │ ┌────────────────┐
         └─│  useSelector   │ ──── triggers re-render
           └────────────────┘
```

### Real-Time Update Flow

```
┌──────────────────┐
│   WebSocket      │ (PolymarketProvider)
└────────┬─────────┘
         │ message
         ▼
┌──────────────────┐
│  WebSocketManager│
└────────┬─────────┘
         │ callback
         ▼
┌──────────────────┐
│ GameCache/       │
│ TeamsCache       │
└────────┬─────────┘
         │ update
         ▼
┌──────────────────┐
│ useLiveGameUpdates│
│ useLiveMarketPrices│
│ useLivePositions │
└────────┬─────────┘
         │ state update
         ▼
┌──────────────────┐
│    Component     │ re-renders with live data
└──────────────────┘
```

---

## State Management

### State Locations

| State Type        | Location          | Example                                     |
| ----------------- | ----------------- | ------------------------------------------- |
| Global Persistent | Redux Store       | User positions, balances, claim status      |
| Real-time         | Local Hook State  | Live prices, game scores                    |
| UI-specific       | Component State   | Search query, active tab, expanded sections |
| Shared UI         | Context           | Scroll position, layout measurements        |
| Cache             | In-memory Objects | GameCache, TeamsCache                       |

### Redux State Structure

```typescript
// Engine.context.PredictController.state
{
  providerConfigs: {...},
  lastError: string | null,
  lastUpdateTimestamp: number,
  depositTransactions: Record<string, PredictDeposit>,
  withdrawTransaction: PredictWithdraw | null,
  claimTransactions: Record<string, PredictClaim>,
  claimablePositions: Record<string, PredictPosition[]>,
}
```

### Selector Organization

```typescript
// selectors/predictController/index.ts
selectPredictBalanceByAddress(state, address); // Memoized balance lookup
selectPredictClaimablePositions(state); // All claimable positions
selectPredictClaimablePositionsByAddress(state, address); // Per-address positions
selectPredictWonPositions(state, address); // Won positions with P&L
selectPredictPendingDeposits(state); // Pending deposits
selectPredictPendingClaims(state); // Pending claims
selectPredictPendingDepositByAddress(state, address); // Pending deposit by address
selectPredictPendingClaimByAddress(state, address); // Pending claim by address
selectPredictWithdrawTransaction(state); // Pending withdraw
```

---

## Hooks Organization

### Hook Categories

| Category            | Count | Purpose                                        |
| ------------------- | ----- | ---------------------------------------------- |
| Trading Operations  | 6     | Order placement, claims, deposits, withdrawals |
| Data Fetching       | 8     | Markets, positions, prices, history            |
| Real-time Updates   | 3     | WebSocket-based live data                      |
| UI State            | 8     | Bottom sheets, scroll, measurements            |
| Toast Notifications | 5 → 1 | Transaction feedback (to be consolidated)      |
| Utility             | 2     | Optimistic updates, debounce                   |

### Hook Naming Convention

```
usePredict[Domain][Action]

Examples:
- usePredictMarket       → Domain: Market, Action: (fetch implied)
- usePredictPositions    → Domain: Positions, Action: (fetch implied)
- usePredictPlaceOrder   → Domain: (Order), Action: PlaceOrder
- usePredictClaim        → Domain: (Winnings), Action: Claim
- usePredictBalance      → Domain: Balance, Action: (fetch implied)
```

### Hook Composition Pattern

```typescript
// Higher-level hooks compose lower-level hooks
export function usePredictBalance() {
  const { getBalance } = usePredictTrading();           // Compose
  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();  // Compose
  const balance = useSelector((state) =>
    selectPredictBalanceByAddress(state, selectedAddress),
  );  // Redux

  const loadBalance = useCallback(async () => {
    await ensurePolygonNetworkExists();
    await getBalance();
  }, [getBalance, ensurePolygonNetworkExists]);

  return { balance, loadBalance, ... };
}
```

---

## Type System

### Core Types (`types/index.ts`)

```typescript
// Market & Outcomes
type PredictMarket = {...}           // 15 properties
type PredictOutcome = {...}          // 12 properties
type PredictOutcomeToken = {...}     // 4 properties
type PredictCategory = 'trending' | 'new' | 'sports' | 'crypto' | 'politics'

// Positions
type PredictPosition = {...}         // 22 properties
enum PredictPositionStatus { OPEN, REDEEMABLE, WON, LOST }

// Trading
enum Side { BUY, SELL }
type OnchainTradeParams = {...}
type OffchainTradeParams = {...}

// Sports
type PredictMarketGame = {...}       // Game data attached to market
type PredictGameStatus = 'scheduled' | 'ongoing' | 'ended'
type PredictGamePeriod = 'NS' | 'Q1' | 'Q2' | ... | 'FT' | 'VFT'
type PredictSportTeam = {...}

// Status Tracking
enum PredictClaimStatus { IDLE, PENDING, CONFIRMED, CANCELLED, ERROR }
enum PredictDepositStatus { IDLE, PENDING, CONFIRMED, CANCELLED, ERROR }
enum PredictWithdrawStatus { IDLE, PENDING, CONFIRMED, CANCELLED, ERROR }

// Result Type (Discriminated Union)
type Result<T = void> =
  | { success: true; response: T; error?: never }
  | { success: false; error: string; response?: never }
```

### Type Organization Strategy (Target)

```
types/
├── index.ts          # Core domain types (markets, positions, activity)
├── navigation.ts     # Navigation parameter types
├── flags.ts          # Feature flag types
├── chart.ts          # NEW: Consolidated chart types
└── api.ts            # API request/response types (if needed)
```

---

## Key Architectural Decisions

### Decision 1: Component Decomposition Strategy

**Decision**: Split large components into focused sub-components within a `/components` subdirectory.

**Rationale**:

- Keeps related code together
- Clear ownership and responsibility
- Easier testing in isolation
- Maintains encapsulation

**Example**:

```
views/PredictMarketDetails/
├── PredictMarketDetails.tsx    # Container (<500 lines)
├── components/
│   ├── Header/
│   ├── Chart/
│   ├── Tabs/
│   └── Actions/
└── index.ts
```

### Decision 2: Context for Shared State

**Decision**: Use React Context for scroll state in PredictFeed instead of prop drilling.

**Rationale**:

- Eliminates passing scrollHandler, headerHeight, tabBarHeight through multiple layers
- Cleaner component interfaces
- Standard React pattern for cross-cutting concerns

### Decision 3: Unified Toast Hook

**Decision**: Consolidate 4 toast hooks into 1 configurable hook.

**Rationale**:

- DRY principle - reduce code duplication
- Consistent toast behavior across features
- Easier maintenance and updates
- Backward compatible via re-exports

### Decision 4: Controller Error Handling Extraction

**Decision**: Extract repeated error handling pattern into utility function.

**Rationale**:

- Pattern repeated 15+ times
- Reduces controller size by ~400 lines
- Centralizes error logging configuration
- Easier to modify error behavior globally

### Decision 5: StyleSheet → Tailwind Migration

**Decision**: Migrate all StyleSheet.create() files to Tailwind + design system.

**Rationale**:

- Aligns with MetaMask UI development guidelines
- Consistent styling approach across codebase
- Benefits from design system tokens
- Better dark/light mode support

### Decision 6: App-Level PredictProvider for Global Event Subscriptions

**Decision**: Create a `PredictProvider` component mounted at the app level (in `App.tsx`) that handles all transaction event subscriptions.

**Problem Being Solved**: Toast hooks currently mount in `PredictTabView` and unsubscribe when the user navigates away, causing missed transaction events.

**Rationale**:

- Event subscriptions persist across all navigation
- No missed transaction events regardless of current screen
- Centralized event handling logic
- Cleaner separation between event handling and UI

**Implementation Approach**:

```typescript
// context/PredictProvider/PredictProvider.tsx
const PredictProvider = ({ children }) => {
  // Subscribe to TransactionController events ONCE at app level
  useEffect(() => {
    const handleTransactionUpdate = ({ transactionMeta }) => {
      // Check if this is a Predict transaction
      if (isPredictTransaction(transactionMeta)) {
        // Queue the event for consumption by any interested hooks
        eventQueue.push(transactionMeta);
        notifySubscribers();
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handleTransactionUpdate,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(...);
    };
  }, []);

  return (
    <PredictContext.Provider value={{ /* event queue, subscribe method */ }}>
      {children}
    </PredictContext.Provider>
  );
};
```

**Migration Path**:

1. Create PredictProvider with event queue
2. Create `usePredictTransactionEvents` hook to consume events
3. Refactor existing toast hooks to use the new hook
4. Mount PredictProvider in App.tsx
5. Remove direct subscriptions from toast hooks

### Decision 7: PredictQueryProvider - Lightweight React Query Alternative

**Decision**: Create a lightweight data fetching layer (`PredictQueryProvider` + `usePredictQuery`) that mimics React Query's API but with minimal implementation, designed to be replaced by real React Query when approved.

**Problem Being Solved**: Data fetching is scattered across 12+ hooks with no caching, leading to:

- Duplicate requests from multiple components
- No stale-while-revalidate pattern
- Inconsistent loading/error handling
- Data refetched on every mount

**Design Goals**:

1. **React Query-compatible API**: Same interface so migration is seamless
2. **Minimal implementation**: Only implement what we need now
3. **Replaceable**: Can be swapped for real React Query with minimal code changes

**Core API (React Query Compatible)**:

```typescript
// usePredictQuery - matches React Query's useQuery
const { data, isLoading, isError, error, refetch, isFetching } =
  usePredictQuery({
    queryKey: ['market', marketId],
    queryFn: () => controller.getMarket({ marketId }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!marketId,
  });

// usePredictMutation - matches React Query's useMutation
const { mutate, isPending, isError } = usePredictMutation({
  mutationFn: (params) => controller.placeOrder(params),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['positions'] }),
});

// PredictQueryClient - matches React Query's QueryClient
const queryClient = usePredictQueryClient();
queryClient.invalidateQueries({ queryKey: ['positions'] });
queryClient.setQueryData(['market', id], newData);
```

**Features to Implement (MVP)**:

| Feature               | Priority | Description                                  |
| --------------------- | -------- | -------------------------------------------- |
| Query caching         | P0       | Store results by queryKey                    |
| Request deduplication | P0       | Single in-flight request per queryKey        |
| staleTime             | P0       | Don't refetch if data is fresh               |
| enabled flag          | P0       | Conditional fetching                         |
| refetch()             | P0       | Manual refetch                               |
| invalidateQueries     | P0       | Mark queries as stale                        |
| Loading/error states  | P0       | isPending, isError, error                    |
| isFetching            | P1       | Background refetch indicator                 |
| setQueryData          | P1       | Direct cache updates                         |
| gcTime                | P2       | Garbage collection (can default to Infinity) |
| refetchOnMount        | P2       | Auto-refetch on mount (can default to false) |

**Features to Skip (Let Real React Query Handle)**:

- refetchOnWindowFocus
- refetchOnReconnect
- Complex retry logic
- Structural sharing
- Suspense support
- Devtools

**Migration Path**:

1. Create PredictQueryClient class (cache + deduplication)
2. Create PredictQueryProvider context
3. Implement usePredictQuery hook
4. Implement usePredictMutation hook
5. Migrate one data hook (e.g., usePredictMarket) as proof of concept
6. Gradually migrate other hooks
7. When React Query is approved, swap providers and remove custom implementation

**Future React Query Migration**:

```typescript
// Before (our lightweight implementation)
import {
  PredictQueryProvider,
  usePredictQuery,
} from '../context/PredictQueryProvider';

// After (real React Query)
import { QueryClientProvider, useQuery } from '@tanstack/react-query';

// Consumer code stays the same!
const { data, isLoading } = useQuery({
  // or usePredictQuery
  queryKey: ['market', marketId],
  queryFn: () => controller.getMarket({ marketId }),
});
```

---

## Related Documents

- [Refactoring Tasks](./refactoring-tasks.md) - Detailed task breakdown with priorities
- [Implementation Guide](./implementation-guide.md) - Patterns and anti-patterns
- [Live NFL Architecture](./live-nfl-architecture.md) - Sports feature specifics
- [Sentry Performance](./predict-sentry-performance.md) - Performance tracking
