import {
  BaseController,
  ControllerGetStateAction,
  ControllerStateChangeEvent,
  StateMetadata,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';
import { successfulFetch, toHex } from '@metamask/controller-utils';
import type { NetworkControllerGetStateAction } from '@metamask/network-controller';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerTransactionFailedEvent,
  TransactionControllerTransactionSubmittedEvent,
  TransactionParams,
  TransactionType,
} from '@metamask/transaction-controller';
import { parseCaipAssetId, type Hex, hasProperty } from '@metamask/utils';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import type { Span } from '@sentry/core';
import { v4 as uuidv4 } from 'uuid';
import Engine from '../../../../core/Engine';
import { generateDepositId } from '../utils/idUtils';
import { USDC_SYMBOL } from '../constants/hyperLiquidConfig';
import { isTPSLOrder } from '../constants/orderTypes';
import {
  LastTransactionResult,
  TransactionStatus,
} from '../types/transactionTypes';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger, { type LoggerErrorOptions } from '../../../../util/Logger';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accountUtils';
import { generateTransferData } from '../../../../util/transactions';
import { formatAccountToCaipAccountId } from '../utils/rewardsUtils';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../constants/eventNames';
import { ensureError } from '../utils/perpsErrorHandler';
import type { CandleData } from '../types/perps-types';
import { CandlePeriod } from '../constants/chartConfig';
import { PerpsMeasurementName } from '../constants/performanceMetrics';
import {
  DATA_LAKE_API_CONFIG,
  PERPS_CONSTANTS,
  MARKET_SORTING_CONFIG,
  type SortOptionId,
} from '../constants/perpsConfig';
import { PERPS_ERROR_CODES } from './perpsErrorCodes';
import { HyperLiquidProvider } from './providers/HyperLiquidProvider';
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
  MarketInfo,
  Order,
  OrderFill,
  OrderParams,
  OrderResult,
  PerpsControllerConfig,
  Position,
  SubscribeAccountParams,
  SubscribeOICapsParams,
  SubscribeOrderFillsParams,
  SubscribeOrdersParams,
  SubscribePositionsParams,
  SubscribePricesParams,
  SwitchProviderResult,
  ToggleTestnetResult,
  UpdatePositionTPSLParams,
  WithdrawParams,
  WithdrawResult,
  GetHistoricalPortfolioParams,
  HistoricalPortfolioResult,
} from './types';
import { getEnvironment } from './utils';
import type {
  RemoteFeatureFlagControllerState,
  RemoteFeatureFlagControllerStateChangeEvent,
  RemoteFeatureFlagControllerGetStateAction,
} from '@metamask/remote-feature-flag-controller';
import {
  type VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../util/remoteFeatureFlag';
import { parseCommaSeparatedString } from '../utils/stringParseUtils';
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

const ON_RAMP_GEO_BLOCKING_URLS = {
  // Use UAT endpoint since DEV endpoint is less reliable.
  DEV: 'https://on-ramp.uat-api.cx.metamask.io/geolocation',
  PROD: 'https://on-ramp.api.cx.metamask.io/geolocation',
};

// Temporary to avoids estimation failures due to insufficient balance.
const DEPOSIT_GAS_LIMIT = toHex(100000);

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

  // Order management (trackingData never stored, only used for analytics)
  pendingOrders: Omit<OrderParams, 'trackingData'>[];

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
      };
    };
    mainnet: {
      [marketSymbol: string]: {
        leverage?: number;
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
  pendingOrders: [],
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
  pendingOrders: {
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
  private providers: Map<string, IPerpsProvider>;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private isReinitializing = false;

  // Geo-location cache
  private geoLocationCache: { location: string; timestamp: number } | null =
    null;
  private geoLocationFetchPromise: Promise<string> | null = null;
  private readonly GEO_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private blockedRegionList: BlockedRegionList = {
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

  private setBlockedRegionList(list: string[], source: 'remote' | 'fallback') {
    // Never downgrade from remote to fallback
    if (source === 'fallback' && this.blockedRegionList.source === 'remote')
      return;

    if (Array.isArray(list)) {
      this.blockedRegionList = {
        list,
        source,
      };
    }

    this.refreshEligibility().catch((error) => {
      Logger.error(
        ensureError(error),
        this.getErrorContext('setBlockedRegionList', { source }),
      );
    });
  }

  /**
   * Respond to RemoteFeatureFlagController state changes
   * Refreshes user eligibility based on geo-blocked regions defined in remote feature flag.
   * Uses fallback configuration when remote feature flag is undefined.
   * Note: Initial eligibility is set in the constructor if fallback regions are provided.
   */
  private refreshEligibilityOnFeatureFlagChange(
    remoteFeatureFlagControllerState: RemoteFeatureFlagControllerState,
  ): void {
    const perpsGeoBlockedRegionsFeatureFlag =
      // NOTE: Do not use perpsPerpTradingGeoBlockedCountries as it is deprecated.
      remoteFeatureFlagControllerState.remoteFeatureFlags
        ?.perpsPerpTradingGeoBlockedCountriesV2;

    const remoteBlockedRegions = (
      perpsGeoBlockedRegionsFeatureFlag as { blockedRegions?: string[] }
    )?.blockedRegions;

    if (Array.isArray(remoteBlockedRegions)) {
      this.setBlockedRegionList(remoteBlockedRegions, 'remote');
    }

    // Also check for HIP-3 config changes
    this.refreshHip3ConfigOnFeatureFlagChange(remoteFeatureFlagControllerState);
  }

  /**
   * Refresh HIP-3 configuration when remote feature flags change.
   * This method extracts HIP-3 settings from remote flags, validates them,
   * and updates internal state if they differ from current values.
   * When config changes, increments hip3ConfigVersion to trigger ConnectionManager reconnection.
   *
   * Follows the "sticky remote" pattern: once remote config is loaded, never downgrade to fallback.
   *
   * @param remoteFeatureFlagControllerState - State from RemoteFeatureFlagController
   */
  private refreshHip3ConfigOnFeatureFlagChange(
    remoteFeatureFlagControllerState: RemoteFeatureFlagControllerState,
  ): void {
    const remoteFlags = remoteFeatureFlagControllerState.remoteFeatureFlags;

    // Extract and validate remote HIP-3 equity enabled flag
    const equityFlag =
      remoteFlags?.perpsHip3Enabled as unknown as VersionGatedFeatureFlag;
    const validatedEquity = validatedVersionGatedFeatureFlag(equityFlag);

    DevLogger.log('PerpsController: HIP-3 equity flag validation', {
      equityFlag,
      validatedEquity,
      willUse: validatedEquity !== undefined ? 'remote' : 'fallback',
    });

    // Extract and validate remote HIP-3 allowlist markets (allowlist)
    let validatedAllowlistMarkets: string[] | undefined;
    if (hasProperty(remoteFlags, 'perpsHip3AllowlistMarkets')) {
      const remoteMarkets = remoteFlags.perpsHip3AllowlistMarkets;

      DevLogger.log('PerpsController: HIP-3 allowlistMarkets validation', {
        remoteMarkets,
        type: typeof remoteMarkets,
        isArray: Array.isArray(remoteMarkets),
      });

      // LaunchDarkly returns comma-separated strings for list values
      if (typeof remoteMarkets === 'string') {
        const parsed = parseCommaSeparatedString(remoteMarkets);

        if (parsed.length > 0) {
          validatedAllowlistMarkets = parsed;
          DevLogger.log(
            'PerpsController: HIP-3 allowlistMarkets validated from string',
            { validatedAllowlistMarkets },
          );
        } else {
          DevLogger.log(
            'PerpsController: HIP-3 allowlistMarkets string was empty after parsing',
            { fallbackValue: this.hip3AllowlistMarkets },
          );
        }
      } else if (
        Array.isArray(remoteMarkets) &&
        remoteMarkets.every(
          (item) => typeof item === 'string' && item.length > 0,
        )
      ) {
        // Fallback: Validate array of non-empty strings (in case format changes)
        validatedAllowlistMarkets = (remoteMarkets as string[])
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        DevLogger.log(
          'PerpsController: HIP-3 allowlistMarkets validated from array',
          { validatedAllowlistMarkets },
        );
      } else {
        DevLogger.log(
          'PerpsController: HIP-3 allowlistMarkets validation FAILED - falling back to local config',
          {
            reason: Array.isArray(remoteMarkets)
              ? 'Array contains non-string or empty values'
              : 'Invalid type (expected string or array)',
            fallbackValue: this.hip3AllowlistMarkets,
          },
        );
      }
    }

    // Extract and validate remote HIP-3 blocklist markets (blocklist)
    let validatedBlocklistMarkets: string[] | undefined;
    if (hasProperty(remoteFlags, 'perpsHip3BlocklistMarkets')) {
      const remoteBlocked = remoteFlags.perpsHip3BlocklistMarkets;

      DevLogger.log('PerpsController: HIP-3 blocklistMarkets validation', {
        remoteBlocked,
        type: typeof remoteBlocked,
        isArray: Array.isArray(remoteBlocked),
      });

      // LaunchDarkly returns comma-separated strings for list values
      if (typeof remoteBlocked === 'string') {
        const parsed = parseCommaSeparatedString(remoteBlocked);

        if (parsed.length > 0) {
          validatedBlocklistMarkets = parsed;
          DevLogger.log(
            'PerpsController: HIP-3 blocklistMarkets validated from string',
            { validatedBlocklistMarkets },
          );
        } else {
          DevLogger.log(
            'PerpsController: HIP-3 blocklistMarkets string was empty after parsing',
            { fallbackValue: this.hip3BlocklistMarkets },
          );
        }
      } else if (
        Array.isArray(remoteBlocked) &&
        remoteBlocked.every(
          (item) => typeof item === 'string' && item.length > 0,
        )
      ) {
        // Fallback: Validate array of non-empty strings (in case format changes)
        validatedBlocklistMarkets = (remoteBlocked as string[])
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        DevLogger.log(
          'PerpsController: HIP-3 blocklistMarkets validated from array',
          { validatedBlocklistMarkets },
        );
      } else {
        DevLogger.log(
          'PerpsController: HIP-3 blocklistMarkets validation FAILED - falling back to local config',
          {
            reason: Array.isArray(remoteBlocked)
              ? 'Array contains non-string or empty values'
              : 'Invalid type (expected string or array)',
            fallbackValue: this.hip3BlocklistMarkets,
          },
        );
      }
    }

    // Detect changes (only if we have valid remote values)
    const equityChanged =
      validatedEquity !== undefined && validatedEquity !== this.hip3Enabled;
    const allowlistMarketsChanged =
      validatedAllowlistMarkets !== undefined &&
      JSON.stringify(
        [...validatedAllowlistMarkets].sort((a, b) => a.localeCompare(b)),
      ) !==
        JSON.stringify(
          [...this.hip3AllowlistMarkets].sort((a, b) => a.localeCompare(b)),
        );
    const blocklistMarketsChanged =
      validatedBlocklistMarkets !== undefined &&
      JSON.stringify(
        [...validatedBlocklistMarkets].sort((a, b) => a.localeCompare(b)),
      ) !==
        JSON.stringify(
          [...this.hip3BlocklistMarkets].sort((a, b) => a.localeCompare(b)),
        );

    if (equityChanged || allowlistMarketsChanged || blocklistMarketsChanged) {
      DevLogger.log(
        'PerpsController: HIP-3 config changed via remote feature flags',
        {
          equityChanged,
          allowlistMarketsChanged,
          blocklistMarketsChanged,
          oldEquity: this.hip3Enabled,
          newEquity: validatedEquity,
          oldAllowlistMarkets: this.hip3AllowlistMarkets,
          newAllowlistMarkets: validatedAllowlistMarkets,
          oldBlocklistMarkets: this.hip3BlocklistMarkets,
          newBlocklistMarkets: validatedBlocklistMarkets,
          source: 'remote',
        },
      );

      // Update internal state (sticky remote - never downgrade)
      if (validatedEquity !== undefined) {
        this.hip3Enabled = validatedEquity;
      }
      if (validatedAllowlistMarkets !== undefined) {
        this.hip3AllowlistMarkets = [...validatedAllowlistMarkets];
      }
      if (validatedBlocklistMarkets !== undefined) {
        this.hip3BlocklistMarkets = [...validatedBlocklistMarkets];
      }
      this.hip3ConfigSource = 'remote';

      // Increment version to trigger ConnectionManager reconnection and cache clearing
      const newVersion = (this.state.hip3ConfigVersion || 0) + 1;
      this.update((state) => {
        state.hip3ConfigVersion = newVersion;
      });

      DevLogger.log(
        'PerpsController: Incremented hip3ConfigVersion to trigger reconnection',
        {
          newVersion,
          newHip3Enabled: this.hip3Enabled,
          newHip3AllowlistMarkets: this.hip3AllowlistMarkets,
          newHip3BlocklistMarkets: this.hip3BlocklistMarkets,
        },
      );

      // Note: ConnectionManager will handle:
      // 1. Detecting hip3ConfigVersion change via Redux monitoring
      // 2. Clearing all StreamManager caches
      // 3. Calling reconnectWithNewContext() -> initializeProviders()
      // 4. Provider reinitialization will read the new HIP-3 config below
    }
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
   * Calculate user fee discount from RewardsController
   * Used to apply MetaMask reward discounts to trading fees
   * @param parentSpan - Optional parent span to attach measurement to (for order traces)
   * @returns Fee discount in basis points (e.g., 550 for 5.5% off) or undefined if no discount
   * @private
   */
  private async calculateUserFeeDiscount(
    parentSpan?: Span,
  ): Promise<number | undefined> {
    // Only create standalone trace if no parent span provided
    const traceId = parentSpan ? undefined : uuidv4();
    let traceData: Record<string, string | number | boolean> | undefined;

    try {
      // Start standalone trace only if no parent span
      const traceSpan =
        parentSpan ||
        (traceId
          ? trace({
              name: TraceName.PerpsRewardsAPICall,
              id: traceId,
              op: TraceOperation.PerpsOperation,
            })
          : undefined);

      const { RewardsController, NetworkController } = Engine.context;
      const evmAccount = getEvmAccountFromSelectedAccountGroup();

      if (!evmAccount) {
        DevLogger.log('PerpsController: No EVM account found for fee discount');
        return undefined;
      }

      // Get the chain ID using proper NetworkController method
      const networkState = this.messenger.call('NetworkController:getState');
      const selectedNetworkClientId = networkState.selectedNetworkClientId;
      const networkClient = NetworkController.getNetworkClientById(
        selectedNetworkClientId,
      );
      const chainId = networkClient?.configuration?.chainId;

      if (!chainId) {
        Logger.error(
          new Error('Chain ID not found for fee discount calculation'),
          this.getErrorContext('calculateUserFeeDiscount', {
            selectedNetworkClientId,
            networkClientExists: !!networkClient,
          }),
        );
        return undefined;
      }

      const caipAccountId = formatAccountToCaipAccountId(
        evmAccount.address,
        chainId,
      );

      if (!caipAccountId) {
        Logger.error(
          new Error('Failed to format CAIP account ID for fee discount'),
          this.getErrorContext('calculateUserFeeDiscount', {
            address: evmAccount.address,
            chainId,
            selectedNetworkClientId,
          }),
        );
        return undefined;
      }

      const orderExecutionFeeDiscountStartTime = performance.now();
      const discountBips =
        await RewardsController.getPerpsDiscountForAccount(caipAccountId);
      const orderExecutionFeeDiscountDuration =
        performance.now() - orderExecutionFeeDiscountStartTime;

      // Attach measurement once to the appropriate span
      setMeasurement(
        PerpsMeasurementName.PERPS_REWARDS_ORDER_EXECUTION_FEE_DISCOUNT_API_CALL,
        orderExecutionFeeDiscountDuration,
        'millisecond',
        traceSpan,
      );

      DevLogger.log('PerpsController: Fee discount calculated', {
        address: evmAccount.address,
        caipAccountId,
        discountBips,
        discountPercentage: discountBips / 100,
        duration: `${orderExecutionFeeDiscountDuration.toFixed(0)}ms`,
      });

      traceData = {
        success: true,
        discountBips,
      };

      return discountBips;
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('calculateUserFeeDiscount'),
      );

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return undefined;
    } finally {
      // Only end trace if we created one (no parent span)
      if (!parentSpan && traceId) {
        endTrace({
          name: TraceName.PerpsRewardsAPICall,
          id: traceId,
          data: traceData,
        });
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
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    const traceId = uuidv4();
    const startTime = performance.now();
    let traceData:
      | { success: boolean; error?: string; orderId?: string }
      | undefined;

    try {
      // Start trace for the entire operation
      const traceSpan = trace({
        name: TraceName.PerpsPlaceOrder,
        id: traceId,
        op: TraceOperation.PerpsOrderSubmission,
        tags: {
          provider: this.state.activeProvider,
          orderType: params.orderType,
          market: params.coin,
          leverage: params.leverage || 1,
          isTestnet: this.state.isTestnet,
        },
        data: {
          isBuy: params.isBuy,
          orderPrice: params.price || '',
        },
      });
      const provider = this.getActiveProvider();

      // Calculate fee discount at execution time (fresh, secure)
      const feeDiscountBips = await this.calculateUserFeeDiscount(traceSpan);

      DevLogger.log('PerpsController: Fee discount calculated', {
        feeDiscountBips,
        hasDiscount: feeDiscountBips !== undefined,
      });

      // Set discount context in provider for this order
      if (feeDiscountBips !== undefined && provider.setUserFeeDiscount) {
        provider.setUserFeeDiscount(feeDiscountBips);
        DevLogger.log('PerpsController: Fee discount set in provider', {
          feeDiscountBips,
        });
      }

      // Optimistic update - exclude trackingData to avoid persisting analytics data
      const { trackingData, ...orderWithoutTracking } = params;
      this.update((state) => {
        state.pendingOrders.push(orderWithoutTracking);
      });

      DevLogger.log('PerpsController: Submitting order to provider', {
        coin: params.coin,
        orderType: params.orderType,
        isBuy: params.isBuy,
        size: params.size,
        leverage: params.leverage,
        hasTP: !!params.takeProfitPrice,
        hasSL: !!params.stopLossPrice,
      });

      let result: OrderResult;
      try {
        result = await provider.placeOrder(params);

        DevLogger.log('PerpsController: Provider response received', {
          success: result.success,
          orderId: result.orderId,
          error: result.error,
        });
      } finally {
        // Always clear discount context, even on exception
        if (provider.setUserFeeDiscount) {
          provider.setUserFeeDiscount(undefined);
          DevLogger.log('PerpsController: Fee discount cleared from provider');
        }
      }

      // Update state only on success
      if (result.success) {
        this.update((state) => {
          state.pendingOrders = state.pendingOrders.filter(
            (o) => o !== orderWithoutTracking,
          );
          state.lastUpdateTimestamp = Date.now();
        });

        // Save executed trade configuration for this market
        if (params.leverage) {
          this.saveTradeConfiguration(params.coin, params.leverage);
        }

        // Track trade transaction executed
        const completionDuration = performance.now() - startTime;

        const eventBuilder = MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
        ).addProperties({
          [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
          [PerpsEventProperties.ASSET]: params.coin,
          [PerpsEventProperties.DIRECTION]: params.isBuy
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
          [PerpsEventProperties.ORDER_TYPE]: params.orderType,
          [PerpsEventProperties.LEVERAGE]: params.leverage || 1,
          [PerpsEventProperties.ORDER_SIZE]: result.filledSize || params.size,
          [PerpsEventProperties.ASSET_PRICE]:
            result.averagePrice || params.trackingData?.marketPrice,
          [PerpsEventProperties.MARGIN_USED]: params.trackingData?.marginUsed,
          [PerpsEventProperties.METAMASK_FEE]: params.trackingData?.metamaskFee,
          [PerpsEventProperties.METAMASK_FEE_RATE]:
            params.trackingData?.metamaskFeeRate,
          [PerpsEventProperties.DISCOUNT_PERCENTAGE]:
            params.trackingData?.feeDiscountPercentage,
          [PerpsEventProperties.ESTIMATED_REWARDS]:
            params.trackingData?.estimatedPoints,
          [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
          // Add TP/SL if set (for new orders)
          ...(params.takeProfitPrice && {
            [PerpsEventProperties.TAKE_PROFIT_PRICE]: parseFloat(
              params.takeProfitPrice,
            ),
          }),
          ...(params.stopLossPrice && {
            [PerpsEventProperties.STOP_LOSS_PRICE]: parseFloat(
              params.stopLossPrice,
            ),
          }),
        });

        MetaMetrics.getInstance().trackEvent(eventBuilder.build());

        // Report to data lake (fire-and-forget with retry)
        this.reportOrderToDataLake({
          action: 'open',
          coin: params.coin,
          sl_price: params.stopLossPrice
            ? parseFloat(params.stopLossPrice)
            : undefined,
          tp_price: params.takeProfitPrice
            ? parseFloat(params.takeProfitPrice)
            : undefined,
        }).catch((error) => {
          Logger.error(
            ensureError(error),
            this.getErrorContext('placeOrder', {
              operation: 'reportOrderToDataLake',
              coin: params.coin,
            }),
          );
        });

        traceData = { success: true, orderId: result.orderId || '' };
      } else {
        // Track trade transaction failed
        const completionDuration = performance.now() - startTime;
        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
          )
            .addProperties({
              [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
              [PerpsEventProperties.ASSET]: params.coin,
              [PerpsEventProperties.DIRECTION]: params.isBuy
                ? PerpsEventValues.DIRECTION.LONG
                : PerpsEventValues.DIRECTION.SHORT,
              [PerpsEventProperties.ORDER_TYPE]: params.orderType,
              [PerpsEventProperties.LEVERAGE]: params.leverage || 1,
              [PerpsEventProperties.ORDER_SIZE]: params.size,
              [PerpsEventProperties.MARGIN_USED]:
                params.trackingData?.marginUsed,
              [PerpsEventProperties.LIMIT_PRICE]:
                params.orderType === 'limit' ? params.price : null,
              [PerpsEventProperties.FEES]: params.trackingData?.totalFee,
              [PerpsEventProperties.ASSET_PRICE]:
                params.trackingData?.marketPrice,
              [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
              [PerpsEventProperties.ERROR_MESSAGE]:
                result.error || 'Unknown error',
            })
            .build(),
        );

        // Remove from pending orders even on failure since the attempt is complete
        this.update((state) => {
          state.pendingOrders = state.pendingOrders.filter(
            (o) => o !== orderWithoutTracking,
          );
        });

        traceData = { success: false, error: result.error || 'Unknown error' };
      }

      return result;
    } catch (error) {
      // Track trade transaction failed (catch block)
      const completionDuration = performance.now() - startTime;
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
        )
          .addProperties({
            [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
            [PerpsEventProperties.ASSET]: params.coin,
            [PerpsEventProperties.DIRECTION]: params.isBuy
              ? PerpsEventValues.DIRECTION.LONG
              : PerpsEventValues.DIRECTION.SHORT,
            [PerpsEventProperties.ORDER_TYPE]: params.orderType,
            [PerpsEventProperties.LEVERAGE]: params.leverage || 1,
            [PerpsEventProperties.ORDER_SIZE]: params.size,
            [PerpsEventProperties.MARGIN_USED]: params.trackingData?.marginUsed,
            [PerpsEventProperties.LIMIT_PRICE]:
              params.orderType === 'limit' ? params.price : null,
            [PerpsEventProperties.FEES]: params.trackingData?.totalFee,
            [PerpsEventProperties.ASSET_PRICE]:
              params.trackingData?.marketPrice,
            [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
            [PerpsEventProperties.ERROR_MESSAGE]:
              error instanceof Error ? error.message : 'Unknown error',
          })
          .build(),
      );

      // Clear discount context in case of error
      try {
        const provider = this.getActiveProvider();
        if (provider.setUserFeeDiscount) {
          provider.setUserFeeDiscount(undefined);
        }
      } catch (cleanupError) {
        Logger.error(
          ensureError(cleanupError),
          this.getErrorContext('placeOrder', {
            operation: 'clearFeeDiscount',
          }),
        );
      }

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    } finally {
      // Always end trace on exit (success or failure)
      endTrace({
        name: TraceName.PerpsPlaceOrder,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Edit an existing order
   */
  async editOrder(params: EditOrderParams): Promise<OrderResult> {
    const traceId = uuidv4();
    const startTime = performance.now();
    let traceData:
      | { success: boolean; error?: string; orderId?: string }
      | undefined;

    try {
      trace({
        name: TraceName.PerpsEditOrder,
        id: traceId,
        op: TraceOperation.PerpsOrderSubmission,
        tags: {
          provider: this.state.activeProvider,
          orderType: params.newOrder.orderType,
          market: params.newOrder.coin,
          leverage: params.newOrder.leverage || 1,
          isTestnet: this.state.isTestnet,
        },
        data: {
          isBuy: params.newOrder.isBuy,
          orderPrice: params.newOrder.price || '',
        },
      });

      const provider = this.getActiveProvider();
      const result = await provider.editOrder(params);
      const completionDuration = performance.now() - startTime;

      if (result.success) {
        this.update((state) => {
          state.lastUpdateTimestamp = Date.now();
        });

        // Track order edit executed
        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
          )
            .addProperties({
              [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
              [PerpsEventProperties.ASSET]: params.newOrder.coin,
              [PerpsEventProperties.DIRECTION]: params.newOrder.isBuy
                ? PerpsEventValues.DIRECTION.LONG
                : PerpsEventValues.DIRECTION.SHORT,
              [PerpsEventProperties.ORDER_TYPE]: params.newOrder.orderType,
              [PerpsEventProperties.LEVERAGE]: params.newOrder.leverage || 1,
              [PerpsEventProperties.ORDER_SIZE]: params.newOrder.size,
              [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
              ...(params.newOrder.price && {
                [PerpsEventProperties.LIMIT_PRICE]: parseFloat(
                  params.newOrder.price,
                ),
              }),
            })
            .build(),
        );

        traceData = { success: true, orderId: result.orderId || '' };
      } else {
        // Track order edit failed
        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
          )
            .addProperties({
              [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
              [PerpsEventProperties.ASSET]: params.newOrder.coin,
              [PerpsEventProperties.DIRECTION]: params.newOrder.isBuy
                ? PerpsEventValues.DIRECTION.LONG
                : PerpsEventValues.DIRECTION.SHORT,
              [PerpsEventProperties.ORDER_TYPE]: params.newOrder.orderType,
              [PerpsEventProperties.LEVERAGE]: params.newOrder.leverage || 1,
              [PerpsEventProperties.ORDER_SIZE]: params.newOrder.size,
              [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
              [PerpsEventProperties.ERROR_MESSAGE]:
                result.error || 'Unknown error',
            })
            .build(),
        );

        traceData = { success: false, error: result.error || 'Unknown error' };
      }

      return result;
    } catch (error) {
      const completionDuration = performance.now() - startTime;

      // Track order edit exception
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
        )
          .addProperties({
            [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
            [PerpsEventProperties.ASSET]: params.newOrder.coin,
            [PerpsEventProperties.DIRECTION]: params.newOrder.isBuy
              ? PerpsEventValues.DIRECTION.LONG
              : PerpsEventValues.DIRECTION.SHORT,
            [PerpsEventProperties.ORDER_TYPE]: params.newOrder.orderType,
            [PerpsEventProperties.LEVERAGE]: params.newOrder.leverage || 1,
            [PerpsEventProperties.ORDER_SIZE]: params.newOrder.size,
            [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
            [PerpsEventProperties.ERROR_MESSAGE]:
              error instanceof Error ? error.message : 'Unknown error',
          })
          .build(),
      );

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsEditOrder,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
    const traceId = uuidv4();
    const startTime = performance.now();
    let traceData:
      | { success: boolean; error?: string; orderId?: string }
      | undefined;

    try {
      trace({
        name: TraceName.PerpsCancelOrder,
        id: traceId,
        op: TraceOperation.PerpsOrderSubmission,
        tags: {
          provider: this.state.activeProvider,
          market: params.coin,
          isTestnet: this.state.isTestnet,
        },
        data: {
          orderId: params.orderId,
        },
      });

      const provider = this.getActiveProvider();
      const result = await provider.cancelOrder(params);
      const completionDuration = performance.now() - startTime;

      if (result.success) {
        this.update((state) => {
          state.lastUpdateTimestamp = Date.now();
        });

        // Track order cancel executed
        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PERPS_ORDER_CANCEL_TRANSACTION,
          )
            .addProperties({
              [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
              [PerpsEventProperties.ASSET]: params.coin,
              [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
            })
            .build(),
        );

        traceData = { success: true, orderId: params.orderId };
      } else {
        // Track order cancel failed
        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PERPS_ORDER_CANCEL_TRANSACTION,
          )
            .addProperties({
              [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
              [PerpsEventProperties.ASSET]: params.coin,
              [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
              [PerpsEventProperties.ERROR_MESSAGE]:
                result.error || 'Unknown error',
            })
            .build(),
        );

        traceData = { success: false, error: result.error || 'Unknown error' };
      }

      return result;
    } catch (error) {
      const completionDuration = performance.now() - startTime;

      // Track order cancel exception
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_ORDER_CANCEL_TRANSACTION,
        )
          .addProperties({
            [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
            [PerpsEventProperties.ASSET]: params.coin,
            [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
            [PerpsEventProperties.ERROR_MESSAGE]:
              error instanceof Error ? error.message : 'Unknown error',
          })
          .build(),
      );

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsCancelOrder,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Cancel multiple orders in parallel
   * Batch version of cancelOrder() that cancels multiple orders simultaneously
   */
  async cancelOrders(params: CancelOrdersParams): Promise<CancelOrdersResult> {
    const traceId = uuidv4();
    const startTime = performance.now();
    let operationResult: CancelOrdersResult | null = null;
    let operationError: Error | null = null;

    try {
      trace({
        name: TraceName.PerpsCancelOrder,
        id: traceId,
        op: TraceOperation.PerpsOrderSubmission,
        tags: {
          provider: this.state.activeProvider,
          isBatch: 'true',
          isTestnet: this.state.isTestnet,
        },
        data: {
          cancelAll: params.cancelAll ? 'true' : 'false',
          coinCount: params.coins?.length || 0,
          orderIdCount: params.orderIds?.length || 0,
        },
      });

      // Pause orders stream to prevent WebSocket updates during cancellation
      operationResult = await this.withStreamPause(async () => {
        // Get all open orders (using getOpenOrders to avoid duplicates from historicalOrders)
        const orders = await this.getOpenOrders();

        // Filter orders based on params
        let ordersToCancel = orders;
        if (params.cancelAll || (!params.coins && !params.orderIds)) {
          // Cancel all orders (excluding TP/SL orders for positions)
          ordersToCancel = orders.filter(
            (o) => !isTPSLOrder(o.detailedOrderType),
          );
        } else if (params.orderIds && params.orderIds.length > 0) {
          // Cancel specific order IDs
          ordersToCancel = orders.filter((o) =>
            params.orderIds?.includes(o.orderId),
          );
        } else if (params.coins && params.coins.length > 0) {
          // Cancel orders for specific coins
          ordersToCancel = orders.filter((o) =>
            params.coins?.includes(o.symbol),
          );
        }

        if (ordersToCancel.length === 0) {
          return {
            success: false,
            successCount: 0,
            failureCount: 0,
            results: [],
          };
        }

        const provider = this.getActiveProvider();

        // Use batch cancel if provider supports it
        if (provider.cancelOrders) {
          return await provider.cancelOrders(
            ordersToCancel.map((order) => ({
              coin: order.symbol,
              orderId: order.orderId,
            })),
          );
        }

        // Fallback: Cancel orders in parallel (for providers without batch support)
        const results = await Promise.allSettled(
          ordersToCancel.map((order) =>
            this.cancelOrder({ coin: order.symbol, orderId: order.orderId }),
          ),
        );

        // Aggregate results
        const successCount = results.filter(
          (r) => r.status === 'fulfilled' && r.value.success,
        ).length;
        const failureCount = results.length - successCount;

        return {
          success: successCount > 0,
          successCount,
          failureCount,
          results: results.map((result, index) => {
            let error: string | undefined;
            if (result.status === 'rejected') {
              error =
                result.reason instanceof Error
                  ? result.reason.message
                  : 'Unknown error';
            } else if (result.status === 'fulfilled' && !result.value.success) {
              error = result.value.error;
            }

            return {
              orderId: ordersToCancel[index].orderId,
              coin: ordersToCancel[index].symbol,
              success: !!(
                result.status === 'fulfilled' && result.value.success
              ),
              error,
            };
          }),
        };
      }, ['orders']); // Disconnect orders stream during operation

      return operationResult;
    } catch (error) {
      operationError =
        error instanceof Error ? error : new Error(String(error));
      throw error;
    } finally {
      const completionDuration = performance.now() - startTime;

      // Track batch cancel event (success or failure)
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_ORDER_CANCEL_TRANSACTION,
        )
          .addProperties({
            [PerpsEventProperties.STATUS]:
              operationResult?.success && operationResult.successCount > 0
                ? PerpsEventValues.STATUS.EXECUTED
                : PerpsEventValues.STATUS.FAILED,
            [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
            ...(operationError && {
              [PerpsEventProperties.ERROR_MESSAGE]: operationError.message,
            }),
            // Note: Custom properties for batch tracking (totalCount, successCount, failureCount)
            // can be added to PerpsEventProperties if needed for analytics
          })
          .build(),
      );

      endTrace({
        name: TraceName.PerpsCancelOrder,
        id: traceId,
      });
    }
  }

  /**
   * Close a position (partial or full)
   */
  async closePosition(params: ClosePositionParams): Promise<OrderResult> {
    const traceId = uuidv4();
    const startTime = performance.now();
    // Get position data for event tracking
    let position: Position | undefined;
    let traceData:
      | { success: boolean; error?: string; filledSize?: string }
      | undefined;

    try {
      const traceSpan = trace({
        name: TraceName.PerpsClosePosition,
        id: traceId,
        op: TraceOperation.PerpsPositionManagement,
        tags: {
          provider: this.state.activeProvider,
          coin: params.coin,
          closeSize: params.size || 'full',
          isTestnet: this.state.isTestnet,
        },
      });

      // Measure position loading time
      const positionLoadStart = performance.now();
      try {
        const positions = await this.getPositions();
        position = positions.find((p) => p.coin === params.coin);
        setMeasurement(
          PerpsMeasurementName.PERPS_GET_POSITIONS_OPERATION,
          performance.now() - positionLoadStart,
          'millisecond',
          traceSpan,
        );
      } catch (err) {
        DevLogger.log(
          'PerpsController: Could not get position data for tracking',
          err,
        );
      }

      const provider = this.getActiveProvider();

      // Calculate fee discount at execution time (same as placeOrder)
      const feeDiscountBips = await this.calculateUserFeeDiscount(traceSpan);

      // Set discount context in provider for this close operation
      if (feeDiscountBips !== undefined && provider.setUserFeeDiscount) {
        provider.setUserFeeDiscount(feeDiscountBips);
      }

      let result: OrderResult;
      try {
        result = await provider.closePosition(params);
      } finally {
        // Always clear discount context, even on exception
        if (provider.setUserFeeDiscount) {
          provider.setUserFeeDiscount(undefined);
        }
      }

      const completionDuration = performance.now() - startTime;

      if (result.success && position) {
        this.update((state) => {
          state.lastUpdateTimestamp = Date.now();
        });

        // Report to data lake (fire-and-forget with retry)
        this.reportOrderToDataLake({
          action: 'close',
          coin: params.coin,
        }).catch((error) => {
          Logger.error(
            ensureError(error),
            this.getErrorContext('closePosition', {
              operation: 'reportOrderToDataLake',
              coin: params.coin,
            }),
          );
        });

        // Determine direction from position size
        const direction =
          parseFloat(position.size) > 0
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT;

        // Check if partially filled
        const filledSize = result.filledSize
          ? parseFloat(result.filledSize)
          : 0;
        const requestedSize = params.size
          ? parseFloat(params.size)
          : Math.abs(parseFloat(position.size));
        const isPartiallyFilled = filledSize > 0 && filledSize < requestedSize;

        if (isPartiallyFilled) {
          // Track partially filled event
          MetaMetrics.getInstance().trackEvent(
            MetricsEventBuilder.createEventBuilder(
              MetaMetricsEvents.PERPS_POSITION_CLOSE_TRANSACTION,
            )
              .addProperties({
                [PerpsEventProperties.STATUS]:
                  PerpsEventValues.STATUS.PARTIALLY_FILLED,
                [PerpsEventProperties.ASSET]: position.coin,
                [PerpsEventProperties.DIRECTION]: direction,
                [PerpsEventProperties.OPEN_POSITION_SIZE]: Math.abs(
                  parseFloat(position.size),
                ),
                [PerpsEventProperties.ORDER_SIZE]: requestedSize,
                [PerpsEventProperties.ORDER_TYPE]:
                  params.orderType || PerpsEventValues.ORDER_TYPE.MARKET,
                [PerpsEventProperties.AMOUNT_FILLED]: filledSize,
                [PerpsEventProperties.REMAINING_AMOUNT]:
                  requestedSize - filledSize,
                [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
              })
              .build(),
          );
        }

        // Track position close executed event
        const orderType =
          params.orderType || PerpsEventValues.ORDER_TYPE.MARKET;
        const closePercentage = params.size
          ? (parseFloat(params.size) / Math.abs(parseFloat(position.size))) *
            100
          : 100;
        const closeType =
          closePercentage === 100
            ? PerpsEventValues.CLOSE_TYPE.FULL
            : PerpsEventValues.CLOSE_TYPE.PARTIAL;

        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PERPS_POSITION_CLOSE_TRANSACTION,
          )
            .addProperties({
              [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
              [PerpsEventProperties.ASSET]: position.coin,
              [PerpsEventProperties.DIRECTION]: direction,
              [PerpsEventProperties.ORDER_TYPE]: orderType,
              [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
              [PerpsEventProperties.PERCENTAGE_CLOSED]: closePercentage,
              [PerpsEventProperties.CLOSE_TYPE]: closeType,
              // Add missing properties per specification
              [PerpsEventProperties.OPEN_POSITION_SIZE]: Math.abs(
                parseFloat(position.size),
              ),
              [PerpsEventProperties.ORDER_SIZE]: params.size
                ? parseFloat(params.size)
                : Math.abs(parseFloat(position.size)),
              [PerpsEventProperties.PNL_DOLLAR]: position.unrealizedPnl
                ? parseFloat(position.unrealizedPnl)
                : null,
              [PerpsEventProperties.PNL_PERCENT]: position.returnOnEquity
                ? parseFloat(position.returnOnEquity) * 100
                : null,
              [PerpsEventProperties.FEE]: params.trackingData?.totalFee || null,
              [PerpsEventProperties.METAMASK_FEE]:
                params.trackingData?.metamaskFee || null,
              [PerpsEventProperties.METAMASK_FEE_RATE]:
                params.trackingData?.metamaskFeeRate || null,
              [PerpsEventProperties.DISCOUNT_PERCENTAGE]:
                params.trackingData?.feeDiscountPercentage || null,
              [PerpsEventProperties.ESTIMATED_REWARDS]:
                params.trackingData?.estimatedPoints || null,
              [PerpsEventProperties.ASSET_PRICE]:
                params.trackingData?.marketPrice || result.averagePrice || null,
              [PerpsEventProperties.LIMIT_PRICE]:
                params.orderType === 'limit' ? params.price : null,
              [PerpsEventProperties.RECEIVED_AMOUNT]:
                params.trackingData?.receivedAmount || null,
            })
            .build(),
        );

        traceData = { success: true, filledSize: result.filledSize || '' };
      } else if (!result.success && position) {
        // Track position close failed event
        const direction =
          parseFloat(position.size) > 0
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT;

        traceData = { success: false, error: result.error || 'Unknown error' };

        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PERPS_POSITION_CLOSE_TRANSACTION,
          )
            .addProperties({
              [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
              [PerpsEventProperties.ASSET]: position.coin,
              [PerpsEventProperties.DIRECTION]: direction,
              [PerpsEventProperties.ORDER_SIZE]:
                params.size || Math.abs(parseFloat(position.size)),
              [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
              [PerpsEventProperties.ERROR_MESSAGE]:
                result.error || 'Unknown error',
              // Add missing properties per specification
              [PerpsEventProperties.OPEN_POSITION_SIZE]: Math.abs(
                parseFloat(position.size),
              ),
              [PerpsEventProperties.ORDER_TYPE]:
                params.orderType || PerpsEventValues.ORDER_TYPE.MARKET,
              [PerpsEventProperties.PERCENTAGE_CLOSED]: params.size
                ? (parseFloat(params.size) /
                    Math.abs(parseFloat(position.size))) *
                  100
                : 100,
              [PerpsEventProperties.PNL_DOLLAR]: position.unrealizedPnl
                ? parseFloat(position.unrealizedPnl)
                : null,
              [PerpsEventProperties.PNL_PERCENT]: position.returnOnEquity
                ? parseFloat(position.returnOnEquity) * 100
                : null,
              [PerpsEventProperties.FEE]: params.trackingData?.totalFee || null,
              [PerpsEventProperties.METAMASK_FEE]:
                params.trackingData?.metamaskFee || null,
              [PerpsEventProperties.METAMASK_FEE_RATE]:
                params.trackingData?.metamaskFeeRate || null,
              [PerpsEventProperties.DISCOUNT_PERCENTAGE]:
                params.trackingData?.feeDiscountPercentage || null,
              [PerpsEventProperties.ESTIMATED_REWARDS]:
                params.trackingData?.estimatedPoints || null,
              [PerpsEventProperties.ASSET_PRICE]:
                params.trackingData?.marketPrice || result.averagePrice || null,
              [PerpsEventProperties.LIMIT_PRICE]:
                params.orderType === 'limit' ? params.price : null,
              [PerpsEventProperties.RECEIVED_AMOUNT]:
                params.trackingData?.receivedAmount || null,
            })
            .build(),
        );
      }

      return result;
    } catch (error) {
      const completionDuration = performance.now() - startTime;

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      if (position) {
        // Track position close failed event for exceptions
        const direction =
          parseFloat(position.size) > 0
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT;

        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PERPS_POSITION_CLOSE_TRANSACTION,
          )
            .addProperties({
              [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
              [PerpsEventProperties.ASSET]: position.coin,
              [PerpsEventProperties.DIRECTION]: direction,
              [PerpsEventProperties.ORDER_SIZE]:
                params.size || Math.abs(parseFloat(position.size)),
              [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
              [PerpsEventProperties.ERROR_MESSAGE]:
                error instanceof Error ? error.message : 'Unknown error',
              // Add missing properties per specification
              [PerpsEventProperties.OPEN_POSITION_SIZE]: Math.abs(
                parseFloat(position.size),
              ),
              [PerpsEventProperties.ORDER_TYPE]:
                params.orderType || PerpsEventValues.ORDER_TYPE.MARKET,
              [PerpsEventProperties.PERCENTAGE_CLOSED]: params.size
                ? (parseFloat(params.size) /
                    Math.abs(parseFloat(position.size))) *
                  100
                : 100,
              [PerpsEventProperties.PNL_DOLLAR]: position.unrealizedPnl
                ? parseFloat(position.unrealizedPnl)
                : null,
              [PerpsEventProperties.PNL_PERCENT]: position.returnOnEquity
                ? parseFloat(position.returnOnEquity) * 100
                : null,
              [PerpsEventProperties.FEE]: params.trackingData?.totalFee || null,
              [PerpsEventProperties.ASSET_PRICE]:
                params.trackingData?.marketPrice || null,
              [PerpsEventProperties.LIMIT_PRICE]:
                params.orderType === 'limit' ? params.price : null,
              [PerpsEventProperties.RECEIVED_AMOUNT]:
                params.trackingData?.receivedAmount || null,
            })
            .build(),
        );
      }
      throw error;
    } finally {
      // Always end trace on exit (success or failure)
      endTrace({
        name: TraceName.PerpsClosePosition,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Close multiple positions in parallel
   * Batch version of closePosition() that closes multiple positions simultaneously
   */
  async closePositions(
    params: ClosePositionsParams,
  ): Promise<ClosePositionsResult> {
    const traceId = uuidv4();
    const startTime = performance.now();
    let operationResult: ClosePositionsResult | null = null;
    let operationError: Error | null = null;

    try {
      trace({
        name: TraceName.PerpsClosePosition,
        id: traceId,
        op: TraceOperation.PerpsPositionManagement,
        tags: {
          provider: this.state.activeProvider,
          isBatch: 'true',
          isTestnet: this.state.isTestnet,
        },
        data: {
          closeAll: params.closeAll ? 'true' : 'false',
          coinCount: params.coins?.length || 0,
        },
      });

      const provider = this.getActiveProvider();

      DevLogger.log('[closePositions] Batch method check', {
        providerType: provider.protocolId,
        hasBatchMethod: !!provider.closePositions,
        methodType: typeof provider.closePositions,
        providerKeys: Object.keys(provider).filter((k) => k.includes('close')),
      });

      // Use batch close if provider supports it (provider handles filtering)
      if (provider.closePositions) {
        operationResult = await provider.closePositions(params);
      } else {
        // Fallback: Get positions, filter, and close in parallel
        const positions = await this.getPositions();

        const positionsToClose =
          params.closeAll || !params.coins || params.coins.length === 0
            ? positions
            : positions.filter((p) => params.coins?.includes(p.coin));

        if (positionsToClose.length === 0) {
          operationResult = {
            success: false,
            successCount: 0,
            failureCount: 0,
            results: [],
          };
          return operationResult;
        }

        const results = await Promise.allSettled(
          positionsToClose.map((position) =>
            this.closePosition({ coin: position.coin }),
          ),
        );

        // Aggregate results
        const successCount = results.filter(
          (r) => r.status === 'fulfilled' && r.value.success,
        ).length;
        const failureCount = results.length - successCount;

        operationResult = {
          success: successCount > 0,
          successCount,
          failureCount,
          results: results.map((result, index) => {
            let error: string | undefined;
            if (result.status === 'rejected') {
              error =
                result.reason instanceof Error
                  ? result.reason.message
                  : 'Unknown error';
            } else if (result.status === 'fulfilled' && !result.value.success) {
              error = result.value.error;
            }

            return {
              coin: positionsToClose[index].coin,
              success: !!(
                result.status === 'fulfilled' && result.value.success
              ),
              error,
            };
          }),
        };
      }

      return operationResult;
    } catch (error) {
      operationError =
        error instanceof Error ? error : new Error(String(error));
      throw error;
    } finally {
      const completionDuration = performance.now() - startTime;

      // Track batch close event (success or failure)
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_POSITION_CLOSE_TRANSACTION,
        )
          .addProperties({
            [PerpsEventProperties.STATUS]:
              operationResult?.success && operationResult.successCount > 0
                ? PerpsEventValues.STATUS.EXECUTED
                : PerpsEventValues.STATUS.FAILED,
            [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
            ...(operationError && {
              [PerpsEventProperties.ERROR_MESSAGE]: operationError.message,
            }),
            // Note: Custom properties for batch tracking (totalCount, successCount, failureCount)
            // can be added to PerpsEventProperties if needed for analytics
          })
          .build(),
      );

      endTrace({
        name: TraceName.PerpsClosePosition,
        id: traceId,
      });
    }
  }

  /**
   * Update TP/SL for an existing position
   */
  async updatePositionTPSL(
    params: UpdatePositionTPSLParams,
  ): Promise<OrderResult> {
    const traceId = uuidv4();
    const startTime = performance.now();
    let traceData: { success: boolean; error?: string } | undefined;
    let result: OrderResult | undefined;
    let errorMessage: string | undefined;

    // Extract tracking data with defaults
    const direction = params.trackingData?.direction;
    const positionSize = params.trackingData?.positionSize;
    const source =
      params.trackingData?.source || PerpsEventValues.SOURCE.TP_SL_VIEW;
    const takeProfitPercentage = params.trackingData?.takeProfitPercentage;
    const stopLossPercentage = params.trackingData?.stopLossPercentage;
    const isEditingExistingPosition =
      params.trackingData?.isEditingExistingPosition;

    try {
      const traceSpan = trace({
        name: TraceName.PerpsUpdateTPSL,
        id: traceId,
        op: TraceOperation.PerpsPositionManagement,
        tags: {
          provider: this.state.activeProvider,
          market: params.coin,
          isTestnet: this.state.isTestnet,
        },
        data: {
          takeProfitPrice: params.takeProfitPrice || '',
          stopLossPrice: params.stopLossPrice || '',
        },
      });

      const provider = this.getActiveProvider();

      // Get fee discount from rewards
      const feeDiscountBips = await this.calculateUserFeeDiscount(traceSpan);

      // Set discount context in provider for this operation
      if (feeDiscountBips !== undefined && provider.setUserFeeDiscount) {
        provider.setUserFeeDiscount(feeDiscountBips);
      }

      try {
        result = await provider.updatePositionTPSL(params);
      } finally {
        // Always clear discount context, even on exception
        if (provider.setUserFeeDiscount) {
          provider.setUserFeeDiscount(undefined);
        }
      }

      if (result.success) {
        this.update((state) => {
          state.lastUpdateTimestamp = Date.now();
        });
        traceData = { success: true };
      } else {
        errorMessage = result.error || 'Unknown error';
        traceData = { success: false, error: errorMessage };
      }

      return result;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      traceData = { success: false, error: errorMessage };
      throw error;
    } finally {
      const completionDuration = performance.now() - startTime;

      // Build common event properties
      const eventProperties = {
        [PerpsEventProperties.STATUS]: result?.success
          ? PerpsEventValues.STATUS.EXECUTED
          : PerpsEventValues.STATUS.FAILED,
        [PerpsEventProperties.ASSET]: params.coin,
        [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
        [PerpsEventProperties.SOURCE]: source,
        // Differentiate create vs edit TP/SL
        [PerpsEventProperties.SCREEN_TYPE]: isEditingExistingPosition
          ? PerpsEventValues.SCREEN_TYPE.EDIT_TPSL
          : PerpsEventValues.SCREEN_TYPE.CREATE_TPSL,
        // Track what user has set
        [PerpsEventProperties.HAS_TAKE_PROFIT]: !!params.takeProfitPrice,
        [PerpsEventProperties.HAS_STOP_LOSS]: !!params.stopLossPrice,
        ...(direction && {
          [PerpsEventProperties.DIRECTION]:
            direction === 'long'
              ? PerpsEventValues.DIRECTION.LONG
              : PerpsEventValues.DIRECTION.SHORT,
        }),
        ...(positionSize !== undefined && {
          [PerpsEventProperties.POSITION_SIZE]: positionSize,
        }),
        ...(params.takeProfitPrice && {
          [PerpsEventProperties.TAKE_PROFIT_PRICE]: parseFloat(
            params.takeProfitPrice,
          ),
        }),
        ...(params.stopLossPrice && {
          [PerpsEventProperties.STOP_LOSS_PRICE]: parseFloat(
            params.stopLossPrice,
          ),
        }),
        ...(takeProfitPercentage !== undefined && {
          [PerpsEventProperties.TAKE_PROFIT_PERCENTAGE]: takeProfitPercentage,
        }),
        ...(stopLossPercentage !== undefined && {
          [PerpsEventProperties.STOP_LOSS_PERCENTAGE]: stopLossPercentage,
        }),
        ...(errorMessage && {
          [PerpsEventProperties.ERROR_MESSAGE]: errorMessage,
        }),
      };

      // Track event once with all properties
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_RISK_MANAGEMENT,
        )
          .addProperties(eventProperties)
          .build(),
      );

      endTrace({
        name: TraceName.PerpsUpdateTPSL,
        id: traceId,
        data: traceData,
      });
    }
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

      // Generate deposit request ID for tracking
      const currentDepositId = generateDepositId();

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

      const provider = this.getActiveProvider();
      const depositRoutes = provider.getDepositRoutes({ isTestnet: false });
      const route = depositRoutes[0];
      const bridgeContractAddress = route.contractAddress;

      const transferData = generateTransferData('transfer', {
        toAddress: bridgeContractAddress,
        amount: '0x0',
      });

      const evmAccount = getEvmAccountFromSelectedAccountGroup();
      if (!evmAccount) {
        throw new Error(
          'No EVM-compatible account found in selected account group',
        );
      }
      const accountAddress = evmAccount.address as Hex;

      const parsedAsset = parseCaipAssetId(route.assetId);
      const assetChainId = toHex(parsedAsset.chainId.split(':')[1]);
      const tokenAddress = parsedAsset.assetReference as Hex;

      const transaction: TransactionParams = {
        from: accountAddress,
        to: tokenAddress,
        value: '0x0',
        data: transferData,
        gas: DEPOSIT_GAS_LIMIT,
      };

      const networkClientId =
        NetworkController.findNetworkClientIdByChainId(assetChainId);

      // addTransaction shows the confirmation screen and returns a promise
      // The promise will resolve when transaction completes or reject if cancelled/failed
      const { result, transactionMeta } =
        await TransactionController.addTransaction(transaction, {
          networkClientId,
          origin: 'metamask',
          type: TransactionType.perpsDeposit,
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
    const traceId = uuidv4();
    const startTime = performance.now();
    let traceData:
      | {
          success: boolean;
          error?: string;
          txHash?: string;
          withdrawalId?: string;
        }
      | undefined;

    // Generate withdrawal request ID for tracking (outside try block for catch access)
    const currentWithdrawalId = `withdraw-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    try {
      trace({
        name: TraceName.PerpsWithdraw,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          assetId: params.assetId || '',
          provider: this.state.activeProvider,
          isTestnet: this.state.isTestnet,
        },
      });
      DevLogger.log('PerpsController: STARTING WITHDRAWAL', {
        params,
        timestamp: new Date().toISOString(),
        assetId: params.assetId,
        amount: params.amount,
        destination: params.destination,
        activeProvider: this.state.activeProvider,
        isTestnet: this.state.isTestnet,
      });

      // Set withdrawal in progress
      this.update((state) => {
        state.withdrawInProgress = true;

        // Calculate net amount after fees (same logic as completed withdrawals)
        const grossAmount = parseFloat(params.amount);
        const feeAmount = 1.0; // HyperLiquid withdrawal fee is $1 USDC
        const netAmount = Math.max(0, grossAmount - feeAmount);

        // Add withdrawal request to tracking
        const withdrawalRequest = {
          id: currentWithdrawalId,
          timestamp: Date.now(),
          amount: netAmount.toString(), // Use net amount (after fees)
          asset: USDC_SYMBOL, // Default to USDC for now
          success: false, // Will be updated when transaction completes
          txHash: undefined,
          status: 'pending' as TransactionStatus,
          destination: params.destination,
          transactionId: undefined, // Will be set to withdrawalId when available
        };

        state.withdrawalRequests.unshift(withdrawalRequest); // Add to beginning of array
      });

      // Get provider (all validation is handled at the provider level)
      const provider = this.getActiveProvider();
      DevLogger.log('PerpsController: DELEGATING TO PROVIDER', {
        provider: this.state.activeProvider,
        providerReady: !!provider,
      });

      // Execute withdrawal through provider
      const result = await provider.withdraw(params);

      DevLogger.log('PerpsController: WITHDRAWAL RESULT', {
        success: result.success,
        error: result.error,
        txHash: result.txHash,
        timestamp: new Date().toISOString(),
      });

      // Update state based on result
      if (result.success) {
        this.update((state) => {
          state.lastError = null;
          state.lastUpdateTimestamp = Date.now();
          state.withdrawInProgress = false;
          state.lastWithdrawResult = {
            success: true,
            txHash: result.txHash || '',
            amount: params.amount,
            asset: USDC_SYMBOL, // Default asset for withdrawals
            timestamp: Date.now(),
            error: '',
          };

          // Update the withdrawal request by request ID to avoid race conditions
          if (state.withdrawalRequests.length > 0) {
            const requestToUpdate = state.withdrawalRequests.find(
              (req) => req.id === currentWithdrawalId,
            );
            if (requestToUpdate) {
              // Set status based on success and txHash availability
              if (result.txHash) {
                requestToUpdate.status = 'completed' as TransactionStatus;
                requestToUpdate.success = true;
                requestToUpdate.txHash = result.txHash;
              } else {
                // Success but no txHash means it's bridging
                requestToUpdate.status = 'bridging' as TransactionStatus;
                requestToUpdate.success = true;
              }
              // Always update withdrawal ID if available
              if (result.withdrawalId) {
                requestToUpdate.withdrawalId = result.withdrawalId;
              }
            }
          }
        });

        DevLogger.log('PerpsController: WITHDRAWAL SUCCESSFUL', {
          txHash: result.txHash,
          amount: params.amount,
          assetId: params.assetId,
          withdrawalId: result.withdrawalId,
        });

        // Track withdrawal transaction executed
        const completionDuration = performance.now() - startTime;
        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PERPS_WITHDRAWAL_TRANSACTION,
          )
            .addProperties({
              [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
              [PerpsEventProperties.WITHDRAWAL_AMOUNT]: params.amount,
              [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
            })
            .build(),
        );

        // Note: The withdrawal result will be cleared by usePerpsWithdrawStatus hook
        // after showing the appropriate toast messages

        // Trigger account state refresh after withdrawal
        this.getAccountState({ source: 'post_withdrawal' }).catch((error) => {
          Logger.error(
            ensureError(error),
            this.getErrorContext('withdraw', {
              operation: 'refreshAccountState',
            }),
          );
        });

        traceData = {
          success: true,
          txHash: result.txHash || '',
          withdrawalId: result.withdrawalId || '',
        };

        return result;
      }

      this.update((state) => {
        state.lastError = result.error || PERPS_ERROR_CODES.WITHDRAW_FAILED;
        state.lastUpdateTimestamp = Date.now();
        state.withdrawInProgress = false;
        state.lastWithdrawResult = {
          success: false,
          error: result.error || PERPS_ERROR_CODES.WITHDRAW_FAILED,
          amount: params.amount,
          asset: USDC_SYMBOL, // Default asset for withdrawals
          timestamp: Date.now(),
          txHash: '',
        };

        // Update the withdrawal request by request ID to avoid race conditions
        if (state.withdrawalRequests.length > 0) {
          const requestToUpdate = state.withdrawalRequests.find(
            (req) => req.id === currentWithdrawalId,
          );
          if (requestToUpdate) {
            requestToUpdate.status = 'failed' as TransactionStatus;
            requestToUpdate.success = false;
          }
        }
      });

      DevLogger.log('PerpsController: WITHDRAWAL FAILED', {
        error: result.error,
        params,
      });

      // Track withdrawal transaction failed
      const completionDuration = performance.now() - startTime;
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_WITHDRAWAL_TRANSACTION,
        )
          .addProperties({
            [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
            [PerpsEventProperties.WITHDRAWAL_AMOUNT]: params.amount,
            [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
            [PerpsEventProperties.ERROR_MESSAGE]:
              result.error || 'Unknown error',
          })
          .build(),
      );

      traceData = {
        success: false,
        error: result.error || 'Unknown error',
      };

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.WITHDRAW_FAILED;

      Logger.error(
        ensureError(error),
        this.getErrorContext('withdraw', {
          assetId: params.assetId,
          amount: params.amount,
        }),
      );

      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
        state.withdrawInProgress = false;
        state.lastWithdrawResult = {
          success: false,
          error: errorMessage,
          amount: '0', // Unknown amount for pre-confirmation errors
          asset: USDC_SYMBOL, // Default asset for withdrawals
          timestamp: Date.now(),
          txHash: '',
        };

        // Update the withdrawal request by request ID to avoid race conditions
        if (state.withdrawalRequests.length > 0) {
          const requestToUpdate = state.withdrawalRequests.find(
            (req) => req.id === currentWithdrawalId,
          );
          if (requestToUpdate) {
            requestToUpdate.status = 'failed' as TransactionStatus;
            requestToUpdate.success = false;
          }
        }
      });

      // Track withdrawal transaction failed (catch block)
      const completionDuration = performance.now() - startTime;
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_WITHDRAWAL_TRANSACTION,
        )
          .addProperties({
            [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
            [PerpsEventProperties.WITHDRAWAL_AMOUNT]: params.amount,
            [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
            [PerpsEventProperties.ERROR_MESSAGE]: errorMessage,
          })
          .build(),
      );

      traceData = {
        success: false,
        error: errorMessage,
      };

      return { success: false, error: errorMessage };
    } finally {
      endTrace({
        name: TraceName.PerpsWithdraw,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get current positions
   */
  async getPositions(params?: GetPositionsParams): Promise<Position[]> {
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsGetPositions,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: this.state.activeProvider,
          isTestnet: this.state.isTestnet,
        },
      });

      const provider = this.getActiveProvider();
      const positions = await provider.getPositions(params);

      // Only update state if the provider call succeeded
      this.update((state) => {
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null; // Clear any previous errors
      });

      traceData = { success: true };
      return positions;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.POSITIONS_FAILED;

      Logger.error(ensureError(error), this.getErrorContext('getPositions'));

      // Update error state but don't modify positions (keep existing data)
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      traceData = {
        success: false,
        error: errorMessage,
      };

      // Re-throw the error so components can handle it appropriately
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsGetPositions,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get historical user fills (trade executions)
   */
  async getOrderFills(params?: GetOrderFillsParams): Promise<OrderFill[]> {
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsOrderFillsFetch,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: this.state.activeProvider,
          isTestnet: this.state.isTestnet,
        },
      });

      const provider = this.getActiveProvider();
      const result = await provider.getOrderFills(params);

      traceData = { success: true };
      return result;
    } catch (error) {
      Logger.error(ensureError(error), this.getErrorContext('getOrderFills'));

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsOrderFillsFetch,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get historical user orders (order lifecycle)
   */
  async getOrders(params?: GetOrdersParams): Promise<Order[]> {
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsOrdersFetch,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: this.state.activeProvider,
          isTestnet: this.state.isTestnet,
        },
      });

      const provider = this.getActiveProvider();
      const result = await provider.getOrders(params);

      traceData = { success: true };
      return result;
    } catch (error) {
      Logger.error(ensureError(error), this.getErrorContext('getOrders'));

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsOrdersFetch,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get currently open orders (real-time status)
   */
  async getOpenOrders(params?: GetOrdersParams): Promise<Order[]> {
    const traceId = uuidv4();
    const startTime = performance.now();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      const traceSpan = trace({
        name: TraceName.PerpsOrdersFetch,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: this.state.activeProvider,
          isTestnet: this.state.isTestnet,
        },
      });

      const provider = this.getActiveProvider();
      const result = await provider.getOpenOrders(params);

      const completionDuration = performance.now() - startTime;
      setMeasurement(
        PerpsMeasurementName.PERPS_GET_OPEN_ORDERS_OPERATION,
        completionDuration,
        'millisecond',
        traceSpan,
      );

      traceData = { success: true };
      return result;
    } catch (error) {
      Logger.error(ensureError(error), this.getErrorContext('getOpenOrders'));

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsOrdersFetch,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get historical user funding history (funding payments)
   */
  async getFunding(params?: GetFundingParams): Promise<Funding[]> {
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsFundingFetch,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: this.state.activeProvider,
          isTestnet: this.state.isTestnet,
        },
      });

      const provider = this.getActiveProvider();
      const result = await provider.getFunding(params);

      traceData = { success: true };
      return result;
    } catch (error) {
      Logger.error(ensureError(error), this.getErrorContext('getFunding'));

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsFundingFetch,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get account state (balances, etc.)
   */
  async getAccountState(params?: GetAccountStateParams): Promise<AccountState> {
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsGetAccountState,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: this.state.activeProvider,
          isTestnet: this.state.isTestnet,
          source: params?.source || 'unknown',
        },
      });

      const provider = this.getActiveProvider();

      // Get both current account state and historical portfolio data
      const [accountState, historicalPortfolio] = await Promise.all([
        provider.getAccountState(params),
        provider.getHistoricalPortfolio(params).catch((error) => {
          Logger.error(
            ensureError(error),
            this.getErrorContext('getAccountState', {
              operation: 'getHistoricalPortfolio',
            }),
          );
        }),
      ]);

      // Add safety check for accountState to prevent TypeError
      if (!accountState) {
        const error = new Error(
          'Failed to get account state: received null/undefined response',
        );

        // Track null account state errors in Sentry for API monitoring
        Logger.error(
          ensureError(error),
          this.getErrorContext('getAccountState', {
            operation: 'nullAccountStateCheck',
          }),
        );

        throw error;
      }

      // fallback to the current account total value if possible
      const historicalPortfolioToUse: HistoricalPortfolioResult =
        historicalPortfolio ?? {
          accountValue1dAgo: accountState.totalBalance || '0',
          timestamp: 0,
        };

      // Only update state if the provider call succeeded
      DevLogger.log(
        'PerpsController: Updating Redux store with accountState and historical data:',
        { accountState, historicalPortfolio: historicalPortfolioToUse },
      );

      this.update((state) => {
        state.accountState = accountState;
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null; // Clear any previous errors
      });
      DevLogger.log('PerpsController: Redux store updated successfully');

      traceData = { success: true };
      return accountState;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.ACCOUNT_STATE_FAILED;

      // Update error state but don't modify accountState (keep existing data)
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      traceData = {
        success: false,
        error: errorMessage,
      };

      // Re-throw the error so components can handle it appropriately
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsGetAccountState,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get historical portfolio data for percentage calculations
   */
  async getHistoricalPortfolio(
    params?: GetHistoricalPortfolioParams,
  ): Promise<HistoricalPortfolioResult> {
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsGetHistoricalPortfolio,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: this.state.activeProvider,
          isTestnet: this.state.isTestnet,
        },
      });

      const provider = this.getActiveProvider();
      const result = await provider.getHistoricalPortfolio(params);

      // Return the result without storing it in state
      // Historical data can be fetched when needed

      traceData = { success: true };
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to get historical portfolio';

      Logger.error(
        ensureError(error),
        this.getErrorContext('getHistoricalPortfolio'),
      );

      // Update error state
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      traceData = {
        success: false,
        error: errorMessage,
      };

      // Re-throw the error so components can handle it appropriately
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsGetHistoricalPortfolio,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get available markets with optional filtering
   * Delegates to provider which handles all multi-DEX logic transparently
   * @param params - Optional parameters for filtering (symbols, dex)
   */
  async getMarkets(params?: {
    symbols?: string[];
    dex?: string;
  }): Promise<MarketInfo[]> {
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsGetMarkets,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: this.state.activeProvider,
          isTestnet: this.state.isTestnet,
          ...(params?.symbols && { symbolCount: params.symbols.length }),
          ...(params?.dex !== undefined && { dex: params.dex }),
        },
      });

      const provider = this.getActiveProvider();
      const markets = await provider.getMarkets(params);

      // Clear any previous errors on successful call
      this.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });

      traceData = { success: true };
      return markets;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.MARKETS_FAILED;

      Logger.error(ensureError(error), this.getErrorContext('getMarkets'));

      // Update error state
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      traceData = {
        success: false,
        error: errorMessage,
      };

      // Re-throw the error so components can handle it appropriately
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsGetMarkets,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get list of available HIP-3 builder-deployed DEXs
   * @param params - Optional parameters for filtering
   * @returns Array of DEX names
   */
  async getAvailableDexs(params?: GetAvailableDexsParams): Promise<string[]> {
    const provider = this.getActiveProvider();

    if (!provider.getAvailableDexs) {
      throw new Error('Provider does not support HIP-3 DEXs');
    }

    return provider.getAvailableDexs(params);
  }

  /**
   * Fetch historical candle data
   */
  async fetchHistoricalCandles(
    coin: string,
    interval: CandlePeriod,
    limit: number = 100,
  ): Promise<CandleData> {
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsFetchHistoricalCandles,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: this.state.activeProvider,
          isTestnet: this.state.isTestnet,
          coin,
          interval,
        },
      });

      const provider = this.getActiveProvider() as IPerpsProvider & {
        clientService?: {
          fetchHistoricalCandles: (
            coin: string,
            interval: CandlePeriod,
            limit: number,
          ) => Promise<CandleData>;
        };
      };

      // Check if provider has a client service with fetchHistoricalCandles
      if (provider.clientService?.fetchHistoricalCandles) {
        const result = await provider.clientService.fetchHistoricalCandles(
          coin,
          interval,
          limit,
        );

        traceData = { success: true };
        return result;
      }

      // Fallback: throw error if method not available
      throw new Error('Historical candles not supported by current provider');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch historical candles';

      Logger.error(
        ensureError(error),
        this.getErrorContext('fetchHistoricalCandles', {
          coin,
          interval,
          limit,
        }),
      );

      // Update error state
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      traceData = {
        success: false,
        error: errorMessage,
      };

      // Re-throw the error so components can handle it appropriately
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsFetchHistoricalCandles,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Calculate liquidation price for a position
   * Uses provider-specific formulas based on protocol rules
   */
  async calculateLiquidationPrice(
    params: LiquidationPriceParams,
  ): Promise<string> {
    const provider = this.getActiveProvider();
    return provider.calculateLiquidationPrice(params);
  }

  /**
   * Calculate maintenance margin for a specific asset
   * Returns a percentage (e.g., 0.0125 for 1.25%)
   */
  async calculateMaintenanceMargin(
    params: MaintenanceMarginParams,
  ): Promise<number> {
    const provider = this.getActiveProvider();
    return provider.calculateMaintenanceMargin(params);
  }

  /**
   * Get maximum leverage allowed for an asset
   */
  async getMaxLeverage(asset: string): Promise<number> {
    const provider = this.getActiveProvider();
    return provider.getMaxLeverage(asset);
  }

  /**
   * Validate order parameters according to protocol-specific rules
   */
  async validateOrder(
    params: OrderParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const provider = this.getActiveProvider();
    return provider.validateOrder(params);
  }

  /**
   * Validate close position parameters according to protocol-specific rules
   */
  async validateClosePosition(
    params: ClosePositionParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const provider = this.getActiveProvider();
    return provider.validateClosePosition(params);
  }

  /**
   * Validate withdrawal parameters according to protocol-specific rules
   */
  async validateWithdrawal(
    params: WithdrawParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const provider = this.getActiveProvider();
    return provider.validateWithdrawal(params);
  }

  /**
   * Get supported withdrawal routes - returns complete asset and routing information
   */
  getWithdrawalRoutes(): AssetRoute[] {
    try {
      const provider = this.getActiveProvider();
      return provider.getWithdrawalRoutes();
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
    return provider.calculateFees(params);
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
  async #fetchGeoLocation(): Promise<string> {
    // Check cache first
    if (this.geoLocationCache) {
      const cacheAge = Date.now() - this.geoLocationCache.timestamp;
      if (cacheAge < this.GEO_CACHE_TTL_MS) {
        DevLogger.log('PerpsController: Using cached geo location', {
          location: this.geoLocationCache.location,
          cacheAge: `${(cacheAge / 1000).toFixed(1)}s`,
        });
        return this.geoLocationCache.location;
      }
    }

    // If already fetching, return the existing promise
    if (this.geoLocationFetchPromise) {
      DevLogger.log(
        'PerpsController: Geo location fetch already in progress, waiting...',
      );
      return this.geoLocationFetchPromise;
    }

    // Start new fetch
    this.geoLocationFetchPromise = this.#performGeoLocationFetch();

    try {
      const location = await this.geoLocationFetchPromise;
      return location;
    } finally {
      // Clear the promise after completion (success or failure)
      this.geoLocationFetchPromise = null;
    }
  }

  /**
   * Perform the actual geo location fetch
   * Separated to allow proper promise management
   */
  async #performGeoLocationFetch(): Promise<string> {
    let location = 'UNKNOWN';

    try {
      const environment = getEnvironment();

      DevLogger.log('PerpsController: Fetching geo location from API', {
        environment,
      });

      const response = await successfulFetch(
        ON_RAMP_GEO_BLOCKING_URLS[environment],
      );

      const textResult = await response?.text();
      location = textResult || 'UNKNOWN';

      // Cache the successful result
      this.geoLocationCache = {
        location,
        timestamp: Date.now(),
      };

      DevLogger.log('PerpsController: Geo location fetched successfully', {
        location,
      });

      return location;
    } catch (e) {
      Logger.error(
        ensureError(e),
        this.getErrorContext('performGeoLocationFetch'),
      );
      // Don't cache failures
      return location;
    }
  }

  /**
   * Refresh eligibility status
   */
  async refreshEligibility(): Promise<void> {
    // Default to false in case of error.
    let isEligible = true;

    try {
      DevLogger.log('PerpsController: Refreshing eligibility');

      // Returns UNKNOWN if we can't fetch the geo location
      const geoLocation = await this.#fetchGeoLocation();

      // Only set to eligible if we have valid geolocation and it's not blocked
      if (geoLocation !== 'UNKNOWN') {
        isEligible = this.blockedRegionList.list.every(
          (geoBlockedRegion) => !geoLocation.startsWith(geoBlockedRegion),
        );
      }
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('refreshEligibility'),
      );
    } finally {
      this.update((state) => {
        state.isEligible = isEligible;
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
    return provider.getBlockExplorerUrl(address);
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

      state.tradeConfigurations[network][coin] = {
        leverage,
      };
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
   */
  private async reportOrderToDataLake(params: {
    action: 'open' | 'close';
    coin: string;
    sl_price?: number;
    tp_price?: number;
    retryCount?: number;
    _traceId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    // Skip data lake reporting for testnet as the API doesn't handle testnet data
    const isTestnet = this.state.isTestnet;
    if (isTestnet) {
      DevLogger.log('DataLake API: Skipping for testnet', {
        action: params.action,
        coin: params.coin,
        network: 'testnet',
      });
      return { success: true, error: 'Skipped for testnet' };
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;
    const {
      action,
      coin,
      sl_price,
      tp_price,
      retryCount = 0,
      _traceId,
    } = params;

    // Generate trace ID once on first call
    const traceId = _traceId || uuidv4();

    // Start trace only on first attempt
    let traceSpan: Span | undefined;
    if (retryCount === 0) {
      traceSpan = trace({
        name: TraceName.PerpsDataLakeReport,
        op: TraceOperation.PerpsOperation,
        id: traceId,
        tags: {
          action,
          coin,
        },
      });
    }

    // Log the attempt
    DevLogger.log('DataLake API: Starting order report', {
      action,
      coin,
      attempt: retryCount + 1,
      maxAttempts: MAX_RETRIES + 1,
      hasStopLoss: !!sl_price,
      hasTakeProfit: !!tp_price,
      timestamp: new Date().toISOString(),
    });

    const apiCallStartTime = performance.now();

    try {
      const token = await this.messenger.call(
        'AuthenticationController:getBearerToken',
      );
      const evmAccount = getEvmAccountFromSelectedAccountGroup();

      if (!evmAccount || !token) {
        DevLogger.log('DataLake API: Missing requirements', {
          hasAccount: !!evmAccount,
          hasToken: !!token,
          action,
          coin,
        });
        return { success: false, error: 'No account or token available' };
      }

      const response = await fetch(DATA_LAKE_API_CONFIG.ORDERS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: evmAccount.address,
          coin,
          sl_price,
          tp_price,
        }),
      });

      if (!response.ok) {
        throw new Error(`DataLake API error: ${response.status}`);
      }

      // Consume response body (might be empty for 201, but good to check)
      const responseBody = await response.text();

      const apiCallDuration = performance.now() - apiCallStartTime;

      // Add measurement to trace if span exists
      if (traceSpan) {
        setMeasurement(
          PerpsMeasurementName.PERPS_DATA_LAKE_API_CALL,
          apiCallDuration,
          'millisecond',
          traceSpan,
        );
      }

      // Success logging
      DevLogger.log('DataLake API: Order reported successfully', {
        action,
        coin,
        status: response.status,
        attempt: retryCount + 1,
        responseBody: responseBody || 'empty',
        duration: `${apiCallDuration.toFixed(0)}ms`,
      });

      // End trace on success
      endTrace({
        name: TraceName.PerpsDataLakeReport,
        id: traceId,
        data: {
          success: true,
          retries: retryCount,
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      Logger.error(
        ensureError(error),
        this.getErrorContext('reportOrderToDataLake', {
          action,
          coin,
          retryCount,
          willRetry: retryCount < MAX_RETRIES,
        }),
      );

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        const retryDelay = RETRY_DELAY_MS * Math.pow(2, retryCount);
        DevLogger.log('DataLake API: Scheduling retry', {
          retryIn: `${retryDelay}ms`,
          nextAttempt: retryCount + 2,
          action,
          coin,
        });

        setTimeout(() => {
          this.reportOrderToDataLake({
            action,
            coin,
            sl_price,
            tp_price,
            retryCount: retryCount + 1,
            _traceId: traceId,
          }).catch((err) => {
            Logger.error(
              ensureError(err),
              this.getErrorContext('reportOrderToDataLake', {
                operation: 'retry',
                retryCount: retryCount + 1,
                action,
                coin,
              }),
            );
          });
        }, retryDelay);

        return { success: false, error: errorMessage };
      }

      endTrace({
        name: TraceName.PerpsDataLakeReport,
        id: traceId,
        data: {
          success: false,
          error: errorMessage,
          totalRetries: retryCount,
        },
      });

      Logger.error(
        ensureError(error),
        this.getErrorContext('reportOrderToDataLake', {
          operation: 'finalFailure',
          action,
          coin,
          retryCount,
        }),
      );

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if the controller is currently reinitializing
   * @returns true if providers are being reinitialized
   */
  public isCurrentlyReinitializing(): boolean {
    return this.isReinitializing;
  }
}
