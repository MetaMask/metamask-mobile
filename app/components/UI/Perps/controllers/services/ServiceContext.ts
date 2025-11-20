import type { IMetaMetrics } from '../../../../../core/Analytics/MetaMetrics.types';
import type { PerpsStreamManager } from '../../providers/PerpsStreamManager';
import type { DATA_LAKE_API_CONFIG } from '../../constants/perpsConfig';
import type {
  PerpsControllerState,
  PerpsControllerMessenger,
} from '../PerpsController';
import type { Order, Position } from '../types';
import type { RewardsController } from '../../../../../core/Engine/controllers/rewards-controller/RewardsController';
import type { NetworkController } from '@metamask/network-controller';

/**
 * ServiceContext
 *
 * Dependency injection interface for Perps services.
 * Provides all orchestration dependencies (tracing, analytics, state management)
 * to services, allowing them to handle full operation logic independently.
 *
 * This enables:
 * - Fat services with complete orchestration
 * - Thin controller with pure delegation
 * - Easy testing through mock contexts
 * - Explicit dependency management
 */
export interface ServiceContext {
  /**
   * Tracing context for performance monitoring
   * Used in trace() calls to tag operations
   */
  tracingContext: {
    provider: string;
    isTestnet: boolean;
  };

  /**
   * MetaMetrics instance for analytics events
   * Services use this to track events directly
   */
  analytics: IMetaMetrics;

  /**
   * Error logging context
   * Provides consistent error logging across services
   */
  errorContext: {
    controller: string;
    method: string;
    extra?: Record<string, unknown>;
  };

  /**
   * State management functions (optional)
   * Only provided for operations that need to mutate controller state
   * Example: Trading operations that update lastTransaction
   */
  stateManager?: {
    update: (updater: (state: PerpsControllerState) => void) => void;
    getState: () => PerpsControllerState;
  };

  /**
   * Optional dependencies - only provided when needed by specific operations
   */

  /**
   * RewardsController for fee discount calculations
   * Required by: TradingService (placeOrder, editOrder, closePosition)
   */
  rewardsController?: RewardsController;

  /**
   * NetworkController for chain ID resolution
   * Required by: TradingService (fee discount calculation)
   */
  networkController?: NetworkController;

  /**
   * Messenger for controller communication
   * Required by: TradingService (AuthenticationController:getBearerToken), DataLakeService (getBearerToken)
   */
  messenger?: PerpsControllerMessenger;

  /**
   * StreamManager for WebSocket subscriptions
   * Required by: TradingService (cancelOrders - for order stream refresh)
   */
  streamManager?: PerpsStreamManager;

  /**
   * Data lake configuration
   * Required by: TradingService (for reporting to data lake)
   */
  dataLakeConfig?: typeof DATA_LAKE_API_CONFIG;

  /**
   * Query functions for dependent data
   * Required by: Operations that need to fetch related data
   */
  getOpenOrders?: () => Promise<Order[]>;
  getPositions?: () => Promise<Position[]>;

  /**
   * Callback functions for controller-specific operations
   */
  saveTradeConfiguration?: (coin: string, leverage: number) => void;

  /**
   * Feature flag configuration callbacks
   * Required by: FeatureFlagConfigurationService
   */
  getBlockedRegionList?: () => {
    list: string[];
    source: 'remote' | 'fallback';
  };
  setBlockedRegionList?: (
    list: string[],
    source: 'remote' | 'fallback',
  ) => void;
  getHip3Config?: () => {
    enabled: boolean;
    allowlistMarkets: string[];
    blocklistMarkets: string[];
    source: 'remote' | 'fallback';
  };
  setHip3Config?: (config: {
    enabled?: boolean;
    allowlistMarkets?: string[];
    blocklistMarkets?: string[];
    source: 'remote' | 'fallback';
  }) => void;
  incrementHip3ConfigVersion?: () => number;
  refreshEligibility?: () => Promise<void>;
}
