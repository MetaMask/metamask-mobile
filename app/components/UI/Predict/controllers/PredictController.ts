import { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';
import {
  BaseController,
  type RestrictedMessenger,
} from '@metamask/base-controller';
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
import Logger from '../../../../util/Logger';
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
} from '../providers/types';
import {
  ClaimParams,
  GetPriceHistoryParams,
  PredictActivity,
  PredictClaim,
  PredictClaimStatus,
  PredictDeposit,
  PredictDepositStatus,
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

/**
 * Error codes for PredictController
 * These codes are returned to the UI layer for translation
 */
export const PREDICT_ERROR_CODES = {
  CLIENT_NOT_INITIALIZED: 'CLIENT_NOT_INITIALIZED',
  MARKETS_FAILED: 'MARKETS_FAILED',
  MARKET_DETAILS_FAILED: 'MARKET_DETAILS_FAILED',
  PRICE_HISTORY_FAILED: 'PRICE_HISTORY_FAILED',
  POSITIONS_FAILED: 'POSITIONS_FAILED',
  PROVIDER_NOT_AVAILABLE: 'PROVIDER_NOT_AVAILABLE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  PLACE_BUY_ORDER_FAILED: 'PLACE_BUY_ORDER_FAILED',
  PLACE_SELL_ORDER_FAILED: 'PLACE_SELL_ORDER_FAILED',
  SUBMIT_OFFCHAIN_TRADE_NOT_SUPPORTED: 'SUBMIT_OFFCHAIN_TRADE_NOT_SUPPORTED',
  NO_ONCHAIN_TRADE_PARAMS: 'NO_ONCHAIN_TRADE_PARAMS',
  ONCHAIN_TRANSACTION_NOT_FOUND: 'ONCHAIN_TRANSACTION_NOT_FOUND',
  SUBMIT_OFFCHAIN_TRADE_FAILED: 'SUBMIT_OFFCHAIN_TRADE_FAILED',
  CLAIM_FAILED: 'CLAIM_FAILED',
  PLACE_ORDER_FAILED: 'PLACE_ORDER_FAILED',
  ENABLE_WALLET_FAILED: 'ENABLE_WALLET_FAILED',
  ACTIVITY_NOT_AVAILABLE: 'ACTIVITY_NOT_AVAILABLE',
  DEPOSIT_FAILED: 'DEPOSIT_FAILED',
  WITHDRAW_FAILED: 'WITHDRAW_FAILED',
} as const;

export type PredictErrorCode =
  (typeof PREDICT_ERROR_CODES)[keyof typeof PREDICT_ERROR_CODES];

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
  balances: { [providerId: string]: { [address: string]: number } };

  // Claim management
  // TODO: change to be per-account basis
  claimablePositions: PredictPosition[];
  claimTransaction: PredictClaim | null;

  // Deposit management
  // TODO: change to be per-account basis
  depositTransaction: PredictDeposit | null;

  // Withdraw management
  // TODO: change to be per-account basis
  withdrawTransaction: PredictWithdraw | null;

  // Persisted data
  // --------------
  // Setup
  isOnboarded: { [address: string]: boolean };
};

/**
 * Get default PredictController state
 */
export const getDefaultPredictControllerState = (): PredictControllerState => ({
  eligibility: {},
  lastError: null,
  lastUpdateTimestamp: 0,
  balances: {},
  claimablePositions: [],
  claimTransaction: null,
  depositTransaction: null,
  withdrawTransaction: null,
  isOnboarded: {},
});

/**
 * State metadata for the PredictController
 */
const metadata = {
  eligibility: { persist: false, anonymous: false },
  lastError: { persist: false, anonymous: false },
  lastUpdateTimestamp: { persist: false, anonymous: false },
  balances: { persist: false, anonymous: false },
  claimablePositions: { persist: false, anonymous: false },
  claimTransaction: { persist: false, anonymous: false },
  depositTransaction: { persist: false, anonymous: false },
  withdrawTransaction: { persist: false, anonymous: false },
  isOnboarded: { persist: true, anonymous: false },
};

