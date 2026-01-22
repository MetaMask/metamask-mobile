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
import { Hex } from '@metamask/utils';
import {
  ARBITRUM_MAINNET_CHAIN_ID_HEX,
  ARBITRUM_MAINNET_CHAIN_ID,
  USDC_ARBITRUM_MAINNET_ADDRESS,
  USDC_SYMBOL,
  HYPERLIQUID_NETWORK_NAME,
  USDC_TOKEN_ICON_URL,
} from '../constants/hyperLiquidConfig';
import {
  BNB_MAINNET_CHAIN_ID,
  USDT_SYMBOL,
  MYX_NETWORK_NAME,
  USDT_TOKEN_ICON_URL,
} from '../constants/myxConfig';
import {
  LastTransactionResult,
  TransactionStatus,
} from '../types/transactionTypes';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../constants/eventNames';
import { ensureError } from '../../../../util/errorUtils';
import type { CandleData } from '../types/perps-types';
import { CandlePeriod } from '../constants/chartConfig';
import {
  PERPS_CONSTANTS,
  MARKET_SORTING_CONFIG,
  PROVIDER_CONFIG,
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
import { RewardsIntegrationService } from './services/RewardsIntegrationService';
import type { ServiceContext } from './services/ServiceContext';
import { type PerpsStreamChannelKey } from '../providers/PerpsStreamManager';
import {
  PerpsAnalyticsEvent,
  type AccountState,
  type AssetRoute,
  type CancelOrderParams,
  type CancelOrderResult,
  type CancelOrdersParams,
  type CancelOrdersResult,
  type ClosePositionParams,
  type ClosePositionsParams,
  type ClosePositionsResult,
  type EditOrderParams,
  type FeeCalculationParams,
  type FeeCalculationResult,
  type FlipPositionParams,
  type Funding,
  type GetAccountStateParams,
  type GetAvailableDexsParams,
  type GetFundingParams,
  type GetMarketsParams,
  type GetOrderFillsParams,
  type GetOrdersParams,
  type GetPositionsParams,
  type IPerpsProvider,
  type LiquidationPriceParams,
  type LiveDataConfig,
  type MaintenanceMarginParams,
  type MarginResult,
  type MarketInfo,
  type Order,
  type OrderFill,
  type OrderParams,
  type OrderResult,
  type PerpsControllerConfig,
  type Position,
  type SubscribeAccountParams,
  type SubscribeCandlesParams,
  type SubscribeOICapsParams,
  type SubscribeOrderBookParams,
  type SubscribeOrderFillsParams,
  type SubscribeOrdersParams,
  type SubscribePositionsParams,
  type SubscribePricesParams,
  type SwitchProviderResult,
  type ToggleTestnetResult,
  type UpdateMarginParams,
  type UpdatePositionTPSLParams,
  type WithdrawParams,
  type WithdrawResult,
  type GetHistoricalPortfolioParams,
  type HistoricalPortfolioResult,
  type OrderType,
  type PerpsProviderInfo,
  type PerpsProviderType,
  // Platform dependencies interface for core migration (bundles all platform-specific deps)
  type IPerpsPlatformDependencies,
  type IPerpsLogger,
} from './types';

/** Derived type for logger options from IPerpsLogger interface */
type PerpsLoggerOptions = Parameters<IPerpsLogger['error']>[1];
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
  activeProvider: PerpsProviderType;
  isTestnet: boolean; // Dev toggle for testnet

  // Initialization state machine
  initializationState: InitializationState;
  initializationError: string | null;
  initializationAttempts: number;

  // Account data (persisted) - using HyperLiquid property names
  accountState: AccountState | null;

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
    accountAddress: string; // Account that initiated this withdrawal
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
    accountAddress: string; // Account that initiated this deposit
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
        orderBookGrouping?: number; // Persisted price grouping for order book
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
        orderBookGrouping?: number; // Persisted price grouping for order book
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
  initializationState: InitializationState.UNINITIALIZED,
  initializationError: null,
  initializationAttempts: 0,
  accountState: null,
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
      type: 'PerpsController:clearPendingTransactionRequests';
      handler: PerpsController['clearPendingTransactionRequests'];
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
    }
  | {
      type: 'PerpsController:getOrderBookGrouping';
      handler: PerpsController['getOrderBookGrouping'];
    }
  | {
      type: 'PerpsController:saveOrderBookGrouping';
      handler: PerpsController['saveOrderBookGrouping'];
    }
  | {
      type: 'PerpsController:getAvailableProviders';
      handler: PerpsController['getAvailableProviders'];
    }
  | {
      type: 'PerpsController:setActiveProvider';
      handler: PerpsController['setActiveProvider'];
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
  /**
   * Platform-specific dependencies (required)
   * Provides logging, metrics, tracing, stream management, and account utilities.
   * Must be provided by the platform (mobile/extension) at instantiation time.
   */
  infrastructure: IPerpsPlatformDependencies;
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

  /**
   * Version counter for blocked region list.
   * Used to prevent race conditions where stale eligibility checks
   * (started with fallback config) overwrite results from newer checks
   * (started with remote config).
   */
  private blockedRegionListVersion = 0;

  // Store HIP-3 configuration (mutable for runtime updates from remote flags)
  private hip3Enabled: boolean;
  private hip3AllowlistMarkets: string[];
  private hip3BlocklistMarkets: string[];
  private hip3ConfigSource: 'remote' | 'fallback' = 'fallback';

  // Store options for dependency injection (allows core package to inject platform-specific services)
  private readonly options: PerpsControllerOptions;

  // Service instances (instantiated with platform dependencies)
  private readonly tradingService: TradingService;
  private readonly marketDataService: MarketDataService;
  private readonly accountService: AccountService;
  private readonly eligibilityService: EligibilityService;
  private readonly dataLakeService: DataLakeService;
  private readonly depositService: DepositService;
  private readonly featureFlagConfigurationService: FeatureFlagConfigurationService;
  private readonly rewardsIntegrationService: RewardsIntegrationService;

  constructor({
    messenger,
    state = {},
    clientConfig = {},
    infrastructure,
  }: PerpsControllerOptions) {
    super({
      name: 'PerpsController',
      metadata,
      messenger,
      state: { ...getDefaultPerpsControllerState(), ...state },
    });

    // Store options for dependency injection
    this.options = {
      messenger,
      state,
      clientConfig,
      infrastructure,
    };

    // Instantiate services with platform dependencies
    this.tradingService = new TradingService(infrastructure);
    this.marketDataService = new MarketDataService(infrastructure);
    this.accountService = new AccountService(infrastructure);
    this.eligibilityService = new EligibilityService(infrastructure);
    this.dataLakeService = new DataLakeService(infrastructure);
    this.depositService = new DepositService(infrastructure);
    this.featureFlagConfigurationService = new FeatureFlagConfigurationService(
      infrastructure,
    );
    this.rewardsIntegrationService = new RewardsIntegrationService(
      infrastructure,
    );

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
      this.logError(
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

    // Migrate old persisted data without accountAddress
    this.migrateRequestsIfNeeded();
  }

  // ============================================================================
  // Infrastructure Access Methods
  // These methods provide access to platform-specific infrastructure via dependency injection.
  // Infrastructure is required and must be provided at instantiation time.
  // ============================================================================

  /**
   * Log an error using injected infrastructure logger
   */
  private logError(error: Error, options?: PerpsLoggerOptions): void {
    this.options.infrastructure.logger.error(error, options);
  }

  /**
   * Log debug message using injected infrastructure debugLogger
   */
  private debugLog(
    ...args: (string | number | boolean | object | null | undefined)[]
  ): void {
    this.options.infrastructure.debugLogger.log(...args);
  }

  /**
   * Get metrics instance from platform dependencies
   */
  private getMetrics(): IPerpsPlatformDependencies['metrics'] {
    return this.options.infrastructure.metrics;
  }

  /**
   * Clean up old withdrawal/deposit requests that don't have accountAddress
   * These are from before the accountAddress field was added and can't be displayed
   * in the UI (which filters by account), so we discard them
   */
  private migrateRequestsIfNeeded(): void {
    this.update((state) => {
      // Remove withdrawal requests without accountAddress - they can't be attributed to any account
      state.withdrawalRequests = state.withdrawalRequests.filter(
        (req) => !!req.accountAddress,
      );

      // Remove deposit requests without accountAddress - they can't be attributed to any account
      state.depositRequests = state.depositRequests.filter(
        (req) => !!req.accountAddress,
      );
    });
  }

  protected setBlockedRegionList(
    list: string[],
    source: 'remote' | 'fallback',
  ) {
    this.featureFlagConfigurationService.setBlockedRegions({
      list,
      source,
      context: this.createServiceContext('setBlockedRegionList', {
        getBlockedRegionList: () => this.blockedRegionList,
        setBlockedRegionList: (
          newList: string[],
          newSource: 'remote' | 'fallback',
        ) => {
          this.blockedRegionList = { list: newList, source: newSource };
          this.blockedRegionListVersion += 1;
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
    this.featureFlagConfigurationService.refreshEligibility({
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
            this.blockedRegionListVersion += 1;
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
    channels: PerpsStreamChannelKey[],
  ): Promise<T> {
    const pausedChannels: PerpsStreamChannelKey[] = [];
    const { streamManager } = this.options.infrastructure;

    // Pause emission on specified channels (WebSocket stays connected)
    // Track which channels successfully paused to ensure proper cleanup
    for (const channel of channels) {
      try {
        streamManager.pauseChannel(channel);
        pausedChannels.push(channel);
      } catch (err) {
        // Log error to Sentry but continue pausing remaining channels
        this.logError(
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
          streamManager.resumeChannel(channel);
        } catch (err) {
          // Log error to Sentry but continue resuming remaining channels
          this.logError(
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

    this.debugLog('PerpsController: Initializing providers', {
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
          this.debugLog('PerpsController: Disconnecting existing providers', {
            count: existingProviders.length,
            timestamp: new Date().toISOString(),
          });
          await Promise.all(
            existingProviders.map((provider) => provider.disconnect()),
          );
        }
        this.providers.clear();

        this.debugLog(
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
            platformDependencies: this.options.infrastructure,
          }),
        );

        // Add MYX provider if enabled
        if (PROVIDER_CONFIG.MYX_ENABLED) {
          const { MYXProvider } = await import('./providers/MYXProvider');
          this.providers.set(
            'myx',
            new MYXProvider({
              isTestnet: this.state.isTestnet,
              platformDependencies: this.options.infrastructure,
            }),
          );
        }

        // Wait for WebSocket transport to be ready before marking as initialized
        await wait(PERPS_CONSTANTS.RECONNECTION_CLEANUP_DELAY_MS);

        this.isInitialized = true;
        this.update((state) => {
          state.initializationState = InitializationState.INITIALIZED;
          state.initializationError = null;
        });

        this.debugLog('PerpsController: Providers initialized successfully', {
          providerCount: this.providers.size,
          activeProvider: this.state.activeProvider,
          timestamp: new Date().toISOString(),
          attempts: attempt,
        });

        return; // Exit retry loop on success
      } catch (error) {
        lastError = ensureError(error);

        this.logError(
          lastError,
          this.getErrorContext('performInitialization', {
            attempt,
            maxAttempts,
          }),
        );

        // If not the last attempt, wait before retrying (exponential backoff)
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s
          this.debugLog(
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

    this.debugLog('PerpsController: Initialization failed', {
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
   * @returns PerpsLoggerOptions with tags (searchable) and context (searchable)
   * @private
   *
   * @example
   * this.logError(error, this.getErrorContext('placeOrder', { symbol: 'BTC', operation: 'validate' }));
   * // Creates searchable tags: feature:perps, provider:hyperliquid, network:mainnet
   * // Creates searchable context: perps_controller.method:placeOrder, perps_controller.symbol:BTC, perps_controller.operation:validate
   */
  private getErrorContext(
    method: string,
    extra?: Record<string, unknown>,
  ): PerpsLoggerOptions {
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
   * Ensure TradingService has controller dependencies set.
   * Uses injectable dependencies from infrastructure for core migration compatibility.
   */
  private ensureTradingServiceDeps(): void {
    const { controllers } = this.options.infrastructure;
    this.tradingService.setControllerDependencies({
      controllers,
      messenger: this.messenger,
      rewardsIntegrationService: this.rewardsIntegrationService,
    });
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
    this.ensureTradingServiceDeps();

    return this.tradingService.placeOrder({
      provider,
      params,
      context: this.createServiceContext('placeOrder', {
        saveTradeConfiguration: (symbol: string, leverage: number) =>
          this.saveTradeConfiguration(symbol, leverage),
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
    this.ensureTradingServiceDeps();

    return this.tradingService.editOrder({
      provider,
      params,
      context: this.createServiceContext('editOrder'),
    });
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
    const provider = this.getActiveProvider();

    return this.tradingService.cancelOrder({
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

    return this.tradingService.cancelOrders({
      provider,
      params,
      context: this.createServiceContext('cancelOrders', {
        getOpenOrders: () => this.getOpenOrders(),
      }),
      withStreamPause: <T>(operation: () => Promise<T>, channels: string[]) =>
        this.withStreamPause(operation, channels as PerpsStreamChannelKey[]),
    });
  }

  /**
   * Close a position (partial or full)
   * Thin delegation to TradingService
   */
  async closePosition(params: ClosePositionParams): Promise<OrderResult> {
    const provider = this.getActiveProvider();
    this.ensureTradingServiceDeps();

    return this.tradingService.closePosition({
      provider,
      params,
      context: this.createServiceContext('closePosition', {
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
    this.ensureTradingServiceDeps();

    return this.tradingService.closePositions({
      provider,
      params,
      context: this.createServiceContext('closePositions', {
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
    this.ensureTradingServiceDeps();

    return this.tradingService.updatePositionTPSL({
      provider,
      params,
      context: this.createServiceContext('updatePositionTPSL'),
    });
  }

  /**
   * Update margin for an existing position (add or remove)
   */
  async updateMargin(params: UpdateMarginParams): Promise<MarginResult> {
    const provider = this.getActiveProvider();
    this.ensureTradingServiceDeps();

    return this.tradingService.updateMargin({
      provider,
      symbol: params.symbol,
      amount: params.amount,
      context: this.createServiceContext('updateMargin'),
    });
  }

  /**
   * Flip position (reverse direction while keeping size and leverage)
   */
  async flipPosition(params: FlipPositionParams): Promise<OrderResult> {
    const provider = this.getActiveProvider();
    this.ensureTradingServiceDeps();

    return this.tradingService.flipPosition({
      provider,
      position: params.position,
      context: this.createServiceContext('flipPosition'),
    });
  }

  /**
   * Simplified deposit method that prepares transaction for confirmation screen
   * No complex state tracking - just sets a loading flag
   */
  async depositWithConfirmation(amount?: string) {
    const { controllers } = this.options.infrastructure;

    try {
      // Clear any stale results when starting a new deposit flow
      // Don't set depositInProgress yet - wait until user confirms

      // Prepare deposit transaction using DepositService
      const provider = this.getActiveProvider();
      const { transaction, assetChainId, currentDepositId } =
        await this.depositService.prepareTransaction({ provider });

      this.update((state) => {
        state.lastDepositResult = null;

        // Get current account address via infrastructure
        const evmAccount =
          this.options.infrastructure.controllers.accounts.getSelectedEvmAccount();
        const accountAddress = evmAccount?.address || 'unknown';

        // Add deposit request to tracking
        const depositRequest = {
          id: currentDepositId,
          timestamp: Date.now(),
          amount: amount || '0', // Use provided amount or default to '0'
          asset: USDC_SYMBOL,
          accountAddress, // Track which account initiated deposit
          success: false, // Will be updated when transaction completes
          txHash: undefined,
          status: 'pending' as TransactionStatus,
          source: undefined,
          transactionId: undefined, // Will be set to depositId when available
        };

        state.depositRequests.unshift(depositRequest); // Add to beginning of array
      });

      const networkClientId =
        controllers.network.findNetworkClientIdForChain(assetChainId);

      if (!networkClientId) {
        throw new Error(
          `No network client found for chain ${assetChainId}. Please add the network first.`,
        );
      }

      const gasFeeToken =
        transaction.to &&
        assetChainId.toLowerCase() === ARBITRUM_MAINNET_CHAIN_ID_HEX &&
        transaction.to.toLowerCase() ===
          USDC_ARBITRUM_MAINNET_ADDRESS.toLowerCase()
          ? (transaction.to as Hex)
          : undefined;

      // submit shows the confirmation screen and returns a promise
      // The promise will resolve when transaction completes or reject if cancelled/failed
      const { result, transactionMeta } = await controllers.transaction.submit(
        transaction,
        {
          networkClientId,
          origin: 'metamask',
          type: TransactionType.perpsDeposit,
          skipInitialGasEstimate: true,
          gasFeeToken,
        },
      );

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
    let withdrawalAmount: string | undefined;

    this.update((state) => {
      const withdrawalIndex = state.withdrawalRequests.findIndex(
        (request) => request.id === withdrawalId,
      );

      if (withdrawalIndex >= 0) {
        const request = state.withdrawalRequests[withdrawalIndex];
        withdrawalAmount = request.amount;
        const originalStatus = request.status;
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

        // Track withdrawal transaction completed/failed (confirmed via HyperLiquid API)
        if (withdrawalAmount !== undefined && originalStatus !== status) {
          this.getMetrics().trackPerpsEvent(
            PerpsAnalyticsEvent.WithdrawalTransaction,
            {
              [PerpsEventProperties.STATUS]:
                status === 'completed'
                  ? PerpsEventValues.STATUS.COMPLETED
                  : PerpsEventValues.STATUS.FAILED,
              [PerpsEventProperties.WITHDRAWAL_AMOUNT]:
                Number.parseFloat(withdrawalAmount),
            },
          );
        }

        this.debugLog('PerpsController: Updated withdrawal status', {
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

    return this.accountService.withdraw({
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
    return this.marketDataService.getPositions({
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
    return this.marketDataService.getOrderFills({
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
    return this.marketDataService.getOrders({
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
    return this.marketDataService.getOpenOrders({
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
    return this.marketDataService.getFunding({
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
    return this.marketDataService.getAccountState({
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
    return this.marketDataService.getHistoricalPortfolio({
      provider,
      params,
      context: this.createServiceContext('getHistoricalPortfolio'),
    });
  }

  /**
   * Get available markets with optional filtering
   * Thin delegation to MarketDataService
   *
   * For readOnly mode, bypasses getActiveProvider() to allow market discovery
   * without full perps initialization (e.g., for discovery banners on spot screens)
   */
  async getMarkets(params?: GetMarketsParams): Promise<MarketInfo[]> {
    // For readOnly mode, access provider directly without initialization check
    // This allows discovery use cases (checking if market exists) without full perps setup
    if (params?.readOnly) {
      // Try to get existing provider, or create a temporary one for readOnly queries
      let provider = this.providers.get(this.state.activeProvider);
      // Create a temporary provider instance for readOnly queries
      // The readOnly path in provider creates a standalone InfoClient without full init
      provider ??= new HyperLiquidProvider({
        isTestnet: this.state.isTestnet,
        hip3Enabled: this.hip3Enabled,
        allowlistMarkets: this.hip3AllowlistMarkets,
        blocklistMarkets: this.hip3BlocklistMarkets,
        platformDependencies: this.options.infrastructure,
      });
      return provider.getMarkets(params);
    }

    const provider = this.getActiveProvider();
    return this.marketDataService.getMarkets({
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
    const context = this.createServiceContext('getAvailableDexs');
    return this.marketDataService.getAvailableDexs({
      provider,
      params,
      context,
    });
  }

  /**
   * Fetch historical candle data
   * Thin delegation to MarketDataService
   */
  async fetchHistoricalCandles(
    symbol: string,
    interval: CandlePeriod,
    limit: number = 100,
    endTime?: number,
  ): Promise<CandleData> {
    const provider = this.getActiveProvider();
    return this.marketDataService.fetchHistoricalCandles({
      provider,
      symbol,
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
    const context = this.createServiceContext('calculateLiquidationPrice');
    return this.marketDataService.calculateLiquidationPrice({
      provider,
      params,
      context,
    });
  }

  /**
   * Calculate maintenance margin for a specific asset
   * Returns a percentage (e.g., 0.0125 for 1.25%)
   */
  async calculateMaintenanceMargin(
    params: MaintenanceMarginParams,
  ): Promise<number> {
    const provider = this.getActiveProvider();
    const context = this.createServiceContext('calculateMaintenanceMargin');
    return this.marketDataService.calculateMaintenanceMargin({
      provider,
      params,
      context,
    });
  }

  /**
   * Get maximum leverage allowed for an asset
   */
  async getMaxLeverage(asset: string): Promise<number> {
    const provider = this.getActiveProvider();
    const context = this.createServiceContext('getMaxLeverage');
    return this.marketDataService.getMaxLeverage({ provider, asset, context });
  }

  /**
   * Validate order parameters according to protocol-specific rules
   */
  async validateOrder(
    params: OrderParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const provider = this.getActiveProvider();
    const context = this.createServiceContext('validateOrder');
    return this.marketDataService.validateOrder({ provider, params, context });
  }

  /**
   * Validate close position parameters according to protocol-specific rules
   */
  async validateClosePosition(
    params: ClosePositionParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const provider = this.getActiveProvider();
    const context = this.createServiceContext('validateClosePosition');
    return this.marketDataService.validateClosePosition({
      provider,
      params,
      context,
    });
  }

  /**
   * Validate withdrawal parameters according to protocol-specific rules
   */
  async validateWithdrawal(
    params: WithdrawParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const provider = this.getActiveProvider();
    return this.accountService.validateWithdrawal({ provider, params });
  }

  /**
   * Get supported withdrawal routes - returns complete asset and routing information
   */
  getWithdrawalRoutes(): AssetRoute[] {
    try {
      const provider = this.getActiveProvider();
      return this.marketDataService.getWithdrawalRoutes({ provider });
    } catch (error) {
      this.logError(
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
      this.debugLog(
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
      });

      const newNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';

      this.debugLog('PerpsController: Network toggle initiated', {
        from: previousNetwork,
        to: newNetwork,
        timestamp: new Date().toISOString(),
      });

      // Reset initialization state and reinitialize provider with new testnet setting
      this.isInitialized = false;
      this.initializationPromise = null;
      await this.init();

      this.debugLog('PerpsController: Network toggle completed', {
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
   * Get available providers for user selection
   * Returns provider info filtered by feature flags
   */
  getAvailableProviders(): PerpsProviderInfo[] {
    const providers: PerpsProviderInfo[] = [
      {
        id: 'hyperliquid',
        name: HYPERLIQUID_NETWORK_NAME,
        chain: 'Arbitrum',
        collateral: 'USD Coin',
        collateralSymbol: USDC_SYMBOL,
        chainId: ARBITRUM_MAINNET_CHAIN_ID,
        iconUrl: USDC_TOKEN_ICON_URL,
        enabled: true,
      },
    ];

    if (PROVIDER_CONFIG.MYX_ENABLED) {
      providers.push({
        id: 'myx',
        name: MYX_NETWORK_NAME,
        chain: 'BNB Chain',
        collateral: 'Tether USD',
        collateralSymbol: USDT_SYMBOL,
        chainId: BNB_MAINNET_CHAIN_ID,
        iconUrl: USDT_TOKEN_ICON_URL,
        enabled: true,
      });
    }

    return providers;
  }

  /**
   * Switch to a different provider
   * Disconnects current provider and reinitializes with new provider
   */
  async switchProvider(
    providerId: PerpsProviderType,
  ): Promise<SwitchProviderResult> {
    // Validate provider is available
    const availableProviders = this.getAvailableProviders();
    const providerInfo = availableProviders.find((p) => p.id === providerId);

    if (!providerInfo?.enabled) {
      return {
        success: false,
        providerId: this.state.activeProvider,
        error: `Provider ${providerId} not available`,
      };
    }

    // Skip if already on this provider
    if (this.state.activeProvider === providerId) {
      return { success: true, providerId };
    }

    // Prevent concurrent switches
    if (this.isReinitializing) {
      return {
        success: false,
        providerId: this.state.activeProvider,
        error: PERPS_ERROR_CODES.CLIENT_REINITIALIZING,
      };
    }

    this.isReinitializing = true;

    try {
      this.debugLog('PerpsController: Provider switch initiated', {
        from: this.state.activeProvider,
        to: providerId,
        timestamp: new Date().toISOString(),
      });

      // Disconnect current provider
      await this.disconnect();

      // Update state with new provider
      this.update((state) => {
        state.activeProvider = providerId;
        state.accountState = null;
        state.initializationState = InitializationState.UNINITIALIZED;
      });

      // Reset initialization state and reinitialize
      this.isInitialized = false;
      this.initializationPromise = null;
      await this.init();

      this.debugLog('PerpsController: Provider switch completed', {
        providerId,
        timestamp: new Date().toISOString(),
      });

      return { success: true, providerId };
    } catch (error) {
      this.logError(
        ensureError(error),
        this.getErrorContext('switchProvider', { providerId }),
      );
      return {
        success: false,
        providerId: this.state.activeProvider,
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
   * Set the active provider (alias for switchProvider for better semantics)
   */
  async setActiveProvider(
    providerId: PerpsProviderType,
  ): Promise<SwitchProviderResult> {
    return this.switchProvider(providerId);
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
      this.logError(
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
      this.logError(
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
      this.logError(
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
      this.logError(
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
      this.logError(
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
      this.logError(
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
      this.logError(
        ensureError(error),
        this.getErrorContext('subscribeToCandles', {
          symbol: params.symbol,
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
      this.logError(
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
      this.logError(
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
    const context = this.createServiceContext('calculateFees');
    return this.marketDataService.calculateFees({ provider, params, context });
  }

  /**
   * Disconnect provider and cleanup subscriptions
   * Call this when navigating away from Perps screens to prevent battery drain
   */
  async disconnect(): Promise<void> {
    this.debugLog(
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
        this.logError(ensureError(error), this.getErrorContext('disconnect'));
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
    // Capture the current version before starting the async operation.
    // This prevents race conditions where stale eligibility checks
    // (started with fallback config) overwrite results from newer checks
    // (started with remote config after it was fetched).
    const versionAtStart = this.blockedRegionListVersion;

    try {
      // TODO: It would be good to have this location before we call this async function to avoid the race condition
      const isEligible = await this.eligibilityService.checkEligibility(
        this.blockedRegionList.list,
      );

      // Only update state if the blocked region list hasn't changed while we were awaiting.
      // This prevents stale fallback-based eligibility checks from overwriting
      // results from remote-based checks.
      if (this.blockedRegionListVersion !== versionAtStart) {
        return;
      }

      this.update((state) => {
        state.isEligible = isEligible;
      });
    } catch (error) {
      this.logError(
        ensureError(error),
        this.getErrorContext('refreshEligibility'),
      );

      // Only update on error if version is still current
      if (this.blockedRegionListVersion === versionAtStart) {
        // Default to eligible on error
        this.update((state) => {
          state.isEligible = true;
        });
      }
    }
  }

  /**
   * Get block explorer URL for an address or just the base URL
   * @param address - Optional address to append to the base URL
   * @returns Block explorer URL
   */
  getBlockExplorerUrl(address?: string): string {
    const provider = this.getActiveProvider();
    return this.marketDataService.getBlockExplorerUrl({ provider, address });
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

    this.debugLog('PerpsController: Marking tutorial as completed', {
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

    this.debugLog('PerpsController: Marking first order completed', {
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
    this.debugLog('PerpsController: Resetting first-time user state', {
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
   * Clear pending/bridging withdrawal and deposit requests
   * This is useful when users want to clear stuck pending indicators
   * Called by Reset Account feature in settings
   */
  clearPendingTransactionRequests(): void {
    this.debugLog('PerpsController: Clearing pending transaction requests', {
      timestamp: new Date().toISOString(),
    });

    this.update((state) => {
      // Filter out pending/bridging withdrawals, keep completed/failed for history
      state.withdrawalRequests = state.withdrawalRequests.filter(
        (req) => req.status !== 'pending' && req.status !== 'bridging',
      );

      // Filter out pending deposits, keep completed/failed for history
      state.depositRequests = state.depositRequests.filter(
        (req) => req.status !== 'pending' && req.status !== 'bridging',
      );

      // Reset withdrawal progress
      state.withdrawalProgress = {
        progress: 0,
        lastUpdated: Date.now(),
        activeWithdrawalId: null,
      };
    });
  }

  /**
   * Get saved trade configuration for a market
   */
  getTradeConfiguration(symbol: string): { leverage?: number } | undefined {
    const network = this.state.isTestnet ? 'testnet' : 'mainnet';
    const config = this.state.tradeConfigurations[network]?.[symbol];

    if (!config?.leverage) return undefined;

    this.debugLog('PerpsController: Retrieved trade config', {
      symbol,
      network,
      leverage: config.leverage,
    });

    return { leverage: config.leverage };
  }

  /**
   * Save trade configuration for a market
   * @param symbol - Market symbol
   * @param leverage - Leverage value
   */
  saveTradeConfiguration(symbol: string, leverage: number): void {
    const network = this.state.isTestnet ? 'testnet' : 'mainnet';

    this.debugLog('PerpsController: Saving trade configuration', {
      symbol,
      network,
      leverage,
      timestamp: new Date().toISOString(),
    });

    this.update((state) => {
      if (!state.tradeConfigurations[network]) {
        state.tradeConfigurations[network] = {};
      }

      const existingConfig = state.tradeConfigurations[network][symbol] || {};
      state.tradeConfigurations[network][symbol] = {
        ...existingConfig,
        leverage,
      };
    });
  }

  /**
   * Save pending trade configuration for a market
   * This is a temporary configuration that expires after 5 minutes
   * @param symbol - Market symbol
   * @param config - Pending trade configuration
   */
  savePendingTradeConfiguration(
    symbol: string,
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

    this.debugLog('PerpsController: Saving pending trade configuration', {
      symbol,
      network,
      config,
      timestamp: new Date().toISOString(),
    });

    this.update((state) => {
      if (!state.tradeConfigurations[network]) {
        state.tradeConfigurations[network] = {};
      }

      const existingConfig = state.tradeConfigurations[network][symbol] || {};
      state.tradeConfigurations[network][symbol] = {
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
   * @param symbol - Market symbol
   * @returns Pending trade configuration or undefined
   */
  getPendingTradeConfiguration(symbol: string):
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
      this.state.tradeConfigurations[network]?.[symbol]?.pendingConfig;

    if (!config) {
      return undefined;
    }

    // Check if config has expired (5 minutes = 300,000 milliseconds)
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const now = Date.now();
    const age = now - config.timestamp;

    if (age > FIVE_MINUTES_MS) {
      this.debugLog('PerpsController: Pending trade config expired', {
        symbol,
        network,
        age,
        timestamp: config.timestamp,
      });
      // Clear expired config
      this.update((state) => {
        if (state.tradeConfigurations[network]?.[symbol]?.pendingConfig) {
          delete state.tradeConfigurations[network][symbol].pendingConfig;
        }
      });
      return undefined;
    }

    this.debugLog('PerpsController: Retrieved pending trade config', {
      symbol,
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
   * @param symbol - Market symbol
   */
  clearPendingTradeConfiguration(symbol: string): void {
    const network = this.state.isTestnet ? 'testnet' : 'mainnet';

    this.debugLog('PerpsController: Clearing pending trade configuration', {
      symbol,
      network,
      timestamp: new Date().toISOString(),
    });

    this.update((state) => {
      if (state.tradeConfigurations[network]?.[symbol]?.pendingConfig) {
        delete state.tradeConfigurations[network][symbol].pendingConfig;
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
    this.debugLog('PerpsController: Saving market filter preferences', {
      optionId,
      timestamp: new Date().toISOString(),
    });

    this.update((state) => {
      state.marketFilterPreferences = optionId;
    });
  }

  /**
   * Get saved order book grouping for a market
   * @param symbol - Market symbol
   * @returns The saved grouping value or undefined if not set
   */
  getOrderBookGrouping(symbol: string): number | undefined {
    const network = this.state.isTestnet ? 'testnet' : 'mainnet';
    const grouping =
      this.state.tradeConfigurations[network]?.[symbol]?.orderBookGrouping;

    if (grouping !== undefined) {
      this.debugLog('PerpsController: Retrieved order book grouping', {
        symbol,
        network,
        grouping,
      });
    }

    return grouping;
  }

  /**
   * Save order book grouping for a market
   * @param symbol - Market symbol
   * @param grouping - Price grouping value
   */
  saveOrderBookGrouping(symbol: string, grouping: number): void {
    const network = this.state.isTestnet ? 'testnet' : 'mainnet';

    this.debugLog('PerpsController: Saving order book grouping', {
      symbol,
      network,
      grouping,
      timestamp: new Date().toISOString(),
    });

    this.update((state) => {
      if (!state.tradeConfigurations[network]) {
        state.tradeConfigurations[network] = {};
      }

      const existingConfig = state.tradeConfigurations[network][symbol] || {};
      state.tradeConfigurations[network][symbol] = {
        ...existingConfig,
        orderBookGrouping: grouping,
      };
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

    this.debugLog('PerpsController: Toggling watchlist market', {
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
    symbol: string;
    sl_price?: number;
    tp_price?: number;
    retryCount?: number;
    _traceId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.dataLakeService.reportOrder({
      action: params.action,
      symbol: params.symbol,
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
