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
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex, numberToHex } from '@metamask/utils';
import performance from 'react-native-performance';
import Engine from '../../../../core/Engine';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import {
  addTransaction,
  addTransactionBatch,
} from '../../../../util/transaction-controller';
import { PolymarketProvider } from '../providers/polymarket/PolymarketProvider';
import {
  PredictEventProperties,
  PredictEventType,
  PredictEventTypeValue,
} from '../constants/eventNames';
import {
  AccountState,
  CalculateBetAmountsParams,
  CalculateBetAmountsResponse,
  CalculateCashOutAmountsParams,
  CalculateCashOutAmountsResponse,
  GetAccountStateParams,
  GetBalanceParams,
  GetMarketsParams,
  GetPositionsParams,
  PlaceOrderParams,
  PredictProvider,
  PrepareDepositParams,
} from '../providers/types';
import {
  ClaimParams,
  GetPriceHistoryParams,
  PredictClaim,
  PredictClaimStatus,
  PredictDeposit,
  PredictDepositStatus,
  PredictMarket,
  PredictPosition,
  PredictActivity,
  PredictPriceHistoryPoint,
  Result,
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
  claimTransaction: PredictClaim | null;

  // Deposit management
  depositTransaction: PredictDeposit | null;

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
  claimTransaction: null,
  depositTransaction: null,
  isOnboarded: {},
});

/**
 * State metadata for the PredictController
 */
