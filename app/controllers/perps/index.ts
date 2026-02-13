/**
 * PerpsController - Protocol-agnostic perpetuals trading controller
 *
 * This module provides a unified interface for perpetual futures trading
 * across multiple protocols with high-performance real-time data handling.
 *
 * Key Features:
 * - Protocol abstraction (HyperLiquid first, extensible to GMX, dYdX, etc.)
 * - Dual data flow: Redux for persistence, direct callbacks for live data
 * - MetaMask native integration with BaseController pattern
 * - Mobile-optimized with throttling and performance considerations
 *
 * Usage:
 * ```typescript
 * import { usePerpsController } from './controllers';
 *
 * const { placeOrder, getPositions } = usePerpsController();
 * // Live prices hooks removed with Live Market Prices component
 *
 * // Place a market order
 * await placeOrder({
 *   coin: 'ETH',
 *   is_buy: true,
 *   sz: '0.1',
 *   order_type: 'market'
 * });
 * ```
 */

// Core controller and types
export {
  PerpsController,
  getDefaultPerpsControllerState,
  InitializationState,
} from './PerpsController';
export type {
  PerpsControllerState,
  PerpsControllerOptions,
  PerpsControllerMessenger,
  PerpsControllerActions,
  PerpsControllerEvents,
} from './PerpsController';

// Provider interfaces and implementations
export { HyperLiquidProvider } from './providers/HyperLiquidProvider';

// All type definitions
export * from './types';

// All constants
export * from './constants';

// All utilities
export * from './utils';

// Error codes
export * from './perpsErrorCodes';

// Selectors
export * from './selectors';

// Services (only externally consumed items)
export { TradingReadinessCache } from './services/TradingReadinessCache';
export type { ServiceContext } from './services/ServiceContext';

// Removed with Live Market Prices component:
// - usePerpsPrices
