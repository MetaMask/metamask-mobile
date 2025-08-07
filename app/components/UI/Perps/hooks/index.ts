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
export { usePerpsClosePosition } from './usePerpsClosePosition';
export { usePerpsOrderFees, formatFeeRate } from './usePerpsOrderFees';
export { useHasExistingPosition } from './useHasExistingPosition';
export { useMinimumOrderAmount } from './useMinimumOrderAmount';
export { usePerpsOrderForm } from './usePerpsOrderForm';
export { usePerpsOrderValidation } from './usePerpsOrderValidation';
export { usePerpsClosePositionValidation } from './usePerpsClosePositionValidation';
export { usePerpsOrderExecution } from './usePerpsOrderExecution';

// Transaction data hooks
export { usePerpsOrderFills } from './usePerpsOrderFills';
export { usePerpsOrders } from './usePerpsOrders';
export { usePerpsFunding } from './usePerpsFunding';

// Block explorer hook
export { usePerpsBlockExplorerUrl } from './usePerpsBlockExplorerUrl';

// - usePerpsDeposit (deposit flows)
// - usePerpsPendingOrders (order management)
// - usePerpsError (error handling)
// - usePerpsLivePositions (live position tracking)
// - usePerpsPositionPnL (P&L calculations)
// - usePerpsReadiness (readiness checks)
// - usePerpsOrderManagement (order workflows)
// - useStableArray (utility hook for stable array references)
