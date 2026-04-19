import {
  SignTypedDataVersion,
  type TypedMessageParams,
} from '@metamask/keyring-controller';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { Hex, numberToHex } from '@metamask/utils';
import { getAddress, parseUnits } from 'ethers/lib/utils';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger, { type LoggerErrorOptions } from '../../../../../util/Logger';
import { analytics } from '../../../../../util/analytics/analytics';
import { UserProfileProperty } from '../../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import {
  generateTransferData,
  isSmartContractAddress,
} from '../../../../../util/transactions';
import { PREDICT_CONSTANTS, PREDICT_ERROR_CODES } from '../../constants/errors';
import { filterSupportedLeagues } from '../../constants/sports';
import { SERIES_MAX_EVENTS } from '../../utils/series';
import {
  GetPriceHistoryParams,
  GetCryptoTargetPriceParams,
  GetPriceParams,
  GetPriceResponse,
  GetSeriesParams,
  PredictActivity,
  PredictCategory,
  PredictMarket,
  PredictPosition,
  PredictPositionStatus,
  PredictPriceHistoryPoint,
  PredictSportsLeague,
  PriceResult,
  Side,
  UnrealizedPnL,
} from '../../types';
import {
  AccountState,
  ClaimOrderParams,
  ClaimOrderResponse,
  ConnectionStatus,
  CryptoPriceUpdateCallback,
  GameUpdateCallback,
  GeoBlockResponse,
  GetAccountStateParams,
  GetBalanceParams,
  GetMarketsParams,
  GetPositionsParams,
  OrderPreview,
  OrderResult,
  PlaceOrderParams,
  PredictProvider,
  PrepareDepositParams,
  PrepareDepositResponse,
  PrepareWithdrawParams,
  PrepareWithdrawResponse,
  PreviewOrderParams,
  PriceUpdateCallback,
  Signer,
  SignWithdrawParams,
  SignWithdrawResponse,
} from '../types';
import {
  MATIC_CONTRACTS,
  MIN_COLLATERAL_BALANCE_FOR_CLAIM,
  ORDER_RATE_LIMIT_MS,
  POLYGON_MAINNET_CHAIN_ID,
  POLYMARKET_PROVIDER_ID,
  ROUNDING_CONFIG,
  SAFE_EXEC_GAS_LIMIT,
} from './constants';
import { PERMIT2_ADDRESS } from './safe/constants';
import {
  computeProxyAddress,
  createPermit2FeeAuthorization,
  createSafeFeeAuthorization,
  getClaimTransaction,
  getDeployProxyWalletTransaction,
  getProxyWalletAllowancesTransaction,
  getSafeUsdcAmount,
  getWithdrawTransactionCallData,
  hasAllowances,
} from './safe/utils';
import { Permit2FeeAuthorization, SafeFeeAuthorization } from './safe/types';
import {
  ApiKeyCreds,
  OrderData,
  OrderType,
  PolymarketApiActivity,
  PolymarketApiEvent,
  PolymarketApiTeam,
  PolymarketPosition,
  SignatureType,
  TickSize,
  UtilsSide,
} from './types';
import {
  createApiKey,
  encodeErc20Transfer,
  fetchEventsFromPolymarketApi,
  fetchCarouselFromPolymarketApi,
  generateSalt,
  getBalance,
  getContractConfig,
  getL2Headers,
  getMarketDetailsFromGammaApi,
  getOrderTypedData,
  getPolymarketEndpoints,
  parsePolymarketActivity,
  parsePolymarketEvents,
  parsePolymarketPositions,
  previewOrder,
  roundOrderAmount,
  submitClobOrder,
} from './utils';
import { PredictFeatureFlags } from '../../types/flags';
import {
  extractNeededTeamsFromEvents,
  isLiveSportsEvent,
} from '../../utils/gameParser';
import { GameCache } from './GameCache';
import { TeamsCache } from './TeamsCache';
import { WebSocketManager } from './WebSocketManager';
import {
  resolvePolymarketProtocol,
  type DepositExecutionMode,
  type PolymarketProtocolDefinition,
  type WithdrawExecutionMode,
} from './protocol/definitions';
import {
  buildProtocolUnsignedOrder,
  getPreviewFeeRateBpsForProtocol,
  getProtocolOrderTypedData,
  getProtocolVerifyingContract,
  serializeProtocolRelayerOrder,
} from './protocol/orderCodec';
import { submitProtocolClobOrder } from './protocol/transport';
import { planTradePreflight } from './preflight/trade';
import { buildSignedSafeExecution } from './preflight/core';
import { buildDepositMaintenanceTransaction } from './preflight/deposit';
import { buildClaimTransaction } from './preflight/claim';
import { buildWithdrawTransaction } from './preflight/withdraw';

export type SignTypedMessageFn = (
  params: TypedMessageParams,
  version: SignTypedDataVersion,
) => Promise<string>;

enum OptimisticUpdateType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  REMOVE = 'REMOVE',
}

interface OptimisticPositionUpdate {
  type: OptimisticUpdateType;
  outcomeTokenId: string;
  marketId: string;
  timestamp: number;

  // For CREATE and UPDATE types
  optimisticPosition?: PredictPosition;
  expectedSize: number; // The expected size after the operation (0 for REMOVE)

  // For REMOVE type
  positionId?: string;
}

export class PolymarketProvider implements PredictProvider {
  readonly providerId = POLYMARKET_PROVIDER_ID;
  readonly name = 'Polymarket';
  readonly chainId = POLYGON_MAINNET_CHAIN_ID;
  readonly #getFeatureFlags: () => PredictFeatureFlags;

  #apiKeysByProtocolAddress: Map<string, ApiKeyCreds> = new Map();
  #accountStateByAddress: Map<string, AccountState> = new Map();
  #lastBuyOrderTimestampByAddress: Map<string, number> = new Map();
  #buyOrderInProgressByAddress: Map<string, boolean> = new Map();
  #optimisticPositionUpdatesByAddress = new Map<
    string,
    Map<string, OptimisticPositionUpdate>
  >();

  private static readonly FALLBACK_CATEGORY: PredictCategory = 'trending';

  constructor({
    getFeatureFlags,
  }: {
    getFeatureFlags: () => PredictFeatureFlags;
  }) {
    this.#getFeatureFlags = getFeatureFlags;
  }

