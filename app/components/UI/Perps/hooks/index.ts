// Core hooks (direct controller access)
export { usePerpsMarkets } from './usePerpsMarkets';
export { usePerpsNetwork } from './usePerpsNetwork';
export { usePerpsNetworkConfig } from './usePerpsNetworkConfig';
export { usePerpsNetworkManagement } from './usePerpsNetworkManagement';
export { usePerpsTrading } from './usePerpsTrading';
export { usePerpsWithdrawQuote } from './usePerpsWithdrawQuote';
export { usePerpsWithdrawStatus } from './usePerpsWithdrawStatus';
export { usePerpsWithdrawProgress } from './usePerpsWithdrawProgress';

// View-level composite hooks (combining multiple hooks for specific views)
export { usePerpsHomeData } from './usePerpsHomeData';
export { usePerpsMarketListView } from './usePerpsMarketListView';
export { usePerpsSearch } from './usePerpsSearch';
export { usePerpsSorting } from './usePerpsSorting';
export { usePerpsNavigation } from './usePerpsNavigation';

// Connection management hooks
export { usePerpsConnectionLifecycle } from './usePerpsConnectionLifecycle';
export { usePerpsConnection } from './usePerpsConnection';

// State hooks (Redux selectors)
// Portfolio balance hook (for wallet integration)
export { usePerpsPortfolioBalance } from './usePerpsPortfolioBalance';

// Live data hooks (WebSocket subscriptions)
export { usePerpsPrices } from './usePerpsPrices';

// Asset metadata hooks
export { usePerpsAssetMetadata } from './usePerpsAssetsMetadata';
// Market data and calculation hooks
export { usePerpsLiquidationPrice } from './usePerpsLiquidationPrice';
export {
  usePerpsMarketData,
  type UsePerpsMarketDataParams,
} from './usePerpsMarketData';
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
export { usePerpsRewards } from './usePerpsRewards';
export { usePerpsRewardAccountOptedIn } from './usePerpsRewardAccountOptedIn';
export { usePerpsCloseAllCalculations } from './usePerpsCloseAllCalculations';
export { usePerpsCancelAllOrders } from './usePerpsCancelAllOrders';
export { usePerpsCloseAllPositions } from './usePerpsCloseAllPositions';
export { usePositionManagement } from './usePositionManagement';
// Removed from barrel: usePerpsHomeActions imports Engine-dependent hooks
// Import directly: import { usePerpsHomeActions } from './hooks/usePerpsHomeActions';
export { useHasExistingPosition } from './useHasExistingPosition';
export { useMinimumOrderAmount } from './useMinimumOrderAmount';
export { usePerpsOrderForm } from './usePerpsOrderForm';
export { usePerpsOrderValidation } from './usePerpsOrderValidation';
export { usePerpsClosePositionValidation } from './usePerpsClosePositionValidation';
export { usePerpsOrderExecution } from './usePerpsOrderExecution';
export { useIsPriceDeviatedAboveThreshold } from './useIsPriceDeviatedAboveThreshold';
export { usePerpsFirstTimeUser } from './usePerpsFirstTimeUser';
export { usePerpsTPSLForm } from './usePerpsTPSLForm';
export { default as usePerpsToasts } from './usePerpsToasts';

// Transaction data hooks
export { usePerpsOrderFills } from './usePerpsOrderFills';
export { usePerpsOrders } from './usePerpsOrders';
export { usePerpsFunding } from './usePerpsFunding';
export { useWithdrawalRequests } from './useWithdrawalRequests';
export { useDepositRequests } from './useDepositRequests';
export { usePerpsTransactionHistory } from './usePerpsTransactionHistory';

// Event tracking hook
export { usePerpsEventTracking } from './usePerpsEventTracking';

// Performance tracking hooks
// Removed: usePerpsScreenTracking - migrated to usePerpsMeasurement
export { usePerpsMeasurement } from './usePerpsMeasurement';

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
