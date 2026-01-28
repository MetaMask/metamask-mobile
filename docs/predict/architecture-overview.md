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

---

## Target Architecture

### Improved Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
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
│  Consolidated toast hooks, clear single responsibility          │
├─────────────────────────────────────────────────────────────────┤
│                      CONTEXT (State Sharing)                     │
│  PredictFeedContext for scroll state, eliminate prop drilling   │
├─────────────────────────────────────────────────────────────────┤
│                    CONTROLLERS (Refactored)                      │
│  Extracted error handling, <2,000 lines, domain separation      │
├─────────────────────────────────────────────────────────────────┤
│                    PROVIDERS (Unchanged)                         │
│  PolymarketProvider | WebSocketManager | Caches                 │
└─────────────────────────────────────────────────────────────────┘
```

### Target Directory Structure

```
app/components/UI/Predict/
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
│   └── navigation.ts              # Navigation types
├── utils/
│   └── controllerErrorHandler.ts  # NEW: Extracted error handling
└── ...
```

### Target Metrics

| Metric                   | Current     | Target       |
| ------------------------ | ----------- | ------------ |
| PredictMarketDetails.tsx | 1,391 lines | <500 lines   |
| PredictFeed.tsx          | 738 lines   | <400 lines   |
| PredictController.ts     | 2,401 lines | <2,000 lines |
| StyleSheet files         | 10          | 0            |
| Duplicate chart types    | 2           | 1 (unified)  |
| Toast hooks              | 4 separate  | 1 unified    |

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
selectPredictBalanceByAddress({ address }); // Memoized balance lookup
selectPredictClaimablePositions(); // All claimable positions
selectPredictClaimablePositionsByAddress(); // Per-address positions
selectPredictWonPositions(); // Won positions with P&L
selectPredictPendingDeposits(); // Pending deposits
selectPredictConfirmedDeposits(); // Confirmed deposits
selectPredictCancelledDeposits(); // Cancelled deposits
selectPredictPendingClaims(); // Pending claims
selectPredictPendingWithdraw(); // Pending withdraw
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
  const balance = useSelector(selectPredictBalanceByAddress());  // Redux

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

---

## Related Documents

- [Refactoring Tasks](./refactoring-tasks.md) - Detailed task breakdown with priorities
- [Implementation Guide](./implementation-guide.md) - Patterns and anti-patterns
- [Live NFL Architecture](./live-nfl-architecture.md) - Sports feature specifics
- [Sentry Performance](./predict-sentry-performance.md) - Performance tracking
