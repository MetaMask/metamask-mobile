# PR Summary: Perps Balance Integration (TAT-1044 & TAT-1299)

## Overview

This PR implements perps account balance integration into the wallet portfolio view, allowing users to see their total portfolio value including perps positions without maintaining unnecessary WebSocket connections.

## Key Features Implemented

### 1. Portfolio Balance Integration (TAT-1299)

- ✅ Perps account balance is now included in the total wallet balance
- ✅ Balance persists in Redux state for offline viewing
- ✅ WebSocket connections only active when in perps environment
- ✅ Support for multiple perps providers (future-proof architecture)

### 2. Unrealized P&L Display (TAT-1044)

- ✅ Total unrealized P&L visible across all open positions
- ✅ 24h portfolio change calculation with real historical data
- ✅ Accurate percentage changes in portfolio value

## Technical Implementation

### Architecture Changes

```
Wallet View (No WebSocket)          Perps Environment (Active WebSocket)
    │                                        │
    ├─ PortfolioBalance                     ├─ PerpsConnectionManager (Singleton)
    │    └─ usePerpsPortfolioBalance        │    ├─ Subscribe to streams
    │         └─ Read from Redux            │    └─ updatePerpsBalances()
    │                                        │         └─ Write to Redux
    └─ Display combined balance              └─ Real-time updates
```

### Key Components Modified

1. **PerpsController** (`app/components/UI/Perps/controllers/PerpsController.ts`)

   - Added `perpsBalances` state structure with historical data
   - Stores `totalValue`, `unrealizedPnl`, `accountValue1dAgo` per provider
   - Fetches and persists historical portfolio data

2. **PerpsConnectionManager** (`app/components/UI/Perps/services/PerpsConnectionManager.ts`)

   - Singleton pattern ensures single instance
   - Updates balances via stream subscriptions
   - Price updates throttled to 5s, position changes immediate

3. **usePerpsPortfolioBalance** (`app/components/UI/Perps/hooks/usePerpsPortfolioBalance.ts`)

   - Aggregates balances across all providers
   - Returns current and 24h ago values
   - Converts USD to display currency

4. **PortfolioBalance** (`app/components/UI/Tokens/TokenList/PortfolioBalance/index.tsx`)

   - Combines wallet + perps balances
   - One-time fetch on mount
   - No WebSocket dependency

5. **AggregatedPercentageCrossChains** (`app/component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains.tsx`)
   - Uses real historical data for 24h change
   - Accurate percentage calculations

## State Structure

```typescript
perpsBalances: {
  [provider: string]: {
    totalValue: string;        // Current account value (USD)
    unrealizedPnl: string;     // P&L from open positions (USD)
    accountValue1dAgo: string; // 24h ago value (USD)
    positions: Position[];     // Current positions
    lastUpdated: number;       // Timestamp
  }
}
```

## Testing Checklist

- [ ] Wallet shows combined balance (wallet + perps)
- [ ] No WebSocket connections on wallet screen
- [ ] Perps balance persists after app restart
- [ ] 24h change shows accurate percentage
- [ ] Balance updates when entering perps tab
- [ ] Position changes update balance immediately
- [ ] Price changes update balance (throttled 5s)

## Files Changed

- `app/components/UI/Perps/controllers/PerpsController.ts` - Added historical data storage
- `app/components/UI/Perps/services/PerpsConnectionManager.ts` - Balance update logic
- `app/components/UI/Perps/hooks/usePerpsPortfolioBalance.ts` - Historical value aggregation
- `app/components/UI/Tokens/TokenList/PortfolioBalance/index.tsx` - Combined balance display
- `app/component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains.tsx` - Real 24h change
- `app/core/Engine/controllers/perps-controller/index.test.ts` - Test fix

## Removed Files

- `app/components/UI/Perps/hooks/usePerpsBalance.ts` - Unused
- `app/components/UI/Perps/hooks/usePerpsHistoricalPortfolio.ts` - Unused
- `app/components/UI/Perps/hooks/usePerpsBalanceUpdater.ts` - Consolidated into singleton

## Performance Considerations

- No WebSocket overhead on wallet screen
- Singleton pattern prevents duplicate subscriptions
- Throttled updates reduce UI flicker
- Persisted state enables instant display

## Migration Notes

- Existing users will see $0 for 24h change initially
- Historical data populates on first perps tab visit
- No breaking changes to existing functionality
