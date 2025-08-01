// Core hooks (direct controller access)
export { usePerpsDeposit } from './usePerpsDeposit';
export { usePerpsDepositQuote } from './usePerpsDepositQuote';
export { usePerpsMarkets } from './usePerpsMarkets';
export { usePerpsNetwork } from './usePerpsNetwork';
export { usePerpsNetworkConfig } from './usePerpsNetworkConfig';
export { usePerpsTrading } from './usePerpsTrading';
export { usePerpsWithdrawQuote } from './usePerpsWithdrawQuote';

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
export { usePerpsLiquidationPrice } from './usePerpsLiquidationPrice';
export { usePerpsMarketData } from './usePerpsMarketData';
export { usePerpsMarketStats } from './usePerpsMarketStats';

// Withdrawal specific hooks
export { useWithdrawTokens } from './useWithdrawTokens';
export { useWithdrawValidation } from './useWithdrawValidation';

// UI utility hooks
export { useBalanceComparison } from './useBalanceComparison';
export { useColorPulseAnimation } from './useColorPulseAnimation';
export { usePerpsPositions } from './usePerpsPositions';
export { usePerpsTPSLUpdate } from './usePerpsTPSLUpdate';

// - usePerpsDeposit (deposit flows)
// - usePerpsPendingOrders (order management)
// - usePerpsError (error handling)
// - usePerpsLivePositions (live position tracking)
// - usePerpsOrderFills (order fills)
// - usePerpsPositionPnL (P&L calculations)
// - usePerpsReadiness (readiness checks)
// - usePerpsOrderManagement (order workflows)
// - useStableArray (utility hook for stable array references)
