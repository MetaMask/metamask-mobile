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

### Live Data (WebSocket)

- `usePerpsPrices` - Real-time prices
- `usePerpsPositionData` - Position updates

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

## Architecture Layers

```
┌─────────────────────────────────────┐
│         Components (UI)              │
├─────────────────────────────────────┤
│          Hooks (React)               │
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
| Get prices     | `usePerpsPrices`                                            |
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
├── /providers     # Protocol implementations
├── /utils         # Helper functions
├── /constants     # Config values
└── /types         # TypeScript definitions
```
