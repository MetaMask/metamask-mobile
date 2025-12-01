import {
  BaseController,
  ControllerGetStateAction,
  ControllerStateChangeEvent,
  StateMetadata,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';
import type { NetworkControllerGetStateAction } from '@metamask/network-controller';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerTransactionFailedEvent,
  TransactionControllerTransactionSubmittedEvent,
  TransactionType,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import { USDC_SYMBOL } from '../constants/hyperLiquidConfig';
import {
  LastTransactionResult,
  TransactionStatus,
} from '../types/transactionTypes';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger, { type LoggerErrorOptions } from '../../../../util/Logger';
import { MetaMetrics } from '../../../../core/Analytics';
import { ensureError } from '../utils/perpsErrorHandler';
import type { CandleData } from '../types/perps-types';
import { CandlePeriod } from '../constants/chartConfig';
import {
  PERPS_CONSTANTS,
  MARKET_SORTING_CONFIG,
  type SortOptionId,
} from '../constants/perpsConfig';
import { PERPS_ERROR_CODES } from './perpsErrorCodes';
import { HyperLiquidProvider } from './providers/HyperLiquidProvider';
import { MarketDataService } from './services/MarketDataService';
import { TradingService } from './services/TradingService';
import { AccountService } from './services/AccountService';
import { EligibilityService } from './services/EligibilityService';
import { DataLakeService } from './services/DataLakeService';
import { DepositService } from './services/DepositService';
import { FeatureFlagConfigurationService } from './services/FeatureFlagConfigurationService';
import type { ServiceContext } from './services/ServiceContext';
import {
  getStreamManagerInstance,
  type PerpsStreamManager,
} from '../providers/PerpsStreamManager';
import type {
  AccountState,
  AssetRoute,
  CancelOrderParams,
  CancelOrderResult,
  CancelOrdersParams,
  CancelOrdersResult,
  ClosePositionParams,
  ClosePositionsParams,
  ClosePositionsResult,
  EditOrderParams,
  FeeCalculationParams,
  FeeCalculationResult,
  FlipPositionParams,
  Funding,
  GetAccountStateParams,
  GetAvailableDexsParams,
  GetFundingParams,
  GetOrderFillsParams,
  GetOrdersParams,
  GetPositionsParams,
  IPerpsProvider,
  LiquidationPriceParams,
  LiveDataConfig,
  MaintenanceMarginParams,
  MarginResult,
  MarketInfo,
  Order,
  OrderFill,
  OrderParams,
  OrderResult,
  PerpsControllerConfig,
  Position,
  SubscribeAccountParams,
  SubscribeCandlesParams,
  SubscribeOICapsParams,
  SubscribeOrderBookParams,
  SubscribeOrderFillsParams,
  SubscribeOrdersParams,
  SubscribePositionsParams,
  SubscribePricesParams,
  SwitchProviderResult,
  ToggleTestnetResult,
  UpdateMarginParams,
  UpdatePositionTPSLParams,
  WithdrawParams,
  WithdrawResult,
  GetHistoricalPortfolioParams,
  HistoricalPortfolioResult,
  OrderType,
} from './types';
import type {
  RemoteFeatureFlagControllerState,
  RemoteFeatureFlagControllerStateChangeEvent,
  RemoteFeatureFlagControllerGetStateAction,
} from '@metamask/remote-feature-flag-controller';
import { wait } from '../utils/wait';

// Re-export error codes from separate file to avoid circular dependencies
export { PERPS_ERROR_CODES, type PerpsErrorCode } from './perpsErrorCodes';

/**
 * Initialization state enum for state machine tracking
 */
export enum InitializationState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  FAILED = 'failed',
}

/**
 * State shape for PerpsController
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PerpsControllerState = {
  // Active provider
  activeProvider: string;
  isTestnet: boolean; // Dev toggle for testnet
  connectionStatus: 'disconnected' | 'connecting' | 'connected';

  // Initialization state machine
  initializationState: InitializationState;
  initializationError: string | null;
  initializationAttempts: number;

  // Account data (persisted) - using HyperLiquid property names
  accountState: AccountState | null;

  // Current positions
  positions: Position[];

  // Perps balances per provider for portfolio display (historical data)
  perpsBalances: {
    [provider: string]: {
      totalBalance: string; // Current total account value (cash + positions) in USD
      unrealizedPnl: string; // Current P&L from open positions in USD
      accountValue1dAgo: string; // Account value 24h ago for daily change calculation in USD
      lastUpdated: number; // Timestamp of last update
    };
  };

  // Simple deposit state (transient, for UI feedback)
  depositInProgress: boolean;
  // Internal transaction id for the deposit transaction
  // We use this to fetch the bridge quotes and get the estimated time.
  lastDepositTransactionId: string | null;
  lastDepositResult: LastTransactionResult | null;

  // Simple withdrawal state (transient, for UI feedback)
  withdrawInProgress: boolean;
  lastWithdrawResult: LastTransactionResult | null;

  // Withdrawal request tracking (persistent, for transaction history)
  withdrawalRequests: {
    id: string;
    amount: string;
    asset: string;
    txHash?: string;
    timestamp: number;
    success: boolean;
    status: TransactionStatus;
    destination?: string;
    source?: string;
    transactionId?: string;
    withdrawalId?: string;
    depositId?: string;
  }[];

  // Withdrawal progress tracking (persistent across navigation)
  withdrawalProgress: {
    progress: number; // 0-100
    lastUpdated: number; // timestamp
    activeWithdrawalId: string | null; // ID of the withdrawal being tracked
  };

  // Deposit request tracking (persistent, for transaction history)
  depositRequests: {
    id: string;
    amount: string;
    asset: string;
    txHash?: string;
    timestamp: number;
    success: boolean;
    status: TransactionStatus;
    destination?: string;
    source?: string;
    transactionId?: string;
    withdrawalId?: string;
    depositId?: string;
  }[];

  // Eligibility (Geo-Blocking)
  isEligible: boolean;

  // Tutorial/First time user tracking (per network)
  isFirstTimeUser: {
    testnet: boolean;
    mainnet: boolean;
  };

  // Notification tracking
  hasPlacedFirstOrder: {
    testnet: boolean;
    mainnet: boolean;
  };

  // Watchlist markets tracking (per network)
  watchlistMarkets: {
    testnet: string[]; // Array of watchlist market symbols for testnet
    mainnet: string[]; // Array of watchlist market symbols for mainnet
  };

  // Trade configurations per market (per network)
  tradeConfigurations: {
    testnet: {
      [marketSymbol: string]: {
        leverage?: number; // Last used leverage for this market
        // Pending trade configuration (temporary, expires after 5 minutes)
        pendingConfig?: {
          amount?: string; // Order size in USD
          leverage?: number; // Leverage
          takeProfitPrice?: string; // Take profit price
          stopLossPrice?: string; // Stop loss price
          limitPrice?: string; // Limit price (for limit orders)
          orderType?: OrderType; // Market vs limit
          timestamp: number; // When the config was saved (for expiration check)
        };
      };
    };
    mainnet: {
      [marketSymbol: string]: {
        leverage?: number;
        // Pending trade configuration (temporary, expires after 5 minutes)
        pendingConfig?: {
          amount?: string; // Order size in USD
          leverage?: number; // Leverage
          takeProfitPrice?: string; // Take profit price
          stopLossPrice?: string; // Stop loss price
          limitPrice?: string; // Limit price (for limit orders)
          orderType?: OrderType; // Market vs limit
          timestamp: number; // When the config was saved (for expiration check)
        };
      };
    };
  };

  // Market filter preferences (network-independent) - includes both sorting and filtering options
  marketFilterPreferences: SortOptionId;

  // Error handling
  lastError: string | null;
  lastUpdateTimestamp: number;

  // HIP-3 Configuration Version (incremented when HIP-3 remote flags change)
  // Used to trigger reconnection and cache invalidation in ConnectionManager
  hip3ConfigVersion: number;
};

/**
 * Get default PerpsController state
 */
