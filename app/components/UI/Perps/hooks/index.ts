// Core hooks (direct controller access)
export { usePerpsController } from './usePerpsController';
export { usePerpsNetwork } from './usePerpsNetwork';

// Connection management hooks
export { usePerpsConnection } from '../providers/PerpsConnectionProvider';

// State hooks (Redux selectors)
export { usePerpsPositions } from './usePerpsPositions';
export { usePerpsAccountState } from './usePerpsAccountState';
export { usePerpsDepositState } from './usePerpsDepositState';
export { usePerpsOrderHistory } from './usePerpsOrderHistory';
export { usePerpsPendingOrders } from './usePerpsPendingOrders';

// Live data hooks (WebSocket subscriptions)
export { usePerpsPrices } from './usePerpsPrices';
export { usePerpsLivePositions } from './usePerpsLivePositions';
export { usePerpsOrderFills } from './usePerpsOrderFills';

// Computed hooks (derived data)
export { usePositionPnL } from './usePositionPnL';
export { usePerpsReadiness } from './usePerpsReadiness';

// Management hooks (complex workflows)
export { useOrderManagement } from './useOrderManagement';

// Utility hooks
export { useStableArray } from './useStableArray';
