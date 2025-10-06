import {
  BaseController,
  type RestrictedMessenger,
} from '@metamask/base-controller';
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
import { parseCaipAssetId, type Hex } from '@metamask/utils';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import type { Span } from '@sentry/core';
import { v4 as uuidv4 } from 'uuid';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
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
import type { CandleData } from '../types';
import { CandlePeriod } from '../constants/chartConfig';
import { PerpsMeasurementName } from '../constants/performanceMetrics';
import {
  DATA_LAKE_API_CONFIG,
  PERPS_CONSTANTS,
} from '../constants/perpsConfig';
import { HyperLiquidProvider } from './providers/HyperLiquidProvider';
import type {
  AccountState,
  AssetRoute,
  CancelOrderParams,
  CancelOrderResult,
  ClosePositionParams,
  EditOrderParams,
  FeeCalculationResult,
  Funding,
  GetAccountStateParams,
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
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import type { RemoteFeatureFlagControllerStateChangeEvent } from '@metamask/remote-feature-flag-controller/dist/remote-feature-flag-controller.d.cts';

// Simple wait utility
const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Error codes for PerpsController
 * These codes are returned to the UI layer for translation
 */
export const PERPS_ERROR_CODES = {
  CLIENT_NOT_INITIALIZED: 'CLIENT_NOT_INITIALIZED',
  CLIENT_REINITIALIZING: 'CLIENT_REINITIALIZING',
  PROVIDER_NOT_AVAILABLE: 'PROVIDER_NOT_AVAILABLE',
  TOKEN_NOT_SUPPORTED: 'TOKEN_NOT_SUPPORTED',
  BRIDGE_CONTRACT_NOT_FOUND: 'BRIDGE_CONTRACT_NOT_FOUND',
  WITHDRAW_FAILED: 'WITHDRAW_FAILED',
  POSITIONS_FAILED: 'POSITIONS_FAILED',
  ACCOUNT_STATE_FAILED: 'ACCOUNT_STATE_FAILED',
  MARKETS_FAILED: 'MARKETS_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  // Provider-agnostic order errors
  ORDER_LEVERAGE_REDUCTION_FAILED: 'ORDER_LEVERAGE_REDUCTION_FAILED',
} as const;

export type PerpsErrorCode =
  (typeof PERPS_ERROR_CODES)[keyof typeof PERPS_ERROR_CODES];

const ON_RAMP_GEO_BLOCKING_URLS = {
  DEV: 'https://on-ramp.dev-api.cx.metamask.io/geolocation',
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

  // Account data (persisted) - using HyperLiquid property names
  accountState: AccountState | null;

  // Current positions
  positions: Position[];

  // Perps balances per provider for portfolio display (historical data)
  perpsBalances: {
    [provider: string]: {
      totalValue: string; // Current total account value (cash + positions) in USD
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
  lastDepositResult: {
    success: boolean;
    txHash?: string;
    error?: string;
  } | null;

  // Simple withdrawal state (transient, for UI feedback)
  withdrawInProgress: boolean;
  lastWithdrawResult: {
    success: boolean;
    txHash?: string;
    amount?: string;
    error?: string;
  } | null;

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

  // Error handling
  lastError: string | null;
  lastUpdateTimestamp: number;
};

/**
 * Get default PerpsController state
 */
export const getDefaultPerpsControllerState = (): PerpsControllerState => ({
  activeProvider: 'hyperliquid',
  isTestnet: __DEV__, // Default to testnet in dev
  connectionStatus: 'disconnected',
  accountState: null,
  positions: [],
  perpsBalances: {},
  pendingOrders: [],
  depositInProgress: false,
  lastDepositResult: null,
  withdrawInProgress: false,
  lastDepositTransactionId: null,
  lastWithdrawResult: null,
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
});

/**
 * State metadata for the PerpsController
 */
const metadata = {
  accountState: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  positions: {
    includeInStateLogs: true,
    persist: false,
    anonymous: false,
    usedInUi: true,
  },
  perpsBalances: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  isTestnet: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  activeProvider: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  connectionStatus: {
    includeInStateLogs: true,
    persist: false,
    anonymous: false,
    usedInUi: true,
  },
  pendingOrders: {
    includeInStateLogs: true,
    persist: false,
    anonymous: false,
    usedInUi: false,
  },
  depositInProgress: {
    includeInStateLogs: true,
    persist: false,
    anonymous: false,
    usedInUi: true,
  },
  lastDepositTransactionId: {
    includeInStateLogs: true,
    persist: false,
    anonymous: false,
    usedInUi: true,
  },
  lastDepositResult: {
    includeInStateLogs: true,
    persist: false,
    anonymous: false,
    usedInUi: true,
  },
  withdrawInProgress: {
    includeInStateLogs: true,
    persist: false,
    anonymous: false,
    usedInUi: true,
  },
  lastWithdrawResult: {
    includeInStateLogs: true,
    persist: false,
    anonymous: false,
    usedInUi: true,
  },
  lastError: {
    includeInStateLogs: false,
    persist: false,
    anonymous: false,
    usedInUi: false,
  },
  lastUpdateTimestamp: {
    includeInStateLogs: true,
    persist: false,
    anonymous: false,
    usedInUi: false,
  },
  isEligible: {
    includeInStateLogs: true,
    persist: false,
    anonymous: false,
    usedInUi: true,
  },
  isFirstTimeUser: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  hasPlacedFirstOrder: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
};

/**
 * PerpsController events
 */
export interface PerpsControllerEvents {
  type: 'PerpsController:stateChange';
  payload: [PerpsControllerState, PerpsControllerState[]];
}

/**
 * PerpsController actions
 */
export type PerpsControllerActions =
  | {
      type: 'PerpsController:getState';
      handler: () => PerpsControllerState;
    }
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
      type: 'PerpsController:closePosition';
      handler: PerpsController['closePosition'];
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
    };

/**
 * External actions the PerpsController can call
 */
export type AllowedActions =
  | NetworkControllerGetStateAction
  | AuthenticationController.AuthenticationControllerGetBearerToken;

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
export type PerpsControllerMessenger = RestrictedMessenger<
  'PerpsController',
  PerpsControllerActions | AllowedActions,
  PerpsControllerEvents | AllowedEvents,
  AllowedActions['type'],
  AllowedEvents['type']
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

  constructor({
    messenger,
    state = {},
    clientConfig = { fallbackBlockedRegions: [] },
  }: PerpsControllerOptions) {
    super({
      name: 'PerpsController',
      metadata,
      messenger,
      state: { ...getDefaultPerpsControllerState(), ...state },
    });

    // Immediately set the fallback region list since RemoteFeatureFlagController is empty by default and takes a moment to populate.
    this.setBlockedRegionList(
      clientConfig.fallbackBlockedRegions ?? [],
      'fallback',
    );

    // RemoteFeatureFlagController state is empty by default so we must wait for it to be populated.
    this.messagingSystem.subscribe(
      'RemoteFeatureFlagController:stateChange',
      this.refreshEligibilityOnFeatureFlagChange.bind(this),
    );

    this.providers = new Map();

    this.initializeProviders().catch((error) => {
      Logger.error(error as Error, {
        message: 'PerpsController: Error initializing providers',
        context: 'PerpsController.constructor',
        timestamp: new Date().toISOString(),
      });
    });
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
      Logger.error(error as Error, 'Error refreshing eligibility');
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
      remoteFeatureFlagControllerState.remoteFeatureFlags
        ?.perpsPerpTradingGeoBlockedCountries;

    const remoteBlockedRegions = (
      perpsGeoBlockedRegionsFeatureFlag as { blockedRegions?: string[] }
    )?.blockedRegions;

    if (Array.isArray(remoteBlockedRegions)) {
      this.setBlockedRegionList(remoteBlockedRegions, 'remote');
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
          ? (trace({
              name: TraceName.PerpsRewardsAPICall,
              id: traceId,
              op: TraceOperation.PerpsOperation,
            }) as Span)
          : undefined);

      if (!traceSpan) {
        // Should never happen, but guard against it
        return undefined;
      }

      const { RewardsController, NetworkController } = Engine.context;
      const evmAccount = getEvmAccountFromSelectedAccountGroup();

      if (!evmAccount) {
        DevLogger.log('PerpsController: No EVM account found for fee discount');
        return undefined;
      }

      // Get the chain ID using proper NetworkController method
      const networkState = this.messagingSystem.call(
        'NetworkController:getState',
      );
      const selectedNetworkClientId = networkState.selectedNetworkClientId;
      const networkClient = NetworkController.getNetworkClientById(
        selectedNetworkClientId,
      );
      const chainId = networkClient?.configuration?.chainId;

      if (!chainId) {
        Logger.error(
          new Error('Chain ID not found for fee discount calculation'),
          {
            message:
              'PerpsController: Missing chain ID prevents reward discount calculation',
            context: 'PerpsController.calculateUserFeeDiscount',
            selectedNetworkClientId,
            networkClientExists: !!networkClient,
          },
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
          {
            message:
              'PerpsController: CAIP account ID formatting failed, preventing reward discount calculation',
            context: 'PerpsController.calculateUserFeeDiscount',
            address: evmAccount.address,
            chainId,
            selectedNetworkClientId,
          },
        );
        return undefined;
      }

      const orderExecutionFeeDiscountStartTime = performance.now();
      const discountBips = await RewardsController.getPerpsDiscountForAccount(
        caipAccountId,
      );
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
      Logger.error(error as Error, {
        message: 'PerpsController: Fee discount calculation failed',
        context: 'PerpsController.calculateUserFeeDiscount',
      });

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
  async initializeProviders(): Promise<void> {
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
   * Actual initialization implementation
   */
  private async performInitialization(): Promise<void> {
    DevLogger.log('PerpsController: Initializing providers', {
      currentNetwork: this.state.isTestnet ? 'testnet' : 'mainnet',
      existingProviders: Array.from(this.providers.keys()),
      timestamp: new Date().toISOString(),
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
    this.providers.set(
      'hyperliquid',
      new HyperLiquidProvider({ isTestnet: this.state.isTestnet }),
    );

    // Future providers can be added here with their own authentication patterns:
    // - Some might use API keys: new BinanceProvider({ apiKey, apiSecret })
    // - Some might use different wallet patterns: new GMXProvider({ signer })
    // - Some might not need auth at all: new DydxProvider()

    // Wait for WebSocket transport to be ready before marking as initialized
    await wait(PERPS_CONSTANTS.RECONNECTION_CLEANUP_DELAY_MS);

    this.isInitialized = true;
    DevLogger.log('PerpsController: Providers initialized successfully', {
      providerCount: this.providers.size,
      activeProvider: this.state.activeProvider,
      timestamp: new Date().toISOString(),
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
    if (!this.isInitialized) {
      this.update((state) => {
        state.lastError = PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED;
        state.lastUpdateTimestamp = Date.now();
      });
      throw new Error(PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED);
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
      }) as Span;
      const provider = this.getActiveProvider();

      // Calculate fee discount at execution time (fresh, secure)
      const feeDiscountBips = await this.calculateUserFeeDiscount(traceSpan);

      // Set discount context in provider for this order
      if (feeDiscountBips !== undefined && provider.setUserFeeDiscount) {
        provider.setUserFeeDiscount(feeDiscountBips);
      }

      // Optimistic update - exclude trackingData to avoid persisting analytics data
      const { trackingData, ...orderWithoutTracking } = params;
      this.update((state) => {
        state.pendingOrders.push(orderWithoutTracking);
      });

      let result: OrderResult;
      try {
        result = await provider.placeOrder(params);
      } finally {
        // Always clear discount context, even on exception
        if (provider.setUserFeeDiscount) {
          provider.setUserFeeDiscount(undefined);
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
            error as Error,
            'Error reporting open order to data lake',
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
        Logger.error(cleanupError as Error, {
          message:
            'PerpsController: Failed to clear fee discount during error cleanup',
          context: 'PerpsController.placeOrder',
        });
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
      trace({
        name: TraceName.PerpsClosePosition,
        id: traceId,
        op: TraceOperation.PerpsPositionManagement,
        startTime: Date.now(),
        parentContext: null,
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
        );
      } catch (err) {
        DevLogger.log(
          'PerpsController: Could not get position data for tracking',
          err,
        );
      }

      const provider = this.getActiveProvider();
      const result = await provider.closePosition(params);
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
            error as Error,
            'Error reporting close order to data lake',
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
        timestamp: Date.now(),
        data: traceData,
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
      }) as Span;

      const provider = this.getActiveProvider();

      // Get fee discount from rewards
      const feeDiscountBips = await this.calculateUserFeeDiscount(traceSpan);

      // Set discount context in provider for this operation
      if (feeDiscountBips !== undefined && provider.setUserFeeDiscount) {
        provider.setUserFeeDiscount(feeDiscountBips);
      }

      let result: OrderResult;
      try {
        result = await provider.updatePositionTPSL(params);
      } finally {
        // Always clear discount context, even on exception
        if (provider.setUserFeeDiscount) {
          provider.setUserFeeDiscount(undefined);
        }
      }

      const completionDuration = performance.now() - startTime;

      if (result.success) {
        this.update((state) => {
          state.lastUpdateTimestamp = Date.now();
        });

        // Track TP/SL update executed - ONE event with both properties
        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PERPS_RISK_MANAGEMENT,
          )
            .addProperties({
              [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
              [PerpsEventProperties.ASSET]: params.coin,
              [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
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
            })
            .build(),
        );

        traceData = { success: true };
      } else {
        // Track TP/SL update failed - ONE event with both properties
        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PERPS_RISK_MANAGEMENT,
          )
            .addProperties({
              [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
              [PerpsEventProperties.ASSET]: params.coin,
              [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
              [PerpsEventProperties.ERROR_MESSAGE]:
                result.error || 'Unknown error',
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
            })
            .build(),
        );

        traceData = { success: false, error: result.error || 'Unknown error' };
      }

      return result;
    } catch (error) {
      const completionDuration = performance.now() - startTime;

      // Track TP/SL update exception
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_RISK_MANAGEMENT,
        )
          .addProperties({
            [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
            [PerpsEventProperties.ASSET]: params.coin,
            [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
            [PerpsEventProperties.ERROR_MESSAGE]:
              error instanceof Error ? error.message : 'Unknown error',
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
  async depositWithConfirmation() {
    const { NetworkController, TransactionController } = Engine.context;

    try {
      // Clear any stale results when starting a new deposit flow
      // Don't set depositInProgress yet - wait until user confirms
      this.update((state) => {
        state.lastDepositResult = null;
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

      // Store the transaction ID
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
            };
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
              };
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
          state.lastDepositResult = {
            success: false,
            error: errorMessage,
          };
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
    const startTime = performance.now();

    trace({
      name: TraceName.PerpsWithdraw,
      op: TraceOperation.PerpsOperation,
      tags: {
        assetId: params.assetId || '',
        provider: this.state.activeProvider,
        isTestnet: this.state.isTestnet,
      },
    });

    try {
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
            txHash: result.txHash,
            amount: params.amount,
          };
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
        this.getAccountState().catch((error) => {
          Logger.error(error as Error, {
            message: '⚠️ PerpsController: Failed to refresh after withdrawal',
            context: 'PerpsController.withdraw',
          });
        });

        endTrace({
          name: TraceName.PerpsWithdraw,
          data: {
            success: true,
            txHash: result.txHash || '',
            withdrawalId: result.withdrawalId || '',
          },
        });

        return result;
      }

      this.update((state) => {
        state.lastError = result.error || PERPS_ERROR_CODES.WITHDRAW_FAILED;
        state.lastUpdateTimestamp = Date.now();
        state.withdrawInProgress = false;
        state.lastWithdrawResult = {
          success: false,
          error: result.error || PERPS_ERROR_CODES.WITHDRAW_FAILED,
        };
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

      endTrace({
        name: TraceName.PerpsWithdraw,
        data: {
          success: false,
          error: result.error || 'Unknown error',
        },
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.WITHDRAW_FAILED;

      Logger.error(error as Error, {
        message: 'PerpsController: WITHDRAWAL EXCEPTION',
        errorMessage,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        params,
      });

      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
        state.withdrawInProgress = false;
        state.lastWithdrawResult = {
          success: false,
          error: errorMessage,
        };
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

      endTrace({
        name: TraceName.PerpsWithdraw,
        data: {
          success: false,
          error: errorMessage,
        },
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get current positions
   */
  async getPositions(params?: GetPositionsParams): Promise<Position[]> {
    const startTime = performance.now();

    try {
      const provider = this.getActiveProvider();
      const positions = await provider.getPositions(params);

      const completionDuration = performance.now() - startTime;

      // Record operation duration as measurement
      setMeasurement(
        PerpsMeasurementName.PERPS_GET_POSITIONS_OPERATION,
        completionDuration,
        'millisecond',
      );

      // Only update state if the provider call succeeded
      this.update((state) => {
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null; // Clear any previous errors
      });

      return positions;
    } catch (error) {
      const completionDuration = performance.now() - startTime;

      // Record operation duration as measurement even on failure
      setMeasurement(
        PerpsMeasurementName.PERPS_GET_POSITIONS_OPERATION,
        completionDuration,
        'millisecond',
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.POSITIONS_FAILED;

      // Update error state but don't modify positions (keep existing data)
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Re-throw the error so components can handle it appropriately
      throw error;
    }
  }

  /**
   * Get historical user fills (trade executions)
   */
  async getOrderFills(params?: GetOrderFillsParams): Promise<OrderFill[]> {
    const startTime = performance.now();
    const provider = this.getActiveProvider();
    const result = await provider.getOrderFills(params);

    const completionDuration = performance.now() - startTime;
    setMeasurement(
      PerpsMeasurementName.PERPS_GET_ORDER_FILLS_OPERATION,
      completionDuration,
      'millisecond',
    );

    return result;
  }

  /**
   * Get historical user orders (order lifecycle)
   */
  async getOrders(params?: GetOrdersParams): Promise<Order[]> {
    const startTime = performance.now();
    const provider = this.getActiveProvider();
    const result = await provider.getOrders(params);

    const completionDuration = performance.now() - startTime;
    setMeasurement(
      PerpsMeasurementName.PERPS_GET_ORDERS_OPERATION,
      completionDuration,
      'millisecond',
    );

    return result;
  }

  /**
   * Get currently open orders (real-time status)
   */
  async getOpenOrders(params?: GetOrdersParams): Promise<Order[]> {
    const startTime = performance.now();
    const provider = this.getActiveProvider();
    const result = await provider.getOpenOrders(params);

    const completionDuration = performance.now() - startTime;
    setMeasurement(
      PerpsMeasurementName.PERPS_GET_OPEN_ORDERS_OPERATION,
      completionDuration,
      'millisecond',
    );

    return result;
  }

  /**
   * Get historical user funding history (funding payments)
   */
  async getFunding(params?: GetFundingParams): Promise<Funding[]> {
    const startTime = performance.now();
    const provider = this.getActiveProvider();
    const result = await provider.getFunding(params);

    const completionDuration = performance.now() - startTime;
    setMeasurement(
      PerpsMeasurementName.PERPS_GET_FUNDING_OPERATION,
      completionDuration,
      'millisecond',
    );

    return result;
  }

  /**
   * Get account state (balances, etc.)
   */
  async getAccountState(params?: GetAccountStateParams): Promise<AccountState> {
    const startTime = performance.now();

    try {
      const provider = this.getActiveProvider();

      // Get both current account state and historical portfolio data
      const [accountState, historicalPortfolio] = await Promise.all([
        provider.getAccountState(params),
        provider.getHistoricalPortfolio(params).catch((error) => {
          Logger.error(error as Error, {
            message:
              'Failed to get historical portfolio, continuing without it',
            context: 'PerpsController.getAccountState',
          });
          return;
        }),
      ]);

      const completionDuration = performance.now() - startTime;

      // Record operation duration as measurement
      setMeasurement(
        PerpsMeasurementName.PERPS_GET_ACCOUNT_STATE_OPERATION,
        completionDuration,
        'millisecond',
      );

      // Add safety check for accountState to prevent TypeError
      if (!accountState) {
        const error = new Error(
          'Failed to get account state: received null/undefined response',
        );

        // Track null account state errors in Sentry for API monitoring
        Logger.error(error, {
          message: 'Received null/undefined account state from provider',
          context: 'PerpsController.getAccountState',
          provider: this.state.activeProvider,
          isTestnet: this.state.isTestnet,
        });

        throw error;
      }

      // fallback to the current account total value if possible
      const historicalPortfolioToUse: HistoricalPortfolioResult =
        historicalPortfolio ?? {
          accountValue1dAgo: accountState.totalValue || '0',
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

      return accountState;
    } catch (error) {
      const completionDuration = performance.now() - startTime;

      // Record operation duration as measurement even on failure
      setMeasurement(
        PerpsMeasurementName.PERPS_GET_ACCOUNT_STATE_OPERATION,
        completionDuration,
        'millisecond',
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.ACCOUNT_STATE_FAILED;

      // Update error state but don't modify accountState (keep existing data)
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Re-throw the error so components can handle it appropriately
      throw error;
    }
  }

  /**
   * Get historical portfolio data for percentage calculations
   */
  async getHistoricalPortfolio(
    params?: GetHistoricalPortfolioParams,
  ): Promise<HistoricalPortfolioResult> {
    const startTime = performance.now();

    try {
      const provider = this.getActiveProvider();
      const result = await provider.getHistoricalPortfolio(params);

      const completionDuration = performance.now() - startTime;
      setMeasurement(
        PerpsMeasurementName.PERPS_GET_HISTORICAL_PORTFOLIO_OPERATION,
        completionDuration,
        'millisecond',
      );

      // Return the result without storing it in state
      // Historical data can be fetched when needed

      return result;
    } catch (error) {
      const completionDuration = performance.now() - startTime;
      setMeasurement(
        PerpsMeasurementName.PERPS_GET_HISTORICAL_PORTFOLIO_OPERATION,
        completionDuration,
        'millisecond',
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to get historical portfolio';

      // Update error state
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Re-throw the error so components can handle it appropriately
      throw error;
    }
  }

  /**
   * Get available markets with optional filtering
   */
  async getMarkets(params?: { symbols?: string[] }): Promise<MarketInfo[]> {
    const startTime = performance.now();

    try {
      const provider = this.getActiveProvider();
      const allMarkets = await provider.getMarkets();

      const completionDuration = performance.now() - startTime;

      // Record operation duration as measurement
      setMeasurement(
        PerpsMeasurementName.PERPS_GET_MARKETS_OPERATION,
        completionDuration,
        'millisecond',
      );

      // Clear any previous errors on successful call
      this.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });

      // Filter by symbols if provided
      if (params?.symbols && params.symbols.length > 0) {
        const filtered = allMarkets.filter((market) =>
          params.symbols?.some(
            (symbol) => market.name.toLowerCase() === symbol.toLowerCase(),
          ),
        );

        return filtered;
      }

      return allMarkets;
    } catch (error) {
      const completionDuration = performance.now() - startTime;

      // Record operation duration as measurement even on failure
      setMeasurement(
        PerpsMeasurementName.PERPS_GET_MARKETS_OPERATION,
        completionDuration,
        'millisecond',
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.MARKETS_FAILED;

      // Update error state
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Re-throw the error so components can handle it appropriately
      throw error;
    }
  }

  /**
   * Fetch historical candle data
   */
  async fetchHistoricalCandles(
    coin: string,
    interval: CandlePeriod,
    limit: number = 100,
  ): Promise<CandleData> {
    try {
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
        return await provider.clientService.fetchHistoricalCandles(
          coin,
          interval,
          limit,
        );
      }

      // Fallback: throw error if method not available
      throw new Error('Historical candles not supported by current provider');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch historical candles';

      // Update error state
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Re-throw the error so components can handle it appropriately
      throw error;
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
      Logger.error(error as Error, {
        message: 'PerpsController: Error getting withdrawal routes',
        context: 'PerpsController.getWithdrawalRoutes',
        timestamp: new Date().toISOString(),
      });
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
      await this.initializeProviders();

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
      Logger.error(error as Error, {
        message: 'PerpsController: Error subscribing to prices',
        context: 'PerpsController.subscribeToPrices',
        timestamp: new Date().toISOString(),
      });
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
      Logger.error(error as Error, {
        message: 'PerpsController: Error subscribing to positions',
        context: 'PerpsController.subscribeToPositions',
        timestamp: new Date().toISOString(),
      });
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
      Logger.error(error as Error, {
        message: 'PerpsController: Error subscribing to order fills',
        context: 'PerpsController.subscribeToOrderFills',
        timestamp: new Date().toISOString(),
      });
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
      Logger.error(error as Error, {
        message: 'PerpsController: Error subscribing to orders',
        context: 'PerpsController.subscribeToOrders',
        timestamp: new Date().toISOString(),
      });
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
      Logger.error(error as Error, {
        message: 'PerpsController: Error subscribing to account',
        context: 'PerpsController.subscribeToAccount',
        timestamp: new Date().toISOString(),
      });
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
      Logger.error(error as Error, {
        message: 'PerpsController: Error setting live data config',
        context: 'PerpsController.setLiveDataConfig',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Calculate trading fees for the active provider
   * Each provider implements its own fee structure
   */
  async calculateFees(params: {
    orderType: 'market' | 'limit';
    isMaker?: boolean;
    amount?: string;
  }): Promise<FeeCalculationResult> {
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
        Logger.error(error as Error, {
          message: 'PerpsController: Error getting provider during disconnect',
          context: 'PerpsController.disconnect',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Reset initialization state to ensure proper reconnection
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Reconnect with new account/network context
   * Called when user switches accounts or networks
   */
  async reconnectWithNewContext(): Promise<void> {
    // Prevent concurrent reinitializations
    if (this.isReinitializing) {
      DevLogger.log('PerpsController: Already reinitializing, waiting...', {
        timestamp: new Date().toISOString(),
      });
      // Wait for the current reinitialization to complete
      if (this.initializationPromise) {
        await this.initializationPromise;
      }
      return;
    }

    this.isReinitializing = true;

    try {
      DevLogger.log('PerpsController: Reconnecting with new account/network', {
        timestamp: new Date().toISOString(),
      });

      // Clear Redux state immediately to reset UI
      this.update((state) => {
        state.accountState = null;
        state.pendingOrders = [];
        state.lastError = null;
      });

      // Clear state and force reinitialization
      // initializeProviders() will handle disconnection if needed
      this.isInitialized = false;
      this.initializationPromise = null;

      // Reinitialize with new context
      await this.initializeProviders();
    } finally {
      this.isReinitializing = false;
    }
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
      Logger.error(e as Error, {
        message: 'PerpsController: Failed to fetch geo location',
        context: 'PerpsController.performGeoLocationFetch',
      });
      // Don't cache failures
      return location;
    }
  }

  /**
   * Refresh eligibility status
   */
  async refreshEligibility(): Promise<void> {
    // Default to false in case of error.
    let isEligible = false;

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
      Logger.error(error as Error, {
        message: 'PerpsController: Eligibility refresh failed',
        context: 'PerpsController.refreshEligibility',
        timestamp: new Date().toISOString(),
      });
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
        startTime: Date.now(),
        parentContext: null,
        tags: {
          action,
          coin,
        },
      }) as Span;
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
      const token = await this.messagingSystem.call(
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
        timestamp: Date.now(),
        data: {
          success: true,
          retries: retryCount,
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      Logger.error(error as Error, {
        message: 'DataLake API: Request failed',
        errorMessage,
        retryCount,
        action,
        coin,
        willRetry: retryCount < MAX_RETRIES,
      });

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
              err as Error,
              'Error reporting retry order to data lake',
            );
          });
        }, retryDelay);

        return { success: false, error: errorMessage };
      }

      endTrace({
        name: TraceName.PerpsDataLakeReport,
        id: traceId,
        timestamp: Date.now(),
        data: {
          success: false,
          error: errorMessage,
          totalRetries: retryCount,
        },
      });

      Logger.error(error as Error, {
        message: 'Failed to report perps order to data lake after retries',
        action,
        coin,
        retryCount,
      });

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
