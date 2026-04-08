import { AccountTreeControllerGetAccountsFromSelectedAccountGroupAction } from '@metamask/account-tree-controller';
import { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';
import {
  BaseController,
  ControllerGetStateAction,
  ControllerStateChangeEvent,
  StateMetadata,
} from '@metamask/base-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { isEvmAccountType } from '@metamask/keyring-api';
import {
  KeyringControllerSignPersonalMessageAction,
  KeyringControllerSignTypedMessageAction,
  PersonalMessageParams,
  SignTypedDataVersion,
  TypedMessageParams,
} from '@metamask/keyring-controller';
import type { Messenger } from '@metamask/messenger';
import {
  NetworkControllerFindNetworkClientIdByChainIdAction,
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetStateAction,
} from '@metamask/network-controller';
import {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';
import {
  TransactionControllerEstimateGasAction,
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerTransactionFailedEvent,
  TransactionControllerTransactionRejectedEvent,
  TransactionControllerTransactionStatusUpdatedEvent,
  TransactionControllerTransactionSubmittedEvent,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex, hexToNumber, numberToHex } from '@metamask/utils';
import performance from 'react-native-performance';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Logger, { type LoggerErrorOptions } from '../../../../util/Logger';

import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import { AssetType } from '../../../Views/confirmations/types/token';
import { PREDICT_CONSTANTS, PREDICT_ERROR_CODES } from '../constants/errors';
import { PredictTradeStatus } from '../constants/eventNames';

import { GEO_BLOCKED_COUNTRIES } from '../constants/geoblock';

import { PREDICT_BALANCE_PLACEHOLDER_ADDRESS } from '../constants/transactions';
import { PolymarketProvider } from '../providers/polymarket/PolymarketProvider';
import {
  MATIC_CONTRACTS,
  POLYMARKET_PROVIDER_ID,
} from '../providers/polymarket/constants';
import { Signer } from '../providers/types';

import {
  AccountState,
  ActiveOrderState,
  ClaimParams,
  ConnectionStatus,
  GameUpdateCallback,
  GetAccountStateParams,
  GetBalanceParams,
  GetMarketsParams,
  GetPositionsParams,
  GetPriceHistoryParams,
  GetPriceParams,
  GetPriceResponse,
  GetSeriesParams,
  OrderPreview,
  PlaceOrderParams,
  PredictAccountMeta,
  PredictActivity,
  PredictBalance,
  PredictClaim,
  PredictClaimStatus,
  PredictMarket,
  PredictPosition,
  PredictPositionStatus,
  PredictPriceHistoryPoint,
  PredictWithdraw,
  PredictWithdrawStatus,
  PrepareDepositParams,
  PrepareWithdrawParams,
  PreviewOrderParams,
  PriceUpdateCallback,
  Result,
  Side,
  UnrealizedPnL,
} from '../types';
import { PredictFeatureFlags } from '../types/flags';

import { ensureError } from '../utils/predictErrorHandler';
import { resolvePredictFeatureFlags } from '../utils/resolvePredictFeatureFlags';
import { validateDepositTransactions } from '../utils/validateTransactions';
import { PredictAnalytics } from './PredictAnalytics';
import type { PredictControllerMethodActions } from './PredictController-method-action-types';
import { withTrace, type TraceableController } from './utils/withTrace';

/**
 * State shape for PredictController
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictControllerState = {
  eligibility: {
    eligible: boolean;
    country?: string;
  };

  // Error handling
  lastError: string | null;
  lastUpdateTimestamp: number;

  // Account balances
  balances: { [address: string]: PredictBalance };

  // Claim management (this should always be ALL claimable positions)
  claimablePositions: { [address: string]: PredictPosition[] };

  // Deposit management
  pendingDeposits: { [address: string]: string };

  // Claim management (pending claim tracking per account)
  pendingClaims: { [address: string]: string };

  // Withdraw management
  // TODO: change to be per-account basis
  withdrawTransaction: PredictWithdraw | null;

  activeBuyOrders: {
    [address: string]: {
      transactionId?: string;
      state: ActiveOrderState;
      error?: string;
    };
  };

  selectedPaymentToken: {
    address: string;
    chainId: string;
    symbol?: string;
  } | null;

  // Persisted data
  accountMeta: {
    [providerId: string]: { [address: string]: PredictAccountMeta };
  };
};

/**
 * Get default PredictController state
 */
export const getDefaultPredictControllerState = (): PredictControllerState => ({
  eligibility: { eligible: false },
  lastError: null,
  lastUpdateTimestamp: 0,
  balances: {},
  claimablePositions: {},
  pendingDeposits: {},
  pendingClaims: {},
  withdrawTransaction: null,
  activeBuyOrders: {},
  selectedPaymentToken: null,
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
  pendingClaims: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
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
  activeBuyOrders: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
  selectedPaymentToken: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
};

/**
 * PredictController events
 */
export type PredictTransactionEventType =
  | 'deposit'
  | 'depositAndOrder'
  | 'claim'
  | 'withdraw'
  | 'order';

export type PredictTransactionEventStatus =
  | 'approved'
  | 'confirmed'
  | 'failed'
  | 'rejected'
  | 'depositing';

export interface PredictControllerTransactionStatusChangedEvent {
  type: 'PredictController:transactionStatusChanged';
  payload: [
    {
      type: PredictTransactionEventType;
      status: PredictTransactionEventStatus;
      senderAddress: string;
      transactionId?: string;
      amount?: number;
      marketId?: string;
    },
  ];
}

export type PredictTransactionStatusChangedPayload =
  PredictControllerTransactionStatusChangedEvent['payload'][0];

export type PredictControllerEvents =
  | ControllerStateChangeEvent<'PredictController', PredictControllerState>
  | PredictControllerTransactionStatusChangedEvent;

/**
 * The action which can be used to retrieve the state of the PredictController.
 */
export type PredictControllerGetStateAction = ControllerGetStateAction<
  'PredictController',
  PredictControllerState
>;

/**
 * PredictController actions
 */
export type PredictControllerActions =
  | PredictControllerGetStateAction
  | PredictControllerMethodActions;

/**
 * External actions the PredictController can call
 */
type AllowedActions =
  | AccountsControllerGetSelectedAccountAction
  | AccountTreeControllerGetAccountsFromSelectedAccountGroupAction
  | NetworkControllerGetStateAction
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | NetworkControllerGetNetworkClientByIdAction
  | TransactionControllerEstimateGasAction
  | KeyringControllerSignTypedMessageAction
  | KeyringControllerSignPersonalMessageAction
  | RemoteFeatureFlagControllerGetStateAction;

/**
 * External events the PredictController can subscribe to
 */
type AllowedEvents =
  | TransactionControllerTransactionSubmittedEvent
  | TransactionControllerTransactionConfirmedEvent
  | TransactionControllerTransactionFailedEvent
  | TransactionControllerTransactionRejectedEvent
  | TransactionControllerTransactionStatusUpdatedEvent
  | RemoteFeatureFlagControllerStateChangeEvent;

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

const MESSENGER_EXPOSED_METHODS = [
  'beforeSign',
  'claimWithConfirmation',
  'clearActiveOrder',
  'clearActiveOrderTransactionId',
  'clearOrderError',
  'clearPendingDeposit',
  'clearWithdrawTransaction',
  'confirmClaim',
  'depositWithConfirmation',
  'getAccountState',
  'getActivity',
  'getBalance',
  'getConnectionStatus',
  'getMarket',
  'getMarketSeries',
  'getMarkets',
  'getPositions',
  'getPriceHistory',
  'getPrices',
  'getUnrealizedPnL',
  'initPayWithAnyToken',
  'onPlaceOrderSuccess',
  'placeOrder',
  'prepareWithdraw',
  'previewOrder',
  'refreshEligibility',
  'selectPaymentToken',
  'setSelectedPaymentToken',
  'subscribeToGameUpdates',
  'subscribeToMarketPrices',
  'trackActivityViewed',
  'trackFeedViewed',
  'trackGeoBlockTriggered',
  'trackMarketDetailsOpened',
  'trackPositionViewed',
  'trackPredictOrderEvent',
  'trackShareAction',
] as const;

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
  private provider: PolymarketProvider;

  private pendingOrderPreviews: {
    [transactionId: string]: {
      preview: OrderPreview;
      signerAddress: string;
      analyticsProperties?: PlaceOrderParams['analyticsProperties'];
    };
  } = {};

  private readonly traceable: TraceableController = {
    update: (updater) => this.update(updater),
    getErrorContext: (method, extra) => this.getErrorContext(method, extra),
  };

  public readonly analytics: PredictAnalytics;

  constructor({ messenger, state = {} }: PredictControllerOptions) {
    super({
      name: 'PredictController',
      metadata,
      messenger,
      state: { ...getDefaultPredictControllerState(), ...state },
    });

    this.messenger.registerMethodActionHandlers(
      this,
      MESSENGER_EXPOSED_METHODS,
    );

    this.provider = new PolymarketProvider({
      getFeatureFlags: () => this.resolveFeatureFlags(),
    });

    this.analytics = new PredictAnalytics({
      getEligibility: () => this.state.eligibility ?? { eligible: false },
    });

    this.messenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      this.handleTransactionStatusUpdate.bind(this),
    );

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
          provider: POLYMARKET_PROVIDER_ID,
        }),
      );
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
    const selectedAddress = address ?? this.getEvmAccountAddress();
    return {
      address: selectedAddress,
      signTypedMessage: (
        _params: TypedMessageParams,
        _version: SignTypedDataVersion,
      ) =>
        this.messenger.call(
          'KeyringController:signTypedMessage',
          _params,
          _version,
        ),
      signPersonalMessage: (_params: PersonalMessageParams) =>
        this.messenger.call('KeyringController:signPersonalMessage', _params),
    };
  }

  private resolveFeatureFlags(): PredictFeatureFlags {
    const remoteFeatureFlagState = this.messenger.call(
      'RemoteFeatureFlagController:getState',
    );
    return resolvePredictFeatureFlags(remoteFeatureFlagState);
  }

  private getEvmAccountAddress(): string {
    const accounts = this.messenger.call(
      'AccountTreeController:getAccountsFromSelectedAccountGroup',
    );
    const evmAccount = accounts.find(
      (account) => account && isEvmAccountType(account.type),
    );
    return evmAccount?.address ?? '0x0';
  }

  private async invalidateQueryCache(chainId: number) {
    const networkClientId = this.messenger.call(
      'NetworkController:findNetworkClientIdByChainId',
      numberToHex(chainId),
    );
    const networkClient = this.messenger.call(
      'NetworkController:getNetworkClientById',
      networkClientId,
    );
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

  async getMarkets(params: GetMarketsParams): Promise<PredictMarket[]> {
    return withTrace(
      this.traceable,
      {
        method: 'getMarkets',
        trace: {
          name: TraceName.PredictGetMarkets,
          op: TraceOperation.PredictDataFetch,
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            providerId: POLYMARKET_PROVIDER_ID,
            ...(params.category && { category: params.category }),
          },
        },
        errorContext: {
          providerId: POLYMARKET_PROVIDER_ID,
          category: params.category,
          sortBy: params.sortBy,
          sortDirection: params.sortDirection,
          status: params.status,
          hasSearchQuery: !!params.q,
        },
        fallbackErrorCode: PREDICT_ERROR_CODES.MARKETS_FAILED,
        traceData: (markets) => ({ marketCount: markets.length }),
      },
      async () => {
        const featureFlags = this.resolveFeatureFlags();
        const allMarkets = await this.provider.getMarkets(params);

        let markets = allMarkets.filter(
          (market): market is PredictMarket => market !== undefined,
        );

        const isFirstPage = !params.offset || params.offset === 0;
        const highlights = featureFlags.marketHighlightsFlag.highlights ?? [];
        const shouldFetchHighlights =
          highlights.length > 0 && isFirstPage && params.category && !params.q;

        if (shouldFetchHighlights) {
          const highlightedMarketIds =
            highlights.find((h) => h.category === params.category)?.markets ??
            [];

          if (highlightedMarketIds.length > 0) {
            const fetchedHighlightedMarkets =
              (await this.provider.getMarketsByIds?.(highlightedMarketIds)) ??
              [];

            const highlightedMarkets = fetchedHighlightedMarkets.filter(
              (market) => market.status === 'open',
            );

            const highlightedIdSet = new Set(
              highlightedMarkets.map((m) => m.id),
            );
            markets = markets.filter(
              (market) => !highlightedIdSet.has(market.id),
            );

            markets = [...highlightedMarkets, ...markets];
          }
        }

        return markets;
      },
    );
  }

  async getCarouselMarkets(): Promise<PredictMarket[]> {
    return withTrace(
      this.traceable,
      {
        method: 'getCarouselMarkets',
        trace: {
          name: TraceName.PredictGetMarkets,
          op: TraceOperation.PredictDataFetch,
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            providerId: POLYMARKET_PROVIDER_ID,
          },
        },
        errorContext: { providerId: POLYMARKET_PROVIDER_ID },
        fallbackErrorCode: PREDICT_ERROR_CODES.MARKETS_FAILED,
        traceData: (markets) => ({ marketCount: markets.length }),
      },
      async () => (await this.provider.getCarouselMarkets?.()) ?? [],
    );
  }

  /**
   * Get detailed information for a single market
   */
  async getMarket({
    marketId,
  }: {
    marketId: string | number;
  }): Promise<PredictMarket> {
    const resolvedMarketId = String(marketId);

    if (!resolvedMarketId) {
      throw new Error('marketId is required');
    }

    return withTrace(
      this.traceable,
      {
        method: 'getMarket',
        trace: {
          name: TraceName.PredictGetMarket,
          op: TraceOperation.PredictDataFetch,
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            providerId: POLYMARKET_PROVIDER_ID,
          },
        },
        errorContext: {
          marketId: resolvedMarketId,
          providerId: POLYMARKET_PROVIDER_ID,
        },
        fallbackErrorCode: PREDICT_ERROR_CODES.MARKET_DETAILS_FAILED,
      },
      async () => {
        try {
          return await this.provider.getMarketDetails({
            marketId: resolvedMarketId,
          });
        } catch (error) {
          if (error instanceof Error) throw error;
          throw new Error(PREDICT_ERROR_CODES.MARKET_DETAILS_FAILED);
        }
      },
    );
  }

  async getMarketSeries(params: GetSeriesParams): Promise<PredictMarket[]> {
    return this.provider.getMarketSeries(params);
  }

  async getPriceHistory(
    params: GetPriceHistoryParams,
  ): Promise<PredictPriceHistoryPoint[]> {
    return withTrace(
      this.traceable,
      {
        method: 'getPriceHistory',
        trace: {
          name: TraceName.PredictGetPriceHistory,
          op: TraceOperation.PredictDataFetch,
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            providerId: POLYMARKET_PROVIDER_ID,
            ...(params.interval && { interval: params.interval }),
          },
        },
        errorContext: {
          providerId: POLYMARKET_PROVIDER_ID,
          marketId: params.marketId,
          fidelity: params.fidelity,
          interval: params.interval,
        },
        fallbackErrorCode: PREDICT_ERROR_CODES.PRICE_HISTORY_FAILED,
        traceData: (history) => ({ pointCount: history.length }),
      },
      async () => {
        const history = await this.provider.getPriceHistory(params);
        return history ?? [];
      },
    );
  }

  async getPrices(params: GetPriceParams): Promise<GetPriceResponse> {
    return withTrace(
      this.traceable,
      {
        method: 'getPrices',
        trace: {
          name: TraceName.PredictGetPrices,
          op: TraceOperation.PredictDataFetch,
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            providerId: POLYMARKET_PROVIDER_ID,
          },
          data: {
            queryCount: params.queries?.length ?? 0,
          },
        },
        errorContext: {
          providerId: POLYMARKET_PROVIDER_ID,
          queriesCount: params.queries?.length,
        },
        fallbackErrorCode: PREDICT_ERROR_CODES.UNKNOWN_ERROR,
        traceData: (response) => ({
          priceCount: response.results?.length ?? 0,
        }),
      },
      async () => this.provider.getPrices({ queries: params.queries }),
    );
  }

  async getPositions(params: GetPositionsParams): Promise<PredictPosition[]> {
    const selectedAddress = params.address ?? this.getSigner().address;

    return withTrace(
      this.traceable,
      {
        method: 'getPositions',
        trace: {
          name: TraceName.PredictGetPositions,
          op: TraceOperation.PredictDataFetch,
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            providerId: POLYMARKET_PROVIDER_ID,
            claimable: params.claimable ?? false,
          },
        },
        errorContext: {
          providerId: POLYMARKET_PROVIDER_ID,
          claimable: params.claimable,
          marketId: params.marketId,
        },
        fallbackErrorCode: PREDICT_ERROR_CODES.POSITIONS_FAILED,
        traceData: (positions) => ({ positionCount: positions.length }),
        updateErrorState: false,
        onSuccess: (positions) => {
          this.update((state) => {
            state.lastError = null;
            state.lastUpdateTimestamp = Date.now();
            if (params.claimable === true) {
              state.claimablePositions[selectedAddress] = [...positions];
            } else if (params.claimable === undefined) {
              state.claimablePositions[selectedAddress] = positions.filter(
                (p) => p.claimable,
              );
            }
          });
        },
      },
      async () => {
        try {
          return await this.provider.getPositions({
            ...params,
            address: selectedAddress,
          });
        } catch (error) {
          this.update((state) => {
            state.lastError =
              error instanceof Error
                ? error.message
                : PREDICT_ERROR_CODES.POSITIONS_FAILED;
            state.lastUpdateTimestamp = Date.now();
          });
          throw error;
        }
      },
    );
  }

  async getActivity(params: { address?: string }): Promise<PredictActivity[]> {
    return withTrace(
      this.traceable,
      {
        method: 'getActivity',
        trace: {
          name: TraceName.PredictGetActivity,
          op: TraceOperation.PredictDataFetch,
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            providerId: POLYMARKET_PROVIDER_ID,
          },
        },
        errorContext: { providerId: POLYMARKET_PROVIDER_ID },
        fallbackErrorCode: PREDICT_ERROR_CODES.ACTIVITY_NOT_AVAILABLE,
        traceData: (activity) => ({ activityCount: activity.length }),
      },
      async () => {
        const selectedAddress = params.address ?? this.getSigner().address;
        return this.provider.getActivity({ address: selectedAddress });
      },
    );
  }

  async getUnrealizedPnL({
    address,
  }: {
    address?: string;
  }): Promise<UnrealizedPnL> {
    return withTrace(
      this.traceable,
      {
        method: 'getUnrealizedPnL',
        trace: {
          name: TraceName.PredictGetUnrealizedPnL,
          op: TraceOperation.PredictDataFetch,
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            providerId: POLYMARKET_PROVIDER_ID,
          },
        },
        errorContext: { providerId: POLYMARKET_PROVIDER_ID },
        fallbackErrorCode: 'Failed to fetch unrealized P&L',
      },
      async () => {
        const selectedAddress = address ?? this.getSigner().address;
        return this.provider.getUnrealizedPnL({ address: selectedAddress });
      },
    );
  }

  /**
   * Track Predict trade transaction analytics event
   * Uses a single consolidated event with status discriminator
   * @public
   */
  public async trackPredictOrderEvent(
    args: Parameters<PredictAnalytics['trackPredictOrderEvent']>[0],
  ): Promise<void> {
    return this.analytics.trackPredictOrderEvent(args);
  }

  public trackMarketDetailsOpened(
    args: Parameters<PredictAnalytics['trackMarketDetailsOpened']>[0],
  ): void {
    this.analytics.trackMarketDetailsOpened(args);
  }

  public trackPositionViewed(
    args: Parameters<PredictAnalytics['trackPositionViewed']>[0],
  ): void {
    this.analytics.trackPositionViewed(args);
  }

  public trackActivityViewed(
    args: Parameters<PredictAnalytics['trackActivityViewed']>[0],
  ): void {
    this.analytics.trackActivityViewed(args);
  }

  public trackGeoBlockTriggered(
    args: Parameters<PredictAnalytics['trackGeoBlockTriggered']>[0],
  ): void {
    this.analytics.trackGeoBlockTriggered(args);
  }

  public trackFeedViewed(
    args: Parameters<PredictAnalytics['trackFeedViewed']>[0],
  ): void {
    this.analytics.trackFeedViewed(args);
  }

  public trackShareAction(
    args: Parameters<PredictAnalytics['trackShareAction']>[0],
  ): void {
    this.analytics.trackShareAction(args);
  }

  async previewOrder(params: PreviewOrderParams): Promise<OrderPreview> {
    try {
      const provider = this.provider;

      const signer = this.getSigner();

      return provider.previewOrder({ ...params, signer });
    } catch (error) {
      // Log to Sentry with preview context (no sensitive amounts)
      Logger.error(
        ensureError(error),
        this.getErrorContext('previewOrder', {
          providerId: POLYMARKET_PROVIDER_ID,
          side: params.side,
          marketId: params.marketId,
          outcomeId: params.outcomeId,
        }),
      );

      throw error;
    }
  }

  async placeOrder(params: PlaceOrderParams): Promise<Result> {
    const activeOrderAddress = params.address ?? this.getEvmAccountAddress();
    const { predictWithAnyTokenEnabled } = this.resolveFeatureFlags();
    const isBuyWithAnyToken =
      predictWithAnyTokenEnabled && params.preview.side === Side.BUY;

    const isExistingPendingOrder =
      !!params.transactionId &&
      !!this.pendingOrderPreviews[params.transactionId];

    if (
      predictWithAnyTokenEnabled &&
      this.state.activeBuyOrders[activeOrderAddress]?.state ===
        ActiveOrderState.PAY_WITH_ANY_TOKEN &&
      !isExistingPendingOrder
    ) {
      const transactionId = params.transactionId;
      if (transactionId) {
        this.pendingOrderPreviews[transactionId] = {
          preview: params.preview,
          signerAddress: activeOrderAddress,
          analyticsProperties: params.analyticsProperties,
        };
      }
      this.update((state) => {
        if (state.activeBuyOrders[activeOrderAddress]) {
          state.activeBuyOrders[activeOrderAddress].state =
            ActiveOrderState.DEPOSITING;
          state.activeBuyOrders[activeOrderAddress].transactionId =
            transactionId;
        }
      });

      try {
        await this.provider.createOptimisticPositionFromPreview({
          address: activeOrderAddress,
          preview: params.preview,
        });
      } catch (error) {
        DevLogger.log(
          'PredictController: Failed to create optimistic position at deposit',
          { error: error instanceof Error ? error.message : String(error) },
        );
      }

      this.trackPredictOrderEvent({
        status: PredictTradeStatus.SUBMITTED,
        amountUsd: params.preview?.maxAmountSpent,
        analyticsProperties: params.analyticsProperties,
        sharePrice: params.preview?.sharePrice,
        orderType: params.preview.orderType,
        paymentTokenAddress:
          params.preview.side === Side.BUY
            ? this.state.selectedPaymentToken?.address
            : undefined,
      });

      this.messenger.publish('PredictController:transactionStatusChanged', {
        type: 'order',
        status: 'depositing',
        senderAddress: activeOrderAddress,
        marketId: params.analyticsProperties?.marketId,
      });

      return {
        success: false,
        response: { status: 'deposit_in_progress' },
      } as unknown as Result;
    }

    if (isBuyWithAnyToken) {
      this.update((state) => {
        if (state.activeBuyOrders[activeOrderAddress]) {
          state.activeBuyOrders[activeOrderAddress].state =
            ActiveOrderState.PLACING_ORDER;
        }
      });
    }

    const startTime = performance.now();
    const { analyticsProperties, preview } = params;

    const sharePrice = preview?.sharePrice;
    const amountUsd =
      preview.side === Side.BUY
        ? preview?.maxAmountSpent
        : preview?.minAmountReceived;

    // Start Sentry trace for place order operation
    const traceId = `place-order-${Date.now()}`;
    let traceData:
      | { success: boolean; error?: string; side?: string }
      | undefined;

    trace({
      name: TraceName.PredictPlaceOrder,
      op: TraceOperation.PredictOrderSubmission,
      id: traceId,
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        providerId: POLYMARKET_PROVIDER_ID,
        side: preview.side,
      },
      data: {
        ...(analyticsProperties?.marketId && {
          marketId: analyticsProperties.marketId,
        }),
      },
    });

    try {
      const provider = this.provider;

      const signer = this.getSigner(activeOrderAddress);

      // Track Predict Trade Transaction with submitted status (fire and forget)
      this.trackPredictOrderEvent({
        status: PredictTradeStatus.SUBMITTED,
        amountUsd,
        analyticsProperties,
        sharePrice,
        orderType: preview.orderType,
      });

      // Invalidate query cache (to avoid nonce issues)
      await this.invalidateQueryCache(provider.chainId);

      const result = await provider.placeOrder({
        ...params,
        signer,
      });

      // Track Predict Action Completed or Failed
      const completionDuration = performance.now() - startTime;

      if (!result.success) {
        throw new Error(result.error);
      }

      if (isBuyWithAnyToken) {
        this.update((state) => {
          if (state.activeBuyOrders[activeOrderAddress]) {
            state.activeBuyOrders[activeOrderAddress].state =
              ActiveOrderState.SUCCESS;
          }
        });
      }

      const { spentAmount, receivedAmount } = result.response;

      const cachedBalance = this.state.balances[signer.address]?.balance ?? 0;
      let realAmountUsd = amountUsd;
      let realSharePrice = sharePrice;
      try {
        if (preview.side === Side.BUY) {
          const totalFee = params.preview.fees?.totalFee ?? 0;
          realAmountUsd = parseFloat(spentAmount);
          realSharePrice = parseFloat(spentAmount) / parseFloat(receivedAmount);

          // Optimistically update balance
          this.update((state) => {
            state.balances[signer.address] = {
              balance: cachedBalance - (realAmountUsd + totalFee),
              // valid for 5 seconds (since it takes some time to reflect balance on-chain)
              validUntil: Date.now() + 5000,
            };
          });
        } else {
          realAmountUsd = parseFloat(receivedAmount);
          realSharePrice = parseFloat(receivedAmount) / parseFloat(spentAmount);

          // Optimistically update balance
          this.update((state) => {
            state.balances[signer.address] = {
              balance: cachedBalance + realAmountUsd,
              // valid for 5 seconds (since it takes some time to reflect balance on-chain)
              validUntil: Date.now() + 5000,
            };
          });
        }
      } catch (_e) {
        // If we can't get real share price, continue without it
      }

      if (isBuyWithAnyToken) {
        this.messenger.publish('PredictController:transactionStatusChanged', {
          type: 'order',
          status: 'confirmed',
          senderAddress: signer.address,
          marketId: analyticsProperties?.marketId,
        });
      }

      // Track Predict Trade Transaction with succeeded status (fire and forget)
      this.trackPredictOrderEvent({
        status: PredictTradeStatus.SUCCEEDED,
        amountUsd: realAmountUsd,
        analyticsProperties,
        completionDuration,
        sharePrice: realSharePrice,
        orderType: preview.orderType,
      });

      traceData = { success: true, side: preview.side };
      return result as unknown as Result;
    } catch (error) {
      const completionDuration = performance.now() - startTime;
      const errorMessage =
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.PLACE_ORDER_FAILED;

      // Track Predict Trade Transaction with failed status (fire and forget)
      this.trackPredictOrderEvent({
        status: PredictTradeStatus.FAILED,
        amountUsd,
        analyticsProperties,
        sharePrice,
        completionDuration,
        failureReason: errorMessage,
        orderType: preview.orderType,
      });

      // Update error state for Sentry integration
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
        if (isBuyWithAnyToken && state.activeBuyOrders[activeOrderAddress]) {
          state.activeBuyOrders[activeOrderAddress].state =
            ActiveOrderState.PREVIEW;
          state.activeBuyOrders[activeOrderAddress].error = errorMessage;
        }
        if (isBuyWithAnyToken) {
          state.selectedPaymentToken = null;
        }
      });

      if (isBuyWithAnyToken) {
        this.provider.clearOptimisticPosition(
          activeOrderAddress,
          preview.outcomeTokenId,
        );
      }

      traceData = { success: false, error: errorMessage };

      const isBackgroundOrder =
        params.transactionId !== undefined &&
        params.transactionId !==
          this.state.activeBuyOrders[activeOrderAddress]?.transactionId;

      if (isBuyWithAnyToken && isBackgroundOrder) {
        this.messenger.publish('PredictController:transactionStatusChanged', {
          type: 'order',
          status: 'failed',
          senderAddress: activeOrderAddress,
          marketId: analyticsProperties?.marketId,
        });
      }

      // Log to Sentry with order context (excluding sensitive data like amounts)
      Logger.error(
        ensureError(error),
        this.getErrorContext('placeOrder', {
          providerId: POLYMARKET_PROVIDER_ID,
          marketId: analyticsProperties?.marketId,
          marketTitle: analyticsProperties?.marketTitle,
          transactionType: analyticsProperties?.transactionType,
          entryPoint: analyticsProperties?.entryPoint,
          completionDuration,
        }),
      );

      if (
        isBuyWithAnyToken &&
        this.state.activeBuyOrders[activeOrderAddress]?.transactionId
      ) {
        this.update((state) => {
          if (state.activeBuyOrders[activeOrderAddress]) {
            state.activeBuyOrders[activeOrderAddress].transactionId = undefined;
          }
        });
        this.initPayWithAnyToken().catch((err) => {
          Logger.error(
            ensureError(err),
            this.getErrorContext('placeOrder', {
              operation: 'initPayWithAnyToken',
            }),
          );
        });
      }

      // Log error for debugging and future Sentry integration
      DevLogger.log('PredictController: Place order failed', {
        error: errorMessage,
        errorDetails: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        providerId: POLYMARKET_PROVIDER_ID,
        params,
      });

      throw new Error(errorMessage);
    } finally {
      if (
        params.transactionId &&
        this.pendingOrderPreviews[params.transactionId]
      ) {
        delete this.pendingOrderPreviews[params.transactionId];
      }
      endTrace({
        name: TraceName.PredictPlaceOrder,
        id: traceId,
        data: traceData,
      });
    }
  }

  async claimWithConfirmation(
    _params: ClaimParams = {},
  ): Promise<PredictClaim> {
    // Start Sentry trace for claim operation
    const traceId = `claim-${Date.now()}`;
    let traceData:
      | {
          success: boolean;
          error?: string;
          reason?: string;
          positionCount?: number;
        }
      | undefined;

    trace({
      name: TraceName.PredictClaim,
      op: TraceOperation.PredictOperation,
      id: traceId,
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        providerId: POLYMARKET_PROVIDER_ID,
      },
    });

    const signer = this.getSigner();

    try {
      const provider = this.provider;

      // Skip if there's already a pending claim for this account
      if (this.state.pendingClaims[signer.address]) {
        traceData = { success: false, reason: 'already_pending' };
        return {
          batchId: this.state.pendingClaims[signer.address],
          chainId: 0,
          status: PredictClaimStatus.PENDING,
        };
      }

      // Get claimable positions from state
      const claimablePositions = this.state.claimablePositions[signer.address];

      if (!claimablePositions || claimablePositions.length === 0) {
        throw new Error('No claimable positions found');
      }

      // Set pending claim placeholder before preparing the transaction
      this.update((state) => {
        state.pendingClaims[signer.address] = 'pending';
      });

      // Invalidate query cache (to avoid nonce issues)
      await this.invalidateQueryCache(provider.chainId);

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
      const networkClientId = this.messenger.call(
        'NetworkController:findNetworkClientIdByChainId',
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
        // Temporarily breaking abstraction, can instead be abstracted via provider.
        gasFeeToken: MATIC_CONTRACTS.collateral as Hex,
        transactions,
      });

      if (!batchResult?.batchId) {
        throw new Error(
          'Failed to get batch ID from claim transaction submission',
        );
      }

      const { batchId } = batchResult;

      // Store the real batchId for pending claim tracking
      this.update((state) => {
        state.pendingClaims[signer.address] = batchId;
      });

      const predictClaim: PredictClaim = {
        batchId,
        chainId,
        status: PredictClaimStatus.PENDING,
      };

      this.update((state) => {
        state.lastError = null; // Clear any previous errors
        state.lastUpdateTimestamp = Date.now();
      });

      traceData = { success: true, positionCount: claimablePositions.length };
      return predictClaim;
    } catch (error) {
      this.clearPendingClaimForAddress({ address: signer.address });

      const e = ensureError(error);
      if (e.message.includes('User denied transaction signature')) {
        traceData = { success: false, reason: 'user_cancelled' };

        // ignore error, as the user cancelled the tx
        return {
          batchId: 'NA',
          chainId: 0,
          status: PredictClaimStatus.CANCELLED,
        };
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.CLAIM_FAILED;

      traceData = { success: false, error: errorMessage };

      // Log to Sentry with claim context (no user address or amounts)
      Logger.error(
        e,
        this.getErrorContext('claimWithConfirmation', {
          providerId: POLYMARKET_PROVIDER_ID,
        }),
      );

      // Log error for debugging and future Sentry integration
      DevLogger.log('PredictController: Claim failed', {
        error: errorMessage,
        errorDetails: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        providerId: POLYMARKET_PROVIDER_ID,
      });

      // Update error state for Sentry integration
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Re-throw the error so the hook can handle it and show the toast
      throw error;
    } finally {
      endTrace({
        name: TraceName.PredictClaim,
        id: traceId,
        data: traceData,
      });
    }
  }

  public confirmClaim({ address }: { address?: string }): void {
    const provider = this.provider;

    const normalizedAddress = (
      address ?? this.getSigner().address
    ).toLowerCase();
    const matchedAddress = Object.keys(this.state.claimablePositions).find(
      (addressKey) => addressKey.toLowerCase() === normalizedAddress,
    );

    if (!matchedAddress) {
      return;
    }

    const signer = this.getSigner(matchedAddress);
    const claimedPositions = this.state.claimablePositions[matchedAddress];
    if (!claimedPositions || claimedPositions.length === 0) {
      return;
    }

    provider.confirmClaim?.({
      positions: claimedPositions,
      signer,
    });

    this.update((state) => {
      state.claimablePositions[matchedAddress] = [];
    });
  }

  private isLocallyGeoblocked(region: { country: string }): boolean {
    return GEO_BLOCKED_COUNTRIES.some(
      ({ country }) => country === region.country,
    );
  }

  /**
   * Refresh eligibility status
   */
  public async refreshEligibility(): Promise<void> {
    DevLogger.log('PredictController: Refreshing eligibility');
    try {
      const geoBlockResponse = await this.provider.isEligible();
      if (geoBlockResponse.isEligible && geoBlockResponse.country) {
        const isLocallyGeoblocked = this.isLocallyGeoblocked({
          country: geoBlockResponse.country,
        });
        geoBlockResponse.isEligible = !isLocallyGeoblocked;
      }
      if (process.env.MM_PREDICT_SKIP_GEOBLOCK === 'true') {
        geoBlockResponse.isEligible = true;
        geoBlockResponse.country = 'N/A';
      }
      this.update((state) => {
        state.eligibility = {
          eligible: geoBlockResponse.isEligible,
          country: geoBlockResponse.country,
        };
      });
    } catch (error) {
      this.update((state) => {
        state.eligibility = {
          eligible: false,
          country: undefined,
        };
      });
      DevLogger.log('PredictController: Eligibility refresh failed', {
        error:
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.UNKNOWN_ERROR,
        timestamp: new Date().toISOString(),
      });

      Logger.error(
        ensureError(error),
        this.getErrorContext('refreshEligibility.provider', {
          providerId: POLYMARKET_PROVIDER_ID,
        }),
      );
    }
  }

  /**
   * Subscribes to real-time game updates via WebSocket.
   *
   * @param gameId - Unique identifier of the game to subscribe to
   * @param callback - Function invoked when game state changes (score, period, status)
   * @returns Unsubscribe function to clean up the subscription
   */
  public subscribeToGameUpdates(
    gameId: string,
    callback: GameUpdateCallback,
  ): () => void {
    const provider = this.provider;
    if (!provider?.subscribeToGameUpdates) {
      return () => undefined;
    }
    return provider.subscribeToGameUpdates(gameId, callback);
  }

  /**
   * Subscribes to real-time market price updates via WebSocket.
   *
   * @param tokenIds - Array of token IDs to subscribe to price updates for
   * @param callback - Function invoked when prices change (includes bestBid/bestAsk)
   * @returns Unsubscribe function to clean up the subscription
   */
  public subscribeToMarketPrices(
    tokenIds: string[],
    callback: PriceUpdateCallback,
  ): () => void {
    const provider = this.provider;
    if (!provider?.subscribeToMarketPrices) {
      return () => undefined;
    }
    return provider.subscribeToMarketPrices(tokenIds, callback);
  }

  /**
   * Gets the current WebSocket connection status for live data feeds.
   *
   * @returns Connection status for sports and market data WebSocket channels
   */
  public getConnectionStatus(): ConnectionStatus {
    const provider = this.provider;
    if (!provider?.getConnectionStatus) {
      return { sportsConnected: false, marketConnected: false };
    }
    return provider.getConnectionStatus();
  }

  public updateStateForTesting(
    updater: (state: PredictControllerState) => void,
  ): void {
    this.update(updater);
  }

  public clearOrderError(): void {
    const address = this.getEvmAccountAddress();
    this.update((state) => {
      if (state.activeBuyOrders[address]) {
        delete state.activeBuyOrders[address].error;
      }
    });
  }

  public onPlaceOrderSuccess(): void {
    const address = this.getEvmAccountAddress();
    this.update((state) => {
      state.activeBuyOrders[address] = {
        state: ActiveOrderState.PREVIEW,
      };
    });
    this.setSelectedPaymentToken(null);
  }

  public clearActiveOrderTransactionId(): void {
    const address = this.getEvmAccountAddress();
    this.update((state) => {
      if (state.activeBuyOrders[address]?.transactionId) {
        state.activeBuyOrders[address].transactionId = undefined;
      }
    });
  }

  public selectPaymentToken(token: AssetType | null): void {
    const isBalanceToken =
      !token || token.address === PREDICT_BALANCE_PLACEHOLDER_ADDRESS;

    this.setSelectedPaymentToken(
      isBalanceToken
        ? null
        : {
            address: token.address,
            chainId: token.chainId ?? '',
            symbol: token.symbol,
          },
    );

    const address = this.getEvmAccountAddress();
    const activeOrder = this.state.activeBuyOrders[address];
    if (!activeOrder) {
      return;
    }

    this.clearOrderError();

    if (activeOrder.state === ActiveOrderState.PAY_WITH_ANY_TOKEN) {
      if (!isBalanceToken) {
        return;
      }
      this.update((state) => {
        if (state.activeBuyOrders[address]) {
          state.activeBuyOrders[address].state = ActiveOrderState.PREVIEW;
        }
      });
      return;
    }

    if (activeOrder.state === ActiveOrderState.PREVIEW) {
      if (isBalanceToken) {
        return;
      }
      this.update((state) => {
        if (state.activeBuyOrders[address]) {
          state.activeBuyOrders[address].state =
            ActiveOrderState.PAY_WITH_ANY_TOKEN;
        }
      });
    }
  }

  public clearActiveOrder(): void {
    const address = this.getEvmAccountAddress();
    this.update((state) => {
      delete state.activeBuyOrders[address];
    });
  }

  public setSelectedPaymentToken(
    token: PredictControllerState['selectedPaymentToken'],
  ): void {
    this.update((state) => {
      state.selectedPaymentToken = token;
    });
  }

  public async depositWithConfirmation(
    _params: PrepareDepositParams = {},
  ): Promise<Result<{ batchId: string }>> {
    const provider = this.provider;

    try {
      const signer = this.getSigner();

      // Clear any previous deposit transaction
      this.update((state) => {
        if (state.pendingDeposits[signer.address]) {
          delete state.pendingDeposits[signer.address];
        }
      });

      const depositPreparation = await provider.prepareDeposit({
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

      DevLogger.log('PredictController: depositWithConfirmation transactions', {
        count: transactions.length,
        transactions: transactions.map((tx, index) => ({
          index,
          type: tx?.type,
          to: tx?.params?.to,
          dataLength: tx?.params?.data?.length ?? 0,
        })),
      });

      validateDepositTransactions(transactions, {
        providerId: POLYMARKET_PROVIDER_ID,
      });

      const networkClientId = this.messenger.call(
        'NetworkController:findNetworkClientIdByChainId',
        chainId,
      );

      if (!networkClientId) {
        throw new Error(`Network client not found for chain ID: ${chainId}`);
      }

      this.update((state) => {
        state.pendingDeposits[signer.address] = 'pending';
      });

      const batchResult = await addTransactionBatch({
        from: signer.address as Hex,
        origin: ORIGIN_METAMASK,
        networkClientId,
        disableHook: true,
        disableSequential: true,
        skipInitialGasEstimate: true,
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
        state.pendingDeposits[signer.address] = batchId;
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
        // Clear pending state before returning
        this.clearPendingDeposit();
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
          providerId: POLYMARKET_PROVIDER_ID,
        }),
      );

      this.clearPendingDeposit();

      throw new Error(
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.DEPOSIT_FAILED,
      );
    }
  }

  /**
   * Prepares and submits a deposit transaction batch using the
   * `predictDepositAndOrder` transaction type. This triggers the new
   * deposit-and-order confirmation screen instead of the standard deposit screen.
   *
   * The flow reuses `provider.prepareDeposit` but overrides the transaction
   * type so the confirmation routing in `info-root.tsx` renders
   * `PredictPayWithAnyTokenInfo`.
   *
   */
  public async initPayWithAnyToken(): Promise<Result<{ batchId: string }>> {
    const provider = this.provider;
    const address = this.getEvmAccountAddress();

    if (!this.state.activeBuyOrders[address]) {
      this.update((state) => {
        state.activeBuyOrders[address] = { state: ActiveOrderState.PREVIEW };
      });
    }

    const currentState = this.state.activeBuyOrders[address]?.state;

    // Reset stale SUCCESS from a background-completed order
    if (currentState === ActiveOrderState.SUCCESS) {
      this.onPlaceOrderSuccess();
    }

    try {
      const signer = this.getSigner();

      const depositPreparation = await provider.prepareDeposit({
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

      // Override transaction types to predictDepositAndOrder so the
      // confirmation routing renders the deposit-and-order info component.
      const depositAndOrderTransactions = transactions.map((tx) => ({
        ...tx,
        type:
          tx.type === TransactionType.predictDeposit
            ? TransactionType.predictDepositAndOrder
            : tx.type,
      }));

      DevLogger.log(
        'PredictController: payWithAnyTokenConfirmation transactions',
        {
          count: depositAndOrderTransactions.length,
          transactions: depositAndOrderTransactions.map((tx, index) => ({
            index,
            type: tx?.type,
            to: tx?.params?.to,
            dataLength: tx?.params?.data?.length ?? 0,
          })),
        },
      );

      validateDepositTransactions(depositAndOrderTransactions, {
        providerId: POLYMARKET_PROVIDER_ID,
      });

      const networkClientId = this.messenger.call(
        'NetworkController:findNetworkClientIdByChainId',
        chainId,
      );

      if (!networkClientId) {
        throw new Error(`Network client not found for chain ID: ${chainId}`);
      }

      const batchResult = await addTransactionBatch({
        from: signer.address as Hex,
        origin: ORIGIN_METAMASK,
        networkClientId,
        disableHook: true,
        disableSequential: true,
        skipInitialGasEstimate: true,
        transactions: depositAndOrderTransactions,
      });

      if (!batchResult?.batchId) {
        throw new Error('Failed to get batch ID from transaction submission');
      }

      const { batchId } = batchResult;

      this.update((state) => {
        if (state.activeBuyOrders[address]) {
          delete state.activeBuyOrders[address].error;
        }
      });

      return {
        success: true,
        response: {
          batchId,
        },
      };
    } catch (error) {
      const e = ensureError(error);
      Logger.error(
        e,
        this.getErrorContext('initPayWithAnyToken', {
          providerId: POLYMARKET_PROVIDER_ID,
        }),
      );

      return {
        success: false,
        error: e.message,
      };
    }
  }

  public clearPendingDeposit(): void {
    const selectedAddress = this.getSigner().address;
    this.clearPendingDepositForAddress({ address: selectedAddress });
  }

  private clearPendingDepositForAddress({
    address,
  }: {
    address: string;
  }): void {
    const normalizedAddress = address.toLowerCase();
    this.update((state) => {
      const matchedAddress = Object.keys(state.pendingDeposits).find(
        (addressKey) => addressKey.toLowerCase() === normalizedAddress,
      );

      if (matchedAddress) {
        delete state.pendingDeposits[matchedAddress];
      }
    });
  }

  private clearPendingClaimForAddress({ address }: { address: string }): void {
    const normalizedAddress = address.toLowerCase();
    this.update((state) => {
      const matchedAddress = Object.keys(state.pendingClaims).find(
        (addressKey) => addressKey.toLowerCase() === normalizedAddress,
      );

      if (matchedAddress) {
        delete state.pendingClaims[matchedAddress];
      }
    });
  }

  private handleTransactionStatusUpdate({
    transactionMeta,
  }: {
    transactionMeta: TransactionMeta;
  }): void {
    const nestedTransactionType = transactionMeta?.nestedTransactions?.find(
      ({ type }) =>
        type === TransactionType.predictDeposit ||
        type === TransactionType.predictDepositAndOrder ||
        type === TransactionType.predictClaim ||
        type === TransactionType.predictWithdraw,
    )?.type;

    if (!nestedTransactionType) {
      return;
    }

    if (
      nestedTransactionType === TransactionType.predictDeposit &&
      !this.isPendingDepositTransaction(transactionMeta)
    ) {
      return;
    }

    const type = this.mapTransactionTypeToPredictTransactionEventType(
      nestedTransactionType,
    );
    const status = this.mapTransactionStatusToPredictTransactionEventStatus(
      transactionMeta.status,
    );

    if (!type || !status) {
      return;
    }

    const address =
      (transactionMeta.txParams.from as string | undefined)?.toLowerCase() ??
      this.getEvmAccountAddress().toLowerCase();
    const transactionId = transactionMeta.id;
    const amount = this.getTransactionAmount({
      type,
      status,
      transactionMeta,
      address,
    });

    try {
      this.handleTransactionSideEffects(type, status, address, transactionMeta);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('handleTransactionStatusUpdate', {
          operation: 'handleTransactionSideEffects',
          type,
          status,
          address,
          transactionId,
        }),
      );
    }

    this.messenger.publish('PredictController:transactionStatusChanged', {
      type,
      status,
      senderAddress: address,
      ...(transactionId ? { transactionId } : {}),
      ...(amount !== undefined ? { amount } : {}),
    });
  }

  private handleTransactionSideEffects(
    type: PredictTransactionEventType,
    status: PredictTransactionEventStatus,
    address: string,
    transactionMeta: TransactionMeta,
  ): void {
    const isTerminal =
      status === 'confirmed' || status === 'failed' || status === 'rejected';

    if (type === 'deposit' && isTerminal) {
      this.clearPendingDepositForAddress({ address });
    }

    if (type === 'depositAndOrder' && status === 'confirmed') {
      const transactionId = transactionMeta.id;
      const pendingOrder = transactionId
        ? this.pendingOrderPreviews[transactionId]
        : null;

      if (!pendingOrder) {
        return;
      }

      const {
        preview,
        signerAddress,
        analyticsProperties: pendingAnalytics,
      } = pendingOrder;

      this.placeOrder({
        analyticsProperties: pendingAnalytics,
        preview,
        address: signerAddress,
        transactionId,
      }).catch((error) => {
        Logger.error(
          ensureError(error),
          this.getErrorContext('handleTransactionSideEffects', {
            operation: 'placeOrder',
          }),
        );
      });
    }

    if (type === 'depositAndOrder' && status === 'failed') {
      const transactionId = transactionMeta.id;

      // Extract market context before deleting the pending order preview
      const pendingOrder = transactionId
        ? this.pendingOrderPreviews[transactionId]
        : null;
      const marketId = pendingOrder?.analyticsProperties?.marketId;
      const outcomeTokenId = pendingOrder?.preview?.outcomeTokenId;

      const isBackgroundOrder =
        transactionId !== undefined &&
        transactionId !== this.state.activeBuyOrders[address]?.transactionId;

      if (transactionId) {
        delete this.pendingOrderPreviews[transactionId];
      }

      if (outcomeTokenId) {
        this.provider.clearOptimisticPosition(address, outcomeTokenId);
      }

      if (this.state.activeBuyOrders[address]) {
        const errorMessage =
          transactionMeta.error?.message ?? PREDICT_ERROR_CODES.DEPOSIT_FAILED;

        this.update((state) => {
          if (state.activeBuyOrders[address]) {
            state.activeBuyOrders[address].state =
              ActiveOrderState.PAY_WITH_ANY_TOKEN;
            state.activeBuyOrders[address].error = errorMessage;
            state.activeBuyOrders[address].transactionId = undefined;
          }
        });
        this.initPayWithAnyToken().catch((error) => {
          Logger.error(
            ensureError(error),
            this.getErrorContext('handleTransactionSideEffects', {
              operation: 'initPayWithAnyToken',
            }),
          );
        });
      }

      if (isBackgroundOrder) {
        this.messenger.publish('PredictController:transactionStatusChanged', {
          type: 'order',
          status: 'failed',
          senderAddress: address,
          marketId,
        });
      }
    }

    if (type === 'depositAndOrder' && status === 'rejected') {
      const transactionId = transactionMeta.id;
      if (transactionId) {
        delete this.pendingOrderPreviews[transactionId];
      }

      if (this.state.activeBuyOrders[address]) {
        this.update((state) => {
          if (state.activeBuyOrders[address]) {
            state.activeBuyOrders[address].state = ActiveOrderState.PREVIEW;
            state.activeBuyOrders[address].transactionId = undefined;
          }
        });
        this.setSelectedPaymentToken(null);
      }
    }

    if (type === 'claim' && isTerminal) {
      this.clearPendingClaimForAddress({ address });
    }

    if (type === 'claim' && status === 'confirmed') {
      this.confirmClaim({ address });
      this.getPositions({ address, claimable: true }).catch(() => undefined);
    }

    if (type === 'withdraw' && isTerminal) {
      this.clearWithdrawTransaction();
    }

    if (status === 'confirmed') {
      this.getBalance({ address }).catch(() => undefined);
    }
  }

  private isPendingDepositTransaction(
    transactionMeta: TransactionMeta,
  ): boolean {
    const { batchId, txParams } = transactionMeta;
    const normalizedFrom = txParams.from?.toLowerCase();

    return Object.entries(this.state.pendingDeposits).some(
      ([address, pendingValue]) => {
        const addressMatch =
          !normalizedFrom || address.toLowerCase() === normalizedFrom;
        if (!addressMatch) {
          return false;
        }

        // Before addTransactionBatch resolves, pendingDeposits stores 'pending'
        // as a placeholder. At that point the transactionMeta may not yet have a
        // batchId, so we match any pending deposit for the same sender.
        if (pendingValue === 'pending') {
          return true;
        }

        // Once the real batchId is stored, require an exact match.
        return Boolean(batchId) && pendingValue === batchId;
      },
    );
  }

  private getClaimAmountByAddress(address: string): number {
    const normalizedAddress = address.toLowerCase();
    const matchedAddress = Object.keys(this.state.claimablePositions).find(
      (addressKey) => addressKey.toLowerCase() === normalizedAddress,
    );

    if (!matchedAddress) {
      return 0;
    }

    return this.state.claimablePositions[matchedAddress].reduce(
      (sum, position) =>
        position.status === PredictPositionStatus.WON
          ? sum + position.currentValue
          : sum,
      0,
    );
  }

  private getTransactionAmount({
    type,
    status,
    transactionMeta,
    address,
  }: {
    type: PredictTransactionEventType;
    status: PredictTransactionEventStatus;
    transactionMeta: TransactionMeta;
    address: string;
  }): number | undefined {
    if (type === 'deposit' && status === 'confirmed') {
      const totalFiat = Number(transactionMeta.metamaskPay?.totalFiat ?? 0);
      const bridgeFeeFiat = Number(
        transactionMeta.metamaskPay?.bridgeFeeFiat ?? 0,
      );
      const networkFeeFiat = Number(
        transactionMeta.metamaskPay?.networkFeeFiat ?? 0,
      );

      const values = [totalFiat, bridgeFeeFiat, networkFeeFiat];
      if (values.some((value) => Number.isNaN(value))) {
        return undefined;
      }

      return Math.max(totalFiat - bridgeFeeFiat - networkFeeFiat, 0);
    }

    if (type === 'claim') {
      return this.getClaimAmountByAddress(address);
    }

    if (type === 'withdraw' && status === 'confirmed') {
      const stateAmount = this.state.withdrawTransaction?.amount;
      if (typeof stateAmount === 'number' && !Number.isNaN(stateAmount)) {
        return stateAmount;
      }

      const receivingAmount = Number(
        transactionMeta.assetsFiatValues?.receiving,
      );
      return Number.isNaN(receivingAmount) ? undefined : receivingAmount;
    }

    return undefined;
  }

  private static readonly transactionTypeMap: Partial<
    Record<TransactionType, PredictTransactionEventType>
  > = {
    [TransactionType.predictDeposit]: 'deposit',
    [TransactionType.predictDepositAndOrder]: 'depositAndOrder',
    [TransactionType.predictClaim]: 'claim',
    [TransactionType.predictWithdraw]: 'withdraw',
  };

  private static readonly transactionStatusMap: Partial<
    Record<TransactionStatus, PredictTransactionEventStatus>
  > = {
    [TransactionStatus.approved]: 'approved',
    [TransactionStatus.confirmed]: 'confirmed',
    [TransactionStatus.failed]: 'failed',
    [TransactionStatus.rejected]: 'rejected',
  };

  private mapTransactionTypeToPredictTransactionEventType(
    transactionType: TransactionType,
  ): PredictTransactionEventType | null {
    return PredictController.transactionTypeMap[transactionType] ?? null;
  }

  private mapTransactionStatusToPredictTransactionEventStatus(
    transactionStatus: TransactionStatus,
  ): PredictTransactionEventStatus | null {
    return PredictController.transactionStatusMap[transactionStatus] ?? null;
  }

  public async getAccountState(
    params: GetAccountStateParams = {},
  ): Promise<AccountState> {
    return withTrace(
      this.traceable,
      {
        method: 'getAccountState',
        trace: {
          name: TraceName.PredictGetAccountState,
          op: TraceOperation.PredictDataFetch,
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            providerId: POLYMARKET_PROVIDER_ID,
          },
        },
        errorContext: { providerId: POLYMARKET_PROVIDER_ID },
        updateErrorState: false,
      },
      async () => {
        const selectedAddress = this.getSigner().address;
        return this.provider.getAccountState({
          ...params,
          ownerAddress: selectedAddress,
        });
      },
    );
  }

  public async getBalance(params: GetBalanceParams): Promise<number> {
    const selectedAddress = this.getSigner().address;
    const address = params.address ?? selectedAddress;
    let wasCached = false;

    return withTrace(
      this.traceable,
      {
        method: 'getBalance',
        trace: {
          name: TraceName.PredictGetBalance,
          op: TraceOperation.PredictDataFetch,
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            providerId: POLYMARKET_PROVIDER_ID,
          },
        },
        errorContext: { providerId: POLYMARKET_PROVIDER_ID },
        updateErrorState: false,
        traceData: () => ({ cached: wasCached }),
        onSuccess: (balance) => {
          if (wasCached) {
            return;
          }

          this.update((state) => {
            state.balances[address] = {
              balance,
              validUntil: Date.now() + 1000,
            };
          });
        },
      },
      async () => {
        const cachedBalance = this.state.balances[address];
        if (cachedBalance && cachedBalance.validUntil > Date.now()) {
          wasCached = true;
          return cachedBalance.balance;
        }

        await this.invalidateQueryCache(this.provider.chainId);
        return this.provider.getBalance({ ...params, address });
      },
    );
  }

  public async prepareWithdraw(
    _params: PrepareWithdrawParams = {},
  ): Promise<Result<string>> {
    try {
      const provider = this.provider;

      const signer = this.getSigner();

      const { chainId, transaction, predictAddress } =
        await provider.prepareWithdraw({
          signer,
        });

      this.update((state) => {
        state.withdrawTransaction = {
          chainId: hexToNumber(chainId),
          status: PredictWithdrawStatus.IDLE,
          providerId: POLYMARKET_PROVIDER_ID,
          predictAddress: predictAddress as Hex,
          transactionId: '',
          amount: 0,
        };
      });

      const { batchId } = await addTransactionBatch({
        from: signer.address as Hex,
        origin: ORIGIN_METAMASK,
        networkClientId: this.messenger.call(
          'NetworkController:findNetworkClientIdByChainId',
          chainId,
        ),
        disableHook: true,
        disableSequential: true,
        requireApproval: true,
        // Temporarily breaking abstraction, can instead be abstracted via provider.
        gasFeeToken: MATIC_CONTRACTS.collateral as Hex,
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
        providerId: POLYMARKET_PROVIDER_ID,
      });

      Logger.error(
        ensureError(error),
        this.getErrorContext('prepareWithdraw', {
          providerId: POLYMARKET_PROVIDER_ID,
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

    const provider = this.provider;

    if (!provider.signWithdraw) {
      return;
    }

    const signer = this.getSigner(request.transactionMeta.txParams.from);

    const chainId = this.state.withdrawTransaction.chainId;

    const networkClientId = this.messenger.call(
      'NetworkController:findNetworkClientIdByChainId',
      numberToHex(chainId),
    );

    // Invalidate query cache (to avoid nonce issues)
    await this.invalidateQueryCache(chainId);

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
      updatedGas = estimateResult.gas as Hex;
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
        transaction.assetsFiatValues = {
          ...transaction.assetsFiatValues,
          receiving: String(amount),
        };
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

export type {
  PredictControllerBeforeSignAction,
  PredictControllerClaimWithConfirmationAction,
  PredictControllerClearActiveOrderAction,
  PredictControllerClearActiveOrderTransactionIdAction,
  PredictControllerClearOrderErrorAction,
  PredictControllerClearPendingDepositAction,
  PredictControllerClearWithdrawTransactionAction,
  PredictControllerConfirmClaimAction,
  PredictControllerDepositWithConfirmationAction,
  PredictControllerGetAccountStateAction,
  PredictControllerGetActivityAction,
  PredictControllerGetBalanceAction,
  PredictControllerGetConnectionStatusAction,
  PredictControllerGetMarketAction,
  PredictControllerGetMarketsAction,
  PredictControllerGetPositionsAction,
  PredictControllerGetPriceHistoryAction,
  PredictControllerGetPricesAction,
  PredictControllerGetUnrealizedPnLAction,
  PredictControllerInitPayWithAnyTokenAction,
  PredictControllerOnPlaceOrderSuccessAction,
  PredictControllerPlaceOrderAction,
  PredictControllerPrepareWithdrawAction,
  PredictControllerPreviewOrderAction,
  PredictControllerRefreshEligibilityAction,
  PredictControllerSelectPaymentTokenAction,
  PredictControllerSetSelectedPaymentTokenAction,
  PredictControllerSubscribeToGameUpdatesAction,
  PredictControllerSubscribeToMarketPricesAction,
  PredictControllerTrackActivityViewedAction,
  PredictControllerTrackFeedViewedAction,
  PredictControllerTrackGeoBlockTriggeredAction,
  PredictControllerTrackMarketDetailsOpenedAction,
  PredictControllerTrackPositionViewedAction,
  PredictControllerTrackPredictOrderEventAction,
  PredictControllerTrackShareActionAction,
} from './PredictController-method-action-types';
