# PerpsController Architecture

## Overview

The PerpsController provides a protocol-agnostic abstraction layer for perpetual futures trading in MetaMask Mobile. It extends MetaMask's BaseController pattern while introducing mobile-specific optimizations for real-time trading.

## Key Design Principles

1. **Protocol Agnostic**: Unified interface supporting multiple perps protocols
2. **Mobile Optimized**: Battery-efficient with automatic WebSocket lifecycle management
3. **High Performance**: Real-time updates bypass Redux to prevent UI blocking
4. **MetaMask Native**: Follows established controller patterns and state persistence
5. **Provider Abstraction**: Consistent API layer that works across different perps protocols

## Architecture Innovation: Navigation-Based WebSocket Management

**Problem**: WebSocket connections for real-time trading data would persist after leaving Perps screens, draining battery and causing memory leaks.

**Solution**: Automatic WebSocket lifecycle management based on navigation state.

**Implementation**:
- `NavigationProvider.tsx`: Monitors route changes at the app level
- `usePerpsNavigationMonitoring.ts`: Detects when entering/leaving Perps routes  
- `HyperLiquidProvider.ts`: Properly closes WebSocket using `Symbol.asyncDispose`

**Benefits**:
- Zero component changes required for cleanup
- Automatic battery optimization
- Centralized WebSocket lifecycle management
- Connections recreated on-demand when returning

## Core Architecture

```
┌─────────────────────────────────────────┐
│              UI Layer                   │
│  Trading Views + Real-time Price Hooks  │
└─────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────┐
│           PerpsController               │
│  • Protocol-agnostic orchestration     │
│  • State persistence via BaseController│
│  • Trading actions + live data routing │
└─────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────┐
│         Protocol Providers             │
│  • HyperLiquidProvider (implemented)   │
│  • Future: GMX, dYdX, etc.             │
│  • SDK integration + signing           │
└─────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────┐
│            External SDKs                │
│  @deeeed/hyperliquid-node20            │
└─────────────────────────────────────────┘
```

## Dual Data Flow Pattern

**Problem**: Real-time trading data (10-100 updates/second) causes UI blocking when routed through Redux.

**Solution**: Separate data flows for different use cases:

1. **Real-Time Data** (Direct WebSocket → UI)
   - Price updates, live P&L calculations
   - Bypasses Redux entirely for maximum performance
   - Component-level subscriptions with automatic cleanup

2. **Trading Actions** (UI → Controller → Provider)
   - Order placement, position management
   - Uses Redux for optimistic updates and persistence

3. **Bootstrap Data** (Controller → Redux → UI)
   - Initial positions, account balances, order history
   - Persisted across app restarts via BaseController

## Key Files

### Controllers
- `controllers/PerpsController.ts` - Main controller extending BaseController
- `controllers/providers/HyperLiquidProvider.ts` - HyperLiquid protocol implementation
- `controllers/types/index.ts` - Interface definitions

### React Integration
- `hooks/usePerpsController.ts` - Main React hooks with performance optimizations
- `hooks/usePerpsNavigationMonitoring.ts` - Navigation-based WebSocket cleanup

### Utilities
- `utils/hyperLiquidAdapter.ts` - Transforms between MetaMask Perps API and protocol-specific SDK formats

### UI Components
- `Views/` - 11 trading interfaces covering deposit flows, order management, and position details
- `components/` - Reusable trading components (modals, cards, form elements)

## Critical Implementation Details

### Performance Optimizations
- **useCallback** throughout to prevent subscription loops
- **Stable function references** to avoid unnecessary re-renders
- **Direct Engine access** (`Engine.context.PerpsController`) for reliability

### WebSocket Management
- **AsyncDispose pattern** for proper WebSocket cleanup
- **Navigation monitoring** at NavigationProvider level
- **On-demand reconnection** when returning to Perps screens

### MetaMask Integration
- **BaseController extension** for state persistence and messaging
- **Direct KeyringController access** (not via messenger due to security constraints)
- **Provider abstraction layer** for multi-protocol compatibility

## SDK Integration Notes

**HyperLiquid SDK**: `@deeeed/hyperliquid-node20` (forked for React Native compatibility)

**Key Transformations** (see `hyperLiquidAdapter.ts`):
```
Protocol SDK Format → MetaMask Perps API
{ szi, entryPx, is_buy } → { size, entryPrice, isBuy }
{ a, b, s, r, t } → { coin, isBuy, size, reduceOnly, orderType }
```

**Multi-Protocol Support**:
- Each protocol provider implements the same `IPerpsProvider` interface
- UI components work with any protocol without modification
- Adapter utilities handle protocol-specific transformations

## Development Commands

```bash
# TypeScript validation (Perps only)
npx tsc --noEmit app/components/UI/Perps/**/*.ts

# ESLint (Perps files only - avoid modifying entire codebase)
yarn lint app/components/UI/Perps/ --fix

# Testing
yarn test app/components/UI/Perps/
```

## State Management

**Controller State** (see `PerpsController.ts`):
- `positions: Position[]` - Persisted to storage
- `accountState: AccountState | null` - Persisted to storage
- `orderHistory: OrderResult[]` - Persisted to storage
- `isTestnet: boolean` - Persisted to storage
- `connectionStatus, pendingOrders, lastError` - Transient state

**Real-Time State** (Component-level):
- Live prices, real-time P&L, order fills
- Direct WebSocket subscriptions, no Redux involvement

## Testing

**Comprehensive testing capabilities**:
- **Main testing interface**: `Views/PerpsView.tsx` for SDK and balance validation
- **Advanced order testing**: `Views/PerpsOrderView.tsx` with debug panel for direct SDK calls
- **Deposit flow testing**: Complete deposit simulation with real token/gas integration
- **Position management**: Live position tracking and P&L calculations

## Current Status

✅ **Core Features Production Ready**:
- Complete HyperLiquid integration
- Battery-optimized WebSocket management
- Performance-optimized React hooks
- Full TypeScript coverage
- MetaMask Engine integration
- Trading and deposit flows (5/11 views fully complete)

⚠️ **In Development**:
- Order editing functionality
- Take Profit/Stop Loss management
- Real-time bridge estimates for cross-chain deposits
- Advanced order management features

## Future Extensions

- Additional protocol providers (GMX, dYdX)
- Enhanced error handling and retry logic
- Advanced order types and risk management
- Cross-chain perpetual support

---

*This architecture successfully combines MetaMask's established patterns with protocol abstraction and mobile optimizations for unified perps trading across multiple protocols.*