  #getSupportedLeagues(): PredictSportsLeague[] {
    const { liveSportsLeagues } = this.#getFeatureFlags();
    return filterSupportedLeagues(liveSportsLeagues);
  }

  #getExtendedSportsMarketsLeagues(): string[] {
    return this.#getFeatureFlags().extendedSportsMarketsLeagues;
  }

  #hasExtendedMarketsForLeague(league: string): boolean {
    return this.#getExtendedSportsMarketsLeagues().includes(league);
  }

  #createTeamLookup(
    enabled: boolean,
  ):
    | ((
        league: PredictSportsLeague,
        abbreviation: string,
      ) => PolymarketApiTeam | undefined)
    | undefined {
    return enabled
      ? (league, abbreviation) =>
          TeamsCache.getInstance().getTeam(league, abbreviation)
      : undefined;
  }

  /**
   * Ensure all sport teams referenced by the given events are loaded into
   * the cache. No-op when live sports is disabled (empty supportedLeagues).
   */
  async #ensureTeamsLoadedForEvents(
    events: PolymarketApiEvent[],
    supportedLeagues: PredictSportsLeague[],
  ): Promise<void> {
    if (supportedLeagues.length === 0) {
      return;
    }

    const neededTeams = extractNeededTeamsFromEvents(events, supportedLeagues);

    await Promise.all(
      [...neededTeams.entries()].map(([league, abbreviations]) =>
        TeamsCache.getInstance().ensureTeamsLoaded(league, abbreviations),
      ),
    );
  }

  /**
   * Generate standard error context for Logger.error calls with searchable tags and context.
   * Enables Sentry dashboard filtering by feature and provider.
   * @param method - The method name where the error occurred
   * @param extra - Optional additional context fields (becomes searchable context data)
   * @returns LoggerErrorOptions with tags (searchable) and context (searchable)
   * @private
   */
  private getErrorContext(
    method: string,
    extra?: Record<string, unknown>,
  ): LoggerErrorOptions {
    return {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        provider: POLYMARKET_PROVIDER_ID,
      },
      context: {
        name: 'PolymarketProvider',
        data: {
          method,
          ...extra,
        },
      },
    };
  }

  #hasPermit2Config(params: {
    permit2Enabled?: boolean;
    executors?: string[];
  }): boolean {
    return (
      params.permit2Enabled === true &&
      Array.isArray(params.executors) &&
      params.executors.length > 0
    );
  }

  #shouldUseFakOrderType({
    permit2Enabled,
    executors,
    fakOrdersEnabled,
  }: {
    permit2Enabled?: boolean;
    executors?: string[];
    fakOrdersEnabled: boolean;
  }): boolean {
    return (
      this.#hasPermit2Config({ permit2Enabled, executors }) &&
      fakOrdersEnabled === true
    );
  }

  #getProtocol(): PolymarketProtocolDefinition {
    return resolvePolymarketProtocol(this.#getFeatureFlags());
  }

  #throwPlaceOrderError({
    error,
    side,
  }: {
    error?: string;
    side: Side;
  }): never {
    if (error?.includes(`order couldn't be fully filled`)) {
      throw new Error(
        side === Side.BUY
          ? PREDICT_ERROR_CODES.BUY_ORDER_NOT_FULLY_FILLED
          : PREDICT_ERROR_CODES.SELL_ORDER_NOT_FULLY_FILLED,
      );
    }

    if (
      error?.includes(`not available in your region`) ||
      error?.includes(`unable to access this provider`)
    ) {
      throw new Error(PREDICT_ERROR_CODES.NOT_ELIGIBLE);
    }

    throw new Error(error ?? PREDICT_ERROR_CODES.PLACE_ORDER_FAILED);
  }

  async #submitOrderV1({
    signer,
    preview,
  }: {
    signer: Signer;
    preview: OrderPreview;
  }) {
    const protocol = this.#getProtocol();

    if (protocol.key !== 'v1') {
      throw new Error('Invalid Polymarket protocol for v1 order submission');
    }

    const chainId = POLYGON_MAINNET_CHAIN_ID;
    const makerAddress =
      this.#accountStateByAddress.get(signer.address)?.address ??
      computeProxyAddress(signer.address);

    if (!makerAddress) {
      throw new Error('Maker address not found');
    }

    const order = buildProtocolUnsignedOrder({
      protocol,
      preview,
      makerAddress,
      signerAddress: signer.address,
    });

    const typedData = getOrderTypedData({
      order,
      chainId,
      verifyingContract:
        getContractConfig(chainId)[
          preview.negRisk ? 'negRiskExchange' : 'exchange'
        ],
    });

    const signature = await signer.signTypedMessage(
      { data: typedData, from: signer.address },
      SignTypedDataVersion.V4,
    );

    const signedOrder = {
      ...order,
      signature,
    };
    const signerApiKey = await this.getApiKey({
      address: signer.address,
      protocolKey: protocol.key,
    });
    const { feeCollection, fakOrdersEnabled } = this.#getFeatureFlags();
    const shouldUsePermit2 = this.#hasPermit2Config({
      permit2Enabled: preview.fees?.permit2Enabled,
      executors: preview.fees?.executors,
    });

    let feeAuthorization:
      | SafeFeeAuthorization
      | Permit2FeeAuthorization
      | undefined;
    let executor: string | undefined;
    let orderType: OrderType = OrderType.FOK;
    let permit2FeeReady = false;

    if (preview.fees !== undefined && preview.fees.totalFee > 0) {
      const safeAddress = computeProxyAddress(signer.address);
      const feeAmountInUsdc = BigInt(
        parseUnits(preview.fees.totalFee.toString(), 6).toString(),
      );

      if (shouldUsePermit2) {
        permit2FeeReady = true;
        const executors = preview.fees.executors ?? [];
        const randomIndex = new Uint32Array(1);
        global.crypto.getRandomValues(randomIndex);
        executor = executors[randomIndex[0] % executors.length];
        feeAuthorization = await createPermit2FeeAuthorization({
          safeAddress,
          signer,
          amount: feeAmountInUsdc,
          spender: executor,
        });
      } else {
        feeAuthorization = await createSafeFeeAuthorization({
          safeAddress,
          signer,
          amount: feeAmountInUsdc,
          to: preview.fees.collector,
        });
      }
    }

    let allowancesTx: { to: string; data: string } | undefined;
    let permit2AllowanceReady = false;
    const hasSafeFeeAuth = feeAuthorization !== undefined && !permit2FeeReady;

    if (feeCollection.permit2Enabled && !hasSafeFeeAuth) {
      try {
        const accountState = await this.getAccountState({
          ownerAddress: signer.address,
        });

        if (accountState.hasAllowances) {
          permit2AllowanceReady = true;
        } else {
          const allowanceTx = await getProxyWalletAllowancesTransaction({
            signer,
            extraUsdcSpenders: [PERMIT2_ADDRESS],
          });

          allowancesTx = allowanceTx.params;
          permit2AllowanceReady = true;
        }
      } catch (allowanceError) {
        DevLogger.log(
          'PolymarketProvider: Failed to generate allowances transaction',
          { error: allowanceError },
        );
        Logger.error(
          allowanceError instanceof Error
            ? allowanceError
            : new Error(String(allowanceError)),
          this.getErrorContext('placeOrder:allowancesTx', {
            operation: 'generate_allowances_tx',
          }),
        );
      }
    }

    if (
      this.#shouldUseFakOrderType({
        permit2Enabled: feeCollection.permit2Enabled,
        executors: feeCollection.executors,
        fakOrdersEnabled,
      })
    ) {
      const hasFees = preview.fees !== undefined && preview.fees.totalFee > 0;
      if (!hasFees || (permit2FeeReady && permit2AllowanceReady)) {
        orderType = OrderType.FAK;
      }
    }

    const clobOrder = serializeProtocolRelayerOrder({
      signedOrder,
      owner: signerApiKey.apiKey,
      orderType,
      side: preview.side,
    });
    const body = JSON.stringify(clobOrder);
    const headers = await getL2Headers({
      l2HeaderArgs: {
        method: 'POST',
        requestPath: `/order`,
        body,
      },
      address: clobOrder.order.signer ?? '',
      apiKey: signerApiKey,
    });

    const orderResult = await submitClobOrder({
      headers,
      clobOrder,
      feeAuthorization,
      executor,
      allowancesTx,
    });

    if (!orderResult.success) {
      DevLogger.log('PolymarketProvider: Place order failed', {
        error: orderResult.error,
        errorDetails: undefined,
        side: preview.side,
        outcomeTokenId: preview.outcomeTokenId,
      });
      this.#throwPlaceOrderError({
        error: orderResult.error,
        side: preview.side,
      });
    }

    return orderResult.response;
  }

  async #submitOrderV2({
    signer,
    preview,
    protocol,
  }: {
    signer: Signer;
    preview: OrderPreview;
    protocol: Extract<PolymarketProtocolDefinition, { key: 'v2' }>;
  }) {
    const safeAddress =
      this.#accountStateByAddress.get(signer.address)?.address ??
      computeProxyAddress(signer.address);

    const order = buildProtocolUnsignedOrder({
      protocol,
      preview: {
        ...preview,
        feeRateBps: getPreviewFeeRateBpsForProtocol({ protocol, preview }),
      },
      makerAddress: safeAddress,
      signerAddress: getAddress(signer.address),
    });

    const typedData = getProtocolOrderTypedData({
      protocol,
      order,
      verifyingContract: getProtocolVerifyingContract({
        protocol,
        negRisk: preview.negRisk,
      }),
    });

    const signature = await signer.signTypedMessage(
      { data: typedData, from: signer.address },
      SignTypedDataVersion.V4,
    );

    const signedOrder = {
      ...order,
      signature,
    };
    const signerApiKey = await this.getApiKey({
      address: signer.address,
      protocolKey: protocol.key,
    });
    const { feeCollection, fakOrdersEnabled } = this.#getFeatureFlags();
    const shouldUsePermit2 = this.#hasPermit2Config({
      permit2Enabled: preview.fees?.permit2Enabled,
      executors: preview.fees?.executors,
    });

    let feeAuthorization: Permit2FeeAuthorization | undefined;
    let executor: string | undefined;
    let orderType: OrderType = OrderType.FOK;
    let permit2FeeReady = false;

    if (
      preview.fees !== undefined &&
      preview.fees.totalFee > 0 &&
      shouldUsePermit2
    ) {
      const feeAmount = BigInt(
        parseUnits(preview.fees.totalFee.toString(), 6).toString(),
      );
      const executors = preview.fees.executors ?? [];
      const randomIndex = new Uint32Array(1);
      global.crypto.getRandomValues(randomIndex);
      executor = executors[randomIndex[0] % executors.length];
      feeAuthorization = await createPermit2FeeAuthorization({
        safeAddress,
        signer,
        amount: feeAmount,
        spender: executor,
        tokenAddress: protocol.collateral.feeAuthorizationToken,
      });
      permit2FeeReady = true;
    }

    let allowancesTx: { to: string; data: string } | undefined;
    let permit2AllowanceReady = false;

    try {
      const tradePlan = await planTradePreflight({
        safeAddress,
        protocol,
      });

      permit2AllowanceReady = tradePlan.transactions.length === 0;

      if (tradePlan.transactions.length > 0) {
        const signedExecution = await buildSignedSafeExecution({
          signer,
          safeAddress,
          transactions: tradePlan.transactions,
          type: TransactionType.contractInteraction,
        });

        allowancesTx = {
          to: signedExecution.params.to,
          data: signedExecution.params.data,
        };
        permit2AllowanceReady = true;
      }
    } catch (allowanceError) {
      DevLogger.log(
        'PolymarketProvider: Failed to generate v2 allowances transaction',
        { error: allowanceError },
      );
      Logger.error(
        allowanceError instanceof Error
          ? allowanceError
          : new Error(String(allowanceError)),
        this.getErrorContext('placeOrder:v2AllowancesTx', {
          operation: 'generate_allowances_tx_v2',
        }),
      );
    }

    if (
      this.#shouldUseFakOrderType({
        permit2Enabled: feeCollection.permit2Enabled,
        executors: feeCollection.executors,
        fakOrdersEnabled,
      })
    ) {
      const hasFees = preview.fees !== undefined && preview.fees.totalFee > 0;
      if (!hasFees || (permit2FeeReady && permit2AllowanceReady)) {
        orderType = OrderType.FAK;
      }
    }

    const clobOrder = serializeProtocolRelayerOrder({
      signedOrder,
      owner: signerApiKey.apiKey,
      orderType,
      side: preview.side,
    });
    const body = JSON.stringify(clobOrder);
    const headers = await getL2Headers({
      l2HeaderArgs: {
        method: 'POST',
        requestPath: `/order`,
        body,
      },
      address: clobOrder.order.signer ?? '',
      apiKey: signerApiKey,
    });

    const orderResult = await submitProtocolClobOrder({
      protocol,
      headers,
      clobOrder,
      feeAuthorization,
      executor,
      allowancesTx,
    });

    if (!orderResult.success) {
      DevLogger.log('PolymarketProvider: Place order V2 failed', {
        error: orderResult.error,
        errorDetails: undefined,
        side: preview.side,
        outcomeTokenId: preview.outcomeTokenId,
      });
      this.#throwPlaceOrderError({
        error: orderResult.error,
        side: preview.side,
      });
    }

    return orderResult.response;
  }

  public async getMarketDetails({
    marketId,
  }: {
    marketId: string;
  }): Promise<PredictMarket> {
    if (!marketId) {
      throw new Error('marketId is required');
    }

    try {
      const event = await getMarketDetailsFromGammaApi({
        marketId,
      });

      const supportedLeagues = this.#getSupportedLeagues();
      const liveSportsEnabled = supportedLeagues.length > 0;
      const isSportsEvent =
        liveSportsEnabled && isLiveSportsEvent(event, supportedLeagues);

      if (isSportsEvent) {
        await this.#ensureTeamsLoadedForEvents([event], supportedLeagues);
      }

      const teamLookup = this.#createTeamLookup(isSportsEvent);

      const [parsedMarket] = parsePolymarketEvents([event], {
        category: PolymarketProvider.FALLBACK_CATEGORY,
        teamLookup,
        extendedSportsMarketsLeagues: this.#getExtendedSportsMarketsLeagues(),
      });

      if (!parsedMarket) {
        throw new Error('Failed to parse market details');
      }

      const result = isSportsEvent
        ? GameCache.getInstance().overlayOnMarket(parsedMarket)
        : parsedMarket;

      return result;
    } catch (error) {
      DevLogger.log('Error getting market details via Polymarket API:', error);
      throw error;
    }
  }

  public async getMarketsByIds(marketIds: string[]): Promise<PredictMarket[]> {
    if (!marketIds || marketIds.length === 0) {
      return [];
    }

    try {
      const marketPromises = marketIds.map((marketId) =>
        this.getMarketDetails({ marketId }).catch((error) => {
          DevLogger.log(
            `PolymarketProvider: Failed to fetch market ${marketId}`,
            error,
          );
          return null;
        }),
      );

      const results = await Promise.all(marketPromises);

      return results.filter(
        (market): market is PredictMarket => market !== null,
      );
    } catch (error) {
      DevLogger.log('Error fetching markets by IDs:', error);

      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('getMarketsByIds', {
          marketIdsCount: marketIds.length,
        }),
      );

      return [];
    }
  }

  public getActivity(_params: { address: string }): Promise<PredictActivity[]> {
    return this.fetchActivity(_params);
  }

  public claimWinnings(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  private async getApiKey({
    address,
    protocolKey,
  }: {
    address: string;
    protocolKey: 'v1' | 'v2';
  }): Promise<ApiKeyCreds> {
    const cacheKey = `${protocolKey}:${address}`;
    const cachedApiKey = this.#apiKeysByProtocolAddress.get(cacheKey);
    if (cachedApiKey) {
      return cachedApiKey;
    }

    const apiKeyCreds = await createApiKey({
      address,
      clobVersion: protocolKey,
    });
    this.#apiKeysByProtocolAddress.set(cacheKey, apiKeyCreds);
    return apiKeyCreds;
  }

  private isRateLimited(address: string): boolean {
    if (this.#buyOrderInProgressByAddress.get(address)) {
      return true;
    }

    const lastTimestamp = this.#lastBuyOrderTimestampByAddress.get(address);
    if (!lastTimestamp) {
      return false;
    }
    const elapsed = Date.now() - lastTimestamp;
    return elapsed < ORDER_RATE_LIMIT_MS;
  }

  public async getMarkets(params?: GetMarketsParams): Promise<PredictMarket[]> {
    try {
      const supportedLeagues = this.#getSupportedLeagues();
      const liveSportsEnabled = supportedLeagues.length > 0;

      // Step 1: Fetch raw events from API
      const { events, category, isSearch } =
        await fetchEventsFromPolymarketApi(params);

      // Step 2: If live sports enabled, extract needed teams and fetch only those
      await this.#ensureTeamsLoadedForEvents(events, supportedLeagues);

      // Step 3: Create team lookup and parse events
      const teamLookup = this.#createTeamLookup(liveSportsEnabled);

      const parsedMarkets = parsePolymarketEvents(events, {
        category,
        sortMarketsBy: 'price',
        teamLookup,
        extendedSportsMarketsLeagues: this.#getExtendedSportsMarketsLeagues(),
      });

      const markets = isSearch
        ? parsedMarkets.filter((m) => m.outcomes.length > 0)
        : parsedMarkets;

      return liveSportsEnabled
        ? GameCache.getInstance().overlayOnMarkets(markets)
        : markets;
    } catch (error) {
      DevLogger.log('Error getting markets via Polymarket API:', error);

      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('getMarkets', {
          category: params?.category,
          status: params?.status,
          sortBy: params?.sortBy,
          hasSearchQuery: !!params?.q,
        }),
      );

      return [];
    }
  }

  public async getMarketSeries(
    params: GetSeriesParams,
  ): Promise<PredictMarket[]> {
    const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();
    const limit = params.limit ?? SERIES_MAX_EVENTS;

    try {
      const queryParams = new URLSearchParams({
        series_id: params.seriesId,
        end_date_min: params.endDateMin,
        end_date_max: params.endDateMax,
        limit: String(limit),
        order: 'endDate',
        ascending: 'true',
      });

      const response = await fetch(
        `${GAMMA_API_ENDPOINT}/events?${queryParams.toString()}`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch series events');
      }

      const events = (await response.json()) as PolymarketApiEvent[];

      if (!Array.isArray(events) || events.length === 0) {
        return [];
      }

      const supportedLeagues = this.#getSupportedLeagues();
      const liveSportsEnabled = supportedLeagues.length > 0;

      await this.#ensureTeamsLoadedForEvents(events, supportedLeagues);

      const teamLookup = this.#createTeamLookup(liveSportsEnabled);

      return parsePolymarketEvents(events, {
        category: PolymarketProvider.FALLBACK_CATEGORY,
        teamLookup,
        extendedSportsMarketsLeagues: this.#getExtendedSportsMarketsLeagues(),
      });
    } catch (error) {
      DevLogger.log('Error fetching series events via Polymarket API:', error);

      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('getMarketSeries', {
          seriesId: params.seriesId,
        }),
      );

      return [];
    }
  }

  public async getCarouselMarkets(): Promise<PredictMarket[]> {
    try {
      const supportedLeagues = this.#getSupportedLeagues();
      const liveSportsEnabled = supportedLeagues.length > 0;

      const items = await fetchCarouselFromPolymarketApi();
      const events = items.map((item) => item.event);

      await this.#ensureTeamsLoadedForEvents(events, supportedLeagues);

      const teamLookup = this.#createTeamLookup(liveSportsEnabled);

      const parsedMarkets = parsePolymarketEvents(events, {
        category: 'trending',
        sortMarketsBy: 'price',
        teamLookup,
        extendedSportsMarketsLeagues: this.#getExtendedSportsMarketsLeagues(),
      }).filter((m) => m.status === 'open' && m.outcomes.length > 0);

      return liveSportsEnabled
        ? GameCache.getInstance().overlayOnMarkets(parsedMarkets)
        : parsedMarkets;
    } catch (error) {
      DevLogger.log('Error fetching carousel markets:', error);

      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('getCarouselMarkets', {}),
      );

      return [];
    }
  }

  public async getPriceHistory({
    marketId,
    fidelity,
    interval,
    startTs,
    endTs,
  }: GetPriceHistoryParams): Promise<PredictPriceHistoryPoint[]> {
    if (!marketId) {
      throw new Error('marketId parameter is required');
    }

    try {
      const { CLOB_ENDPOINT } = getPolymarketEndpoints();
      const searchParams = new URLSearchParams({ market: marketId });

      if (typeof fidelity === 'number') {
        searchParams.set('fidelity', String(fidelity));
      }

      if (startTs !== undefined && endTs !== undefined) {
        searchParams.set('startTs', String(startTs));
        searchParams.set('endTs', String(endTs));
      } else if (interval) {
        searchParams.set('interval', interval);
      }

      const response = await fetch(
        `${CLOB_ENDPOINT}/prices-history?${searchParams.toString()}`,
        {
          method: 'GET',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to get price history');
      }

      const data = (await response.json()) as {
        history?: { t?: number; p?: number }[];
      };

      if (!Array.isArray(data?.history)) {
        return [];
      }

      return data.history
        .filter(
          (entry): entry is { t: number; p: number } =>
            typeof entry?.t === 'number' && typeof entry?.p === 'number',
        )
        .map((entry) => ({
          timestamp: entry.t,
          price: entry.p,
        }));
    } catch (error) {
      DevLogger.log('Error getting price history via Polymarket API:', error);

      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('getPriceHistory', {
          marketId,
          fidelity,
          interval,
          startTs,
          endTs,
        }),
      );

      return [];
    }
  }

  public async getCryptoTargetPrice(
    params: GetCryptoTargetPriceParams,
  ): Promise<number | null> {
    try {
      const { CRYPTO_PRICE_ENDPOINT } = getPolymarketEndpoints();
      const url = `${CRYPTO_PRICE_ENDPOINT}?symbol=${encodeURIComponent(params.symbol)}&eventStartTime=${encodeURIComponent(params.eventStartTime)}&variant=${encodeURIComponent(params.variant)}&endDate=${encodeURIComponent(params.endDate)}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Crypto target price API returned ${response.status}`);
      }

      const data: unknown = await response.json();
      const parsed = data as { openPrice?: number } | undefined;
      if (typeof parsed?.openPrice !== 'number') {
        throw new Error('Crypto target price API returned unexpected shape');
      }
      return parsed.openPrice;
    } catch (error) {
      DevLogger.log(
        'Error getting crypto target price via Polymarket API:',
        error,
      );

      return null;
    }
  }

  /**
   * Get current prices for multiple tokens from CLOB /prices endpoint
   *
   * Fetches BUY (best ask) and SELL (best bid) prices for outcome tokens.
   * BUY = what you'd pay to buy
   * SELL = what you'd receive to sell
   *
   * @param params - Query parameters with marketId, outcomeId, and outcomeTokenId
   * @returns Structured price response with results
   */
  public async getPrices({
    queries,
  }: GetPriceParams): Promise<GetPriceResponse> {
    if (!queries || queries.length === 0) {
      throw new Error('queries parameter is required and must not be empty');
    }

    try {
      const { CLOB_ENDPOINT } = getPolymarketEndpoints();

      const bookParams = queries.flatMap((query) => [
        { token_id: query.outcomeTokenId, side: Side.BUY },
        { token_id: query.outcomeTokenId, side: Side.SELL },
      ]);

      const response = await fetch(`${CLOB_ENDPOINT}/prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookParams),
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(
          `POST /prices failed: ${response.status} ${responseText}`,
        );
      }

      type PolymarketPricesResponse = Record<
        string,
        Partial<Record<Side, string>>
      >;
      const data = (await response.json()) as PolymarketPricesResponse;

      const results: PriceResult[] = queries.map((query) => {
        const priceData = data[query.outcomeTokenId];
        return {
          marketId: query.marketId,
          outcomeId: query.outcomeId,
          outcomeTokenId: query.outcomeTokenId,
          entry: {
            buy: priceData?.BUY ? Number(priceData.BUY) : 0,
            sell: priceData?.SELL ? Number(priceData.SELL) : 0,
          },
        };
      });

      return {
        providerId: this.providerId,
        results,
      };
    } catch (error) {
      DevLogger.log('Error getting prices via Polymarket API:', error);

      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('getPrices', {
          queriesCount: queries.length,
        }),
      );

      return {
        providerId: this.providerId,
        results: [],
      };
    }
  }

  /**
   * Create or update an optimistic position after a successful BUY order
   */
  private async createOrUpdateOptimisticPosition({
    address,
    type,
    marketId,
    outcomeId,
    outcomeTokenId,
    spentAmount,
    receivedAmount,
    existingPosition,
    preview,
  }: {
    address: string;
    type: OptimisticUpdateType.CREATE | OptimisticUpdateType.UPDATE;
    marketId: string;
    outcomeId: string;
    outcomeTokenId: string;
    spentAmount: number;
    receivedAmount: number;
    existingPosition?: PredictPosition;
    preview: OrderPreview;
  }): Promise<void> {
    // Defensive check: should never create optimistic updates for claimable positions
    if (existingPosition?.claimable) {
      DevLogger.log(
        'PolymarketProvider: Attempted to create optimistic update on claimable position',
        {
          outcomeTokenId,
          claimable: existingPosition.claimable,
        },
      );
      return; // Silently return without creating optimistic update
    }

    // Calculate the expected final size after this purchase
    // If there's an existing position, add to it; otherwise it's a new position
    const currentSize = existingPosition?.size ?? 0;
    const expectedSize = currentSize + receivedAmount;

    // Calculate new position values
    let newAmount: number;
    let newInitialValue: number;
    let newAvgPrice: number;
    let newCurrentValue: number;
    let optimisticPosition: PredictPosition;

    if (existingPosition) {
      // Update existing position
      newAmount = existingPosition.amount + receivedAmount;
      newInitialValue = existingPosition.initialValue + spentAmount;
      newAvgPrice = newInitialValue / newAmount;
      newCurrentValue = newAmount * existingPosition.price;

      optimisticPosition = {
        ...existingPosition,
        amount: newAmount,
        size: expectedSize,
        initialValue: newInitialValue,
        avgPrice: newAvgPrice,
        currentValue: newCurrentValue,
        cashPnl: newCurrentValue - newInitialValue,
        percentPnl:
          ((newCurrentValue - newInitialValue) / newInitialValue) * 100,
        optimistic: true,
      };
    } else {
      // Create new position
      newAmount = receivedAmount;
      newInitialValue = spentAmount;
      newAvgPrice = spentAmount / receivedAmount;
      newCurrentValue = receivedAmount * preview.sharePrice;

      // Fetch market details for complete position data
      let marketDetails: PredictMarket | undefined;
      try {
        marketDetails = await this.getMarketDetails({ marketId });
      } catch (error) {
        DevLogger.log(
          'PolymarketProvider: Failed to fetch market details for optimistic position',
          error,
        );
      }

      const outcome = marketDetails?.outcomes.find((o) => o.id === outcomeId);
      const outcomeToken = outcome?.tokens.find((t) => t.id === outcomeTokenId);

      optimisticPosition = {
        id: outcomeTokenId,
        providerId: this.providerId,
        marketId,
        outcomeId,
        outcome: outcomeToken?.title ?? 'Unknown',
        outcomeTokenId,
        currentValue: newCurrentValue,
        title: outcome?.title ?? 'Unknown Market',
        icon: outcome?.image ?? marketDetails?.image ?? '',
        amount: newAmount,
        price: preview.sharePrice,
        status: PredictPositionStatus.OPEN,
        size: expectedSize,
        outcomeIndex:
          outcome?.tokens.findIndex((t) => t.id === outcomeTokenId) ?? 0,
        percentPnl:
          ((newCurrentValue - newInitialValue) / newInitialValue) * 100,
        cashPnl: newCurrentValue - newInitialValue,
        claimable: false,
        initialValue: newInitialValue,
        avgPrice: newAvgPrice,
        endDate: marketDetails?.endDate ?? new Date().toISOString(),
        negRisk: preview.negRisk,
        optimistic: true,
      };
    }

    // Store the optimistic update
    let addressMapForUpdate =
      this.#optimisticPositionUpdatesByAddress.get(address);
    if (!addressMapForUpdate) {
      addressMapForUpdate = new Map();
      this.#optimisticPositionUpdatesByAddress.set(
        address,
        addressMapForUpdate,
      );
    }

    addressMapForUpdate.set(outcomeTokenId, {
      type,
      outcomeTokenId,
      marketId,
      timestamp: Date.now(),
      optimisticPosition,
      expectedSize, // The size we expect to see when API confirms
    });

    DevLogger.log('PolymarketProvider: Created optimistic position update', {
      type,
      outcomeTokenId,
      expectedSize,
    });
  }

  /**
   * Mark a position for optimistic removal after a SELL or CLAIM operation
   */
  private removeOptimisticPosition({
    address,
    positionId,
    outcomeTokenId,
    marketId,
  }: {
    address: string;
    positionId: string;
    outcomeTokenId: string;
    marketId: string;
  }): void {
    let addressMap = this.#optimisticPositionUpdatesByAddress.get(address);
    if (!addressMap) {
      addressMap = new Map();
      this.#optimisticPositionUpdatesByAddress.set(address, addressMap);
    }

    addressMap.set(outcomeTokenId, {
      type: OptimisticUpdateType.REMOVE,
      outcomeTokenId,
      marketId,
      timestamp: Date.now(),
      positionId,
      expectedSize: 0, // For REMOVE, we expect size to be 0 (position gone)
    });

    DevLogger.log(
      'PolymarketProvider: Marked position for optimistic removal',
      {
        positionId,
        outcomeTokenId,
      },
    );
  }

  /**
   * Create an optimistic position from a preview before the order is placed.
   * Used during the deposit phase of the pay-with-any-token flow so the
   * position appears immediately while the deposit confirms.
   *
   * On order success the provider's own placeOrder() will overwrite this
   * entry with real amounts (same outcomeTokenId key).
   */
  async createOptimisticPositionFromPreview({
    address,
    preview,
  }: {
    address: string;
    preview: OrderPreview;
  }): Promise<void> {
    const { outcomeTokenId, outcomeId } = preview;

    let existingPosition: PredictPosition | undefined;
    try {
      const positions = await this.getPositions({
        address,
        outcomeId,
        limit: 5,
      });
      existingPosition = positions.find(
        (p) => p.outcomeTokenId === outcomeTokenId && !p.claimable,
      );
    } catch {
      // Position lookup failure is non-critical; treat as new position
    }

    await this.createOrUpdateOptimisticPosition({
      address,
      type: existingPosition
        ? OptimisticUpdateType.UPDATE
        : OptimisticUpdateType.CREATE,
      marketId: preview.marketId,
      outcomeId,
      outcomeTokenId,
      spentAmount: preview.maxAmountSpent,
      receivedAmount: preview.minAmountReceived,
      existingPosition,
      preview,
    });
  }

  /**
   * Remove a previously created optimistic position entry.
   * Used to immediately clean up preview-based optimistic positions
   * when a deposit or order fails.
   */
  clearOptimisticPosition(address: string, outcomeTokenId: string): void {
    const addressMap = this.#optimisticPositionUpdatesByAddress.get(address);
    if (addressMap) {
      addressMap.delete(outcomeTokenId);
    }
  }

  /**
   * Check if an API position has been updated to match our expected size
   * Simple comparison: if API size matches expected size, we're done
   */
  private isApiPositionUpdated(
    apiPosition: PredictPosition,
    update: OptimisticPositionUpdate,
  ): boolean {
    // If API position is claimable, it's always updated since we cannot
    // perform updates on claimable positions, other than REMOVE
    if (apiPosition.claimable) {
      return true;
    }

    const { expectedSize } = update;

    // Use a small tolerance for floating point comparison (0.1%)
    const sizeDiff = Math.abs(apiPosition.size - expectedSize);
    const sizeTolerance = Math.max(expectedSize * 0.001, 0.01); // 0.1% or 0.01 minimum
    const isUpdated = sizeDiff <= sizeTolerance;

    return isUpdated;
  }

  /**
   * Apply optimistic position updates to the API positions
   * Handles CREATE, UPDATE, and REMOVE operations
   */
  private applyOptimisticPositionUpdates({
    address,
    positions,
    claimable,
    marketId,
    outcomeId,
  }: {
    address: string;
    positions: PredictPosition[];
    claimable?: boolean;
    marketId?: string;
    outcomeId?: string;
  }): PredictPosition[] {
    const optimisticUpdates =
      this.#optimisticPositionUpdatesByAddress.get(address);

    if (!optimisticUpdates || optimisticUpdates.size === 0) {
      return positions;
    }

    const now = Date.now();
    const TIMEOUT_MS = 1 * 60 * 1000; // 1 minute
    const result: PredictPosition[] = [...positions];
    const updatesToRemove: string[] = [];

    // Process each optimistic update
    optimisticUpdates.forEach((update, outcomeTokenId) => {
      // Safety timeout: Remove updates older than TIMEOUT_MS
      if (now - update.timestamp > TIMEOUT_MS) {
        updatesToRemove.push(outcomeTokenId);
        DevLogger.log(
          'PolymarketProvider: Removing optimistic update due to timeout',
          {
            outcomeTokenId,
            age: now - update.timestamp,
          },
        );
        return;
      }

      // Check if this update matches the query filters
      const matchesFilter =
        (!outcomeId || update.outcomeTokenId === outcomeId) &&
        (!marketId || outcomeId || update.marketId === marketId);

      const apiPositionIndex = result.findIndex(
        (p) => p.outcomeTokenId === outcomeTokenId,
      );

      switch (update.type) {
        case OptimisticUpdateType.CREATE:
        case OptimisticUpdateType.UPDATE: {
          if (apiPositionIndex >= 0) {
            const apiPosition = result[apiPositionIndex];

            // Check if API position reflects our update
            if (this.isApiPositionUpdated(apiPosition, update)) {
              // API has been updated, remove optimistic update
              updatesToRemove.push(outcomeTokenId);
              DevLogger.log(
                'PolymarketProvider: API position updated, removing optimistic update',
                {
                  outcomeTokenId,
                  apiSize: apiPosition.size,
                  expectedSize: update.expectedSize,
                },
              );
            } else if (
              update.optimisticPosition &&
              !claimable &&
              matchesFilter
            ) {
              // API not yet updated, use optimistic position (only if matches filter)
              result[apiPositionIndex] = update.optimisticPosition;
            }
          } else if (update.optimisticPosition && !claimable && matchesFilter) {
            // New position not in API yet, add optimistic position (only if matches filter)
            result.push(update.optimisticPosition);
          }
          break;
        }

        case OptimisticUpdateType.REMOVE: {
          if (apiPositionIndex >= 0) {
            // Position still exists in API, remove it from results (optimistic removal)
            result.splice(apiPositionIndex, 1);
          } else {
            // Position not in this API response
            // This is expected - the position should be gone!
            // Keep the optimistic update active so it filters the position from other queries
            // It will be cleaned up by the timeout (5 minutes)
          }
          break;
        }
      }
    });

    // Clean up confirmed/timed-out updates
    if (updatesToRemove.length > 0) {
      updatesToRemove.forEach((tokenId) => {
        optimisticUpdates.delete(tokenId);
      });

      if (optimisticUpdates.size === 0) {
        this.#optimisticPositionUpdatesByAddress.delete(address);
      }
    }

    return result;
  }

  public async getPositions({
    address,
    limit = 100, // todo: reduce this once we've decided on the pagination approach
    offset = 0,
    claimable,
    marketId,
    outcomeId,
  }: GetPositionsParams): Promise<PredictPosition[]> {
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints();

    if (!address) {
      throw new Error('Address is required');
    }

    const predictAddress = computeProxyAddress(address);

    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      user: predictAddress,
      sortBy: 'CURRENT',
    });

    if (claimable !== undefined) {
      queryParams.set('redeemable', claimable.toString());
    }

    // Use market (conditionId/outcomeId) if provided for targeted fetch
    // This is mutually exclusive with eventId (marketId)
    if (outcomeId) {
      queryParams.set('market', outcomeId);
    } else if (marketId) {
      queryParams.set('eventId', marketId);
    }

    const response = await fetch(
      `${DATA_API_ENDPOINT}/positions?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to get positions');
    }
    const positionsData = (await response.json()) as PolymarketPosition[];

    const teamLookup = this.#createTeamLookup(
      this.#getSupportedLeagues().length > 0,
    );

    const parsedPositions = await parsePolymarketPositions({
      positions: positionsData,
      teamLookup,
    });

    // Apply optimistic updates (unified for BUY/SELL/CLAIM)
    const positionsWithOptimisticUpdates = this.applyOptimisticPositionUpdates({
      address,
      positions: parsedPositions,
      claimable,
      marketId,
      outcomeId,
    });

    return positionsWithOptimisticUpdates;
  }

  private async fetchActivity({
    address,
  }: {
    address: string;
  }): Promise<PredictActivity[]> {
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints();

    if (!address) {
      throw new Error('Address is required');
    }

    try {
      const predictAddress =
        this.#accountStateByAddress.get(address)?.address ??
        (await this.getAccountState({ ownerAddress: address })).address;

      const queryParams = new URLSearchParams({
        user: predictAddress,
        excludeLostRedeems: 'true',
      });

      const response = await fetch(
        `${DATA_API_ENDPOINT}/activity?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to get activity');
      }

      const activityRaw = (await response.json()) as PolymarketApiActivity[];
      const parsedActivity = parsePolymarketActivity(activityRaw);
      return Array.isArray(parsedActivity) ? parsedActivity : [];
    } catch (error) {
      DevLogger.log('Error getting activity via Polymarket API:', error);

      // Log to Sentry - this error is swallowed (returns []) so controller won't see it
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('fetchActivity'),
      );

      return [];
    }
  }

  public async getUnrealizedPnL({
    address,
  }: {
    address: string;
  }): Promise<UnrealizedPnL> {
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints();

    const predictAddress =
      this.#accountStateByAddress.get(address)?.address ??
      (await this.getAccountState({ ownerAddress: address })).address;

    const response = await fetch(
      `${DATA_API_ENDPOINT}/upnl?user=${predictAddress}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch unrealized P&L');
    }

    const data = (await response.json()) as UnrealizedPnL[];

    if (!Array.isArray(data)) {
      throw new Error('No unrealized P&L data found');
    }

    return data[0];
  }

  public async previewOrder(
    params: PreviewOrderParams & {
      signer: Signer;
    },
  ): Promise<OrderPreview> {
    const { feeCollection, fakOrdersEnabled } = this.#getFeatureFlags();
    const protocol = this.#getProtocol();
    const basePreview = await previewOrder({
      ...params,
      feeCollection,
      isV2: protocol.key === 'v2',
    });
    const normalizedPreview = {
      ...basePreview,
      feeRateBps: getPreviewFeeRateBpsForProtocol({
        protocol,
        preview: basePreview,
      }),
    };

    let orderType = OrderType.FOK;

    if (
      this.#shouldUseFakOrderType({
        permit2Enabled: feeCollection.permit2Enabled,
        executors: feeCollection.executors,
        fakOrdersEnabled,
      })
    ) {
      orderType = OrderType.FAK;
    }

    if (params.signer && this.isRateLimited(params.signer.address)) {
      return {
        ...normalizedPreview,
        orderType,
        rateLimited: true,
      };
    }

    return { ...normalizedPreview, orderType };
  }

  public async placeOrder(
    params: PlaceOrderParams & { signer: Signer },
  ): Promise<OrderResult> {
    const { signer, preview } = params;
    const { outcomeTokenId, side, positionId } = preview;

    // Check existing position for both BUY and SELL to validate claimable status
    let existingPosition: PredictPosition | undefined;
    if (side === Side.BUY) {
      this.#buyOrderInProgressByAddress.set(signer.address, true);
    }

    try {
      // Use outcomeId for efficient targeted lookup
      const positions = await this.getPositions({
        address: signer.address,
        outcomeId: preview.outcomeId,
        limit: 5,
      });
      existingPosition = positions.find(
        (p) => p.outcomeTokenId === outcomeTokenId,
      );

      // Check if position is claimable - cannot place orders on claimable positions
      // Claimable positions mean the market is closed and API has final state
      if (existingPosition?.claimable) {
        const error = 'Cannot place orders on claimable positions';
        DevLogger.log(
          'PolymarketProvider: Order blocked on claimable position',
          {
            error,
            outcomeTokenId,
            side,
            claimable: existingPosition.claimable,
          },
        );
        if (side === Side.BUY) {
          this.#buyOrderInProgressByAddress.set(signer.address, false);
        }
        return {
          success: false,
          error,
        } as OrderResult;
      }
    } catch (error) {
      if (side === Side.BUY) {
        this.#buyOrderInProgressByAddress.set(signer.address, false);
      }
      DevLogger.log(
        'PolymarketProvider: Failed to fetch existing position',
        error,
      );
    }

    try {
      const protocol = this.#getProtocol();
      const orderResponse =
        protocol.key === 'v2'
          ? await this.#submitOrderV2({
              signer,
              preview,
              protocol,
            })
          : await this.#submitOrderV1({
              signer,
              preview,
            });

      if (side === Side.BUY) {
        this.#lastBuyOrderTimestampByAddress.set(signer.address, Date.now());

        if (orderResponse.makingAmount && orderResponse.takingAmount) {
          try {
            const spentAmount = parseFloat(orderResponse.makingAmount);
            const receivedAmount = parseFloat(orderResponse.takingAmount);

            await this.createOrUpdateOptimisticPosition({
              address: signer.address,
              type: existingPosition
                ? OptimisticUpdateType.UPDATE
                : OptimisticUpdateType.CREATE,
              marketId: preview.marketId,
              outcomeId: preview.outcomeId,
              outcomeTokenId,
              spentAmount,
              receivedAmount,
              existingPosition,
              preview,
            });
          } catch (optimisticError) {
            DevLogger.log(
              'PolymarketProvider: Failed to create optimistic position update',
              optimisticError,
            );
            Logger.error(
              optimisticError instanceof Error
                ? optimisticError
                : new Error(String(optimisticError)),
              this.getErrorContext('placeOrder:optimisticUpdate', {
                operation: 'optimistic_position_update',
                outcomeTokenId,
                side,
              }),
            );
          }
        }
      } else if (positionId) {
        this.removeOptimisticPosition({
          address: signer.address,
          positionId,
          outcomeTokenId,
          marketId: preview.marketId,
        });
      }

      return {
        success: true,
        response: {
          id: orderResponse.orderID ?? '',
          spentAmount: orderResponse.makingAmount ?? '0',
          receivedAmount: orderResponse.takingAmount ?? '0',
          txHashes: orderResponse.transactionsHashes,
        },
      } as OrderResult;
    } catch (error) {
      // Catch all errors and return them in consistent format
      // instead of throwing for better error handling
      DevLogger.log('PolymarketProvider: Place order failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error instanceof Error ? error.stack : undefined,
        side,
        outcomeTokenId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to place order',
      } as OrderResult;
    } finally {
      if (side === Side.BUY) {
        this.#buyOrderInProgressByAddress.set(signer.address, false);
      }
    }
  }

  public async prepareClaim(
    params: ClaimOrderParams,
  ): Promise<ClaimOrderResponse> {
    try {
      const { positions, signer } = params;
      const protocol = this.#getProtocol();

      if (!positions || positions.length === 0) {
        throw new Error('No positions provided for claim');
      }

      if (!signer?.address) {
        throw new Error('Signer address is required for claim');
      }

      // Get safe address from cache or fetch it
      let safeAddress: string | undefined;
      try {
        safeAddress =
          this.#accountStateByAddress.get(signer.address)?.address ??
          computeProxyAddress(signer.address);
      } catch (error) {
        throw new Error(
          `Failed to retrieve account state: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }

      if (!safeAddress) {
        throw new Error('Safe address not found for claim');
      }

      if (protocol.key === 'v2') {
        const claimTransaction = await buildClaimTransaction({
          signer,
          positions,
          safeAddress,
          protocol,
        });

        return {
          chainId: POLYGON_MAINNET_CHAIN_ID,
          transactions: [claimTransaction],
        };
      }

      const signerBalance = await getBalance({ address: signer.address });

      let includeTransferTransaction = false;

      if (signerBalance < MIN_COLLATERAL_BALANCE_FOR_CLAIM) {
        includeTransferTransaction = true;
      }

      // Generate claim transaction
      let claimTransaction;
      try {
        claimTransaction = await getClaimTransaction({
          signer,
          positions,
          safeAddress,
          includeTransferTransaction,
        });
      } catch (error) {
        throw new Error(
          `Failed to generate claim transaction: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }

      if (!claimTransaction || claimTransaction.length === 0) {
        throw new Error('No claim transaction generated');
      }

      return {
        chainId: POLYGON_MAINNET_CHAIN_ID,
        transactions: claimTransaction,
      };
    } catch (error) {
      // Log error for debugging
      DevLogger.log('PolymarketProvider: prepareClaim failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Re-throw with clear error message
      throw error;
    }
  }

  public confirmClaim({
    positions,
    signer,
  }: {
    positions: PredictPosition[];
    signer: Signer;
  }) {
    // Use unified optimistic update system for claim operations
    positions.forEach((position) => {
      this.removeOptimisticPosition({
        address: signer.address,
        positionId: position.id,
        outcomeTokenId: position.outcomeTokenId,
        marketId: position.marketId,
      });
    });
  }

  public async isEligible(): Promise<GeoBlockResponse> {
    const { GEOBLOCK_API_ENDPOINT } = getPolymarketEndpoints();
    const result: GeoBlockResponse = { isEligible: false };

    try {
      const res = await fetch(GEOBLOCK_API_ENDPOINT);
      const data = (await res.json()) as {
        blocked?: boolean;
        country?: string;
      };

      if (data.blocked !== undefined) {
        result.isEligible = data.blocked === false;
        result.country = data.country;
      }
    } catch (error) {
      DevLogger.log('PolymarketProvider: Error checking geoblock status', {
        error:
          error instanceof Error
            ? error.message
            : `Error checking geoblock status: ${error}`,
        timestamp: new Date().toISOString(),
      });

      // Log to Sentry - this error is swallowed (returns false) so controller won't see it
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('isEligible', {
          operation: 'geoblock_check',
        }),
      );
    }
    return result;
  }

  /**
   * Set user trait for Polymarket account creation via MetaMask
   */
  private setPolymarketAccountCreatedTrait(): void {
    analytics.identify({
      [UserProfileProperty.CREATED_POLYMARKET_ACCOUNT_VIA_MM]: true,
    });
  }

  public async prepareDeposit(
    params: PrepareDepositParams,
  ): Promise<PrepareDepositResponse> {
    const transactions: PrepareDepositResponse['transactions'] = [];
    const { signer } = params;
    const protocol = this.#getProtocol();

    if (!signer?.address) {
      throw new Error('Signer address is required for deposit preparation');
    }

    const depositMode = protocol.workflow.depositMode as DepositExecutionMode;
    const depositTokenAddress =
      depositMode === 'pusd-transfer'
        ? protocol.collateral.tradingToken
        : protocol.collateral.legacyUsdceToken;

    if (!depositTokenAddress) {
      throw new Error('Collateral contract address not configured');
    }

    const accountState = await this.getAccountState({
      ownerAddress: signer.address,
    });

    if (!accountState) {
      throw new Error('Failed to retrieve account state');
    }

    if (!accountState.address) {
      throw new Error('Account address not found in account state');
    }

    if (!accountState.isDeployed) {
      const deployTransaction = await getDeployProxyWalletTransaction({
        signer,
      });

      if (!deployTransaction) {
        throw new Error('Failed to get deploy proxy wallet transaction params');
      }

      if (!deployTransaction.params?.to || !deployTransaction.params?.data) {
        throw new Error('Invalid deploy transaction: missing params');
      }

      transactions.push(deployTransaction);

      // Set user trait for Polymarket account creation via MetaMask
      this.setPolymarketAccountCreatedTrait();
    }

    const depositTransactionCallData = generateTransferData('transfer', {
      toAddress: accountState.address,
      amount: '0x0',
    });

    if (!depositTransactionCallData) {
      throw new Error(
        'Failed to generate transfer data for deposit transaction',
      );
    }

    transactions.push({
      params: {
        to: depositTokenAddress as Hex,
        data: depositTransactionCallData as Hex,
      },
      type: TransactionType.predictDeposit,
    });

    if (protocol.key === 'v2') {
      const maintenanceTransaction = await buildDepositMaintenanceTransaction({
        signer,
        safeAddress: accountState.address,
        protocol,
      });

      if (maintenanceTransaction) {
        transactions.push(maintenanceTransaction);
      }

      return {
        chainId: CHAIN_IDS.POLYGON,
        transactions,
      };
    }

    if (!accountState.hasAllowances) {
      const { feeCollection: depositFeeCollection } = this.#getFeatureFlags();
      const extraUsdcSpenders = depositFeeCollection.permit2Enabled
        ? [PERMIT2_ADDRESS]
        : [];
      const allowanceTransaction = await getProxyWalletAllowancesTransaction({
        signer,
        extraUsdcSpenders,
      });

      if (!allowanceTransaction) {
        throw new Error('Failed to get proxy wallet allowances transaction');
      }

      if (
        !allowanceTransaction.params?.to ||
        !allowanceTransaction.params?.data
      ) {
        throw new Error('Invalid allowance transaction: missing params');
      }

      transactions.splice(transactions.length - 1, 0, allowanceTransaction);
    }

    return {
      chainId: CHAIN_IDS.POLYGON,
      transactions,
    };
  }

  public async getAccountState(
    params: GetAccountStateParams,
  ): Promise<AccountState> {
    try {
      const { ownerAddress } = params;

      if (!ownerAddress) {
        throw new Error('Owner address is required');
      }

      // Get or compute safe address
      const cachedAddress = this.#accountStateByAddress.get(ownerAddress);
      let address: string;
      try {
        address = cachedAddress?.address ?? computeProxyAddress(ownerAddress);
      } catch (error) {
        throw new Error(
          `Failed to compute safe address: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }

      if (!address) {
        throw new Error('Failed to get safe address');
      }

      // Check deployment status and allowances
      let isDeployed: boolean;
      let hasAllowancesResult: boolean;
      const { feeCollection: flagFeeCollection } = this.#getFeatureFlags();
      const extraUsdcSpenders = flagFeeCollection.permit2Enabled
        ? [PERMIT2_ADDRESS]
        : [];
      try {
        [isDeployed, hasAllowancesResult] = await Promise.all([
          isSmartContractAddress(
            address,
            numberToHex(POLYGON_MAINNET_CHAIN_ID),
          ),
          hasAllowances({ address, extraUsdcSpenders }),
        ]);
      } catch (error) {
        throw new Error(
          `Failed to check account state: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }

      const accountState = {
        address: address as `0x${string}`,
        isDeployed,
        hasAllowances: hasAllowancesResult,
      };

      this.#accountStateByAddress.set(ownerAddress, accountState);

      return accountState;
    } catch (error) {
      DevLogger.log('PolymarketProvider: getAccountState failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  public async getBalance({ address }: GetBalanceParams): Promise<number> {
    if (!address) {
      throw new Error('address is required');
    }

    const predictAddress =
      this.#accountStateByAddress.get(address)?.address ??
      computeProxyAddress(address);
    const protocol = this.#getProtocol();

    if (protocol.key !== 'v2') {
      return await getBalance({ address: predictAddress });
    }

    const balances = await Promise.all(
      protocol.collateral.balanceTokens.map((tokenAddress) =>
        getBalance({
          address: predictAddress,
          tokenAddress,
        }),
      ),
    );

    return balances.reduce((sum, balance) => sum + balance, 0);
  }

  public async prepareWithdraw(
    params: PrepareWithdrawParams,
  ): Promise<PrepareWithdrawResponse> {
    const { signer } = params;
    const protocol = this.#getProtocol();

    if (!signer.address) {
      throw new Error('Signer address is required');
    }

    const safeAddress =
      this.#accountStateByAddress.get(signer.address)?.address ??
      (await this.getAccountState({ ownerAddress: signer.address })).address;

    const withdrawMode = protocol.workflow
      .withdrawMode as WithdrawExecutionMode;
    const withdrawTokenAddress =
      withdrawMode === 'pusd-transfer'
        ? protocol.collateral.tradingToken
        : protocol.collateral.legacyUsdceToken;

    const callData = encodeErc20Transfer({
      to: signer.address,
      value: '0x0',
    });

    return {
      chainId: CHAIN_IDS.POLYGON,
      transaction: {
        params: {
          to: withdrawTokenAddress as Hex,
          data: callData,
          gas: numberToHex(SAFE_EXEC_GAS_LIMIT) as Hex,
        },
        type: TransactionType.predictWithdraw,
      },
      predictAddress: safeAddress,
    };
  }

  public async signWithdraw(
    params: SignWithdrawParams,
  ): Promise<SignWithdrawResponse> {
    const { callData, signer } = params;
    const protocol = this.#getProtocol();

    if (!signer.address) {
      throw new Error('Signer address is required');
    }

    const safeAddress =
      this.#accountStateByAddress.get(signer.address)?.address ??
      computeProxyAddress(signer.address);

    const amount = getSafeUsdcAmount(callData);

    if (protocol.key === 'v2') {
      const signedWithdrawTransaction = await buildWithdrawTransaction({
        signer,
        safeAddress,
        requestedAmount: amount,
        mode: protocol.workflow.withdrawMode,
        protocol,
      });

      return {
        callData: signedWithdrawTransaction.params.data,
        amount,
      };
    }

    const signedCallData = await getWithdrawTransactionCallData({
      data: callData,
      signer,
      safeAddress,
    });

    return {
      callData: signedCallData,
      amount,
    };
  }

  public subscribeToGameUpdates(
    gameId: string,
    callback: GameUpdateCallback,
  ): () => void {
    return WebSocketManager.getInstance().subscribeToGame(gameId, callback);
  }

  public subscribeToMarketPrices(
    tokenIds: string[],
    callback: PriceUpdateCallback,
  ): () => void {
    return WebSocketManager.getInstance().subscribeToMarketPrices(
      tokenIds,
      callback,
    );
  }

  public subscribeToCryptoPrices(
    symbols: string[],
    callback: CryptoPriceUpdateCallback,
  ): () => void {
    return WebSocketManager.getInstance().subscribeToCryptoPrices(
      symbols,
      callback,
    );
  }

  public getConnectionStatus(): ConnectionStatus {
    const status = WebSocketManager.getInstance().getConnectionStatus();
    return {
      sportsConnected: status.sportsConnected,
      marketConnected: status.marketConnected,
      rtdsConnected: status.rtdsConnected,
    };
  }
}
