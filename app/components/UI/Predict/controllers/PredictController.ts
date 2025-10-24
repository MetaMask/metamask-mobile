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
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerTransactionFailedEvent,
  TransactionControllerTransactionRejectedEvent,
  TransactionControllerTransactionSubmittedEvent,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex, hexToNumber, numberToHex } from '@metamask/utils';
import performance from 'react-native-performance';
import Engine from '../../../../core/Engine';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import {
  addTransaction,
} from '../../../../util/transaction-controller';
import { PolymarketProvider } from '../providers/polymarket/PolymarketProvider';
import { ensureError } from '../utils/predictErrorHandler';
import {
  PredictEventProperties,
  PredictEventType,
  PredictEventTypeValue,
} from '../constants/eventNames';
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

  // Claim management
  claimablePositions: PredictPosition[];
  claimTransaction: PredictClaim | null;

  // Deposit management
  depositTransaction: PredictDeposit | null;

  // Withdraw management
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
  | AccountsControllerGetSelectedAccountAction['type']
  | NetworkControllerGetStateAction['type'];

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
  PredictControllerActions,
  PredictControllerEvents | AllowedEvents,
  AllowedActions,
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

      this.trackPredictOrderEvent({
        eventType: PredictEventType.FAILED,
        amount,
        analyticsProperties,
        providerId,
        sharePrice,
        completionDuration,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
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
        error:
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.PLACE_ORDER_FAILED,
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
      const selectedAddress = AccountsController.getSelectedAccount().address;

      const signer = {
        address: selectedAddress,
        signTypedMessage: (
          params: TypedMessageParams,
          version: SignTypedDataVersion,
        ) => KeyringController.signTypedMessage(params, version),
        signPersonalMessage: (params: PersonalMessageParams) =>
          KeyringController.signPersonalMessage(params),
      };

      const claimablePositions = await this.getPositions({
        claimable: true,
      });

      const { transactions, chainId } = await provider.prepareClaim({
        positions: claimablePositions,
        signer,
      });
      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        numberToHex(chainId),
      );

      const { batchId } = await addTransactionBatch({
        from: signer.address as Hex,
        origin: ORIGIN_METAMASK,
        networkClientId,
        disableHook: true,
        disableSequential: true,
        transactions: [
          {
            params: {
              to: signer.address as Hex,
              value: '0x1',
            },
          },
          ...transactions,
        ],
      });

      const predictClaim: PredictClaim = {
        batchId,
        chainId,
        status: PredictClaimStatus.PENDING,
      };

      this.update((state) => {
        state.claimTransaction = predictClaim;
      });

      return predictClaim;
    } catch (error) {
      // Log to Sentry with claim context (no user address or amounts)
      Logger.error(
        ensureError(error),
        this.getErrorContext('claimWithConfirmation', {
          providerId,
        }),
      );

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

      const { transactions, chainId } = await provider.prepareDeposit({
        ...params,
        signer,
      });

      const networkClientId =
        NetworkController.findNetworkClientIdByChainId(chainId);

      const { batchId } = await addTransactionBatch({
        from: signer.address as Hex,
        origin: ORIGIN_METAMASK,
        networkClientId,
        disableHook: true,
        disableSequential: true,
        transactions,
      });

      // Store deposit transaction for tracking (mirrors claim pattern)
      const predictDeposit: PredictDeposit = {
        batchId,
        chainId: parseInt(chainId, 16),
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
          : PREDICT_ERROR_CODES.ENABLE_WALLET_FAILED,
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
      return provider.getBalance({
        ...params,
        address: params.address ?? selectedAddress,
      });
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
        params: TypedMessageParams,
        version: SignTypedDataVersion,
      ) => KeyringController.signTypedMessage(params, version),
      signPersonalMessage: (params: PersonalMessageParams) =>
        KeyringController.signPersonalMessage(params),
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
        to: transaction.params.to as Hex,
        predictAddress: predictAddress as Hex,
        transactionId: '',
      };
    });

    const { batchId } = await addTransactionBatch({
      from: selectedAddress as Hex,
      origin: ORIGIN_METAMASK,
      networkClientId: NetworkController.findNetworkClientIdByChainId(chainId),
      disableHook: true,
      disableSequential: true,
      requireApproval: true,
      transactions: [
        {
          params: {
            to: signer.address as Hex,
            value: '0x1',
          },
        },
        transaction,
      ],
    });

    /* const { transactionMeta } = await addTransaction(
      {
        ...transaction,
        from: selectedAddress as Hex,
      },
      {
        origin: ORIGIN_METAMASK,
        networkClientId:
          NetworkController.findNetworkClientIdByChainId(chainId),
        requireApproval: true,
      },
    ); */

    this.update((state) => {
      if (state.withdrawTransaction) {
        state.withdrawTransaction.status = PredictWithdrawStatus.PENDING;
        state.withdrawTransaction.transactionId = batchId;
      }
    });

    return {
      success: true,
      response: batchId,
    };
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

    const isWithdrawTransaction =
      request.transactionMeta?.nestedTransactions?.some(
        (tx) => tx.type === TransactionType.predictWithdraw,
      );

    if (!isWithdrawTransaction) {
      return;
    }

    const withdrawTransaction =
      request.transactionMeta?.nestedTransactions?.find(
        (tx) => tx.type === TransactionType.predictWithdraw,
      );

    const provider = this.providers.get(
      this.state.withdrawTransaction.providerId,
    );
    if (!provider) {
      throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
    }

    if (!provider.prepareWithdrawConfirmation) {
      return;
    }
    const { KeyringController } = Engine.context;

    const signer = {
      address: request.transactionMeta.txParams.from,
      signTypedMessage: (
        params: TypedMessageParams,
        version: SignTypedDataVersion,
      ) => KeyringController.signTypedMessage(params, version),
      signPersonalMessage: (params: PersonalMessageParams) =>
        KeyringController.signPersonalMessage(params),
    };

    const { callData } = await provider.prepareWithdrawConfirmation({
      callData: withdrawTransaction?.data as Hex,
      signer,
    });

    return {
      updateTransaction: (transaction: TransactionMeta) => {
        transaction.txParams.data = callData;
        transaction.txParams.to = this.state.withdrawTransaction
          ?.predictAddress as Hex;
      },
    };
  }
}
