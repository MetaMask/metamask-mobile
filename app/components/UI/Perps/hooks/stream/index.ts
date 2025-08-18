// Export individual hooks with proper naming convention
export { usePerpsLivePrices } from './usePerpsLivePrices';
export { usePerpsLiveOrders } from './usePerpsLiveOrders';
export { usePerpsLivePositions } from './usePerpsLivePositions';
export { usePerpsLiveFills } from './usePerpsLiveFills';

// Export types for convenience
export type { UsePerpsLivePricesOptions } from './usePerpsLivePrices';
export type { UsePerpsLiveOrdersOptions } from './usePerpsLiveOrders';
export type { UsePerpsLivePositionsOptions } from './usePerpsLivePositions';
export type { UsePerpsLiveFillsOptions } from './usePerpsLiveFills';

// Re-export types from controllers
export type {
  PriceUpdate,
  Order,
  Position,
  OrderFill,
} from '../../controllers/types';

// Legacy exports for backward compatibility during migration
// TODO: Remove these after all components are migrated
export { usePerpsLivePrices as useLivePrices } from './usePerpsLivePrices';
export { usePerpsLiveOrders as useLiveOrders } from './usePerpsLiveOrders';
export { usePerpsLivePositions as useLivePositions } from './usePerpsLivePositions';
export { usePerpsLiveFills as useLiveFills } from './usePerpsLiveFills';
