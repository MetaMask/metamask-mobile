import { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';
import { AccountTreeControllerGetAccountsFromSelectedAccountGroupAction } from '@metamask/account-tree-controller';
import { isEvmAccountType } from '@metamask/keyring-api';
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
  KeyringControllerSignTypedMessageAction,
  KeyringControllerSignPersonalMessageAction,
} from '@metamask/keyring-controller';
import {
  NetworkControllerGetStateAction,
  NetworkControllerFindNetworkClientIdByChainIdAction,
  NetworkControllerGetNetworkClientByIdAction,
} from '@metamask/network-controller';
import {
  TransactionControllerTransactionStatusUpdatedEvent,
  TransactionControllerEstimateGasAction,
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerTransactionFailedEvent,
  TransactionControllerTransactionRejectedEvent,
  TransactionControllerTransactionSubmittedEvent,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';
import { Hex, hexToNumber, numberToHex } from '@metamask/utils';
import performance from 'react-native-performance';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Logger, { type LoggerErrorOptions } from '../../../../util/Logger';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import {
  PredictEventProperties,
  PredictShareStatusValue,
  PredictTradeStatus,
  PredictTradeStatusValue,
} from '../constants/eventNames';
import { validateDepositTransactions } from '../utils/validateTransactions';
import { PolymarketProvider } from '../providers/polymarket/PolymarketProvider';
import { Signer } from '../providers/types';
import {
  AccountState,
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
import { ensureError } from '../utils/predictErrorHandler';
import { PREDICT_CONSTANTS, PREDICT_ERROR_CODES } from '../constants/errors';
import { GEO_BLOCKED_COUNTRIES } from '../constants/geoblock';
import {
  MATIC_CONTRACTS,
  POLYMARKET_PROVIDER_ID,
} from '../providers/polymarket/constants';
import {
  DEFAULT_FEE_COLLECTION_FLAG,
  DEFAULT_LIVE_SPORTS_FLAG,
  DEFAULT_MARKET_HIGHLIGHTS_FLAG,
} from '../constants/flags';
import { filterSupportedLeagues } from '../constants/sports';
import {
  PredictFeeCollection,
  PredictLiveSportsFlag,
  PredictMarketHighlightsFlag,
} from '../types/flags';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../util/remoteFeatureFlag';

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
  eligibility: { eligible: false },
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
export type PredictTransactionEventType = 'deposit' | 'claim' | 'withdraw';

export type PredictTransactionEventStatus =
  | 'approved'
  | 'confirmed'
  | 'failed'
  | 'rejected';

export interface PredictControllerTransactionStatusChangedEvent {
  type: 'PredictController:transactionStatusChanged';
  payload: [
    {
      type: PredictTransactionEventType;
      status: PredictTransactionEventStatus;
      senderAddress: string;
      transactionId?: string;
      amount?: number;
      /** Received fiat amount in USD for post-quote withdrawals */
      targetFiat?: number;
      /** Destination chain ID for post-quote withdrawals */
      destinationChainId?: string;
      /** Destination token address for post-quote withdrawals */
      destinationTokenAddress?: string;
    },
  ];
}

export type PredictTransactionStatusChangedPayload =
  PredictControllerTransactionStatusChangedEvent['payload'][0];

export type PredictControllerEvents =
  | ControllerStateChangeEvent<'PredictController', PredictControllerState>
  | PredictControllerTransactionStatusChangedEvent;

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

  constructor({ messenger, state = {} }: PredictControllerOptions) {
    super({
      name: 'PredictController',
      metadata,
      messenger,
      state: { ...getDefaultPredictControllerState(), ...state },
    });

    this.provider = new PolymarketProvider();

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

  /**
   * Get available markets with optional filtering
   */
  async getMarkets(params: GetMarketsParams): Promise<PredictMarket[]> {
    // Start Sentry trace for get markets operation
    const traceId = `get-markets-${Date.now()}`;
    let traceData:
      | { success: boolean; error?: string; marketCount?: number }
      | undefined;

    trace({
      name: TraceName.PredictGetMarkets,
      op: TraceOperation.PredictDataFetch,
      id: traceId,
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        providerId: POLYMARKET_PROVIDER_ID,
        ...(params.category && { category: params.category }),
      },
    });

    try {
      const remoteFeatureFlagState = this.messenger.call(
        'RemoteFeatureFlagController:getState',
      );
      const liveSportsFlag =
        (remoteFeatureFlagState.remoteFeatureFlags
          .predictLiveSports as unknown as PredictLiveSportsFlag | undefined) ??
        DEFAULT_LIVE_SPORTS_FLAG;
      const liveSportsLeagues = liveSportsFlag.enabled
        ? filterSupportedLeagues(liveSportsFlag.leagues ?? [])
        : [];

      const rawMarketHighlightsFlag = remoteFeatureFlagState.remoteFeatureFlags
        .predictMarketHighlights as unknown as
        | PredictMarketHighlightsFlag
        | undefined;

      const isHighlightsFlagValid = validatedVersionGatedFeatureFlag(
        rawMarketHighlightsFlag as unknown as VersionGatedFeatureFlag,
      );

      const marketHighlightsFlag: PredictMarketHighlightsFlag =
        isHighlightsFlagValid && rawMarketHighlightsFlag
          ? rawMarketHighlightsFlag
          : DEFAULT_MARKET_HIGHLIGHTS_FLAG;

      const paramsWithLiveSports = { ...params, liveSportsLeagues };

      const allMarkets = await this.provider.getMarkets(paramsWithLiveSports);

      let markets = allMarkets.filter(
        (market): market is PredictMarket => market !== undefined,
      );

      const isFirstPage = !params.offset || params.offset === 0;
      const shouldFetchHighlights =
        isHighlightsFlagValid && isFirstPage && params.category && !params.q;

      if (shouldFetchHighlights) {
        const highlightedMarketIds =
          (marketHighlightsFlag.highlights ?? []).find(
            (h) => h.category === params.category,
          )?.markets ?? [];

        if (highlightedMarketIds.length > 0) {
          const provider = this.provider;

          const fetchedHighlightedMarkets =
            (await provider.getMarketsByIds?.(
              highlightedMarketIds,
              liveSportsLeagues,
            )) ?? [];

          const highlightedMarkets = fetchedHighlightedMarkets.filter(
            (market) => market.status === 'open',
          );

          const highlightedIdSet = new Set(highlightedMarkets.map((m) => m.id));
          markets = markets.filter(
            (market) => !highlightedIdSet.has(market.id),
          );

          markets = [...highlightedMarkets, ...markets];
        }
      }

      this.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });

      traceData = { success: true, marketCount: markets.length };
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

      traceData = { success: false, error: errorMessage };

      // Log to Sentry with market query context
      Logger.error(
        ensureError(error),
        this.getErrorContext('getMarkets', {
          providerId: POLYMARKET_PROVIDER_ID,
          category: params.category,
          sortBy: params.sortBy,
          sortDirection: params.sortDirection,
          status: params.status,
          hasSearchQuery: !!params.q,
        }),
      );

      // Re-throw the error so components can handle it appropriately
      throw error;
    } finally {
      endTrace({
        name: TraceName.PredictGetMarkets,
        id: traceId,
        data: traceData,
      });
    }
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

    // Start Sentry trace for get market operation
    const traceId = `get-market-${Date.now()}`;
    let traceData: { success: boolean; error?: string } | undefined;

    trace({
      name: TraceName.PredictGetMarket,
      op: TraceOperation.PredictDataFetch,
      id: traceId,
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        providerId: POLYMARKET_PROVIDER_ID,
      },
    });

    try {
      const provider = this.provider;

      const remoteFeatureFlagState = this.messenger.call(
        'RemoteFeatureFlagController:getState',
      );
      const liveSportsFlag =
        (remoteFeatureFlagState.remoteFeatureFlags
          .predictLiveSports as unknown as PredictLiveSportsFlag | undefined) ??
        DEFAULT_LIVE_SPORTS_FLAG;
      const liveSportsLeagues = liveSportsFlag.enabled
        ? filterSupportedLeagues(liveSportsFlag.leagues ?? [])
        : [];

      const market = await provider.getMarketDetails({
        marketId: resolvedMarketId,
        liveSportsLeagues,
      });

      this.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });

      traceData = { success: true };
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

      traceData = { success: false, error: errorMessage };

      // Log to Sentry with market details context
      Logger.error(
        ensureError(error),
        this.getErrorContext('getMarket', {
          marketId: resolvedMarketId,
          providerId: POLYMARKET_PROVIDER_ID,
        }),
      );

      if (error instanceof Error) {
        throw error;
      }

      throw new Error(PREDICT_ERROR_CODES.MARKET_DETAILS_FAILED);
    } finally {
      endTrace({
        name: TraceName.PredictGetMarket,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get market price history
   */
  async getPriceHistory(
    params: GetPriceHistoryParams,
  ): Promise<PredictPriceHistoryPoint[]> {
    // Start Sentry trace for get price history operation
    const traceId = `get-price-history-${Date.now()}`;
    let traceData:
      | { success: boolean; error?: string; pointCount?: number }
      | undefined;

    trace({
      name: TraceName.PredictGetPriceHistory,
      op: TraceOperation.PredictDataFetch,
      id: traceId,
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        providerId: POLYMARKET_PROVIDER_ID,
        ...(params.interval && { interval: params.interval }),
      },
    });

    try {
      const history = await this.provider.getPriceHistory(params);

      const priceHistory = history ?? [];

      this.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });

      traceData = { success: true, pointCount: priceHistory.length };
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

      traceData = { success: false, error: errorMessage };

      // Log to Sentry with price history context
      Logger.error(
        ensureError(error),
        this.getErrorContext('getPriceHistory', {
          providerId: POLYMARKET_PROVIDER_ID,
          marketId: params.marketId,
          fidelity: params.fidelity,
          interval: params.interval,
        }),
      );

      throw error;
    } finally {
      endTrace({
        name: TraceName.PredictGetPriceHistory,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get current prices for multiple tokens
   *
   * Fetches BUY (best ask) and SELL (best bid) prices from the provider.
   * BUY = what you'd pay to buy
   * SELL = what you'd receive to sell
   */
  async getPrices(params: GetPriceParams): Promise<GetPriceResponse> {
    // Start Sentry trace for get prices operation
    const traceId = `get-prices-${Date.now()}`;
    let traceData:
      | { success: boolean; error?: string; priceCount?: number }
      | undefined;

    trace({
      name: TraceName.PredictGetPrices,
      op: TraceOperation.PredictDataFetch,
      id: traceId,
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        providerId: POLYMARKET_PROVIDER_ID,
      },
      data: {
        queryCount: params.queries?.length,
      },
    });

    try {
      const provider = this.provider;

      const response = await provider.getPrices({ queries: params.queries });

      this.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });

      traceData = { success: true, priceCount: response.results?.length ?? 0 };
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.UNKNOWN_ERROR;

      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      traceData = { success: false, error: errorMessage };

      // Log to Sentry with prices context
      Logger.error(
        ensureError(error),
        this.getErrorContext('getPrices', {
          providerId: POLYMARKET_PROVIDER_ID,
          queriesCount: params.queries?.length,
        }),
      );

      throw error;
    } finally {
      endTrace({
        name: TraceName.PredictGetPrices,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get user positions
   */
  async getPositions(params: GetPositionsParams): Promise<PredictPosition[]> {
    // Start Sentry trace for get positions operation
    const traceId = `get-positions-${Date.now()}`;
    let traceData:
      | { success: boolean; error?: string; positionCount?: number }
      | undefined;

    trace({
      name: TraceName.PredictGetPositions,
      op: TraceOperation.PredictDataFetch,
      id: traceId,
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        providerId: POLYMARKET_PROVIDER_ID,
        claimable: params.claimable ?? false,
      },
    });

    try {
      const { address } = params;

      const selectedAddress = address ?? this.getSigner().address;

      const provider = this.provider;

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

      traceData = { success: true, positionCount: positions.length };
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

      traceData = { success: false, error: errorMessage };

      // Log to Sentry with positions query context (no user address)
      Logger.error(
        ensureError(error),
        this.getErrorContext('getPositions', {
          providerId: POLYMARKET_PROVIDER_ID,
          claimable: params.claimable,
          marketId: params.marketId,
        }),
      );

      // Re-throw the error so components can handle it appropriately
      throw error;
    } finally {
      endTrace({
        name: TraceName.PredictGetPositions,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get user activity
   */
  async getActivity(params: { address?: string }): Promise<PredictActivity[]> {
    // Start Sentry trace for get activity operation
    const traceId = `get-activity-${Date.now()}`;
    let traceData:
      | { success: boolean; error?: string; activityCount?: number }
      | undefined;

    trace({
      name: TraceName.PredictGetActivity,
      op: TraceOperation.PredictDataFetch,
      id: traceId,
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        providerId: POLYMARKET_PROVIDER_ID,
      },
    });

    try {
      const { address } = params;
      const selectedAddress = address ?? this.getSigner().address;

      const activity = await this.provider.getActivity({
        address: selectedAddress,
      });

      this.update((state) => {
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null;
      });

      traceData = { success: true, activityCount: activity.length };
      return activity;
    } catch (error) {
      this.update((state) => {
        state.lastError =
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.ACTIVITY_NOT_AVAILABLE;
        state.lastUpdateTimestamp = Date.now();
      });

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Log to Sentry with activity query context (no user address)
      Logger.error(
        ensureError(error),
        this.getErrorContext('getActivity', {
          providerId: POLYMARKET_PROVIDER_ID,
        }),
      );

      throw error;
    } finally {
      endTrace({
        name: TraceName.PredictGetActivity,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get unrealized P&L for a user
   */
  async getUnrealizedPnL({
    address,
  }: {
    address?: string;
  }): Promise<UnrealizedPnL> {
    // Start Sentry trace for get unrealized PnL operation
    const traceId = `get-unrealized-pnl-${Date.now()}`;
    let traceData: { success: boolean; error?: string } | undefined;

    trace({
      name: TraceName.PredictGetUnrealizedPnL,
      op: TraceOperation.PredictDataFetch,
      id: traceId,
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        providerId: POLYMARKET_PROVIDER_ID,
      },
    });

    try {
      const selectedAddress = address ?? this.getSigner().address;

      const provider = this.provider;

      const unrealizedPnL = await provider.getUnrealizedPnL({
        address: selectedAddress,
      });

      // Update state on successful call
      this.update((state) => {
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null;
      });

      traceData = { success: true };
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

      traceData = { success: false, error: errorMessage };

      // Log to Sentry with unrealized PnL context (no user address)
      Logger.error(
        ensureError(error),
        this.getErrorContext('getUnrealizedPnL', {
          providerId: POLYMARKET_PROVIDER_ID,
        }),
      );

      throw error;
    } finally {
      endTrace({
        name: TraceName.PredictGetUnrealizedPnL,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Track Predict trade transaction analytics event
   * Uses a single consolidated event with status discriminator
   * @public
   */
  public async trackPredictOrderEvent({
    status,
    amountUsd,
    analyticsProperties,
    completionDuration,
    failureReason,
    sharePrice,
    pnl,
  }: {
    status: PredictTradeStatusValue;
    amountUsd?: number;
    analyticsProperties?: PlaceOrderParams['analyticsProperties'];
    completionDuration?: number;
    failureReason?: string;
    sharePrice?: number;
    pnl?: number;
  }): Promise<void> {
    if (!analyticsProperties) {
      return;
    }

    // Build regular properties (common to all statuses)
    const regularProperties = {
      [PredictEventProperties.STATUS]: status,
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
      ...(analyticsProperties.marketType && {
        [PredictEventProperties.MARKET_TYPE]: analyticsProperties.marketType,
      }),
      ...(analyticsProperties.outcome && {
        [PredictEventProperties.OUTCOME]: analyticsProperties.outcome,
      }),
      ...(completionDuration !== undefined && {
        [PredictEventProperties.COMPLETION_DURATION]: completionDuration,
      }),
      ...(failureReason && {
        [PredictEventProperties.FAILURE_REASON]: failureReason,
      }),
      ...(analyticsProperties.marketSlug && {
        [PredictEventProperties.MARKET_SLUG]: analyticsProperties.marketSlug,
      }),
      ...(analyticsProperties.gameId && {
        [PredictEventProperties.GAME_ID]: analyticsProperties.gameId,
      }),
      ...(analyticsProperties.gameStartTime && {
        [PredictEventProperties.GAME_START_TIME]:
          analyticsProperties.gameStartTime,
      }),
      ...(analyticsProperties.gameLeague && {
        [PredictEventProperties.GAME_LEAGUE]: analyticsProperties.gameLeague,
      }),
      ...(analyticsProperties.gameStatus && {
        [PredictEventProperties.GAME_STATUS]: analyticsProperties.gameStatus,
      }),
      ...(analyticsProperties.gamePeriod && {
        [PredictEventProperties.GAME_PERIOD]: analyticsProperties.gamePeriod,
      }),
      ...(analyticsProperties.gameClock && {
        [PredictEventProperties.GAME_CLOCK]: analyticsProperties.gameClock,
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

    DevLogger.log(`📊 [Analytics] PREDICT_TRADE_TRANSACTION [${status}]`, {
      providerId: POLYMARKET_PROVIDER_ID,
      regularProperties,
      sensitiveProperties,
    });

    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PREDICT_TRADE_TRANSACTION,
      )
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
    marketSlug,
    gameId,
    gameStartTime,
    gameLeague,
    gameStatus,
    gamePeriod,
    gameClock,
  }: {
    marketId: string;
    marketTitle: string;
    marketCategory?: string;
    marketTags?: string[];
    entryPoint: string;
    marketDetailsViewed: string;
    marketSlug?: string;
    gameId?: string;
    gameStartTime?: string;
    gameLeague?: string;
    gameStatus?: string;
    gamePeriod?: string | null;
    gameClock?: string | null;
  }): void {
    const analyticsProperties = {
      [PredictEventProperties.MARKET_ID]: marketId,
      [PredictEventProperties.MARKET_TITLE]: marketTitle,
      [PredictEventProperties.MARKET_CATEGORY]: marketCategory,
      [PredictEventProperties.MARKET_TAGS]: marketTags,
      [PredictEventProperties.ENTRY_POINT]: entryPoint,
      [PredictEventProperties.MARKET_DETAILS_VIEWED]: marketDetailsViewed,
      ...(marketSlug && {
        [PredictEventProperties.MARKET_SLUG]: marketSlug,
      }),
      ...(gameId && {
        [PredictEventProperties.GAME_ID]: gameId,
      }),
      ...(gameStartTime && {
        [PredictEventProperties.GAME_START_TIME]: gameStartTime,
      }),
      ...(gameLeague && {
        [PredictEventProperties.GAME_LEAGUE]: gameLeague,
      }),
      ...(gameStatus && {
        [PredictEventProperties.GAME_STATUS]: gameStatus,
      }),
      ...(gamePeriod && {
        [PredictEventProperties.GAME_PERIOD]: gamePeriod,
      }),
      ...(gameClock && {
        [PredictEventProperties.GAME_CLOCK]: gameClock,
      }),
    };

    DevLogger.log('📊 [Analytics] PREDICT_MARKET_DETAILS_OPENED', {
      analyticsProperties,
    });

    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
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

    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
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

    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PREDICT_ACTIVITY_VIEWED,
      )
        .addProperties(analyticsProperties)
        .build(),
    );
  }

  /**
   * Track geo-blocking event when user attempts an action but is blocked
   */
  public trackGeoBlockTriggered({
    attemptedAction,
  }: {
    attemptedAction: string;
  }): void {
    const eligibilityData = this.state.eligibility;
    const analyticsProperties = {
      [PredictEventProperties.COUNTRY]: eligibilityData?.country,
      [PredictEventProperties.ATTEMPTED_ACTION]: attemptedAction,
    };

    DevLogger.log('📊 [Analytics] PREDICT_GEO_BLOCKED_TRIGGERED', {
      analyticsProperties,
    });

    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PREDICT_GEO_BLOCKED_TRIGGERED,
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

    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PREDICT_FEED_VIEWED,
      )
        .addProperties(analyticsProperties)
        .build(),
    );
  }

  /**
   * Track Share Action analytics event for Predict markets
   * @public
   */
  public trackShareAction({
    status,
    marketId,
    marketSlug,
  }: {
    status: PredictShareStatusValue;
    marketId?: string;
    marketSlug?: string;
  }): void {
    const analyticsProperties = {
      [PredictEventProperties.STATUS]: status,
      ...(marketId && {
        [PredictEventProperties.MARKET_ID]: marketId,
      }),
      ...(marketSlug && {
        [PredictEventProperties.MARKET_SLUG]: marketSlug,
      }),
    };

    DevLogger.log('📊 [Analytics] SHARE_ACTION', {
      analyticsProperties,
    });

    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(MetaMetricsEvents.SHARE_ACTION)
        .addProperties(analyticsProperties)
        .build(),
    );
  }

  async previewOrder(params: PreviewOrderParams): Promise<OrderPreview> {
    try {
      const provider = this.provider;

      const remoteFeatureFlagState = this.messenger.call(
        'RemoteFeatureFlagController:getState',
      );
      const feeCollection =
        (remoteFeatureFlagState.remoteFeatureFlags
          .predictFeeCollection as unknown as
          | PredictFeeCollection
          | undefined) ?? DEFAULT_FEE_COLLECTION_FLAG;

      const signer = this.getSigner();

      return provider.previewOrder({ ...params, signer, feeCollection });
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

      const signer = this.getSigner();

      // Track Predict Trade Transaction with submitted status (fire and forget)
      this.trackPredictOrderEvent({
        status: PredictTradeStatus.SUBMITTED,
        amountUsd,
        analyticsProperties,
        sharePrice,
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

      // Track Predict Trade Transaction with succeeded status (fire and forget)
      this.trackPredictOrderEvent({
        status: PredictTradeStatus.SUCCEEDED,
        amountUsd: realAmountUsd,
        analyticsProperties,
        completionDuration,
        sharePrice: realSharePrice,
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
      });

      // Update error state for Sentry integration
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      traceData = { success: false, error: errorMessage };

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

    try {
      const provider = this.provider;

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

  private handleTransactionStatusUpdate({
    transactionMeta,
  }: {
    transactionMeta: TransactionMeta;
  }): void {
    const nestedTransactionType = transactionMeta?.nestedTransactions?.find(
      ({ type }) =>
        type === TransactionType.predictDeposit ||
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
      this.handleTransactionSideEffects(type, status, address);
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
      ...this.getWithdrawDestinationFields(type, status, transactionMeta),
    });
  }

  private handleTransactionSideEffects(
    type: PredictTransactionEventType,
    status: PredictTransactionEventStatus,
    address: string,
  ): void {
    const isTerminal =
      status === 'confirmed' || status === 'failed' || status === 'rejected';

    if (type === 'deposit' && isTerminal) {
      this.clearPendingDepositForAddress({ address });
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

  /**
   * Extracts raw destination fields for post-quote withdrawals from metamaskPay.
   * Token symbol resolution is deferred to the UI layer (selectors / hooks).
   */
  private getWithdrawDestinationFields(
    type: PredictTransactionEventType,
    status: PredictTransactionEventStatus,
    transactionMeta: TransactionMeta,
  ): {
    targetFiat?: number;
    destinationChainId?: string;
    destinationTokenAddress?: string;
  } {
    if (type !== 'withdraw' || status !== 'confirmed') {
      return {};
    }

    const { metamaskPay } = transactionMeta;
    if (!metamaskPay?.isPostQuote) {
      return {};
    }

    const targetFiat = Number(metamaskPay.targetFiat);

    return {
      ...(Number.isFinite(targetFiat) ? { targetFiat } : {}),
      ...(metamaskPay.chainId
        ? { destinationChainId: metamaskPay.chainId }
        : {}),
      ...(metamaskPay.tokenAddress
        ? { destinationTokenAddress: metamaskPay.tokenAddress }
        : {}),
    };
  }

  private static readonly transactionTypeMap: Partial<
    Record<TransactionType, PredictTransactionEventType>
  > = {
    [TransactionType.predictDeposit]: 'deposit',
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
    // Start Sentry trace for get account state operation
    const traceId = `get-account-state-${Date.now()}`;
    let traceData: { success: boolean; error?: string } | undefined;

    trace({
      name: TraceName.PredictGetAccountState,
      op: TraceOperation.PredictDataFetch,
      id: traceId,
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        providerId: POLYMARKET_PROVIDER_ID,
      },
    });

    try {
      const provider = this.provider;
      const selectedAddress = this.getSigner().address;

      const accountState = await provider.getAccountState({
        ...params,
        ownerAddress: selectedAddress,
      });

      traceData = { success: true };
      return accountState;
    } catch (error) {
      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Log to Sentry with account state context (no user address)
      Logger.error(
        ensureError(error),
        this.getErrorContext('getAccountState', {
          providerId: POLYMARKET_PROVIDER_ID,
        }),
      );

      throw error;
    } finally {
      endTrace({
        name: TraceName.PredictGetAccountState,
        id: traceId,
        data: traceData,
      });
    }
  }

  public async getBalance(params: GetBalanceParams): Promise<number> {
    // Start Sentry trace for get balance operation
    const traceId = `get-balance-${Date.now()}`;
    let traceData:
      | { success: boolean; error?: string; cached?: boolean }
      | undefined;

    trace({
      name: TraceName.PredictGetBalance,
      op: TraceOperation.PredictDataFetch,
      id: traceId,
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        providerId: POLYMARKET_PROVIDER_ID,
      },
    });

    try {
      const provider = this.provider;
      const selectedAddress = this.getSigner().address;
      const address = params.address ?? selectedAddress;

      const cachedBalance = this.state.balances[address];
      if (cachedBalance && cachedBalance.validUntil > Date.now()) {
        traceData = { success: true, cached: true };
        return cachedBalance.balance;
      }

      // Invalidate query cache
      await this.invalidateQueryCache(provider.chainId);

      const balance = await provider.getBalance({
        ...params,
        address,
      });

      this.update((state) => {
        state.balances[address] = {
          balance,
          // valid for 1 second
          validUntil: Date.now() + 1000,
        };
      });

      traceData = { success: true, cached: false };
      return balance;
    } catch (error) {
      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Log to Sentry with balance query context (no user address)
      Logger.error(
        ensureError(error),
        this.getErrorContext('getBalance', {
          providerId: POLYMARKET_PROVIDER_ID,
        }),
      );

      throw error;
    } finally {
      endTrace({
        name: TraceName.PredictGetBalance,
        id: traceId,
        data: traceData,
      });
    }
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