const metadata = {
  eligibility: { persist: false, anonymous: false },
  lastError: { persist: false, anonymous: false },
  lastUpdateTimestamp: { persist: false, anonymous: false },
  claimTransaction: { persist: false, anonymous: false },
  depositTransaction: { persist: false, anonymous: false },
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

    // Subscribe to TransactionController events for deposit tracking
    this.messagingSystem.subscribe(
      'TransactionController:transactionSubmitted',
      this.handleTransactionSubmitted.bind(this),
    );

    this.messagingSystem.subscribe(
      'TransactionController:transactionConfirmed',
      this.handleTransactionConfirmed.bind(this),
    );

    this.messagingSystem.subscribe(
      'TransactionController:transactionFailed',
      this.handleTransactionFailed.bind(this),
    );

    this.messagingSystem.subscribe(
      'TransactionController:transactionRejected',
      this.handleTransactionRejected.bind(this),
    );

    this.initializeProviders().catch((error) => {
      DevLogger.log('PredictController: Error initializing providers', {
        error:
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.UNKNOWN_ERROR,
        timestamp: new Date().toISOString(),
      });
    });

    this.refreshEligibility().catch((error) => {
      DevLogger.log('PredictController: Error refreshing eligibility', {
        error:
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.UNKNOWN_ERROR,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Handle transaction submitted event
   */
  private handleTransactionSubmitted(
    _event: TransactionControllerTransactionSubmittedEvent['payload'][0],
  ): void {
    // TODO: Implement transaction submission tracking
  }

  /**
   * Handle transaction confirmed event
   */
  private async handleTransactionConfirmed(
    _txMeta: TransactionControllerTransactionConfirmedEvent['payload'][0],
  ): Promise<void> {
    const batchId = _txMeta.batchId;
    const txId = _txMeta.id;
    const id = batchId ?? txId;

    if (!id) {
      return;
    }

    // Check claim transaction (single tx)
    const claimTransaction = this.state.claimTransaction;
    if (claimTransaction?.transactionId === id) {
      this.update((state) => {
        if (!state.claimTransaction) return;
        state.claimTransaction.status = PredictClaimStatus.CONFIRMED;
      });
      return;
    }
  }

  /**
   * Handle transaction failed event
   */
  private handleTransactionFailed(
    _event: TransactionControllerTransactionFailedEvent['payload'][0],
  ): void {
    const batchId = _event.transactionMeta.batchId;
    const txId = _event.transactionMeta.id;
    const id = batchId ?? txId;

    if (!id) {
      return;
    }

    // Check claim transaction
    const claimTransaction = this.state.claimTransaction;
    if (claimTransaction?.transactionId === id) {
      this.update((state) => {
        if (!state.claimTransaction) return;
        state.claimTransaction.status = PredictClaimStatus.ERROR;
      });
      return;
    }
  }

  /**
   * Handle transaction rejected event
   */
  private handleTransactionRejected(
    _event: TransactionControllerTransactionRejectedEvent['payload'][0],
  ): void {
    const batchId = _event.transactionMeta.batchId;
    const txId = _event.transactionMeta.id;
    const id = batchId ?? txId;

    if (!id) {
      return;
    }

    // Check claim transaction
    const claimTransaction = this.state.claimTransaction;
    if (claimTransaction?.transactionId === id) {
      this.update((state) => {
        if (!state.claimTransaction) return;
        state.claimTransaction.status = PredictClaimStatus.CANCELLED;
      });
      return;
    }
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

      throw error;
    }
  }

  /**
   * Track Predict order analytics events
   * @private
   */
  private async trackPredictOrderEvent({
    eventType,
    amount,
    analyticsProperties,
    provider,
    providerId,
    ownerAddress,
    completionDuration,
    orderId,
    failureReason,
  }: {
    eventType: PredictEventTypeValue;
    amount: number;
    analyticsProperties?: PlaceOrderParams['analyticsProperties'];
    provider?: PredictProvider;
    providerId: string;
    ownerAddress?: string;
    completionDuration?: number;
    orderId?: string;
    failureReason?: string;
  }): Promise<void> {
    if (!analyticsProperties) {
      return;
    }

    // Get safe address from account state for analytics (only if provider and ownerAddress available)
    let safeAddress: string | undefined;
    if (provider && ownerAddress) {
      try {
        const accountState = await provider.getAccountState({
          providerId,
          ownerAddress,
        });
        safeAddress = accountState.address;
      } catch {
        // If we can't get safe address, continue without it
      }
    }

    // Build regular properties (common to all events)
    const regularProperties = {
      [PredictEventProperties.TIMESTAMP]: Date.now(),
      [PredictEventProperties.MARKET_ID]: analyticsProperties.marketId,
      [PredictEventProperties.MARKET_TITLE]: analyticsProperties.marketTitle,
      [PredictEventProperties.MARKET_CATEGORY]:
        analyticsProperties.marketCategory,
      [PredictEventProperties.ENTRY_POINT]: analyticsProperties.entryPoint,
      [PredictEventProperties.TRANSACTION_TYPE]:
        analyticsProperties.transactionType,
      [PredictEventProperties.LIQUIDITY]: analyticsProperties.liquidity,
      [PredictEventProperties.SHARE_PRICE]: analyticsProperties.sharePrice,
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
      [PredictEventProperties.AMOUNT]: amount,
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

  async placeOrder<T>(params: PlaceOrderParams): Promise<Result<T>> {
    const startTime = performance.now();
    const { analyticsProperties, size, providerId } = params;

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
        amount: size,
        analyticsProperties,
        provider,
        providerId,
        ownerAddress: selectedAddress,
      });

      const result = await provider.placeOrder({ ...params, signer });

      // Track Predict Action Completed or Failed
      const completionDuration = performance.now() - startTime;

      if (result.success) {
        // Extract order ID from response if available
        const orderId =
          result.response &&
          typeof result.response === 'object' &&
          'orderID' in result.response
            ? (result.response as { orderID?: string }).orderID
            : undefined;

        // Track Predict Action Completed (fire and forget)
        this.trackPredictOrderEvent({
          eventType: PredictEventType.COMPLETED,
          amount: size,
          analyticsProperties,
          provider,
          providerId,
          ownerAddress: selectedAddress,
          completionDuration,
          orderId,
        });
      } else {
        // Track Predict Action Failed (fire and forget)
        this.trackPredictOrderEvent({
          eventType: PredictEventType.FAILED,
          amount: size,
          analyticsProperties,
          provider,
          providerId,
          ownerAddress: selectedAddress,
          completionDuration,
          failureReason: result.error || 'Unknown error',
        });
      }

      return result as Result<T>;
    } catch (error) {
      const completionDuration = performance.now() - startTime;

      // Track Predict Action Failed (fire and forget)
      // Note: If provider/ownerAddress unavailable, we'll track without user_address
      const provider = this.providers.get(providerId);
      const selectedAddress =
        Engine.context?.AccountsController?.getSelectedAccount()?.address;

      this.trackPredictOrderEvent({
        eventType: PredictEventType.FAILED,
        amount: size,
        analyticsProperties,
        provider,
        providerId,
        ownerAddress: selectedAddress,
        completionDuration,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.PLACE_ORDER_FAILED,
      };
    }
  }

  async calculateBetAmounts(
    params: CalculateBetAmountsParams,
  ): Promise<CalculateBetAmountsResponse> {
    const provider = this.providers.get(params.providerId);
    if (!provider) {
      throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
    }
    return provider.calculateBetAmounts(params);
  }

  async calculateCashOutAmounts(
    params: CalculateCashOutAmountsParams,
  ): Promise<CalculateCashOutAmountsResponse> {
    const provider = this.providers.get(params.providerId);
    if (!provider) {
      throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
    }
    return provider.calculateCashOutAmounts(params);
  }

  async claim({ positions, providerId }: ClaimParams): Promise<PredictClaim> {
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

    const claimTransaction = await provider.prepareClaim({
      positions,
      signer,
    });

    const { transactionMeta } = await addTransaction(
      {
        ...claimTransaction.transactionParams,
      },
      {
        networkClientId: NetworkController.findNetworkClientIdByChainId(
          numberToHex(claimTransaction.chainId),
        ),
        origin: ORIGIN_METAMASK,
        type: TransactionType.contractInteraction,
      },
    );

    const predictClaim: PredictClaim = {
      transactionId: transactionMeta.id,
      chainId: claimTransaction.chainId,
      status: PredictClaimStatus.PENDING,
      txParams: { ...claimTransaction.transactionParams, value: '0x0' },
    };

    this.update((state) => {
      state.claimTransaction = predictClaim;
    });

    return predictClaim;
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

  public clearClaimTransactions(): void {
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
  }

  public async getBalance(params: GetBalanceParams): Promise<number> {
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
  }
}
