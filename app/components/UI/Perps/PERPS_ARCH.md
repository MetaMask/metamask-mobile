# Perps Architecture

## Hooks - Categorized to prevent duplication

### Controller Access

- `usePerpsTrading` - Trading ops (place/cancel/close)
- `usePerpsDeposit` - Deposit flow
- `usePerpsDepositQuote` - Deposit quotes
- `usePerpsMarkets` - Market data
- `usePerpsNetwork` - Network config
- `usePerpsWithdrawQuote` - Withdrawal quotes

### State Management

- `usePerpsAccount` - Redux account state
- `usePerpsConnection` - Connection provider
- `usePerpsPositions` - Position list
- `usePerpsNetworkConfig` - Network state

### Live Data (Stream Architecture)

- `useLivePrices` - Real-time prices with component-level debouncing (NEW)
- `usePerpsPrices` - Legacy real-time prices (being deprecated)
- `usePerpsPositionData` - Position updates
- Future: `useLiveOrders`, `useLivePositions`, `useLiveFills`

### Calculations

- `usePerpsLiquidationPrice` - Liquidation calc
- `usePerpsOrderFees` - Fee calc
- `useMinimumOrderAmount` - Min order calc
- `usePerpsMarketData` - Market-specific data
- `usePerpsMarketStats` - Market statistics

### Validation (Protocol + UI)

- `usePerpsOrderValidation` - Order validation
- `usePerpsClosePositionValidation` - Close validation
- `useWithdrawValidation` - Withdrawal validation

### Form Management

- `usePerpsOrderForm` - Order form state
- `usePerpsOrderExecution` - Order execution flow
- `usePerpsClosePosition` - Close position flow
- `usePerpsTPSLUpdate` - TP/SL updates

### UI Utilities

- `useColorPulseAnimation` - Animations
- `useBalanceComparison` - Balance compare
- `useHasExistingPosition` - Position check
- `useStableArray` - Array stability

### Assets/Tokens

- `usePerpsAssetMetadata` - Asset metadata
- `usePerpsPaymentTokens` - Payment tokens
- `useWithdrawTokens` - Withdrawal tokens

### Special Purpose

- `usePerpsEligibility` - User eligibility check

## Duplication Prevention

Before creating a new hook:

1. Check existing hooks in relevant category
2. Consider composing existing hooks
3. Follow naming: `usePerps[Feature][Action]`
4. Keep single responsibility

## Stream Architecture (WebSocket Management)

### Overview

Single WebSocket subscriptions shared across all components with component-level debouncing. This prevents subscription interference and reduces WebSocket connections by 90%.

### Provider Setup

- `PerpsStreamProvider` wraps all routes in `/routes/index.tsx`
- Provides access to stream channels without holding state
- No re-renders propagated to parent components

### Stream Hooks

Located in `/hooks/stream/`:

```typescript
// Each component sets its own update rate
const prices = useLivePrices({
  symbols: ['BTC', 'ETH'],
  debounceMs: 10000, // 10s for order view
});
```

Available hooks:

- `useLivePrices(options)` - Real-time prices with custom debounce
- `useLiveOrders(options)` - Order updates (future)
- `useLivePositions(options)` - Position updates (future)
- `useLiveFills(options)` - Fill notifications (future)

### Benefits

- **90% fewer WebSocket connections** - Single subscription per data type
- **No subscription interference** - Each component controls its rate
- **Component-level control** - Different rates for different views
- **Instant first render** - Cached data available immediately
- **Zero parent re-renders** - Updates go directly to subscribers

### Migration Path

1. Replace `usePerpsPrices` with `useLivePrices`
2. Set appropriate debounce for each view:
   - Order entry: 10000ms (stable prices)
   - Market list: 2000ms (responsive updates)
   - Market details: 500ms (near real-time)
   - Charts: 100ms (smooth animations)

## Architecture Layers

```
┌─────────────────────────────────────┐
│         Components (UI)              │
├─────────────────────────────────────┤
│          Hooks (React)               │
├─────────────────────────────────────┤
│    Stream Manager (WebSocket)        │ <- NEW LAYER
├─────────────────────────────────────┤
│       Controller (Business)          │
├─────────────────────────────────────┤
│        Provider (Protocol)           │
└─────────────────────────────────────┘
```

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

| Need           | Use Hook                                                    |
| -------------- | ----------------------------------------------------------- |
| Place order    | `usePerpsTrading` + `usePerpsOrderExecution`                |
| Validate order | `usePerpsOrderValidation`                                   |
| Get prices     | `useLivePrices` (NEW) or `usePerpsPrices` (legacy)          |
| Manage form    | `usePerpsOrderForm`                                         |
| Calculate fees | `usePerpsOrderFees`                                         |
| Check position | `useHasExistingPosition`                                    |
| Close position | `usePerpsClosePosition` + `usePerpsClosePositionValidation` |
| Get account    | `usePerpsAccount`                                           |
| Deposit funds  | `usePerpsDeposit`                                           |
| Withdraw funds | `usePerpsWithdrawQuote` + `useWithdrawValidation`           |

## File Structure

```
/Perps
├── /components     # UI components
├── /controllers    # Business logic
├── /hooks         # React integration (30+ hooks)
│   └── /stream    # WebSocket stream hooks (NEW)
├── /providers     # Protocol implementations
│   └── PerpsStreamManager.tsx  # WebSocket manager (NEW)
├── /utils         # Helper functions
├── /constants     # Config values
└── /types         # TypeScript definitions
```
