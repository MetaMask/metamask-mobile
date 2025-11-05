import { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';
import {
  BaseController,
  ControllerGetStateAction,
  ControllerStateChangeEvent,
  StateMetadata,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  PersonalMessageParams,
  SignTypedDataVersion,
  TypedMessageParams,
} from '@metamask/keyring-controller';
import { NetworkControllerGetStateAction } from '@metamask/network-controller';
import {
  TransactionControllerEstimateGasAction,
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerTransactionFailedEvent,
  TransactionControllerTransactionRejectedEvent,
  TransactionControllerTransactionSubmittedEvent,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex, hexToNumber, numberToHex } from '@metamask/utils';
import performance from 'react-native-performance';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Logger, { type LoggerErrorOptions } from '../../../../util/Logger';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import {
  PredictEventProperties,
  PredictEventType,
  PredictEventTypeValue,
} from '../constants/eventNames';
import { PolymarketProvider } from '../providers/polymarket/PolymarketProvider';
import {
  AccountState,
  GetAccountStateParams,
  GetBalanceParams,
  GetMarketsParams,
  GetPositionsParams,
  OrderPreview,
  PlaceOrderParams,
  PredictProvider,
  PrepareDepositParams,
  PrepareWithdrawParams,
  PreviewOrderParams,
  Signer,
} from '../providers/types';
import {
  AcceptAgreementParams,
  ClaimParams,
  GetPriceHistoryParams,
  PredictAccountMeta,
  PredictActivity,
  PredictBalance,
  PredictClaim,
  PredictClaimStatus,
  PredictMarket,
  PredictPosition,
  PredictPriceHistoryPoint,
  PredictWithdraw,
  PredictWithdrawStatus,
  Result,
  Side,
  UnrealizedPnL,
} from '../types';
import { ensureError } from '../utils/predictErrorHandler';
import { PREDICT_CONSTANTS, PREDICT_ERROR_CODES } from '../constants/errors';

/**
 * State shape for PredictController
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictControllerState = {
  // Eligibility (Geo-Blocking) per Provider
  eligibility: { [key: string]: boolean };

  // Error handling
  lastError: string | null;
  lastUpdateTimestamp: number;

  // Account balances
  balances: { [providerId: string]: { [address: string]: PredictBalance } };

  // Claim management
  claimablePositions: { [address: string]: PredictPosition[] };

  // Deposit management
  pendingDeposits: { [providerId: string]: { [address: string]: boolean } };

  // Withdraw management
  // TODO: change to be per-account basis
  withdrawTransaction: PredictWithdraw | null;

  // Persisted data
  accountMeta: {
    [providerId: string]: { [address: string]: PredictAccountMeta };
  };
};

/**
 * Get default PredictController state
 */
export const getDefaultPredictControllerState = (): PredictControllerState => ({
  eligibility: {},
  lastError: null,
  lastUpdateTimestamp: 0,
  balances: {},
  claimablePositions: {},
  pendingDeposits: {},
  withdrawTransaction: null,
  accountMeta: {},
});

/**
 * State metadata for the PredictController
 */
const metadata: StateMetadata<PredictControllerState> = {
  eligibility: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: false,
  },
  lastError: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: false,
  },
  lastUpdateTimestamp: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: false,
  },
  balances: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: false,
  },
  claimablePositions: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
  pendingDeposits: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: false,
  },
  withdrawTransaction: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: false,
  },
  accountMeta: {
    persist: true,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
};

/**
 * PredictController events
 */
export type PredictControllerEvents = ControllerStateChangeEvent<
  'PredictController',
  PredictControllerState
>;

/**
 * PredictController actions
 */
export type PredictControllerActions =
  | ControllerGetStateAction<'PredictController', PredictControllerState>
  | {
      type: 'PredictController:refreshEligibility';
      handler: PredictController['refreshEligibility'];
    }
  | {
      type: 'PredictController:placeOrder';
      handler: PredictController['placeOrder'];
    };

/**
 * External actions the PredictController can call
 */
type AllowedActions =
  | AccountsControllerGetSelectedAccountAction
  | NetworkControllerGetStateAction
  | TransactionControllerEstimateGasAction;

/**
 * External events the PredictController can subscribe to
 */
type AllowedEvents =
  | TransactionControllerTransactionSubmittedEvent
  | TransactionControllerTransactionConfirmedEvent
  | TransactionControllerTransactionFailedEvent
  | TransactionControllerTransactionRejectedEvent;

/**
 * PredictController messenger constraints
 */
export type PredictControllerMessenger = Messenger<
  'PredictController',
  PredictControllerActions | AllowedActions,
  PredictControllerEvents | AllowedEvents
>;

/**
 * PredictController options
 */
export interface PredictControllerOptions {
  messenger: PredictControllerMessenger;
  state?: Partial<PredictControllerState>;
}

/**
 * PredictController - Protocol-agnostic prediction markets trading controller
 *
 * Provides a unified interface for prediction markets trading across multiple protocols.
 * Features dual data flow architecture:
 * - Trading actions use Redux for persistence and optimistic updates
 * - Live data uses direct callbacks for maximum performance
 */
export class PredictController extends BaseController<
  'PredictController',
  PredictControllerState,
  PredictControllerMessenger
