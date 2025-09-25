// Core hooks (direct controller access)
export { usePerpsMarkets } from './usePerpsMarkets';
export { usePerpsNetwork } from './usePerpsNetwork';
export { usePerpsNetworkConfig } from './usePerpsNetworkConfig';
export { usePerpsNetworkManagement } from './usePerpsNetworkManagement';
export { usePerpsTrading } from './usePerpsTrading';
export { usePerpsWithdrawQuote } from './usePerpsWithdrawQuote';
export { usePerpsDepositStatus } from './usePerpsDepositStatus';
export { usePerpsWithdrawStatus } from './usePerpsWithdrawStatus';

// Connection management hooks
export { usePerpsConnection } from '../providers/PerpsConnectionProvider';
export { usePerpsConnectionLifecycle } from './usePerpsConnectionLifecycle';

// State hooks (Redux selectors)
export { usePerpsAccount } from './usePerpsAccount';
// Portfolio balance hook (for wallet integration)
export { usePerpsPortfolioBalance } from './usePerpsPortfolioBalance';

// Live data hooks (WebSocket subscriptions)
export { usePerpsPositionData } from './usePerpsPositionData';
export { usePerpsPrices } from './usePerpsPrices';

// Asset metadata hooks
export { usePerpsAssetMetadata } from './usePerpsAssetsMetadata';
// Market data and calculation hooks
export { usePerpsLiquidationPrice } from './usePerpsLiquidationPrice';
export { usePerpsMarketData } from './usePerpsMarketData';
export { usePerpsMarketStats } from './usePerpsMarketStats';

// Withdrawal specific hooks
export { useWithdrawTokens } from './useWithdrawTokens';
export { useWithdrawValidation } from './useWithdrawValidation';

// Payment tokens hook
export { usePerpsPaymentTokens } from './usePerpsPaymentTokens';

// UI utility hooks
export { useBalanceComparison } from './useBalanceComparison';
export { useColorPulseAnimation } from './useColorPulseAnimation';
export { usePerpsTPSLUpdate } from './usePerpsTPSLUpdate';
export { usePerpsClosePosition } from './usePerpsClosePosition';
export { usePerpsOrderFees, formatFeeRate } from './usePerpsOrderFees';
export { useHasExistingPosition } from './useHasExistingPosition';
export { useMinimumOrderAmount } from './useMinimumOrderAmount';
export { usePerpsOrderForm } from './usePerpsOrderForm';
export { usePerpsOrderValidation } from './usePerpsOrderValidation';
export { usePerpsClosePositionValidation } from './usePerpsClosePositionValidation';
export { usePerpsOrderExecution } from './usePerpsOrderExecution';
export { usePerpsFirstTimeUser } from './usePerpsFirstTimeUser';
export { usePerpsTPSLForm } from './usePerpsTPSLForm';
export { default as usePerpsToasts } from './usePerpsToasts';

// Transaction data hooks
export { usePerpsOrderFills } from './usePerpsOrderFills';
export { usePerpsOrders } from './usePerpsOrders';
export { usePerpsFunding } from './usePerpsFunding';

// Event tracking hook
export { usePerpsEventTracking } from './usePerpsEventTracking';

// Performance tracking hooks
export { usePerpsPerformance } from './usePerpsPerformance';
export { usePerpsScreenTracking } from './usePerpsScreenTracking';

// Block explorer hook
export { usePerpsBlockExplorerUrl } from './usePerpsBlockExplorerUrl';

// Utility hooks
export { useStableArray } from './useStableArray';

// Stream hooks (WebSocket subscriptions)
export * from './stream';

// - usePerpsPendingOrders (order management)
// - usePerpsError (error handling)
// - usePerpsLivePositions (live position tracking)
// - usePerpsPositionPnL (P&L calculations)
// - usePerpsReadiness (readiness checks)
// - usePerpsOrderManagement (order workflows)
