// Core hooks (direct controller access)
export { usePerpsTrading } from './usePerpsTrading';
export { usePerpsNetworkConfig } from './usePerpsNetworkConfig';
export { usePerpsNetwork } from './usePerpsNetwork';

// Connection management hooks
export { usePerpsConnection } from '../providers/PerpsConnectionProvider';

// State hooks (Redux selectors)
export { usePerpsPositions } from './usePerpsPositions';
export { usePerpsAccount } from './usePerpsAccount';
export { usePerpsDeposit } from './usePerpsDeposit';
export { usePerpsPendingOrders } from './usePerpsPendingOrders';
export { usePerpsError } from './usePerpsError';

// Live data hooks (WebSocket subscriptions)
export { usePerpsPrices } from './usePerpsPrices';
export { usePerpsLivePositions } from './usePerpsLivePositions';
export { usePerpsOrderFills } from './usePerpsOrderFills';

// Computed hooks (derived data)
export { usePerpsPositionPnL } from './usePerpsPositionPnL';
export { usePerpsReadiness } from './usePerpsReadiness';

// Management hooks (complex workflows)
export { usePerpsOrderManagement } from './usePerpsOrderManagement';

// Utility hooks
export { useStableArray } from './useStableArray';