/**
 * PredictController events
 */
export interface PredictControllerEvents {
  type: 'PredictController:stateChange';
  payload: [PredictControllerState, PredictControllerState[]];
}

/**
 * PredictController actions
 */
export type PredictControllerActions =
  | {
      type: 'PredictController:getState';
      handler: () => PredictControllerState;
    }
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
export type AllowedActions =
  | AccountsControllerGetSelectedAccountAction
  | NetworkControllerGetStateAction
  | TransactionControllerEstimateGasAction;

/**
 * External events the PredictController can subscribe to
 */
export type AllowedEvents =
  | TransactionControllerTransactionSubmittedEvent
  | TransactionControllerTransactionConfirmedEvent
  | TransactionControllerTransactionFailedEvent
  | TransactionControllerTransactionRejectedEvent;

/**
 * PredictController messenger constraints
 */
export type PredictControllerMessenger = RestrictedMessenger<
  'PredictController',
  PredictControllerActions | AllowedActions,
  PredictControllerEvents | AllowedEvents,
  AllowedActions['type'],
  AllowedEvents['type']
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
   * Generate standard error context for Logger.error calls
   * Ensures consistent error reporting to Sentry with minimal but complete context
   * @param method - The method name where the error occurred
   * @param extra - Optional additional context fields
   * @returns Standardized error context object
   * @private
   */
  private getErrorContext(
    method: string,
    extra?: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      feature: 'Predict',
      context: `PredictController.${method}`,
      ...extra,
    };
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
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
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
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
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
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
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
      const { address, providerId } = params;
      const { AccountsController } = Engine.context;

      const selectedAddress =
        address ?? AccountsController.getSelectedAccount().address;

      const providerIds = providerId
        ? [providerId]
        : Array.from(this.providers.keys());

      if (providerIds.some((id) => !this.providers.has(id))) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      const allPositions = await Promise.all(
        providerIds.map((id: string) =>
          this.providers.get(id)?.getPositions({
            ...params,
            address: selectedAddress,
          }),
        ),
      );

      //TODO: We need to sort the positions after merging them
      const positions = allPositions
        .flat()
        .filter(
          (position): position is PredictPosition => position !== undefined,
        );

      // Only update state if the provider call succeeded
      this.update((state) => {
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null; // Clear any previous errors
        if (params.claimable) {
          state.claimablePositions = [...positions];
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
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
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
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
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
    amount,
    analyticsProperties,
    providerId,
    completionDuration,
    orderId,
    failureReason,
    sharePrice,
  }: {
    eventType: PredictEventTypeValue;
    amount?: number;
    analyticsProperties?: PlaceOrderParams['analyticsProperties'];
    providerId: string;
    completionDuration?: number;
    orderId?: string;
    failureReason?: string;
    sharePrice?: number;
  }): Promise<void> {
    if (!analyticsProperties) {
      return;
    }

    // Get safe address from getAccountState for analytics
    let safeAddress: string | undefined;
    try {
      const accountState = await this.getAccountState({
        providerId,
      });
      safeAddress = accountState.address;
    } catch {
      // If we can't get safe address, continue without it
    }

    // Build regular properties (common to all events)
    const regularProperties = {
      [PredictEventProperties.MARKET_ID]: analyticsProperties.marketId,
      [PredictEventProperties.MARKET_TITLE]: analyticsProperties.marketTitle,
      [PredictEventProperties.MARKET_CATEGORY]:
        analyticsProperties.marketCategory,
      [PredictEventProperties.ENTRY_POINT]: analyticsProperties.entryPoint,
      [PredictEventProperties.TRANSACTION_TYPE]:
        analyticsProperties.transactionType,
      [PredictEventProperties.LIQUIDITY]: analyticsProperties.liquidity,
      [PredictEventProperties.VOLUME]: analyticsProperties.volume,
      [PredictEventProperties.SHARE_PRICE]: sharePrice,
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
      ...(amount !== undefined && {
        [PredictEventProperties.AMOUNT]: amount,
      }),
      // Add user address only if we have it
      ...(safeAddress && {
        [PredictEventProperties.USER_ADDRESS]: safeAddress,
      }),
      // Add order ID for COMPLETED events
      ...(orderId && {
        [PredictEventProperties.ORDER_ID]: orderId,
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
    entryPoint,
    marketDetailsViewed,
  }: {
    marketId: string;
    marketTitle: string;
    marketCategory?: string;
    entryPoint: string;
    marketDetailsViewed: string;
  }): void {
    const analyticsProperties = {
      [PredictEventProperties.MARKET_ID]: marketId,
      [PredictEventProperties.MARKET_TITLE]: marketTitle,
      [PredictEventProperties.MARKET_CATEGORY]: marketCategory,
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

  async previewOrder(params: PreviewOrderParams): Promise<OrderPreview> {
    try {
      const provider = this.providers.get(params.providerId);
      if (!provider) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      const { AccountsController, KeyringController } = Engine.context;
      const selectedAddress = AccountsController.getSelectedAccount().address;
      const signer = {
        address: selectedAddress,
        signTypedMessage: (
          _params: TypedMessageParams,
          _version: SignTypedDataVersion,
        ) => KeyringController.signTypedMessage(_params, _version),
        signPersonalMessage: (_params: PersonalMessageParams) =>
          KeyringController.signPersonalMessage(_params),
      };

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
    const amount = preview?.maxAmountSpent;

    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      const { AccountsController, KeyringController } = Engine.context;
      const selectedAddress = AccountsController.getSelectedAccount().address;
      const signer = {
        address: selectedAddress,
        signTypedMessage: (
          _params: TypedMessageParams,
          _version: SignTypedDataVersion,
        ) => KeyringController.signTypedMessage(_params, _version),
        signPersonalMessage: (_params: PersonalMessageParams) =>
          KeyringController.signPersonalMessage(_params),
      };

      // Track Predict Action Submitted (fire and forget)
      this.trackPredictOrderEvent({
        eventType: PredictEventType.SUBMITTED,
        amount,
        analyticsProperties,
        providerId,
        sharePrice,
      });

      const result = await provider.placeOrder({ ...params, signer });

      // Track Predict Action Completed or Failed
      const completionDuration = performance.now() - startTime;

      if (result.success) {
        const { id: orderId, spentAmount, receivedAmount } = result.response;

        let realSharePrice = sharePrice;
        try {
          if (preview.side === Side.BUY) {
            realSharePrice =
              parseFloat(spentAmount) / parseFloat(receivedAmount);
          } else {
            realSharePrice =
              parseFloat(receivedAmount) / parseFloat(spentAmount);
          }
        } catch (_e) {
          // If we can't get real share price, continue without it
        }

        // Track Predict Action Completed (fire and forget)
        this.trackPredictOrderEvent({
          eventType: PredictEventType.COMPLETED,
          amount: spentAmount ? parseFloat(spentAmount) : amount,
          analyticsProperties,
          providerId,
          completionDuration,
          orderId,
          sharePrice: realSharePrice,
        });
      } else {
        // Track Predict Action Failed (fire and forget)
        this.trackPredictOrderEvent({
          eventType: PredictEventType.FAILED,
          amount,
          analyticsProperties,
          providerId,
          sharePrice,
          completionDuration,
          failureReason: result.error || 'Unknown error',
        });
      }

      return result as Result;
    } catch (error) {
      const completionDuration = performance.now() - startTime;
      const errorMessage =
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.PLACE_ORDER_FAILED;

      this.trackPredictOrderEvent({
        eventType: PredictEventType.FAILED,
        amount,
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

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async claimWithConfirmation({
    providerId,
  }: ClaimParams): Promise<PredictClaim> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      const { AccountsController, KeyringController, NetworkController } =
        Engine.context;

      // Get selected account - can fail if no account is selected
      const selectedAccount = AccountsController.getSelectedAccount();
      if (!selectedAccount?.address) {
        throw new Error('No account selected');
      }
      const selectedAddress = selectedAccount.address;

      const signer = {
        address: selectedAddress,
        signTypedMessage: (
          params: TypedMessageParams,
          version: SignTypedDataVersion,
        ) => KeyringController.signTypedMessage(params, version),
        signPersonalMessage: (params: PersonalMessageParams) =>
          KeyringController.signPersonalMessage(params),
      };

      // Get claimable positions - can fail if network request fails
      const claimablePositions = await this.getPositions({
        claimable: true,
      });

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
        state.claimTransaction = predictClaim;
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
        state.claimTransaction = null; // Clear any partial claim transaction
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

  public clearClaimTransaction(): void {
    this.update((state) => {
      state.claimTransaction = null;
    });
  }

  public async depositWithConfirmation(
    params: PrepareDepositParams,
  ): Promise<Result<{ batchId: string }>> {
    const provider = this.providers.get(params.providerId);
    if (!provider) {
      throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
    }

    const { AccountsController, KeyringController, NetworkController } =
      Engine.context;

    try {
      // Clear any previous deposit transaction
      this.update((state) => {
        state.depositTransaction = null;
      });

      const selectedAccount = AccountsController.getSelectedAccount();
      if (!selectedAccount?.address) {
        throw new Error('No account selected for deposit');
      }

      const selectedAddress = selectedAccount.address;
      const signer = {
        address: selectedAddress,
        signTypedMessage: (
          _params: TypedMessageParams,
          _version: SignTypedDataVersion,
        ) => KeyringController.signTypedMessage(_params, _version),
        signPersonalMessage: (_params: PersonalMessageParams) =>
          KeyringController.signPersonalMessage(_params),
      };

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

      // Store deposit transaction for tracking (mirrors claim pattern)
      const predictDeposit: PredictDeposit = {
        batchId,
        chainId: parsedChainId,
        status: PredictDepositStatus.PENDING,
        providerId: params.providerId,
      };

      this.update((state) => {
        state.depositTransaction = predictDeposit;
      });

      return {
        success: true,
        response: {
          batchId,
        },
      };
    } catch (error) {
      // Log to Sentry with deposit context (no sensitive amounts)
      Logger.error(
        ensureError(error),
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

  public clearDepositTransaction(): void {
    this.update((state) => {
      state.depositTransaction = null;
    });
  }

  public async getAccountState(
    params: GetAccountStateParams,
  ): Promise<AccountState> {
    try {
      const provider = this.providers.get(params.providerId);
      if (!provider) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
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
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }
      const { AccountsController } = Engine.context;
      const selectedAddress = AccountsController.getSelectedAccount().address;
      const address = params.address ?? selectedAddress;
      const balance = await provider.getBalance({
        ...params,
        address,
      });
      this.update((state) => {
        state.balances[params.providerId] = {
          ...state.balances[params.providerId],
          [address]: balance,
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
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      const { AccountsController, KeyringController, NetworkController } =
        Engine.context;
      const selectedAddress = AccountsController.getSelectedAccount().address;
      const signer = {
        address: selectedAddress,
        signTypedMessage: (
          typedMessageParams: TypedMessageParams,
          version: SignTypedDataVersion,
        ) => KeyringController.signTypedMessage(typedMessageParams, version),
        signPersonalMessage: (personalMessageParams: PersonalMessageParams) =>
          KeyringController.signPersonalMessage(personalMessageParams),
      };
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

      const { batchId } = await addTransactionBatch({
        from: selectedAddress as Hex,
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

      return {
        success: false,
        error: errorMessage,
      };
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
      throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
    }

    if (!provider.signWithdraw) {
      return;
    }

    const { KeyringController, NetworkController } = Engine.context;

    const signer = {
      address: request.transactionMeta.txParams.from,
      signTypedMessage: (
        params: TypedMessageParams,
        version: SignTypedDataVersion,
      ) => KeyringController.signTypedMessage(params, version),
      signPersonalMessage: (params: PersonalMessageParams) =>
        KeyringController.signPersonalMessage(params),
    };

    const chainId = this.state.withdrawTransaction.chainId;

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
      const estimateResult = await this.messagingSystem.call(
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
}
