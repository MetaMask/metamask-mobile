import type {
  PerpsControllerState,
  PerpsControllerMessenger,
} from '../PerpsController';
import type { Order, Position } from '../types';

/**
 * ServiceContext
 *
 * Lightweight per-call context for Perps services.
 * Contains ONLY data that varies per operation:
 * - Tracing context (provider, network)
 * - Error context (controller, method)
 * - State management callbacks
 * - Query/action callbacks specific to the operation
 *
 * Platform dependencies (logging, metrics, tracing) are injected into service
 * instances via constructor, not passed per-call.
 *
 * Controller-level singletons (RewardsController, NetworkController, messenger)
 * are also injected into services that need them, not passed per-call.
 *
 * This enables:
 * - Clean method signatures (no verbose dependency passing)
 * - Fat services with complete orchestration
 * - Thin controller with pure delegation
 * - Easy testing through mock contexts and constructor injection
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
   * Messenger for controller communication (optional)
   * Required by: DataLakeService (getBearerToken)
   * Note: TradingService now receives this via setControllerDependencies()
   */
  messenger?: PerpsControllerMessenger;

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