export const getDefaultPerpsControllerState = (): PerpsControllerState => ({
  activeProvider: 'hyperliquid',
  isTestnet: false, // Default to mainnet
  connectionStatus: 'disconnected',
  initializationState: InitializationState.UNINITIALIZED,
  initializationError: null,
  initializationAttempts: 0,
  accountState: null,
  positions: [],
  perpsBalances: {},
  depositInProgress: false,
  lastDepositResult: null,
  withdrawInProgress: false,
  lastDepositTransactionId: null,
  lastWithdrawResult: null,
  withdrawalRequests: [],
  withdrawalProgress: {
    progress: 0,
    lastUpdated: 0,
    activeWithdrawalId: null,
  },
  depositRequests: [],
  lastError: null,
  lastUpdateTimestamp: 0,
  isEligible: false,
  isFirstTimeUser: {
    testnet: true,
    mainnet: true,
  },
  hasPlacedFirstOrder: {
    testnet: false,
    mainnet: false,
  },
  watchlistMarkets: {
    testnet: [],
    mainnet: [],
  },
  tradeConfigurations: {
    testnet: {},
    mainnet: {},
  },
  marketFilterPreferences: MARKET_SORTING_CONFIG.DEFAULT_SORT_OPTION_ID,
  hip3ConfigVersion: 0,
});

/**
 * State metadata for the PerpsController
 */
