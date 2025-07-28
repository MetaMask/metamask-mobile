// Core hooks (direct controller access)
export { usePerpsTrading } from './usePerpsTrading';
export { usePerpsNetworkConfig } from './usePerpsNetworkConfig';
export { usePerpsNetwork } from './usePerpsNetwork';
export { usePerpsMarkets } from './usePerpsMarkets';
export { usePerpsDeposit } from './usePerpsDeposit';
export { usePerpsDepositQuote } from './usePerpsDepositQuote';

// Connection management hooks
export { usePerpsConnection } from '../providers/PerpsConnectionProvider';

// State hooks (Redux selectors)
export { usePerpsAccount } from './usePerpsAccount';

// Live data hooks (WebSocket subscriptions)
export { usePerpsPositionData } from './usePerpsPositionData';
export { usePerpsPrices } from './usePerpsPrices';

// Asset metadata hooks
export { usePerpsAssetMetadata } from './usePerpsAssetsMetadata';

// Payment token hooks
export { usePerpsPaymentTokens } from './usePerpsPaymentTokens';

// Market data and calculation hooks
export { usePerpsMarketData } from './usePerpsMarketData';
export { usePerpsLiquidationPrice } from './usePerpsLiquidationPrice';

// UI utility hooks
export { usePerpsTPSLUpdate } from './usePerpsTPSLUpdate';
export { usePerpsPositions } from './usePerpsPositions';
export { useBalanceComparison } from './useBalanceComparison';
export { useColorPulseAnimation } from './useColorPulseAnimation';
// - usePerpsDeposit (deposit flows)
// - usePerpsPendingOrders (order management)
// - usePerpsError (error handling)
// - usePerpsLivePositions (live position tracking)
// - usePerpsOrderFills (order fills)
// - usePerpsPositionPnL (P&L calculations)
// - usePerpsReadiness (readiness checks)
// - usePerpsOrderManagement (order workflows)
// - useStableArray (utility hook for stable array references)
