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
export type {
  // Core interfaces
  PerpsProvider,

  // Order and trading types
  OrderParams,
  OrderResult,
  CancelOrderParams,
  CancelOrderResult,
  ClosePositionParams,

  // Position and account types
  Position,
  AccountState,
  MarketInfo,

  // Deposit/withdrawal types
  DepositParams,
  DepositResult,
  WithdrawParams,
  WithdrawResult,

  // Live data types
  PriceUpdate,
  OrderFill,
  LiveDataConfig,

  // Subscription parameter types
  SubscribePricesParams,
  SubscribePositionsParams,
  SubscribeOrderFillsParams,

  // Query parameter types
  GetPositionsParams,
  GetAccountStateParams,
  GetSupportedPathsParams,

  // Result types
  ToggleTestnetResult,
  SwitchProviderResult,
  InitializeResult,
  ReadyToTradeResult,
  DisconnectResult,
} from './types';

// React hooks for UI integration
export {
  usePerpsTrading,
  usePerpsNetworkConfig,
  usePerpsNetwork,
} from '../hooks';

// Removed with Live Market Prices component:
// - usePerpsPrices