> {
  private providers: Map<string, PredictProvider>;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor({ messenger, state = {} }: PredictControllerOptions) {
    super({
      name: 'PredictController',
      metadata,
      messenger,
      state: { ...getDefaultPredictControllerState(), ...state },
    });

    this.providers = new Map();

    this.initializeProviders().catch((error) => {
      DevLogger.log('PredictController: Error initializing providers', {
        error:
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.UNKNOWN_ERROR,
        timestamp: new Date().toISOString(),
      });

      Logger.error(
        ensureError(error),
        this.getErrorContext('initializeProviders', {
          existingProvidersCount: this.providers.size,
          isInitialized: this.isInitialized,
        }),
      );
    });

    this.refreshEligibility().catch((error) => {
      DevLogger.log('PredictController: Error refreshing eligibility', {
        error:
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.UNKNOWN_ERROR,
        timestamp: new Date().toISOString(),
      });

      Logger.error(
        ensureError(error),
        this.getErrorContext('refreshEligibility', {
          providersCount: this.providers.size,
        }),
      );
    });
  }

  /**
   * Initialize the PredictController providers
   * Must be called before using any other methods
   * Prevents double initialization with promise caching
   */
  private async initializeProviders(): Promise<void> {
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
    DevLogger.log('PredictController: Initializing providers', {
      existingProviders: Array.from(this.providers.keys()),
      timestamp: new Date().toISOString(),
    });

    // Disconnect existing providers to close WebSocket connections
    const existingProviders = Array.from(this.providers.values());
    if (existingProviders.length > 0) {
      DevLogger.log('PredictController: Disconnecting existing providers', {
        count: existingProviders.length,
        timestamp: new Date().toISOString(),
      });
    }

    this.providers.clear();
    this.providers.set('polymarket', new PolymarketProvider());

    this.isInitialized = true;
    DevLogger.log('PredictController: Providers initialized successfully', {
      providerCount: this.providers.size,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Generate standard error context for Logger.error calls with searchable tags and context.
   * Enables Sentry dashboard filtering by feature and provider.
   *
   * @param method - The method name where the error occurred
   * @param extra - Optional additional context fields (becomes searchable context data)
   * @returns LoggerErrorOptions with tags (searchable) and context (searchable)
   * @private
   *
   * @example
   * Logger.error(error, this.getErrorContext('placeOrder', { marketId: 'abc', operation: 'validate' }));
   * // Creates searchable tags: feature:predict, provider:polymarket
   * // Creates searchable context: predict_controller.method:placeOrder, predict_controller.marketId:abc
   */
  private getErrorContext(
    method: string,
    extra?: Record<string, unknown>,
  ): LoggerErrorOptions {
    return {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        // Note: PredictController doesn't track active provider in state like PerpsController
        // If we add provider tracking, we can include it here: provider: this.state.activeProvider
      },
      context: {
        name: PREDICT_CONSTANTS.CONTROLLER_NAME,
        data: {
          method,
          ...extra,
        },
      },
    };
  }

  /**
   * Get signer for the currently selected account
   * @param address - Optionally specify the address to use
   * @returns Signer object
   * @private
   */
  private getSigner(address?: string): Signer {
    const { AccountsController, KeyringController } = Engine.context;
    const selectedAddress =
      address ?? AccountsController.getSelectedAccount().address;
    return {
      address: selectedAddress,
      signTypedMessage: (
        _params: TypedMessageParams,
        _version: SignTypedDataVersion,
      ) => KeyringController.signTypedMessage(_params, _version),
      signPersonalMessage: (_params: PersonalMessageParams) =>
        KeyringController.signPersonalMessage(_params),
    };
  }

  private async invalidateQueryCache(chainId: number) {
    const { NetworkController } = Engine.context;
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      numberToHex(chainId),
    );
    const networkClient =
      NetworkController.getNetworkClientById(networkClientId);
    try {
      await networkClient.blockTracker.checkForLatestBlock();
    } catch (error) {
      DevLogger.log('PredictController: Error invalidating query cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      Logger.error(
        ensureError(error),
        this.getErrorContext('invalidateQueryCache', {
          chainId,
        }),
      );
    }
  }

  /**
   * Get available markets with optional filtering
   */
  async getMarkets(params: GetMarketsParams): Promise<PredictMarket[]> {
    try {
      const providerIds = params.providerId
        ? [params.providerId]
        : Array.from(this.providers.keys());

      if (providerIds.some((id) => !this.providers.has(id))) {
        throw new Error('Provider not available');
      }

      const allMarkets = await Promise.all(
        providerIds.map((id: string) =>
          this.providers.get(id)?.getMarkets(params),
        ),
      );

      //TODO: We need to sort the markets after merging them
      const markets = allMarkets
        .flat()
        .filter((market): market is PredictMarket => market !== undefined);

      // Clear any previous errors on successful call
      this.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });

      return markets;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.MARKETS_FAILED;

      // Update error state
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Log to Sentry with market query context
      Logger.error(
        ensureError(error),
        this.getErrorContext('getMarkets', {
          providerId: params.providerId,
          category: params.category,
          sortBy: params.sortBy,
          sortDirection: params.sortDirection,
          status: params.status,
          hasSearchQuery: !!params.q,
        }),
      );

      // Re-throw the error so components can handle it appropriately
      throw error;
    }
  }

  /**
   * Get detailed information for a single market
   */
  async getMarket({
    marketId,
    providerId,
  }: {
    marketId: string | number;
    providerId?: string;
  }): Promise<PredictMarket> {
    const resolvedMarketId = String(marketId);

    if (!resolvedMarketId) {
      throw new Error('marketId is required');
    }

    try {
      await this.initializeProviders();

      const targetProviderId = providerId ?? 'polymarket';
      const provider = this.providers.get(targetProviderId);

      if (!provider) {
        throw new Error('Provider not available');
      }

      const market = await provider.getMarketDetails({
        marketId: resolvedMarketId,
      });

      this.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });

      return market;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.MARKET_DETAILS_FAILED;

      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Log to Sentry with market details context
      Logger.error(
        ensureError(error),
        this.getErrorContext('getMarket', {
          marketId: resolvedMarketId,
          providerId: providerId ?? 'polymarket',
        }),
      );

      if (error instanceof Error) {
        throw error;
      }

      throw new Error(PREDICT_ERROR_CODES.MARKET_DETAILS_FAILED);
    }
  }

  /**
   * Get market price history
   */
  async getPriceHistory(
    params: GetPriceHistoryParams,
  ): Promise<PredictPriceHistoryPoint[]> {
    try {
      const providerIds = params.providerId
        ? [params.providerId]
        : Array.from(this.providers.keys());

      if (providerIds.some((id) => !this.providers.has(id))) {
        throw new Error('Provider not available');
      }

      const histories = await Promise.all(
        providerIds.map((id: string) =>
          this.providers.get(id)?.getPriceHistory({
            ...params,
            providerId: id,
          }),
        ),
      );

      const priceHistory = histories.flatMap((history) => history ?? []);

      this.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });

      return priceHistory;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.PRICE_HISTORY_FAILED;

      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Log to Sentry with price history context
      Logger.error(
        ensureError(error),
        this.getErrorContext('getPriceHistory', {
          providerId: params.providerId,
          marketId: params.marketId,
          fidelity: params.fidelity,
          interval: params.interval,
        }),
      );

      throw error;
    }
  }

  /**
   * Get user positions
   */
  async getPositions(params: GetPositionsParams): Promise<PredictPosition[]> {
    try {
      const { address, providerId = 'polymarket' } = params;
      const { AccountsController } = Engine.context;

      const selectedAddress =
        address ?? AccountsController.getSelectedAccount().address;

      const provider = this.providers.get(providerId);

      if (!provider) {
        throw new Error('Provider not available');
      }

      const positions = await provider.getPositions({
        ...params,
        address: selectedAddress,
      });

      // Only update state if the provider call succeeded
      this.update((state) => {
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null; // Clear any previous errors
        if (params.claimable) {
          state.claimablePositions[selectedAddress] = [...positions];
        }
      });

      return positions;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.POSITIONS_FAILED;

      // Update error state but don't modify positions (keep existing data)
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Log to Sentry with positions query context (no user address)
      Logger.error(
        ensureError(error),
        this.getErrorContext('getPositions', {
          providerId: params.providerId,
          claimable: params.claimable,
          marketId: params.marketId,
        }),
      );

      // Re-throw the error so components can handle it appropriately
      throw error;
    }
  }

  /**
   * Get user activity
   */
  async getActivity(params: {
    address?: string;
    providerId?: string;
  }): Promise<PredictActivity[]> {
    try {
      const { address, providerId } = params;
      const { AccountsController } = Engine.context;

      const selectedAddress =
        address ?? AccountsController.getSelectedAccount().address;

      const providerIds = providerId
        ? [providerId]
        : Array.from(this.providers.keys());

      if (providerIds.some((id) => !this.providers.has(id))) {
        throw new Error('Provider not available');
      }

      const allActivity = await Promise.all(
        providerIds.map((id: string) =>
          this.providers.get(id)?.getActivity({ address: selectedAddress }),
        ),
      );

      const activity = allActivity
        .flat()
        .filter((entry): entry is PredictActivity => entry !== undefined);

      this.update((state) => {
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null;
      });

      return activity;
    } catch (error) {
      this.update((state) => {
        state.lastError =
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.ACTIVITY_NOT_AVAILABLE;
        state.lastUpdateTimestamp = Date.now();
      });

      // Log to Sentry with activity query context (no user address)
      Logger.error(
        ensureError(error),
        this.getErrorContext('getActivity', {
          providerId: params.providerId,
        }),
      );

      throw error;
    }
  }

  /**
   * Get unrealized P&L for a user
   */
  async getUnrealizedPnL({
    address,
    providerId = 'polymarket',
  }: {
    address?: string;
    providerId?: string;
  }): Promise<UnrealizedPnL> {
    try {
      const { AccountsController } = Engine.context;
      const selectedAddress =
        address ?? AccountsController.getSelectedAccount().address;

      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error('Provider not available');
      }

      const unrealizedPnL = await provider.getUnrealizedPnL({
        address: selectedAddress,
      });

      // Update state on successful call
      this.update((state) => {
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null;
      });

      return unrealizedPnL;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch unrealized P&L';

      // Update error state
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Log to Sentry with unrealized PnL context (no user address)
      Logger.error(
        ensureError(error),
        this.getErrorContext('getUnrealizedPnL', {
          providerId,
        }),
      );

      throw error;
    }
  }

  /**
   * Track Predict order analytics events
   * @public
   */
  public async trackPredictOrderEvent({
    eventType,
    amountUsd,
    analyticsProperties,
    providerId,
    completionDuration,
    failureReason,
    sharePrice,
    pnl,
  }: {
    eventType: PredictEventTypeValue;
    amountUsd?: number;
    analyticsProperties?: PlaceOrderParams['analyticsProperties'];
    providerId: string;
    completionDuration?: number;
    failureReason?: string;
    sharePrice?: number;
    pnl?: number;
  }): Promise<void> {
    if (!analyticsProperties) {
      return;
    }

    // Build regular properties (common to all events)
    const regularProperties = {
      [PredictEventProperties.MARKET_ID]: analyticsProperties.marketId,
      [PredictEventProperties.MARKET_TITLE]: analyticsProperties.marketTitle,
      [PredictEventProperties.MARKET_CATEGORY]:
        analyticsProperties.marketCategory,
      [PredictEventProperties.MARKET_TAGS]: analyticsProperties.marketTags,
      [PredictEventProperties.ENTRY_POINT]: analyticsProperties.entryPoint,
      [PredictEventProperties.TRANSACTION_TYPE]:
        analyticsProperties.transactionType,
      [PredictEventProperties.LIQUIDITY]: analyticsProperties.liquidity,
      [PredictEventProperties.VOLUME]: analyticsProperties.volume,
      [PredictEventProperties.SHARE_PRICE]: sharePrice,
      // Add market type and outcome
      ...(analyticsProperties.marketType && {
        [PredictEventProperties.MARKET_TYPE]: analyticsProperties.marketType,
      }),
      ...(analyticsProperties.outcome && {
        [PredictEventProperties.OUTCOME]: analyticsProperties.outcome,
      }),
      // Add completion duration for COMPLETED and FAILED events
      ...(completionDuration !== undefined && {
        [PredictEventProperties.COMPLETION_DURATION]: completionDuration,
      }),
      // Add failure reason for FAILED events
      ...(failureReason && {
        [PredictEventProperties.FAILURE_REASON]: failureReason,
      }),
    };

    // Build sensitive properties
    const sensitiveProperties = {
      ...(amountUsd !== undefined && {
        [PredictEventProperties.AMOUNT_USD]: amountUsd,
      }),
      // Add PNL for sell orders only
      ...(pnl !== undefined && {
        [PredictEventProperties.PNL]: pnl,
      }),
    };

    // Determine event name based on type
    let metaMetricsEvent: (typeof MetaMetricsEvents)[keyof typeof MetaMetricsEvents];
    let eventLabel: string;

    switch (eventType) {
      case PredictEventType.INITIATED:
        metaMetricsEvent = MetaMetricsEvents.PREDICT_ACTION_INITIATED;
        eventLabel = 'PREDICT_ACTION_INITIATED';
        break;
      case PredictEventType.SUBMITTED:
        metaMetricsEvent = MetaMetricsEvents.PREDICT_ACTION_SUBMITTED;
        eventLabel = 'PREDICT_ACTION_SUBMITTED';
        break;
      case PredictEventType.COMPLETED:
        metaMetricsEvent = MetaMetricsEvents.PREDICT_ACTION_COMPLETED;
        eventLabel = 'PREDICT_ACTION_COMPLETED';
        break;
      case PredictEventType.FAILED:
        metaMetricsEvent = MetaMetricsEvents.PREDICT_ACTION_FAILED;
        eventLabel = 'PREDICT_ACTION_FAILED';
        break;
    }

    DevLogger.log(`📊 [Analytics] ${eventLabel}`, {
      providerId,
      regularProperties,
      sensitiveProperties,
    });

    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(metaMetricsEvent)
        .addProperties(regularProperties)
        .addSensitiveProperties(sensitiveProperties)
        .build(),
    );
  }

  /**
   * Track Predict market details opened analytics event
   * @public
   */
  public trackMarketDetailsOpened({
    marketId,
    marketTitle,
    marketCategory,
    marketTags,
    entryPoint,
    marketDetailsViewed,
  }: {
    marketId: string;
    marketTitle: string;
    marketCategory?: string;
    marketTags?: string[];
    entryPoint: string;
    marketDetailsViewed: string;
  }): void {
    const analyticsProperties = {
      [PredictEventProperties.MARKET_ID]: marketId,
      [PredictEventProperties.MARKET_TITLE]: marketTitle,
      [PredictEventProperties.MARKET_CATEGORY]: marketCategory,
      [PredictEventProperties.MARKET_TAGS]: marketTags,
      [PredictEventProperties.ENTRY_POINT]: entryPoint,
      [PredictEventProperties.MARKET_DETAILS_VIEWED]: marketDetailsViewed,
    };

    DevLogger.log('📊 [Analytics] PREDICT_MARKET_DETAILS_OPENED', {
      analyticsProperties,
    });

    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PREDICT_MARKET_DETAILS_OPENED,
      )
        .addProperties(analyticsProperties)
        .build(),
    );
  }

  /**
   * Track Predict position viewed analytics event
   * @public
   */
  public trackPositionViewed({
    openPositionsCount,
  }: {
    openPositionsCount: number;
  }): void {
    const analyticsProperties = {
      [PredictEventProperties.OPEN_POSITIONS_COUNT]: openPositionsCount,
    };

    DevLogger.log('📊 [Analytics] PREDICT_POSITION_VIEWED', {
      analyticsProperties,
    });

    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PREDICT_POSITION_VIEWED,
      )
        .addProperties(analyticsProperties)
        .build(),
    );
  }

  /**
   * Track Predict Activity Viewed event
   * @public
   */
  public trackActivityViewed({ activityType }: { activityType: string }): void {
    const analyticsProperties = {
      [PredictEventProperties.ACTIVITY_TYPE]: activityType,
    };

    DevLogger.log('📊 [Analytics] PREDICT_ACTIVITY_VIEWED', {
      analyticsProperties,
    });

    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PREDICT_ACTIVITY_VIEWED,
      )
        .addProperties(analyticsProperties)
        .build(),
    );
  }

  /**
   * Track when user views the predict feed
   * Tracks session-based feed interactions with unique session IDs
   * @param sessionId - Unique session identifier
   * @param feedTab - Current active feed tab
   * @param numPagesViewed - Number of pages viewed in session
   * @param sessionTime - Time spent in feed (seconds)
   * @param entryPoint - How user entered the feed
   * @param isSessionEnd - Whether this is the final event for the session
   * @public
   */
  public trackFeedViewed({
    sessionId,
    feedTab,
    numPagesViewed,
    sessionTime,
    entryPoint,
    isSessionEnd = false,
  }: {
    sessionId: string;
    feedTab: string;
    numPagesViewed: number;
    sessionTime: number;
    entryPoint?: string;
    isSessionEnd?: boolean;
  }): void {
    const analyticsProperties = {
      [PredictEventProperties.SESSION_ID]: sessionId,
      [PredictEventProperties.PREDICT_FEED_TAB]: feedTab,
      [PredictEventProperties.NUM_FEED_PAGES_VIEWED_IN_SESSION]: numPagesViewed,
      [PredictEventProperties.SESSION_TIME_IN_FEED]: sessionTime,
      [PredictEventProperties.IS_SESSION_END]: isSessionEnd,
      ...(entryPoint && { [PredictEventProperties.ENTRY_POINT]: entryPoint }),
    };

    DevLogger.log('📊 [Analytics] PREDICT_FEED_VIEWED', {
      analyticsProperties,
      isSessionEnd,
    });

    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PREDICT_FEED_VIEWED,
      )
        .addProperties(analyticsProperties)
        .build(),
    );
  }

  async previewOrder(params: PreviewOrderParams): Promise<OrderPreview> {
    try {
      const provider = this.providers.get(params.providerId);
      if (!provider) {
        throw new Error('Provider not available');
      }

      const signer = this.getSigner();

      return provider.previewOrder({ ...params, signer });
    } catch (error) {
      // Log to Sentry with preview context (no sensitive amounts)
      Logger.error(
        ensureError(error),
        this.getErrorContext('previewOrder', {
          providerId: params.providerId,
          side: params.side,
          marketId: params.marketId,
          outcomeId: params.outcomeId,
        }),
      );

      throw error;
    }
  }

  async placeOrder(params: PlaceOrderParams): Promise<Result> {
    const startTime = performance.now();
    const { analyticsProperties, preview, providerId } = params;

    const sharePrice = preview?.sharePrice;
    const amountUsd =
      preview.side === Side.BUY
        ? preview?.maxAmountSpent
        : preview?.minAmountReceived;

    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error('Provider not available');
      }

      const signer = this.getSigner();

      // Track Predict Action Submitted (fire and forget)
      this.trackPredictOrderEvent({
        eventType: PredictEventType.SUBMITTED,
        amountUsd,
        analyticsProperties,
        providerId,
        sharePrice,
      });

      // Invalidate query cache (to avoid nonce issues)
      await this.invalidateQueryCache(provider.chainId);

      const result = await provider.placeOrder({ ...params, signer });

      // Track Predict Action Completed or Failed
      const completionDuration = performance.now() - startTime;

      if (result.success) {
        const { spentAmount, receivedAmount } = result.response;

        const cachedBalance =
          this.state.balances[providerId]?.[signer.address]?.balance ?? 0;
        let realAmountUsd = amountUsd;
        let realSharePrice = sharePrice;
        try {
          if (preview.side === Side.BUY) {
            realAmountUsd = parseFloat(spentAmount);
            realSharePrice =
              parseFloat(spentAmount) / parseFloat(receivedAmount);

            // Optimistically update balance
            this.update((state) => {
              state.balances[providerId] = state.balances[providerId] || {};
              state.balances[providerId][signer.address] = {
                balance: cachedBalance - realAmountUsd,
                // valid for 5 seconds (since it takes some time to reflect balance on-chain)
                validUntil: Date.now() + 5000,
              };
            });
          } else {
            realAmountUsd = parseFloat(receivedAmount);
            realSharePrice =
              parseFloat(receivedAmount) / parseFloat(spentAmount);

            // Optimistically update balance
            this.update((state) => {
              state.balances[providerId] = state.balances[providerId] || {};
              state.balances[providerId][signer.address] = {
                balance: cachedBalance + realAmountUsd,
                // valid for 5 seconds (since it takes some time to reflect balance on-chain)
                validUntil: Date.now() + 5000,
              };
            });
          }
        } catch (_e) {
          // If we can't get real share price, continue without it
        }

        // Track Predict Action Completed (fire and forget)
        this.trackPredictOrderEvent({
          eventType: PredictEventType.COMPLETED,
          amountUsd: realAmountUsd,
          analyticsProperties,
          providerId,
          completionDuration,
          sharePrice: realSharePrice,
        });
      } else {
        // Track Predict Action Failed (fire and forget)
        this.trackPredictOrderEvent({
          eventType: PredictEventType.FAILED,
          amountUsd,
          analyticsProperties,
          providerId,
          sharePrice,
          completionDuration,
          failureReason: result.error || 'Unknown error',
        });
        throw new Error(result.error);
      }

      return result as unknown as Result;
    } catch (error) {
      const completionDuration = performance.now() - startTime;
      const errorMessage =
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.PLACE_ORDER_FAILED;

      this.trackPredictOrderEvent({
        eventType: PredictEventType.FAILED,
        amountUsd,
        analyticsProperties,
        providerId,
        sharePrice,
        completionDuration,
        failureReason: errorMessage,
      });

      // Update error state for Sentry integration
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Log error for debugging and future Sentry integration
      DevLogger.log('PredictController: Place order failed', {
        error: errorMessage,
        errorDetails: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        providerId,
        params,
      });

      // Log to Sentry with order context (excluding sensitive data like amounts)
      Logger.error(
        ensureError(error),
        this.getErrorContext('placeOrder', {
          providerId,
          marketId: analyticsProperties?.marketId,
          marketTitle: analyticsProperties?.marketTitle,
          transactionType: analyticsProperties?.transactionType,
          entryPoint: analyticsProperties?.entryPoint,
          completionDuration,
        }),
      );

      throw new Error(errorMessage);
    }
  }

  async claimWithConfirmation({
    providerId,
  }: ClaimParams): Promise<PredictClaim> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error('Provider not available');
      }

      const signer = this.getSigner();

      // Get claimable positions from state
      const claimablePositions = this.state.claimablePositions[signer.address];

      if (!claimablePositions || claimablePositions.length === 0) {
        throw new Error('No claimable positions found');
      }

      // Prepare claim transaction - can fail if safe address not found, signing fails, etc.
      const prepareClaimResult = await provider.prepareClaim({
        positions: claimablePositions,
        signer,
      });

      if (!prepareClaimResult) {
        throw new Error('Failed to prepare claim transaction');
      }

      const { transactions, chainId } = prepareClaimResult;

      if (!transactions || transactions.length === 0) {
        throw new Error('No transactions returned from claim preparation');
      }

      if (!chainId) {
        throw new Error('Chain ID not provided by claim preparation');
      }

      // Find network client - can fail if chain is not supported
      const { NetworkController } = Engine.context;
      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        numberToHex(chainId),
      );

      if (!networkClientId) {
        throw new Error(
          `Network client not found for chain ID: ${numberToHex(chainId)}`,
        );
      }

      // Add transaction batch - can fail if transaction submission fails
      const batchResult = await addTransactionBatch({
        from: signer.address as Hex,
        origin: ORIGIN_METAMASK,
        networkClientId,
        disableHook: true,
        disableSequential: true,
        transactions,
      });

      if (!batchResult?.batchId) {
        throw new Error(
          'Failed to get batch ID from claim transaction submission',
        );
      }

      const { batchId } = batchResult;

      const predictClaim: PredictClaim = {
        batchId,
        chainId,
        status: PredictClaimStatus.PENDING,
      };

      this.update((state) => {
        state.lastError = null; // Clear any previous errors
        state.lastUpdateTimestamp = Date.now();
      });

      return predictClaim;
    } catch (error) {
      const e = ensureError(error);
      if (e.message.includes('User denied transaction signature')) {
        // ignore error, as the user cancelled the tx
        return {
          batchId: 'NA',
          chainId: 0,
          status: PredictClaimStatus.CANCELLED,
        };
      }
      // Log to Sentry with claim context (no user address or amounts)
      Logger.error(
        e,
        this.getErrorContext('claimWithConfirmation', {
          providerId,
        }),
      );
      const errorMessage =
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.CLAIM_FAILED;

      // Update error state for Sentry integration
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Log error for debugging and future Sentry integration
      DevLogger.log('PredictController: Claim failed', {
        error: errorMessage,
        errorDetails: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        providerId,
      });

      // Re-throw the error so the hook can handle it and show the toast
      throw error;
    }
  }

  public confirmClaim({
    providerId = 'polymarket',
  }: {
    providerId: string;
  }): void {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error('Provider not available');
    }
    const signer = this.getSigner();
    const claimedPositions = this.state.claimablePositions[signer.address];
    if (!claimedPositions || claimedPositions.length === 0) {
      return;
    }

    this.providers.get(providerId)?.confirmClaim?.({
      positions: claimedPositions,
      signer: this.getSigner(),
    });

    this.update((state) => {
      state.claimablePositions[signer.address] = [];
    });
  }

  /**
   * Refresh eligibility status
   */
  public async refreshEligibility(): Promise<void> {
    DevLogger.log('PredictController: Refreshing eligibility');
    for (const [providerId, provider] of this.providers) {
      if (!provider) {
        continue;
      }
      try {
        const isEligible = await provider.isEligible();
        this.update((state) => {
          state.eligibility[providerId] = isEligible;
        });
      } catch (error) {
        // Default to false in case of error
        this.update((state) => {
          state.eligibility[providerId] = false;
        });
        DevLogger.log('PredictController: Eligibility refresh failed', {
          error:
            error instanceof Error
              ? error.message
              : PREDICT_ERROR_CODES.UNKNOWN_ERROR,
          timestamp: new Date().toISOString(),
        });

        // Log to Sentry with provider context
        Logger.error(
          ensureError(error),
          this.getErrorContext('refreshEligibility.provider', {
            providerId,
          }),
        );
      }
    }
  }

  /**
   * Test utility method to update state for testing purposes
   * @param updater - Function that updates the state
   */
  public updateStateForTesting(
    updater: (state: PredictControllerState) => void,
  ): void {
    this.update(updater);
  }

  public async depositWithConfirmation(
    params: PrepareDepositParams,
  ): Promise<Result<{ batchId: string }>> {
    const provider = this.providers.get(params.providerId);
    if (!provider) {
      throw new Error('Provider not available');
    }

    try {
      const signer = this.getSigner();

      // Clear any previous deposit transaction
      this.update((state) => {
        state.pendingDeposits[params.providerId] = {
          [signer.address]: false,
        };
      });

      const depositPreparation = await provider.prepareDeposit({
        ...params,
        signer,
      });

      if (!depositPreparation) {
        throw new Error('Deposit preparation returned undefined');
      }

      const { transactions, chainId } = depositPreparation;

      if (!transactions || transactions.length === 0) {
        throw new Error('No transactions returned from deposit preparation');
      }

      if (!chainId) {
        throw new Error('Chain ID not provided by deposit preparation');
      }

      const { NetworkController } = Engine.context;
      const networkClientId =
        NetworkController.findNetworkClientIdByChainId(chainId);

      if (!networkClientId) {
        throw new Error(`Network client not found for chain ID: ${chainId}`);
      }

      const batchResult = await addTransactionBatch({
        from: signer.address as Hex,
        origin: ORIGIN_METAMASK,
        networkClientId,
        disableHook: true,
        disableSequential: true,
        transactions,
      });

      if (!batchResult?.batchId) {
        throw new Error('Failed to get batch ID from transaction submission');
      }

      const { batchId } = batchResult;

      // Validate chainId format before parsing
      const parsedChainId = hexToNumber(chainId);
      if (isNaN(parsedChainId)) {
        throw new Error(`Invalid chain ID format: ${chainId}`);
      }

      this.update((state) => {
        state.pendingDeposits[params.providerId] = {
          [signer.address]: true,
        };
      });

      return {
        success: true,
        response: {
          batchId,
        },
      };
    } catch (error) {
      const e = ensureError(error);
      if (e.message.includes('User denied transaction signature')) {
        // ignore error, as the user cancelled the tx
        return {
          success: true,
          response: { batchId: 'NA' },
        };
      }
      // Log to Sentry with deposit context (no sensitive amounts)
      Logger.error(
        e,
        this.getErrorContext('depositWithConfirmation', {
          providerId: params.providerId,
        }),
      );

      throw new Error(
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.DEPOSIT_FAILED,
      );
    }
  }

  public clearPendingDeposit({ providerId }: { providerId: string }): void {
    const { AccountsController } = Engine.context;
    const selectedAddress = AccountsController.getSelectedAccount().address;
    this.update((state) => {
      state.pendingDeposits[providerId] = {
        [selectedAddress]: false,
      };
    });
  }

  public async getAccountState(
    params: GetAccountStateParams,
  ): Promise<AccountState> {
    try {
      const provider = this.providers.get(params.providerId);
      if (!provider) {
        throw new Error('Provider not available');
      }
      const { AccountsController } = Engine.context;
      const selectedAddress = AccountsController.getSelectedAccount().address;

      return provider.getAccountState({
        ...params,
        ownerAddress: selectedAddress,
      });
    } catch (error) {
      // Log to Sentry with account state context (no user address)
      Logger.error(
        ensureError(error),
        this.getErrorContext('getAccountState', {
          providerId: params.providerId,
        }),
      );

      throw error;
    }
  }

  public async getBalance(params: GetBalanceParams): Promise<number> {
    try {
      const provider = this.providers.get(params.providerId);
      if (!provider) {
        throw new Error('Provider not available');
      }
      const { AccountsController } = Engine.context;
      const selectedAddress = AccountsController.getSelectedAccount().address;
      const address = params.address ?? selectedAddress;

      const cachedBalance = this.state.balances[params.providerId]?.[address];
      if (cachedBalance && cachedBalance.validUntil > Date.now()) {
        return cachedBalance.balance;
      }

      // Invalidate query cache
      await this.invalidateQueryCache(provider.chainId);

      const balance = await provider.getBalance({
        ...params,
        address,
      });

      this.update((state) => {
        state.balances[params.providerId] = {
          ...state.balances[params.providerId],
          [address]: {
            balance,
            // valid for 1 second
            validUntil: Date.now() + 1000,
          },
        };
      });
      return balance;
    } catch (error) {
      // Log to Sentry with balance query context (no user address)
      Logger.error(
        ensureError(error),
        this.getErrorContext('getBalance', {
          providerId: params.providerId,
        }),
      );

      throw error;
    }
  }

  public async prepareWithdraw(
    params: PrepareWithdrawParams,
  ): Promise<Result<string>> {
    try {
      const provider = this.providers.get(params.providerId);
      if (!provider) {
        throw new Error('Provider not available');
      }

      const signer = this.getSigner();

      const { chainId, transaction, predictAddress } =
        await provider.prepareWithdraw({
          ...params,
          signer,
        });

      this.update((state) => {
        state.withdrawTransaction = {
          chainId: hexToNumber(chainId),
          status: PredictWithdrawStatus.IDLE,
          providerId: params.providerId,
          predictAddress: predictAddress as Hex,
          transactionId: '',
          amount: 0,
        };
      });

      const { NetworkController } = Engine.context;

      const { batchId } = await addTransactionBatch({
        from: signer.address as Hex,
        origin: ORIGIN_METAMASK,
        networkClientId:
          NetworkController.findNetworkClientIdByChainId(chainId),
        disableHook: true,
        disableSequential: true,
        requireApproval: true,
        transactions: [transaction],
      });

      this.update((state) => {
        if (state.withdrawTransaction) {
          state.withdrawTransaction.transactionId = batchId;
        }
      });

      return {
        success: true,
        response: batchId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.WITHDRAW_FAILED;

      const e = ensureError(error);
      if (e.message.includes('User denied transaction signature')) {
        // ignore error, as the user cancelled the tx
        return {
          success: true,
          response: 'User cancelled transaction',
        };
      }

      // Update error state for Sentry integration
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
        state.withdrawTransaction = null; // Clear any partial withdraw transaction
      });

      // Log error for debugging and future Sentry integration
      DevLogger.log('PredictController: Prepare withdraw failed', {
        error: errorMessage,
        errorDetails: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        providerId: params.providerId,
      });

      Logger.error(
        ensureError(error),
        this.getErrorContext('prepareWithdraw', {
          providerId: params.providerId,
        }),
      );

      throw new Error(errorMessage);
    }
  }

  public async beforeSign(request: {
    transactionMeta: TransactionMeta;
  }): Promise<
    | {
        updateTransaction?: (transaction: TransactionMeta) => void;
      }
    | undefined
  > {
    if (!this.state.withdrawTransaction) {
      return;
    }

    const withdrawTransaction =
      request.transactionMeta?.nestedTransactions?.find(
        (tx) => tx.type === TransactionType.predictWithdraw,
      );

    if (!withdrawTransaction) {
      return;
    }

    const provider = this.providers.get(
      this.state.withdrawTransaction.providerId,
    );
    if (!provider) {
      throw new Error('Provider not available');
    }

    if (!provider.signWithdraw) {
      return;
    }

    const signer = this.getSigner(request.transactionMeta.txParams.from);

    const chainId = this.state.withdrawTransaction.chainId;

    const { NetworkController } = Engine.context;
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      numberToHex(chainId),
    );

    const { callData, amount } = await provider.signWithdraw({
      callData: withdrawTransaction?.data as Hex,
      signer,
    });

    const newParams = {
      ...withdrawTransaction,
      from: request.transactionMeta.txParams.from,
      data: callData,
      to: this.state.withdrawTransaction?.predictAddress as Hex,
    };

    // Attempt to estimate gas for the updated transaction
    let updatedGas: Hex | undefined;
    try {
      const estimateResult = await this.messenger.call(
        'TransactionController:estimateGas',
        newParams,
        networkClientId,
      );
      updatedGas = estimateResult.gas;
    } catch (error) {
      // Log the error but continue - we'll use the original gas values
      DevLogger.log(
        'PredictController: Gas estimation failed in beforeSign, using original gas values',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      );
      this.update((state) => {
        if (state.withdrawTransaction) {
          state.withdrawTransaction.status = PredictWithdrawStatus.ERROR;
        }
      });

      return;
    }

    this.update((state) => {
      if (state.withdrawTransaction) {
        state.withdrawTransaction.amount = amount;
        state.withdrawTransaction.status = PredictWithdrawStatus.PENDING;
      }
    });

    return {
      updateTransaction: (transaction: TransactionMeta) => {
        transaction.txParams.data = callData;
        transaction.txParams.to = this.state.withdrawTransaction
          ?.predictAddress as Hex;
        // Only update gas if estimation succeeded
        if (updatedGas) {
          transaction.txParams.gas = updatedGas;
          transaction.txParams.gasLimit = updatedGas;
        }
      },
    };
  }

  public clearWithdrawTransaction(): void {
    this.update((state) => {
      state.withdrawTransaction = null;
    });
  }

  public acceptAgreement(params: AcceptAgreementParams): boolean {
    try {
      const provider = this.providers.get(params.providerId);
      if (!provider) {
        throw new Error('Provider not available');
      }
      this.update((state) => {
        const accountMeta = state.accountMeta[params.providerId]?.[
          params.address
        ] || {
          isOnboarded: false,
          acceptedToS: false,
        };

        state.accountMeta[params.providerId] = {
          ...(state.accountMeta[params.providerId] || {}),
          [params.address]: {
            ...accountMeta,
            acceptedToS: true,
          },
        };
      });
      return true;
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('acceptAgreement', {
          providerId: params.providerId,
        }),
      );
      throw error;
    }
  }
}