const metadata: StateMetadata<PerpsControllerState> = {
  accountState: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  positions: {
    includeInStateLogs: true,
    persist: false,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  perpsBalances: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  isTestnet: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  activeProvider: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  connectionStatus: {
    includeInStateLogs: true,
    persist: false,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  initializationState: {
    includeInStateLogs: true,
    persist: false,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  initializationError: {
    includeInStateLogs: true,
    persist: false,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  initializationAttempts: {
    includeInStateLogs: true,
    persist: false,
    includeInDebugSnapshot: false,
    usedInUi: false,
  },
  depositInProgress: {
    includeInStateLogs: true,
    persist: false,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  lastDepositTransactionId: {
    includeInStateLogs: true,
    persist: false,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  lastDepositResult: {
    includeInStateLogs: true,
    persist: false,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  withdrawInProgress: {
    includeInStateLogs: true,
    persist: false,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  lastWithdrawResult: {
    includeInStateLogs: true,
    persist: false,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  withdrawalRequests: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  withdrawalProgress: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  depositRequests: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  lastError: {
    includeInStateLogs: false,
    persist: false,
    includeInDebugSnapshot: false,
    usedInUi: false,
  },
  lastUpdateTimestamp: {
    includeInStateLogs: true,
    persist: false,
    includeInDebugSnapshot: false,
    usedInUi: false,
  },
  isEligible: {
    includeInStateLogs: true,
    persist: false,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  isFirstTimeUser: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  hasPlacedFirstOrder: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  watchlistMarkets: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  tradeConfigurations: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  marketFilterPreferences: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  hip3ConfigVersion: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: false,
  },
};

/**
 * PerpsController events
 */
export type PerpsControllerEvents = ControllerStateChangeEvent<
  'PerpsController',
  PerpsControllerState
>;

/**
 * PerpsController actions
 */
export type PerpsControllerActions =
  | ControllerGetStateAction<'PerpsController', PerpsControllerState>
  | {
      type: 'PerpsController:placeOrder';
      handler: PerpsController['placeOrder'];
    }
  | {
      type: 'PerpsController:editOrder';
      handler: PerpsController['editOrder'];
    }
  | {
      type: 'PerpsController:cancelOrder';
      handler: PerpsController['cancelOrder'];
    }
  | {
      type: 'PerpsController:cancelOrders';
      handler: PerpsController['cancelOrders'];
    }
  | {
      type: 'PerpsController:closePosition';
      handler: PerpsController['closePosition'];
    }
  | {
      type: 'PerpsController:closePositions';
      handler: PerpsController['closePositions'];
    }
  | {
      type: 'PerpsController:withdraw';
      handler: PerpsController['withdraw'];
    }
  | {
      type: 'PerpsController:getPositions';
      handler: PerpsController['getPositions'];
    }
  | {
      type: 'PerpsController:getOrderFills';
      handler: PerpsController['getOrderFills'];
    }
  | {
      type: 'PerpsController:getOrders';
      handler: PerpsController['getOrders'];
    }
  | {
      type: 'PerpsController:getOpenOrders';
      handler: PerpsController['getOpenOrders'];
    }
  | {
      type: 'PerpsController:getFunding';
      handler: PerpsController['getFunding'];
    }
  | {
      type: 'PerpsController:getAccountState';
      handler: PerpsController['getAccountState'];
    }
  | {
      type: 'PerpsController:getMarkets';
      handler: PerpsController['getMarkets'];
    }
  | {
      type: 'PerpsController:refreshEligibility';
      handler: PerpsController['refreshEligibility'];
    }
  | {
      type: 'PerpsController:toggleTestnet';
      handler: PerpsController['toggleTestnet'];
    }
  | {
      type: 'PerpsController:disconnect';
      handler: PerpsController['disconnect'];
    }
  | {
      type: 'PerpsController:calculateFees';
      handler: PerpsController['calculateFees'];
    }
  | {
      type: 'PerpsController:markTutorialCompleted';
      handler: PerpsController['markTutorialCompleted'];
    }
  | {
      type: 'PerpsController:markFirstOrderCompleted';
      handler: PerpsController['markFirstOrderCompleted'];
    }
  | {
      type: 'PerpsController:getHistoricalPortfolio';
      handler: PerpsController['getHistoricalPortfolio'];
    }
  | {
      type: 'PerpsController:resetFirstTimeUserState';
      handler: PerpsController['resetFirstTimeUserState'];
    }
  | {
      type: 'PerpsController:saveTradeConfiguration';
      handler: PerpsController['saveTradeConfiguration'];
    }
  | {
      type: 'PerpsController:getTradeConfiguration';
      handler: PerpsController['getTradeConfiguration'];
    }
  | {
      type: 'PerpsController:saveMarketFilterPreferences';
      handler: PerpsController['saveMarketFilterPreferences'];
    }
  | {
      type: 'PerpsController:getMarketFilterPreferences';
      handler: PerpsController['getMarketFilterPreferences'];
    }
  | {
      type: 'PerpsController:savePendingTradeConfiguration';
      handler: PerpsController['savePendingTradeConfiguration'];
    }
  | {
      type: 'PerpsController:getPendingTradeConfiguration';
      handler: PerpsController['getPendingTradeConfiguration'];
    }
  | {
      type: 'PerpsController:clearPendingTradeConfiguration';
      handler: PerpsController['clearPendingTradeConfiguration'];
    };

/**
 * External actions the PerpsController can call
 */
export type AllowedActions =
  | NetworkControllerGetStateAction
  | AuthenticationController.AuthenticationControllerGetBearerToken
  | RemoteFeatureFlagControllerGetStateAction;

/**
 * External events the PerpsController can subscribe to
 */
export type AllowedEvents =
  | TransactionControllerTransactionSubmittedEvent
  | TransactionControllerTransactionConfirmedEvent
  | TransactionControllerTransactionFailedEvent
  | RemoteFeatureFlagControllerStateChangeEvent;

/**
 * PerpsController messenger constraints
 */
export type PerpsControllerMessenger = Messenger<
  'PerpsController',
  PerpsControllerActions | AllowedActions,
  PerpsControllerEvents | AllowedEvents
>;

/**
 * PerpsController options
 */
export interface PerpsControllerOptions {
  messenger: PerpsControllerMessenger;
  state?: Partial<PerpsControllerState>;
  clientConfig?: PerpsControllerConfig;
}

interface BlockedRegionList {
  list: string[];
  source: 'remote' | 'fallback';
}

/**
 * PerpsController - Protocol-agnostic perpetuals trading controller
 *
 * Provides a unified interface for perpetual futures trading across multiple protocols.
 * Features dual data flow architecture:
 * - Trading actions use Redux for persistence and optimistic updates
 * - Live data uses direct callbacks for maximum performance
 */
export class PerpsController extends BaseController<
  'PerpsController',
  PerpsControllerState,
  PerpsControllerMessenger
> {
  protected providers: Map<string, IPerpsProvider>;
  protected isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private isReinitializing = false;

  protected blockedRegionList: BlockedRegionList = {
    list: [],
    source: 'fallback',
  };

  // Store HIP-3 configuration (mutable for runtime updates from remote flags)
  private hip3Enabled: boolean;
  private hip3AllowlistMarkets: string[];
  private hip3BlocklistMarkets: string[];
  private hip3ConfigSource: 'remote' | 'fallback' = 'fallback';

  constructor({
    messenger,
    state = {},
    clientConfig = {},
  }: PerpsControllerOptions) {
    super({
      name: 'PerpsController',
      metadata,
      messenger,
      state: { ...getDefaultPerpsControllerState(), ...state },
    });

    // Set HIP-3 fallback configuration from client (will be updated if remote flags available)
    this.hip3Enabled = clientConfig.fallbackHip3Enabled ?? false;
    this.hip3AllowlistMarkets = [
      ...(clientConfig.fallbackHip3AllowlistMarkets ?? []),
    ];
    this.hip3BlocklistMarkets = [
      ...(clientConfig.fallbackHip3BlocklistMarkets ?? []),
    ];

    // Immediately set the fallback region list since RemoteFeatureFlagController is empty by default and takes a moment to populate.
    this.setBlockedRegionList(
      clientConfig.fallbackBlockedRegions ?? [],
      'fallback',
    );

    /**
     * Immediately read current state to catch any flags already loaded
     * This is necessary to avoid race conditions where the RemoteFeatureFlagController fetches flags
     * before the PerpsController initializes its RemoteFeatureFlagController subscription.
     *
     * We still subscribe in case the RemoteFeatureFlagController is not yet populated and updates later.
     */
    try {
      const currentRemoteFeatureFlagState = this.messenger.call(
        'RemoteFeatureFlagController:getState',
      );

      this.refreshEligibilityOnFeatureFlagChange(currentRemoteFeatureFlagState);
    } catch (error) {
      // If we can't read the remote feature flags at construction time, we'll rely on:
      // 1. The fallback blocked regions already set above
      // 2. The subscription to catch updates when RemoteFeatureFlagController is ready
      Logger.error(
        ensureError(error),
        this.getErrorContext('constructor', {
          operation: 'readRemoteFeatureFlags',
        }),
      );
    }

    this.messenger.subscribe(
      'RemoteFeatureFlagController:stateChange',
      this.refreshEligibilityOnFeatureFlagChange.bind(this),
    );

    this.providers = new Map();
  }

  protected setBlockedRegionList(
    list: string[],
    source: 'remote' | 'fallback',
  ) {
    FeatureFlagConfigurationService.setBlockedRegions({
      list,
      source,
      context: this.createServiceContext('setBlockedRegionList', {
        getBlockedRegionList: () => this.blockedRegionList,
        setBlockedRegionList: (
          newList: string[],
          newSource: 'remote' | 'fallback',
        ) => {
          this.blockedRegionList = { list: newList, source: newSource };
        },
        refreshEligibility: () => this.refreshEligibility(),
      }),
    });
  }

  /**
   * Respond to RemoteFeatureFlagController state changes
   * Refreshes user eligibility based on geo-blocked regions defined in remote feature flag.
   * Uses fallback configuration when remote feature flag is undefined.
   * Note: Initial eligibility is set in the constructor if fallback regions are provided.
   */
  protected refreshEligibilityOnFeatureFlagChange(
    remoteFeatureFlagControllerState: RemoteFeatureFlagControllerState,
  ): void {
    FeatureFlagConfigurationService.refreshEligibility({
      remoteFeatureFlagControllerState,
      context: this.createServiceContext(
        'refreshEligibilityOnFeatureFlagChange',
        {
          getBlockedRegionList: () => this.blockedRegionList,
          setBlockedRegionList: (
            list: string[],
            source: 'remote' | 'fallback',
          ) => {
            this.blockedRegionList = { list, source };
          },
          refreshEligibility: () => this.refreshEligibility(),
          getHip3Config: () => ({
            enabled: this.hip3Enabled,
            allowlistMarkets: this.hip3AllowlistMarkets,
            blocklistMarkets: this.hip3BlocklistMarkets,
            source: this.hip3ConfigSource,
          }),
          setHip3Config: (config) => {
            if (config.enabled !== undefined) {
              this.hip3Enabled = config.enabled;
            }
            if (config.allowlistMarkets !== undefined) {
              this.hip3AllowlistMarkets = [...config.allowlistMarkets];
            }
            if (config.blocklistMarkets !== undefined) {
              this.hip3BlocklistMarkets = [...config.blocklistMarkets];
            }
            if (config.source !== undefined) {
              this.hip3ConfigSource = config.source;
            }
          },
          incrementHip3ConfigVersion: () => {
            const newVersion = (this.state.hip3ConfigVersion || 0) + 1;
            this.update((state) => {
              state.hip3ConfigVersion = newVersion;
            });
            return newVersion;
          },
        },
      ),
    });
  }

  /**
   * Execute an operation while temporarily pausing specified stream channels
   * to prevent WebSocket updates from triggering UI re-renders during operations.
   *
   * WebSocket connections remain alive but updates are not emitted to subscribers.
   * This prevents race conditions where UI re-renders fetch stale data during operations.
   *
   * @param operation - The async operation to execute
   * @param channels - Array of stream channel names to pause
   * @returns The result of the operation
   *
   * @example
   * ```typescript
   * // Cancel orders without stream interference
   * await this.withStreamPause(
   *   async () => this.provider.cancelOrders({ cancelAll: true }),
   *   ['orders']
   * );
   *
   * // Close positions and pause multiple streams
   * await this.withStreamPause(
   *   async () => this.provider.closePositions(positions),
   *   ['positions', 'account', 'orders']
   * );
   * ```
   */
  private async withStreamPause<T>(
    operation: () => Promise<T>,
    channels: (keyof PerpsStreamManager)[],
  ): Promise<T> {
    const streamManager = getStreamManagerInstance();
    const pausedChannels: (keyof PerpsStreamManager)[] = [];

    // Pause emission on specified channels (WebSocket stays connected)
    // Track which channels successfully paused to ensure proper cleanup
    for (const channel of channels) {
      try {
        streamManager[channel].pause();
        pausedChannels.push(channel);
      } catch (err) {
        // Log error to Sentry but continue pausing remaining channels
        Logger.error(
          ensureError(err),
          this.getErrorContext('withStreamPause', {
            operation: 'pause',
            channel: String(channel),
            pausedChannels: pausedChannels.join(','),
          }),
        );
      }
    }

    try {
      // Execute operation without stream interference
      return await operation();
    } finally {
      // Resume only channels that were successfully paused
      for (const channel of pausedChannels) {
        try {
          streamManager[channel].resume();
        } catch (err) {
          // Log error to Sentry but continue resuming remaining channels
          Logger.error(
            ensureError(err),
            this.getErrorContext('withStreamPause', {
              operation: 'resume',
              channel: String(channel),
              pausedChannels: pausedChannels.join(','),
            }),
          );
        }
      }
    }
  }

  /**
   * Initialize the PerpsController providers
   * Must be called before using any other methods
   * Prevents double initialization with promise caching
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Actual initialization implementation with retry logic
   */
  private async performInitialization(): Promise<void> {
    const maxAttempts = 3;
    const baseDelay = 1000;

    this.update((state) => {
      state.initializationState = InitializationState.INITIALIZING;
      state.initializationError = null;
      state.initializationAttempts = 0;
    });

    DevLogger.log('PerpsController: Initializing providers', {
      currentNetwork: this.state.isTestnet ? 'testnet' : 'mainnet',
      existingProviders: Array.from(this.providers.keys()),
      timestamp: new Date().toISOString(),
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.update((state) => {
          state.initializationAttempts = attempt;
        });

        // Disconnect existing providers to close WebSocket connections
        const existingProviders = Array.from(this.providers.values());
        if (existingProviders.length > 0) {
          DevLogger.log('PerpsController: Disconnecting existing providers', {
            count: existingProviders.length,
            timestamp: new Date().toISOString(),
          });
          await Promise.all(
            existingProviders.map((provider) => provider.disconnect()),
          );
        }
        this.providers.clear();

        DevLogger.log(
          'PerpsController: Creating provider with HIP-3 configuration',
          {
            hip3Enabled: this.hip3Enabled,
            hip3AllowlistMarkets: this.hip3AllowlistMarkets,
            hip3BlocklistMarkets: this.hip3BlocklistMarkets,
            hip3ConfigSource: this.hip3ConfigSource,
            isTestnet: this.state.isTestnet,
          },
        );

        this.providers.set(
          'hyperliquid',
          new HyperLiquidProvider({
            isTestnet: this.state.isTestnet,
            hip3Enabled: this.hip3Enabled,
            allowlistMarkets: this.hip3AllowlistMarkets,
            blocklistMarkets: this.hip3BlocklistMarkets,
          }),
        );

        // Future providers can be added here with their own authentication patterns:
        // - Some might use API keys: new BinanceProvider({ apiKey, apiSecret })
        // - Some might use different wallet patterns: new GMXProvider({ signer })
        // - Some might not need auth at all: new DydxProvider()

        // Wait for WebSocket transport to be ready before marking as initialized
        await wait(PERPS_CONSTANTS.RECONNECTION_CLEANUP_DELAY_MS);

        this.isInitialized = true;
        this.update((state) => {
          state.initializationState = InitializationState.INITIALIZED;
          state.initializationError = null;
        });

        DevLogger.log('PerpsController: Providers initialized successfully', {
          providerCount: this.providers.size,
          activeProvider: this.state.activeProvider,
          timestamp: new Date().toISOString(),
          attempts: attempt,
        });

        return; // Exit retry loop on success
      } catch (error) {
        lastError = ensureError(error);

        Logger.error(
          lastError,
          this.getErrorContext('performInitialization', {
            attempt,
            maxAttempts,
          }),
        );

        // If not the last attempt, wait before retrying (exponential backoff)
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s
          DevLogger.log(
            `PerpsController: Retrying initialization in ${delay}ms`,
            {
              attempt,
              maxAttempts,
              error: lastError.message,
            },
          );
          await wait(delay);
        }
      }
    }

    this.isInitialized = false;
    this.update((state) => {
      state.initializationState = InitializationState.FAILED;
      state.initializationError = lastError?.message ?? 'Unknown error';
    });
    this.initializationPromise = null; // Clear promise to allow retry

    DevLogger.log('PerpsController: Initialization failed', {
      error: lastError?.message,
      attempts: maxAttempts,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Generate standard error context for Logger.error calls with searchable tags and context.
   * Enables Sentry dashboard filtering by feature, provider, and network.
   *
   * @param method - The method name where the error occurred
   * @param extra - Optional additional context fields (becomes searchable context data)
   * @returns LoggerErrorOptions with tags (searchable) and context (searchable)
   * @private
   *
   * @example
   * Logger.error(error, this.getErrorContext('placeOrder', { coin: 'BTC', operation: 'validate' }));
   * // Creates searchable tags: feature:perps, provider:hyperliquid, network:mainnet
   * // Creates searchable context: perps_controller.method:placeOrder, perps_controller.coin:BTC, perps_controller.operation:validate
   */
  private getErrorContext(
    method: string,
    extra?: Record<string, unknown>,
  ): LoggerErrorOptions {
    return {
      tags: {
        feature: PERPS_CONSTANTS.FEATURE_NAME,
        provider: this.state.activeProvider,
        network: this.state.isTestnet ? 'testnet' : 'mainnet',
      },
      context: {
        name: 'PerpsController',
        data: {
          method,
          ...extra,
        },
      },
    };
  }

  /**
   * Create a ServiceContext for dependency injection into services
   * Provides all orchestration dependencies (tracing, analytics, state management)
   *
   * @param method - Method name for error context
   * @param additionalContext - Optional additional context (e.g., rewardsController, streamManager)
   * @returns ServiceContext with all required dependencies
   */
  private createServiceContext(
    method: string,
    additionalContext?: Partial<ServiceContext>,
  ): ServiceContext {
    return {
      tracingContext: {
        provider: this.state.activeProvider,
        isTestnet: this.state.isTestnet,
      },
      analytics: MetaMetrics.getInstance(),
      errorContext: {
        controller: 'PerpsController',
        method,
      },
      stateManager: {
        update: (updater) => this.update(updater),
        getState: () => this.state,
      },
      ...additionalContext,
    };
  }

  /**
   * Get the currently active provider
   * @returns The active provider
   * @throws Error if provider is not initialized or reinitializing
   */
  getActiveProvider(): IPerpsProvider {
    // Check if we're in the middle of reinitializing
    if (this.isReinitializing) {
      this.update((state) => {
        state.lastError = PERPS_ERROR_CODES.CLIENT_REINITIALIZING;
        state.lastUpdateTimestamp = Date.now();
      });
      throw new Error(PERPS_ERROR_CODES.CLIENT_REINITIALIZING);
    }

    // Check if not initialized
    if (
      this.state.initializationState !== InitializationState.INITIALIZED ||
      !this.isInitialized
    ) {
      const errorMessage =
        this.state.initializationState === InitializationState.FAILED
          ? `${PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED}: ${this.state.initializationError || 'Initialization failed'}`
          : PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED;

      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });
      throw new Error(errorMessage);
    }

    const provider = this.providers.get(this.state.activeProvider);
    if (!provider) {
      this.update((state) => {
        state.lastError = PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE;
        state.lastUpdateTimestamp = Date.now();
      });
      throw new Error(PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
    }

    return provider;
  }

  /**
   * Place a new order
   * Thin delegation to TradingService
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    const provider = this.getActiveProvider();
    const { RewardsController, NetworkController } = Engine.context;

    return TradingService.placeOrder({
      provider,
      params,
      context: this.createServiceContext('placeOrder', {
        rewardsController: RewardsController,
        networkController: NetworkController,
        messenger: this.messenger,
        saveTradeConfiguration: (coin: string, leverage: number) =>
          this.saveTradeConfiguration(coin, leverage),
      }),
      reportOrderToDataLake: (dataLakeParams) =>
        this.reportOrderToDataLake(dataLakeParams),
    });
  }

  /**
   * Edit an existing order
   * Thin delegation to TradingService
   */
  async editOrder(params: EditOrderParams): Promise<OrderResult> {
    const provider = this.getActiveProvider();
    const { RewardsController, NetworkController } = Engine.context;

    return TradingService.editOrder({
      provider,
      params,
      context: this.createServiceContext('editOrder', {
        rewardsController: RewardsController,
        networkController: NetworkController,
        messenger: this.messenger,
      }),
    });
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
    const provider = this.getActiveProvider();

    return TradingService.cancelOrder({
      provider,
      params,
      context: this.createServiceContext('cancelOrder'),
    });
  }

  /**
   * Cancel multiple orders in parallel
   * Batch version of cancelOrder() that cancels multiple orders simultaneously
   */
  async cancelOrders(params: CancelOrdersParams): Promise<CancelOrdersResult> {
    const provider = this.getActiveProvider();

    return TradingService.cancelOrders({
      provider,
      params,
      context: this.createServiceContext('cancelOrders', {
        getOpenOrders: () => this.getOpenOrders(),
      }),
      withStreamPause: <T>(operation: () => Promise<T>, channels: string[]) =>
        this.withStreamPause(
          operation,
          channels as (keyof PerpsStreamManager)[],
        ),
    });
  }

  /**
   * Close a position (partial or full)
   * Thin delegation to TradingService
   */
  async closePosition(params: ClosePositionParams): Promise<OrderResult> {
    const provider = this.getActiveProvider();
    const { RewardsController, NetworkController } = Engine.context;

    return TradingService.closePosition({
      provider,
      params,
      context: this.createServiceContext('closePosition', {
        rewardsController: RewardsController,
        networkController: NetworkController,
        messenger: this.messenger,
        getPositions: () => this.getPositions(),
      }),
      reportOrderToDataLake: (dataLakeParams) =>
        this.reportOrderToDataLake(dataLakeParams),
    });
  }

  /**
   * Close multiple positions in parallel
   * Batch version of closePosition() that closes multiple positions simultaneously
   */
  async closePositions(
    params: ClosePositionsParams,
  ): Promise<ClosePositionsResult> {
    const provider = this.getActiveProvider();
    const { RewardsController, NetworkController } = Engine.context;

    return TradingService.closePositions({
      provider,
      params,
      context: this.createServiceContext('closePositions', {
        rewardsController: RewardsController,
        networkController: NetworkController,
        messenger: this.messenger,
        getPositions: () => this.getPositions(),
      }),
    });
  }

  /**
   * Update TP/SL for an existing position
   */
  async updatePositionTPSL(
    params: UpdatePositionTPSLParams,
  ): Promise<OrderResult> {
    const provider = this.getActiveProvider();
    const { RewardsController, NetworkController } = Engine.context;

    return TradingService.updatePositionTPSL({
      provider,
      params,
      context: this.createServiceContext('updatePositionTPSL', {
        rewardsController: RewardsController,
        networkController: NetworkController,
        messenger: this.messenger,
      }),
    });
  }

  /**
   * Update margin for an existing position (add or remove)
   */
  async updateMargin(params: UpdateMarginParams): Promise<MarginResult> {
    const provider = this.getActiveProvider();
    const { RewardsController, NetworkController } = Engine.context;

    return TradingService.updateMargin({
      provider,
      coin: params.coin,
      amount: params.amount,
      context: this.createServiceContext('updateMargin', {
        rewardsController: RewardsController,
        networkController: NetworkController,
        messenger: this.messenger,
      }),
    });
  }

  /**
   * Flip position (reverse direction while keeping size and leverage)
   */
  async flipPosition(params: FlipPositionParams): Promise<OrderResult> {
    const provider = this.getActiveProvider();
    const { RewardsController, NetworkController } = Engine.context;

    return TradingService.flipPosition({
      provider,
      position: params.position,
      context: this.createServiceContext('flipPosition', {
        rewardsController: RewardsController,
        networkController: NetworkController,
        messenger: this.messenger,
      }),
    });
  }

  /**
   * Simplified deposit method that prepares transaction for confirmation screen
   * No complex state tracking - just sets a loading flag
   */
  async depositWithConfirmation(amount?: string) {
    const { NetworkController, TransactionController } = Engine.context;

    try {
      // Clear any stale results when starting a new deposit flow
      // Don't set depositInProgress yet - wait until user confirms

      // Prepare deposit transaction using DepositService
      const provider = this.getActiveProvider();
      const { transaction, assetChainId, currentDepositId } =
        await DepositService.prepareTransaction({ provider });

      this.update((state) => {
        state.lastDepositResult = null;

        // Add deposit request to tracking
        const depositRequest = {
          id: currentDepositId,
          timestamp: Date.now(),
          amount: amount || '0', // Use provided amount or default to '0'
          asset: USDC_SYMBOL,
          success: false, // Will be updated when transaction completes
          txHash: undefined,
          status: 'pending' as TransactionStatus,
          source: undefined,
          transactionId: undefined, // Will be set to depositId when available
        };

        state.depositRequests.unshift(depositRequest); // Add to beginning of array
      });

      const networkClientId =
        NetworkController.findNetworkClientIdByChainId(assetChainId);

      // addTransaction shows the confirmation screen and returns a promise
      // The promise will resolve when transaction completes or reject if cancelled/failed
      const { result, transactionMeta } =
        await TransactionController.addTransaction(transaction, {
          networkClientId,
          origin: 'metamask',
          type: TransactionType.perpsDeposit,
          skipInitialGasEstimate: true,
        });

      // Store the transaction ID and try to get amount from transaction
      this.update((state) => {
        state.lastDepositTransactionId = transactionMeta.id;
      });

      // At this point, the confirmation modal is shown to the user
      // The result promise will resolve/reject based on user action and transaction outcome

      // Track the transaction lifecycle
      // The result promise will resolve/reject based on user action and transaction outcome
      // Note: We intentionally don't set depositInProgress immediately to avoid
      // showing toasts before the user confirms the transaction

      // TODO: @abretonc7s Find a better way to trigger our custom toast notification then having to toggle the state
      // How to replace the system notifications?
      result
        .then((actualTxHash) => {
          // Transaction was successfully completed
          // Set depositInProgress to true temporarily to show success
          this.update((state) => {
            state.depositInProgress = true;
            state.lastDepositResult = {
              success: true,
              txHash: actualTxHash,
              amount: amount || '0',
              asset: USDC_SYMBOL, // Default asset for deposits
              timestamp: Date.now(),
              error: '',
            };

            // Update the deposit request by request ID to avoid race conditions
            if (state.depositRequests.length > 0) {
              const requestToUpdate = state.depositRequests.find(
                (req) => req.id === currentDepositId,
              );
              if (requestToUpdate) {
                // For deposits, we have a txHash immediately, so mark as completed
                // (the transaction hash means the deposit was successful)
                requestToUpdate.status = 'completed' as TransactionStatus;
                requestToUpdate.success = true;
                requestToUpdate.txHash = actualTxHash;
              }
            }
          });

          // Clear depositInProgress after a short delay
          setTimeout(() => {
            this.update((state) => {
              state.depositInProgress = false;
              state.lastDepositTransactionId = null;
            });
          }, 100);
        })
        .catch((error) => {
          // Check if user denied/cancelled the transaction
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const userCancelled =
            errorMessage.includes('User denied') ||
            errorMessage.includes('User rejected') ||
            errorMessage.includes('User cancelled') ||
            errorMessage.includes('User canceled');

          if (userCancelled) {
            // User cancelled - clear any state, no toast
            this.update((state) => {
              state.depositInProgress = false;
              state.lastDepositTransactionId = null;
              // Don't set lastDepositResult - no toast needed
            });
          } else {
            // Transaction failed after confirmation - show error toast
            this.update((state) => {
              state.depositInProgress = false;
              state.lastDepositTransactionId = null;
              state.lastDepositResult = {
                success: false,
                error: errorMessage,
                amount: amount || '0',
                asset: USDC_SYMBOL, // Default asset for deposits
                timestamp: Date.now(),
                txHash: '',
              };

              // Update the deposit request by request ID to avoid race conditions
              if (state.depositRequests.length > 0) {
                const requestToUpdate = state.depositRequests.find(
                  (req) => req.id === currentDepositId,
                );
                if (requestToUpdate) {
                  requestToUpdate.status = 'failed' as TransactionStatus;
                  requestToUpdate.success = false;
                }
              }
            });
          }
        });

      return {
        result,
      };
    } catch (error) {
      // Check if user denied/cancelled the transaction
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const userCancelled =
        errorMessage.includes('User denied') ||
        errorMessage.includes('User rejected') ||
        errorMessage.includes('User cancelled') ||
        errorMessage.includes('User canceled');

      if (!userCancelled) {
        // Only track actual errors, not user cancellations
        this.update((state) => {
          state.lastDepositTransactionId = null;
          // Note: lastDepositResult is already set in the catch block above
        });
      }
      throw error;
    }
  }

  /**
   * Clear the last deposit result after it has been shown to the user
   */
  clearDepositResult(): void {
    this.update((state) => {
      state.lastDepositResult = null;
    });
  }

  clearWithdrawResult(): void {
    this.update((state) => {
      state.lastWithdrawResult = null;
    });
  }

  /**
   * Update withdrawal request status when it completes
   * This is called when a withdrawal is matched with a completed withdrawal from the API
   */
  updateWithdrawalStatus(
    withdrawalId: string,
    status: 'completed' | 'failed',
    txHash?: string,
  ): void {
    this.update((state) => {
      const withdrawalIndex = state.withdrawalRequests.findIndex(
        (request) => request.id === withdrawalId,
      );

      if (withdrawalIndex >= 0) {
        const request = state.withdrawalRequests[withdrawalIndex];
        request.status = status;
        request.success = status === 'completed';
        if (txHash) {
          request.txHash = txHash;
        }

        // Clear withdrawal progress when withdrawal completes
        if (status === 'completed' || status === 'failed') {
          state.withdrawalProgress = {
            progress: 0,
            lastUpdated: Date.now(),
            activeWithdrawalId: null,
          };
        }

        DevLogger.log('PerpsController: Updated withdrawal status', {
          withdrawalId,
          status,
          txHash,
        });
      }
    });
  }

  /**
   * Update withdrawal progress (persistent across navigation)
   */
  updateWithdrawalProgress(
    progress: number,
    activeWithdrawalId: string | null = null,
  ): void {
    this.update((state) => {
      state.withdrawalProgress = {
        progress,
        lastUpdated: Date.now(),
        activeWithdrawalId,
      };
    });
  }

  /**
   * Get current withdrawal progress
   */
  getWithdrawalProgress(): {
    progress: number;
    lastUpdated: number;
    activeWithdrawalId: string | null;
  } {
    return this.state.withdrawalProgress;
  }

  /**
   * Withdraw funds from trading account
   *
   * The withdrawal process varies by provider and may involve:
   * - Direct on-chain transfers
   * - Bridge operations
   * - Multi-step validation processes
   *
   * Check the specific provider documentation for detailed withdrawal flows.
   *
   * @param params Withdrawal parameters
   * @returns WithdrawResult with withdrawal ID and tracking info
   */
  async withdraw(params: WithdrawParams): Promise<WithdrawResult> {
    const provider = this.getActiveProvider();

    return AccountService.withdraw({
      provider,
      params,
      context: this.createServiceContext('withdraw'),
      refreshAccountState: async () => {
        await this.getAccountState({ source: 'post_withdrawal' });
      },
    });
  }

  /**
   * Get current positions
   * Thin delegation to MarketDataService
   */
  async getPositions(params?: GetPositionsParams): Promise<Position[]> {
    const provider = this.getActiveProvider();
    return MarketDataService.getPositions({
      provider,
      params,
      context: this.createServiceContext('getPositions'),
    });
  }

  /**
   * Get historical user fills (trade executions)
   * Thin delegation to MarketDataService
   */
  async getOrderFills(params?: GetOrderFillsParams): Promise<OrderFill[]> {
    const provider = this.getActiveProvider();
    return MarketDataService.getOrderFills({
      provider,
      params,
      context: this.createServiceContext('getOrderFills'),
    });
  }

  /**
   * Get historical user orders (order lifecycle)
   * Thin delegation to MarketDataService
   */
  async getOrders(params?: GetOrdersParams): Promise<Order[]> {
    const provider = this.getActiveProvider();
    return MarketDataService.getOrders({
      provider,
      params,
      context: this.createServiceContext('getOrders'),
    });
  }

  /**
   * Get currently open orders (real-time status)
   * Thin delegation to MarketDataService
   */
  async getOpenOrders(params?: GetOrdersParams): Promise<Order[]> {
    const provider = this.getActiveProvider();
    return MarketDataService.getOpenOrders({
      provider,
      params,
      context: this.createServiceContext('getOpenOrders'),
    });
  }

  /**
   * Get historical user funding history (funding payments)
   * Thin delegation to MarketDataService
   */
  async getFunding(params?: GetFundingParams): Promise<Funding[]> {
    const provider = this.getActiveProvider();
    return MarketDataService.getFunding({
      provider,
      params,
      context: this.createServiceContext('getFunding'),
    });
  }

  /**
   * Get account state (balances, etc.)
   * Thin delegation to MarketDataService
   */
  async getAccountState(params?: GetAccountStateParams): Promise<AccountState> {
    const provider = this.getActiveProvider();
    return MarketDataService.getAccountState({
      provider,
      params,
      context: this.createServiceContext('getAccountState'),
    });
  }

  /**
   * Get historical portfolio data
   * Thin delegation to MarketDataService
   */
  async getHistoricalPortfolio(
    params?: GetHistoricalPortfolioParams,
  ): Promise<HistoricalPortfolioResult> {
    const provider = this.getActiveProvider();
    return MarketDataService.getHistoricalPortfolio({
      provider,
      params,
      context: this.createServiceContext('getHistoricalPortfolio'),
    });
  }

  /**
   * Get available markets with optional filtering
   * Thin delegation to MarketDataService
   */
  async getMarkets(params?: {
    symbols?: string[];
    dex?: string;
  }): Promise<MarketInfo[]> {
    const provider = this.getActiveProvider();
    return MarketDataService.getMarkets({
      provider,
      params,
      context: this.createServiceContext('getMarkets'),
    });
  }

  /**
   * Get list of available HIP-3 builder-deployed DEXs
   * @param params - Optional parameters for filtering
   * @returns Array of DEX names
   */
  async getAvailableDexs(params?: GetAvailableDexsParams): Promise<string[]> {
    const provider = this.getActiveProvider();
    return MarketDataService.getAvailableDexs({ provider, params });
  }

  /**
   * Fetch historical candle data
   * Thin delegation to MarketDataService
   */
  async fetchHistoricalCandles(
    coin: string,
    interval: CandlePeriod,
    limit: number = 100,
    endTime?: number,
  ): Promise<CandleData> {
    const provider = this.getActiveProvider();
    return MarketDataService.fetchHistoricalCandles({
      provider,
      coin,
      interval,
      limit,
      endTime,
      context: this.createServiceContext('fetchHistoricalCandles'),
    });
  }

  /**
   * Calculate liquidation price for a position
   * Uses provider-specific formulas based on protocol rules
   */
  async calculateLiquidationPrice(
    params: LiquidationPriceParams,
  ): Promise<string> {
    const provider = this.getActiveProvider();
    return MarketDataService.calculateLiquidationPrice({ provider, params });
  }

  /**
   * Calculate maintenance margin for a specific asset
   * Returns a percentage (e.g., 0.0125 for 1.25%)
   */
  async calculateMaintenanceMargin(
    params: MaintenanceMarginParams,
  ): Promise<number> {
    const provider = this.getActiveProvider();
    return MarketDataService.calculateMaintenanceMargin({ provider, params });
  }

  /**
   * Get maximum leverage allowed for an asset
   */
  async getMaxLeverage(asset: string): Promise<number> {
    const provider = this.getActiveProvider();
    return MarketDataService.getMaxLeverage({ provider, asset });
  }

  /**
   * Validate order parameters according to protocol-specific rules
   */
  async validateOrder(
    params: OrderParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const provider = this.getActiveProvider();
    return MarketDataService.validateOrder({ provider, params });
  }

  /**
   * Validate close position parameters according to protocol-specific rules
   */
  async validateClosePosition(
    params: ClosePositionParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const provider = this.getActiveProvider();
    return MarketDataService.validateClosePosition({ provider, params });
  }

  /**
   * Validate withdrawal parameters according to protocol-specific rules
   */
  async validateWithdrawal(
    params: WithdrawParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const provider = this.getActiveProvider();
    return AccountService.validateWithdrawal({ provider, params });
  }

  /**
   * Get supported withdrawal routes - returns complete asset and routing information
   */
  getWithdrawalRoutes(): AssetRoute[] {
    try {
      const provider = this.getActiveProvider();
      return MarketDataService.getWithdrawalRoutes({ provider });
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('getWithdrawalRoutes'),
      );
      // Return empty array if provider is not available
      return [];
    }
  }

  /**
   * Toggle between testnet and mainnet
   */
  async toggleTestnet(): Promise<ToggleTestnetResult> {
    // Prevent concurrent reinitializations
    if (this.isReinitializing) {
      DevLogger.log(
        'PerpsController: Already reinitializing, skipping toggle',
        {
          timestamp: new Date().toISOString(),
        },
      );
      return {
        success: false,
        isTestnet: this.state.isTestnet,
        error: PERPS_ERROR_CODES.CLIENT_REINITIALIZING,
      };
    }

    this.isReinitializing = true;

    try {
      const previousNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';

      this.update((state) => {
        state.isTestnet = !state.isTestnet;
        state.connectionStatus = 'disconnected';
      });

      const newNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';

      DevLogger.log('PerpsController: Network toggle initiated', {
        from: previousNetwork,
        to: newNetwork,
        timestamp: new Date().toISOString(),
      });

      // Reset initialization state and reinitialize provider with new testnet setting
      this.isInitialized = false;
      this.initializationPromise = null;
      await this.init();

      DevLogger.log('PerpsController: Network toggle completed', {
        newNetwork,
        isTestnet: this.state.isTestnet,
        timestamp: new Date().toISOString(),
      });

      return { success: true, isTestnet: this.state.isTestnet };
    } catch (error) {
      return {
        success: false,
        isTestnet: this.state.isTestnet,
        error:
          error instanceof Error
            ? error.message
            : PERPS_ERROR_CODES.UNKNOWN_ERROR,
      };
    } finally {
      this.isReinitializing = false;
    }
  }

  /**
   * Switch to a different provider
   */
  async switchProvider(providerId: string): Promise<SwitchProviderResult> {
    if (!this.providers.has(providerId)) {
      return {
        success: false,
        providerId: this.state.activeProvider,
        error: `Provider ${providerId} not available`,
      };
    }

    this.update((state) => {
      state.activeProvider = providerId;
      state.connectionStatus = 'disconnected';
    });

    return { success: true, providerId };
  }

  /**
   * Get current network (mainnet/testnet)
   */
  getCurrentNetwork(): 'mainnet' | 'testnet' {
    return this.state.isTestnet ? 'testnet' : 'mainnet';
  }

  // Live data delegation (NO Redux) - delegates to active provider

  /**
   * Subscribe to live price updates
   */
  subscribeToPrices(params: SubscribePricesParams): () => void {
    try {
      const provider = this.getActiveProvider();
      return provider.subscribeToPrices(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToPrices', {
          symbols: params.symbols?.join(','),
        }),
      );
      // Return a no-op unsubscribe function
      return () => {
        // No-op: Provider not initialized
      };
    }
  }

  /**
   * Subscribe to live position updates
   */
  subscribeToPositions(params: SubscribePositionsParams): () => void {
    try {
      const provider = this.getActiveProvider();
      return provider.subscribeToPositions(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToPositions', {
          accountId: params.accountId,
        }),
      );
      // Return a no-op unsubscribe function
      return () => {
        // No-op: Provider not initialized
      };
    }
  }

  /**
   * Subscribe to live order fill updates
   */
  subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void {
    try {
      const provider = this.getActiveProvider();
      return provider.subscribeToOrderFills(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToOrderFills', {
          accountId: params.accountId,
        }),
      );
      // Return a no-op unsubscribe function
      return () => {
        // No-op: Provider not initialized
      };
    }
  }

  /**
   * Subscribe to live order updates
   */
  subscribeToOrders(params: SubscribeOrdersParams): () => void {
    try {
      const provider = this.getActiveProvider();
      return provider.subscribeToOrders(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToOrders', {
          accountId: params.accountId,
        }),
      );
      // Return a no-op unsubscribe function
      return () => {
        // No-op: Provider not initialized
      };
    }
  }

  /**
   * Subscribe to live account updates
   */
  subscribeToAccount(params: SubscribeAccountParams): () => void {
    try {
      const provider = this.getActiveProvider();
      return provider.subscribeToAccount(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToAccount', {
          accountId: params.accountId,
        }),
      );
      // Return a no-op unsubscribe function
      return () => {
        // No-op: Provider not initialized
      };
    }
  }

  /**
   * Subscribe to full order book updates with multiple depth levels
   * Creates a dedicated L2Book subscription for real-time order book data
   */
  subscribeToOrderBook(params: SubscribeOrderBookParams): () => void {
    try {
      const provider = this.getActiveProvider();
      return provider.subscribeToOrderBook(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToOrderBook', {
          symbol: params.symbol,
          levels: params.levels,
        }),
      );
      // Return a no-op unsubscribe function
      return () => {
        // No-op: Provider not initialized
      };
    }
  }

  /**
   * Subscribe to live candle updates
   */
  subscribeToCandles(params: SubscribeCandlesParams): () => void {
    try {
      const provider = this.getActiveProvider();
      return provider.subscribeToCandles(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToCandles', {
          coin: params.coin,
          interval: params.interval,
          duration: params.duration,
        }),
      );
      // Return a no-op unsubscribe function
      return () => {
        // No-op: Provider not initialized
      };
    }
  }

  /**
   * Subscribe to open interest cap updates
   * Zero additional network overhead - data comes from existing webData3 subscription
   */
  subscribeToOICaps(params: SubscribeOICapsParams): () => void {
    try {
      const provider = this.getActiveProvider();
      return provider.subscribeToOICaps(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToOICaps', {
          accountId: params.accountId,
        }),
      );
      // Return a no-op unsubscribe function
      return () => {
        // No-op: Provider not initialized
      };
    }
  }

  /**
   * Configure live data throttling
   */
  setLiveDataConfig(config: Partial<LiveDataConfig>): void {
    try {
      const provider = this.getActiveProvider();
      provider.setLiveDataConfig(config);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('setLiveDataConfig'),
      );
    }
  }

  /**
   * Calculate trading fees for the active provider
   * Each provider implements its own fee structure
   */
  async calculateFees(
    params: FeeCalculationParams,
  ): Promise<FeeCalculationResult> {
    const provider = this.getActiveProvider();
    return MarketDataService.calculateFees({ provider, params });
  }

  /**
   * Disconnect provider and cleanup subscriptions
   * Call this when navigating away from Perps screens to prevent battery drain
   */
  async disconnect(): Promise<void> {
    DevLogger.log(
      'PerpsController: Disconnecting provider to cleanup subscriptions',
      {
        timestamp: new Date().toISOString(),
      },
    );

    // Only disconnect the provider if we're initialized
    if (this.isInitialized && !this.isReinitializing) {
      try {
        const provider = this.getActiveProvider();
        await provider.disconnect();
      } catch (error) {
        Logger.error(ensureError(error), this.getErrorContext('disconnect'));
      }
    }

    // Reset initialization state to ensure proper reconnection
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Eligibility (Geo-Blocking)
   */

  /**
   * Fetch geo location
   *
   * Returned in Country or Country-Region format
   * Example: FR, DE, US-MI, CA-ON
   */
  /**
   * Refresh eligibility status
   */
  async refreshEligibility(): Promise<void> {
    try {
      DevLogger.log('PerpsController: Refreshing eligibility');

      const isEligible = await EligibilityService.checkEligibility(
        this.blockedRegionList.list,
      );

      this.update((state) => {
        state.isEligible = isEligible;
      });
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('refreshEligibility'),
      );
      // Default to eligible on error
      this.update((state) => {
        state.isEligible = true;
      });
    }
  }

  /**
   * Get block explorer URL for an address or just the base URL
   * @param address - Optional address to append to the base URL
   * @returns Block explorer URL
   */
  getBlockExplorerUrl(address?: string): string {
    const provider = this.getActiveProvider();
    return MarketDataService.getBlockExplorerUrl({ provider, address });
  }

  /**
   * Check if user is first-time for the current network
   */
  isFirstTimeUserOnCurrentNetwork(): boolean {
    const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
    return this.state.isFirstTimeUser[currentNetwork];
  }

  /**
   * Mark that the user has completed the tutorial/onboarding
   * This prevents the tutorial from showing again
   */
  markTutorialCompleted(): void {
    const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';

    DevLogger.log('PerpsController: Marking tutorial as completed', {
      timestamp: new Date().toISOString(),
      network: currentNetwork,
    });

    this.update((state) => {
      state.isFirstTimeUser[currentNetwork] = false;
    });
  }

  /*
   * Mark that user has placed their first successful order
   * This prevents the notification tooltip from showing again
   */
  markFirstOrderCompleted(): void {
    const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';

    DevLogger.log('PerpsController: Marking first order completed', {
      timestamp: new Date().toISOString(),
      network: currentNetwork,
    });

    this.update((state) => {
      state.hasPlacedFirstOrder[currentNetwork] = true;
    });
  }

  /**
   * Reset first-time user state for both networks
   * This is useful for testing the tutorial flow
   * Called by Reset Account feature in settings
   */
  resetFirstTimeUserState(): void {
    DevLogger.log('PerpsController: Resetting first-time user state', {
      timestamp: new Date().toISOString(),
      previousState: this.state.isFirstTimeUser,
    });

    this.update((state) => {
      state.isFirstTimeUser = {
        testnet: true,
        mainnet: true,
      };
      state.hasPlacedFirstOrder = {
        testnet: false,
        mainnet: false,
      };
    });
  }

  /**
   * Get saved trade configuration for a market
   */
  getTradeConfiguration(coin: string): { leverage?: number } | undefined {
    const network = this.state.isTestnet ? 'testnet' : 'mainnet';
    const config = this.state.tradeConfigurations[network]?.[coin];

    if (!config?.leverage) return undefined;

    DevLogger.log('PerpsController: Retrieved trade config', {
      coin,
      network,
      leverage: config.leverage,
    });

    return { leverage: config.leverage };
  }

  /**
   * Save trade configuration for a market
   * @param coin - Market symbol
   * @param leverage - Leverage value
   */
  saveTradeConfiguration(coin: string, leverage: number): void {
    const network = this.state.isTestnet ? 'testnet' : 'mainnet';

    DevLogger.log('PerpsController: Saving trade configuration', {
      coin,
      network,
      leverage,
      timestamp: new Date().toISOString(),
    });

    this.update((state) => {
      if (!state.tradeConfigurations[network]) {
        state.tradeConfigurations[network] = {};
      }

      const existingConfig = state.tradeConfigurations[network][coin] || {};
      state.tradeConfigurations[network][coin] = {
        ...existingConfig,
        leverage,
      };
    });
  }

  /**
   * Save pending trade configuration for a market
   * This is a temporary configuration that expires after 5 minutes
   * @param coin - Market symbol
   * @param config - Pending trade configuration
   */
  savePendingTradeConfiguration(
    coin: string,
    config: {
      amount?: string;
      leverage?: number;
      takeProfitPrice?: string;
      stopLossPrice?: string;
      limitPrice?: string;
      orderType?: OrderType;
    },
  ): void {
    const network = this.state.isTestnet ? 'testnet' : 'mainnet';

    DevLogger.log('PerpsController: Saving pending trade configuration', {
      coin,
      network,
      config,
      timestamp: new Date().toISOString(),
    });

    this.update((state) => {
      if (!state.tradeConfigurations[network]) {
        state.tradeConfigurations[network] = {};
      }

      const existingConfig = state.tradeConfigurations[network][coin] || {};
      state.tradeConfigurations[network][coin] = {
        ...existingConfig,
        pendingConfig: {
          ...config,
          timestamp: Date.now(),
        },
      };
    });
  }

  /**
   * Get pending trade configuration for a market
   * Returns undefined if config doesn't exist or has expired (more than 5 minutes old)
   * @param coin - Market symbol
   * @returns Pending trade configuration or undefined
   */
  getPendingTradeConfiguration(coin: string):
    | {
        amount?: string;
        leverage?: number;
        takeProfitPrice?: string;
        stopLossPrice?: string;
        limitPrice?: string;
        orderType?: OrderType;
      }
    | undefined {
    const network = this.state.isTestnet ? 'testnet' : 'mainnet';
    const config =
      this.state.tradeConfigurations[network]?.[coin]?.pendingConfig;

    if (!config) {
      return undefined;
    }

    // Check if config has expired (5 minutes = 300,000 milliseconds)
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const now = Date.now();
    const age = now - config.timestamp;

    if (age > FIVE_MINUTES_MS) {
      DevLogger.log('PerpsController: Pending trade config expired', {
        coin,
        network,
        age,
        timestamp: config.timestamp,
      });
      // Clear expired config
      this.update((state) => {
        if (state.tradeConfigurations[network]?.[coin]?.pendingConfig) {
          delete state.tradeConfigurations[network][coin].pendingConfig;
        }
      });
      return undefined;
    }

    DevLogger.log('PerpsController: Retrieved pending trade config', {
      coin,
      network,
      config,
      age,
    });

    // Return config without timestamp
    const { timestamp, ...configWithoutTimestamp } = config;
    return configWithoutTimestamp;
  }

  /**
   * Clear pending trade configuration for a market
   * @param coin - Market symbol
   */
  clearPendingTradeConfiguration(coin: string): void {
    const network = this.state.isTestnet ? 'testnet' : 'mainnet';

    DevLogger.log('PerpsController: Clearing pending trade configuration', {
      coin,
      network,
      timestamp: new Date().toISOString(),
    });

    this.update((state) => {
      if (state.tradeConfigurations[network]?.[coin]?.pendingConfig) {
        delete state.tradeConfigurations[network][coin].pendingConfig;
      }
    });
  }

  /**
   * Get saved market filter preferences
   */
  getMarketFilterPreferences(): SortOptionId {
    return (
      this.state.marketFilterPreferences ??
      MARKET_SORTING_CONFIG.DEFAULT_SORT_OPTION_ID
    );
  }

  /**
   * Save market filter preferences
   * @param optionId - Sort/filter option ID
   */
  saveMarketFilterPreferences(optionId: SortOptionId): void {
    DevLogger.log('PerpsController: Saving market filter preferences', {
      optionId,
      timestamp: new Date().toISOString(),
    });

    this.update((state) => {
      state.marketFilterPreferences = optionId;
    });
  }

  /**
   * Toggle watchlist status for a market
   * Watchlist markets are stored per network (testnet/mainnet)
   */
  toggleWatchlistMarket(symbol: string): void {
    const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
    const currentWatchlist = this.state.watchlistMarkets[currentNetwork];
    const isWatchlisted = currentWatchlist.includes(symbol);

    DevLogger.log('PerpsController: Toggling watchlist market', {
      timestamp: new Date().toISOString(),
      network: currentNetwork,
      symbol,
      action: isWatchlisted ? 'remove' : 'add',
    });

    this.update((state) => {
      if (isWatchlisted) {
        // Remove from watchlist
        state.watchlistMarkets[currentNetwork] = currentWatchlist.filter(
          (s) => s !== symbol,
        );
      } else {
        // Add to watchlist
        state.watchlistMarkets[currentNetwork] = [...currentWatchlist, symbol];
      }
    });
  }

  /**
   * Check if a market is in the watchlist on the current network
   */
  isWatchlistMarket(symbol: string): boolean {
    const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
    return this.state.watchlistMarkets[currentNetwork].includes(symbol);
  }

  /**
   * Get all watchlist markets for the current network
   */
  getWatchlistMarkets(): string[] {
    const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
    return this.state.watchlistMarkets[currentNetwork];
  }

  /**
   * Report order events to data lake API with retry (non-blocking)
   * Thin delegation to DataLakeService
   */
  protected async reportOrderToDataLake(params: {
    action: 'open' | 'close';
    coin: string;
    sl_price?: number;
    tp_price?: number;
    retryCount?: number;
    _traceId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return DataLakeService.reportOrder({
      action: params.action,
      coin: params.coin,
      sl_price: params.sl_price,
      tp_price: params.tp_price,
      isTestnet: this.state.isTestnet,
      context: this.createServiceContext('reportOrderToDataLake', {
        messenger: this.messenger,
      }),
      retryCount: params.retryCount,
      _traceId: params._traceId,
    });
  }

  /**
   * Check if the controller is currently reinitializing
   * @returns true if providers are being reinitialized
   */
  public isCurrentlyReinitializing(): boolean {
    return this.isReinitializing;
  }
}
