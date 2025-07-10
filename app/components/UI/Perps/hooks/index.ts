// Core hooks (direct controller access)
export { usePerpsTrading } from './usePerpsTrading';
export { usePerpsNetworkConfig } from './usePerpsNetworkConfig';
export { usePerpsNetwork } from './usePerpsNetwork';

// Connection management hooks
export { usePerpsConnection } from '../providers/PerpsConnectionProvider';

// State hooks (Redux selectors)
export { usePerpsAccount } from './usePerpsAccount';

// Live data hooks (WebSocket subscriptions)
export { usePerpsPrices } from './usePerpsPrices';

// Utility hooks
export { useStableArray } from './useStableArray';

// Removed for minimal PR:
// - usePerpsPositions (positions management)
// - usePerpsDeposit (deposit flows)
// - usePerpsPendingOrders (order management)
// - usePerpsError (error handling)
// - usePerpsLivePositions (live position tracking)
// - usePerpsOrderFills (order fills)
// - usePerpsPositionPnL (P&L calculations)
// - usePerpsReadiness (readiness checks)
// - usePerpsOrderManagement (order workflows)
