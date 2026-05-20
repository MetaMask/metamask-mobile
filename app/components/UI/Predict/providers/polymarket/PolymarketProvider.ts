import {
  SignTypedDataVersion,
  type TypedMessageParams,
} from '@metamask/keyring-controller';
import {
  CHAIN_IDS,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { Hex, numberToHex } from '@metamask/utils';
import { getAddress, Interface, parseUnits } from 'ethers/lib/utils';
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
  CryptoPriceHistoryPoint,
  GetCryptoPriceHistoryParams,
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
  BeforeSignClaimParams,
  BeforeSignClaimResult,
  ClaimOrderParams,
  ClaimOrderResponse,
  ConnectionStatus,
  CryptoPriceUpdateCallback,
  GameUpdateCallback,
  GeoBlockResponse,
  GetAccountStateParams,
  GetBalanceParams,
  GetMarketsParams,
  GetMarketsResult,
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
  PublishClaimParams,
  PublishClaimResult,
  SearchMarketsParams,
  Signer,
  SignWithdrawParams,
  SignWithdrawResponse,
} from '../types';
import {
  COLLATERAL_TOKEN_DECIMALS,
  ORDER_RATE_LIMIT_MS,
  POLYGON_MAINNET_CHAIN_ID,
  POLYMARKET_PROVIDER_ID,
  SAFE_EXEC_GAS_LIMIT,
} from './constants';
import {
  computeProxyAddress,
  createPermit2FeeAuthorization,
  getSafeTransferAmount,
  getSafeTransferAmountRaw,
} from './safe/utils';
import { Permit2FeeAuthorization } from './safe/types';
import {
  ApiKeyCreds,
  OrderType,
  SignatureType,
  PolymarketApiActivity,
  PolymarketApiEvent,
  PolymarketApiEventsKeysetResponse,
  PolymarketApiTeam,
  PolymarketPosition,
} from './types';
import {
  createApiKey,
  encodeErc20Transfer,
  fetchEventsFromPolymarketApi,
  fetchCarouselFromPolymarketApi,
  getBalance,
  getL2Headers,
  fetchChildEventsFromGammaApi,
  getMarketDetailsFromGammaApi,
  getPolymarketEndpoints,
  getRawBalance,
  mergeChildEventsIntoParent,
  parsePolymarketActivity,
  parsePolymarketEvents,
  parsePolymarketPositions,
  previewOrder,
  searchEventsFromPolymarketApi,
} from './utils';
import { PredictFeatureFlags } from '../../types/flags';
import {
  extractNeededTeamsFromEvents,
  getEventLeague,
  isLiveSportsEvent,
} from '../../utils/gameParser';
import { GameCache } from './GameCache';
import { TeamsCache } from './TeamsCache';
import { WebSocketManager } from './WebSocketManager';
import {
  getProtocolWithdrawTokenAddress,
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
} from './protocol/definitions';
import {
  buildProtocolUnsignedOrder,
  getPreviewFeeRateBpsForProtocol,
  getProtocolVerifyingContract,
  serializeProtocolRelayerOrder,
  signProtocolOrder,
} from './protocol/orderCodec';
import { submitProtocolClobOrder } from './protocol/transport';
import {
  buildClaimTransaction,
  planDepositWalletClaim,
} from './preflight/claim';
import { buildDepositMaintenanceTransaction } from './preflight/deposit';
import { planDepositWalletPreflight } from './preflight/depositWallet';
import { buildLegacySafeMigrationSweepTransaction } from './preflight/legacySafeMigration';
import { buildTradeAllowancesTx } from './preflight/trade';
import { buildWithdrawTransaction } from './preflight/withdraw';
import {
  deriveDepositWalletAddress,
  executeDepositWalletBatch,
  getDepositWalletRelayerTransactionId,
  requestDepositWalletCreate,
  syncDepositWalletCollateralBalanceAllowance,
  toDepositWalletCalls,
  waitForDepositWalletDeployed,
  waitForDepositWalletTransaction,
} from './depositWallet';

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

const ERC20_TRANSFER_INTERFACE = new Interface([
  'function transfer(address to, uint256 value)',
]);

export class PolymarketProvider implements PredictProvider {
  readonly providerId = POLYMARKET_PROVIDER_ID;
  readonly name = 'Polymarket';
  readonly chainId = POLYGON_MAINNET_CHAIN_ID;
  readonly #getFeatureFlags: () => PredictFeatureFlags;

  #apiKeysByProtocolAddress: Map<string, ApiKeyCreds> = new Map();
  #accountStateByAddress: Map<string, AccountState> = new Map();
  #safeAddressesWithZeroLegacyUsdceBalance = new Set<string>();
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

  #getAccountStateCacheKey(ownerAddress: string): string {
    return getAddress(ownerAddress).toLowerCase();
  }

  #getCachedAccountState(ownerAddress: string): AccountState | undefined {
    return this.#accountStateByAddress.get(
      this.#getAccountStateCacheKey(ownerAddress),
    );
  }

  #setCachedAccountState(
    ownerAddress: string,
    accountState: AccountState,
  ): void {
    this.#accountStateByAddress.set(
      this.#getAccountStateCacheKey(ownerAddress),
      accountState,
    );
  }

  public invalidateAccountState(ownerAddress: string): void {
    try {
      this.#accountStateByAddress.delete(
        this.#getAccountStateCacheKey(ownerAddress),
      );
    } catch (error) {
      DevLogger.log('PolymarketProvider: Failed to invalidate account state', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  #getSupportedLeagues(): PredictSportsLeague[] {
    const { liveSportsLeagues } = this.#getFeatureFlags();
    return filterSupportedLeagues(liveSportsLeagues);
  }

  #getExtendedSportsMarketsLeagues(): string[] {
    return this.#getFeatureFlags().extendedSportsMarketsLeagues;
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

  async #parseEventsToMarkets({
    events,
    category,
    filterEmptyOutcomes = false,
  }: {
    events: PolymarketApiEvent[];
    category: PredictCategory;
    filterEmptyOutcomes?: boolean;
  }): Promise<PredictMarket[]> {
    const supportedLeagues = this.#getSupportedLeagues();
    const liveSportsEnabled = supportedLeagues.length > 0;

    await this.#ensureTeamsLoadedForEvents(events, supportedLeagues);

    const teamLookup = this.#createTeamLookup(liveSportsEnabled);

    let markets = parsePolymarketEvents(events, {
      category,
      sortMarketsBy: 'price',
      teamLookup,
      extendedSportsMarketsLeagues: this.#getExtendedSportsMarketsLeagues(),
    });

    if (filterEmptyOutcomes) {
      markets = markets.filter((m) => m.outcomes.length > 0);
    }

    return liveSportsEnabled
      ? GameCache.getInstance().overlayOnMarkets(markets)
      : markets;
  }

  /**
   * Extended sports positions can point to child events like player props or
   * halftime markets, but the details view should resolve back to the parent
   * game and merge the child markets into that game when the league supports it.
   */
  async #resolveSportMarketFromPolymarket({
    event,
    extendedSportsMarketsLeagues,
  }: {
    event: PolymarketApiEvent;
    extendedSportsMarketsLeagues: string[];
  }): Promise<{
    resolvedEvent: PolymarketApiEvent;
    childMarketIds?: string[];
  }> {
    const eventLeague = getEventLeague(event, extendedSportsMarketsLeagues);
    if (!eventLeague || !extendedSportsMarketsLeagues.includes(eventLeague)) {
      return { resolvedEvent: event };
    }

    const resolvedEventId = event.parentEventId ?? event.id;

    try {
      const allEvents = await fetchChildEventsFromGammaApi({
        parentEventId: resolvedEventId,
      });
      return {
        resolvedEvent: mergeChildEventsIntoParent(allEvents),
        childMarketIds: allEvents.map(
          (resolvedChildEvent) => resolvedChildEvent.id,
        ),
      };
    } catch (childFetchError) {
      DevLogger.log(
        'Failed to fetch child events, using resolved event only:',
        childFetchError,
      );
      return { resolvedEvent: event };
    }
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
    return POLYMARKET_V2_PROTOCOL;
  }

  #getLegacyUsdceBalanceCacheKey(safeAddress: string): string {
    return getAddress(safeAddress).toLowerCase();
  }

  async #getLegacyUsdceBalance({
    safeAddress,
    protocol,
  }: {
    safeAddress: string;
    protocol: PolymarketProtocolDefinition;
  }): Promise<bigint> {
    const cacheKey = this.#getLegacyUsdceBalanceCacheKey(safeAddress);

    if (this.#safeAddressesWithZeroLegacyUsdceBalance.has(cacheKey)) {
      return 0n;
    }

    const balance = await getRawBalance({
      address: safeAddress,
      tokenAddress: protocol.collateral.legacyUsdceToken,
    });

    if (balance === 0n) {
      this.#safeAddressesWithZeroLegacyUsdceBalance.add(cacheKey);
    }

    return balance;
  }

  #pickExecutor(executors: string[]): string {
    const randomIndex = new Uint32Array(1);
    global.crypto.getRandomValues(randomIndex);

    return executors[randomIndex[0] % executors.length];
  }

  #getPlaceOrderType({
    preview,
    feeCollection,
    fakOrdersEnabled,
    permit2FeeReady,
    permit2AllowanceReady,
    manualFeeCollectionSupported = true,
  }: {
    preview: OrderPreview;
    feeCollection: PredictFeatureFlags['feeCollection'];
    fakOrdersEnabled: boolean;
    permit2FeeReady: boolean;
    permit2AllowanceReady: boolean;
    manualFeeCollectionSupported?: boolean;
  }): OrderType {
    if (
      !this.#shouldUseFakOrderType({
        permit2Enabled: feeCollection.permit2Enabled,
        executors: feeCollection.executors,
        fakOrdersEnabled,
      })
    ) {
      return OrderType.FOK;
    }

    const hasFees = preview.fees !== undefined && preview.fees.totalFee > 0;

    if (
      !hasFees ||
      !manualFeeCollectionSupported ||
      (permit2FeeReady && permit2AllowanceReady)
    ) {
      return OrderType.FAK;
    }

    return OrderType.FOK;
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

  async #submitOrder({
    signer,
    preview,
    protocol,
  }: {
    signer: Signer;
    preview: OrderPreview;
    protocol: PolymarketProtocolDefinition;
  }) {
    const accountState = await this.getAccountState({
      ownerAddress: signer.address,
    });
    const isDepositWallet = accountState.walletType === 'deposit-wallet';
    const tradingWalletAddress = accountState.address;
    const verifyingContract = getProtocolVerifyingContract({
      protocol,
      negRisk: preview.negRisk,
    });

    let depositWalletSetupUpdatedState = false;
    if (isDepositWallet) {
      depositWalletSetupUpdatedState = await this.ensureDepositWalletReady({
        ownerAddress: signer.address,
        depositWalletAddress: tradingWalletAddress,
        protocol,
        getSigner: () => signer,
        operation: 'deposit_wallet_order_preflight',
      });
    }

    const order = buildProtocolUnsignedOrder({
      protocol,
      preview: {
        ...preview,
        feeRateBps: getPreviewFeeRateBpsForProtocol(),
      },
      makerAddress: tradingWalletAddress,
      signerAddress: isDepositWallet
        ? tradingWalletAddress
        : getAddress(signer.address),
      signatureType: isDepositWallet
        ? SignatureType.POLY_1271
        : SignatureType.POLY_GNOSIS_SAFE,
    });

    const signature = await signProtocolOrder({
      signer,
      protocol,
      order,
      verifyingContract,
    });

    const signedOrder = {
      ...order,
      signature,
    };
    const signerApiKey = await this.getApiKey({
      address: signer.address,
    });

    if (isDepositWallet && depositWalletSetupUpdatedState) {
      await this.syncDepositWalletBalanceAllowanceForOrderIfNeeded({
        protocol,
        signerAddress: signer.address,
        apiKey: signerApiKey,
      });
    }

    const { feeCollection, fakOrdersEnabled } = this.#getFeatureFlags();
    const shouldUsePermit2 =
      !isDepositWallet &&
      this.#hasPermit2Config({
        permit2Enabled: preview.fees?.permit2Enabled,
        executors: preview.fees?.executors,
      });

    let feeAuthorization: Permit2FeeAuthorization | undefined;
    let executor: string | undefined;
    let permit2FeeReady = false;

    if (
      preview.fees !== undefined &&
      preview.fees.totalFee > 0 &&
      shouldUsePermit2
    ) {
      const feeAmount = BigInt(
        parseUnits(preview.fees.totalFee.toString(), 6).toString(),
      );
      executor = this.#pickExecutor(preview.fees.executors ?? []);
      feeAuthorization = await createPermit2FeeAuthorization({
        safeAddress: tradingWalletAddress,
        signer,
        amount: feeAmount,
        spender: executor,
        tokenAddress: protocol.collateral.feeAuthorizationToken,
      });
      permit2FeeReady = true;
    }

    let allowancesTx: { to: string; data: string } | undefined;
    let permit2AllowanceReady = false;

    if (isDepositWallet) {
      const legacySafeAddress = computeProxyAddress(signer.address);
      const legacySafeDeployed = await isSmartContractAddress(
        legacySafeAddress,
        numberToHex(POLYGON_MAINNET_CHAIN_ID),
      );

      if (legacySafeDeployed) {
        const sweepTransaction = await buildLegacySafeMigrationSweepTransaction(
          {
            signer,
            legacySafeAddress,
            depositWalletAddress: tradingWalletAddress,
            protocol,
          },
        );

        allowancesTx = sweepTransaction?.params;
      }
    } else {
      try {
        const safeLegacyUsdceBalance = await this.#getLegacyUsdceBalance({
          safeAddress: tradingWalletAddress,
          protocol,
        });
        allowancesTx = await buildTradeAllowancesTx({
          signer,
          safeAddress: tradingWalletAddress,
          protocol,
          safeUsdceBalance: safeLegacyUsdceBalance,
        });
        permit2AllowanceReady = true;
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
        throw new Error('Failed to prepare v2 trade preflight');
      }
    }

    const orderType = this.#getPlaceOrderType({
      preview,
      feeCollection,
      fakOrdersEnabled,
      permit2FeeReady,
      permit2AllowanceReady,
      manualFeeCollectionSupported: !isDepositWallet,
    });

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
      address: signer.address,
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
      const extendedSportsMarketsLeagues =
        this.#getExtendedSportsMarketsLeagues();
      const isSportsEvent =
        liveSportsEnabled &&
        isLiveSportsEvent(
          event,
          supportedLeagues,
          extendedSportsMarketsLeagues,
        );

      let mergedEvent = event;
      let childMarketIds: string[] | undefined;
      if (isSportsEvent) {
        const resolvedSportMarket =
          await this.#resolveSportMarketFromPolymarket({
            event,
            extendedSportsMarketsLeagues,
          });
        mergedEvent = resolvedSportMarket.resolvedEvent;
        childMarketIds = resolvedSportMarket.childMarketIds;

        await this.#ensureTeamsLoadedForEvents([mergedEvent], supportedLeagues);
      }

      const teamLookup = this.#createTeamLookup(isSportsEvent);

      const [parsedMarket] = parsePolymarketEvents([mergedEvent], {
        category: PolymarketProvider.FALLBACK_CATEGORY,
        teamLookup,
        extendedSportsMarketsLeagues,
      });

      if (!parsedMarket) {
        throw new Error('Failed to parse market details');
      }

      const result = isSportsEvent
        ? GameCache.getInstance().overlayOnMarket(parsedMarket)
        : parsedMarket;

      if (childMarketIds) {
        result.childMarketIds = childMarketIds;
      }

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
  }: {
    address: string;
  }): Promise<ApiKeyCreds> {
    const cacheKey = address;
    const cachedApiKey = this.#apiKeysByProtocolAddress.get(cacheKey);
    if (cachedApiKey) {
      return cachedApiKey;
    }

    const apiKeyCreds = await createApiKey({
      address,
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

  public async getMarkets(
    params?: GetMarketsParams,
  ): Promise<GetMarketsResult> {
    try {
      const { events, category, nextCursor } =
        await fetchEventsFromPolymarketApi(params);

      const markets = await this.#parseEventsToMarkets({
        events,
        category,
      });

      return { markets, nextCursor };
    } catch (error) {
      DevLogger.log('Error getting markets via Polymarket API:', error);

      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('getMarkets', {
          category: params?.category,
          hasAfterCursor: Boolean(params?.afterCursor),
        }),
      );

      return { markets: [], nextCursor: null };
    }
  }

  public async searchMarkets(
    params: SearchMarketsParams,
  ): Promise<{ markets: PredictMarket[]; totalResults: number }> {
    const query = params.q.trim();

    if (!query) {
      return { markets: [], totalResults: 0 };
    }

    try {
      const { events, totalResults } = await searchEventsFromPolymarketApi({
        ...params,
        q: query,
      });

      const markets = await this.#parseEventsToMarkets({
        events,
        category: PolymarketProvider.FALLBACK_CATEGORY,
        filterEmptyOutcomes: true,
      });

      return { markets, totalResults };
    } catch (error) {
      DevLogger.log('Error searching markets via Polymarket API:', error);

      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('searchMarkets', {
          hasSearchQuery: Boolean(query),
        }),
      );

      return { markets: [], totalResults: 0 };
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
        `${GAMMA_API_ENDPOINT}/events/keyset?${queryParams.toString()}`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch series events');
      }

      const responseData =
        (await response.json()) as PolymarketApiEventsKeysetResponse;

      if (!Array.isArray(responseData.events)) {
        throw new Error('Malformed keyset series events response');
      }

      const events = responseData.events;

      if (events.length === 0) {
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
      // Polymarket's carousel API occasionally returns sports events that have
      // already finished (ended: true). Filter them out here so ended games
      // never reach the carousel UI. Non-sports events have `ended` undefined
      // and pass through unchanged.
      const events = items
        .map((item) => item.event)
        .filter((event) => !event.ended);

      await this.#ensureTeamsLoadedForEvents(events, supportedLeagues);

      const teamLookup = this.#createTeamLookup(liveSportsEnabled);

      const parsedMarkets = parsePolymarketEvents(events, {
        category: 'trending',
        sortMarketsBy: 'price',
        teamLookup,
        extendedSportsMarketsLeagues: this.#getExtendedSportsMarketsLeagues(),
      })
        .filter((m) => m.status === 'open' && m.outcomes.length > 0)
        .map((market) => {
          // Carousel cards only have room for a single "winning team /
          // winning side" bet. When Polymarket returns an event with
          // multiple markets (e.g. an e-sports match with Match Winner +
          // O/U 2.5 Games), collapse to just the moneyline outcome so
          // users see the primary bet instead of a random pair of
          // secondary markets. Events without a moneyline outcome are
          // passed through unchanged.
          const moneyline = market.outcomes.find(
            (o) => o.sportsMarketType?.toLowerCase() === 'moneyline',
          );
          return moneyline ? { ...market, outcomes: [moneyline] } : market;
        });

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

  public async getCryptoPriceHistory(
    params: GetCryptoPriceHistoryParams,
  ): Promise<CryptoPriceHistoryPoint[]> {
    const { symbol, eventStartTime, variant, endDate } = params;

    try {
      if (!symbol) {
        throw new Error('symbol parameter is required');
      }

      const { CRYPTO_PRICE_HISTORY_ENDPOINT } = getPolymarketEndpoints();
      const searchParams = new URLSearchParams({
        symbol,
        eventStartTime,
        variant,
      });

      if (endDate) {
        searchParams.set('endDate', endDate);
      }

      const response = await fetch(
        `${CRYPTO_PRICE_HISTORY_ENDPOINT}?${searchParams.toString()}`,
        { method: 'GET' },
      );

      if (!response.ok) {
        throw new Error('Failed to get crypto price history');
      }

      const data = (await response.json()) as {
        timestamp?: number;
        value?: number;
      }[];

      if (!Array.isArray(data)) {
        return [];
      }

      return data
        .filter(
          (entry): entry is { timestamp: number; value: number } =>
            typeof entry?.timestamp === 'number' &&
            typeof entry?.value === 'number',
        )
        .map((entry) => ({
          timestamp: entry.timestamp,
          value: entry.value,
        }));
    } catch (error) {
      DevLogger.log(
        'Error getting crypto price history via Polymarket API:',
        error,
      );

      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('getCryptoPriceHistory', {
          symbol,
          eventStartTime,
          variant,
          endDate,
        } as Record<string, unknown>),
      );

      throw error;
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
      if (typeof parsed?.openPrice !== 'number' || parsed.openPrice <= 0) {
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

    const predictAddress =
      this.#getCachedAccountState(address)?.address ??
      (await this.getAccountState({ ownerAddress: address })).address;

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

    const positionsUrl = `${DATA_API_ENDPOINT}/positions?${queryParams.toString()}`;
    const response = await fetch(positionsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get positions');
    }
    const positionsText = await response.text();
    let positionsData: PolymarketPosition[];
    try {
      positionsData = JSON.parse(positionsText) as PolymarketPosition[];
    } catch (parseError) {
      const snippet = positionsText.slice(0, 200).replace(/\s+/gu, ' ');
      DevLogger.log('PolymarketProvider: non-JSON positions response', {
        url: positionsUrl,
        status: response.status,
        contentType: response.headers.get('content-type'),
        bodySnippet: snippet,
      });
      throw new Error(
        `Polymarket positions returned non-JSON (status ${response.status}): ${snippet}`,
      );
    }

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
        this.#getCachedAccountState(address)?.address ??
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
      this.#getCachedAccountState(address)?.address ??
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
    const basePreview = await previewOrder({
      ...params,
      feeCollection,
    });
    const normalizedPreview = {
      ...basePreview,
      feeRateBps: getPreviewFeeRateBpsForProtocol(),
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
      const orderResponse = await this.#submitOrder({
        signer,
        preview,
        protocol,
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

      let safeAddress: Hex;
      try {
        safeAddress = computeProxyAddress(signer.address);
      } catch (error) {
        throw new Error(
          `Failed to compute safe address: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }

      const safeLegacyUsdceBalance = await this.#getLegacyUsdceBalance({
        safeAddress,
        protocol,
      });
      const claimTransaction = await buildClaimTransaction({
        signer,
        positions,
        safeAddress,
        protocol,
        safeLegacyUsdceBalance,
      });

      return {
        chainId: POLYGON_MAINNET_CHAIN_ID,
        transactions: [claimTransaction],
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

  public async beforeSignClaim({
    transactionMeta,
    signer,
    positions,
  }: BeforeSignClaimParams): Promise<BeforeSignClaimResult | undefined> {
    if (!positions || positions.length === 0) {
      throw new Error('No claimable positions found for claim signing');
    }

    const accountState = await this.getAccountState({
      ownerAddress: signer.address,
    });

    if (accountState.walletType !== 'deposit-wallet') {
      return undefined;
    }

    DevLogger.log('PolymarketProvider: Deposit wallet claim beforeSign', {
      operation: 'deposit_wallet_claim_before_sign',
      walletType: 'deposit-wallet',
      signerAddress: signer.address,
      depositWalletAddress: accountState.address,
      transactionId: transactionMeta.id,
      positionCount: positions.length,
    });

    return {
      updateTransaction: (transaction: TransactionMeta) => {
        transaction.isExternalSign = true;
        transaction.selectedGasFeeToken = undefined;
        transaction.isGasFeeTokenIgnoredIfBalance = false;
        delete transaction.txParams.nonce;
      },
    };
  }

  public async publishClaim({
    transactionMeta,
    signer,
    positions,
  }: PublishClaimParams): Promise<PublishClaimResult> {
    if (!positions || positions.length === 0) {
      throw new Error('No claimable positions found for claim publish');
    }

    const protocol = this.#getProtocol();
    const accountState = await this.getAccountState({
      ownerAddress: signer.address,
    });

    if (accountState.walletType !== 'deposit-wallet') {
      return { transactionHash: undefined };
    }

    if (transactionMeta.isExternalSign !== true) {
      throw new Error(
        'Deposit wallet claim publish requires external-sign transaction',
      );
    }

    try {
      const calls = await planDepositWalletClaim({
        positions,
        walletAddress: accountState.address,
        protocol,
      });

      DevLogger.log(
        'PolymarketProvider: Deposit wallet claim publish started',
        {
          operation: 'deposit_wallet_claim_publish',
          walletType: 'deposit-wallet',
          signerAddress: signer.address,
          depositWalletAddress: accountState.address,
          transactionId: transactionMeta.id,
          positionCount: positions.length,
          callCount: calls.length,
        },
      );

      const executeResponse = await executeDepositWalletBatch({
        signer,
        walletAddress: accountState.address,
        calls,
      });
      const transactionID =
        getDepositWalletRelayerTransactionId(executeResponse);

      if (!transactionID) {
        throw new Error(
          'Polymarket deposit wallet claim response missing transactionID',
        );
      }

      const transactionHash = await waitForDepositWalletTransaction({
        transactionID,
      });

      DevLogger.log(
        'PolymarketProvider: Deposit wallet claim publish submitted',
        {
          operation: 'deposit_wallet_claim_publish',
          walletType: 'deposit-wallet',
          signerAddress: signer.address,
          depositWalletAddress: accountState.address,
          transactionId: transactionMeta.id,
          relayerTransactionID: transactionID,
          positionCount: positions.length,
          callCount: calls.length,
          transactionHash,
        },
      );

      return { transactionHash };
    } catch (error) {
      DevLogger.log('PolymarketProvider: Deposit wallet claim publish failed', {
        operation: 'deposit_wallet_claim_publish',
        walletType: 'deposit-wallet',
        signerAddress: signer.address,
        depositWalletAddress: accountState.address,
        transactionId: transactionMeta.id,
        positionCount: positions.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('publishClaim', {
          operation: 'deposit_wallet_claim_publish',
          walletType: 'deposit-wallet',
          positionCount: positions.length,
        }),
      );

      throw error;
    }
  }

  private async syncDepositWalletBalanceAllowanceForSignerIfNeeded({
    signerAddress,
  }: {
    signerAddress: string;
  }): Promise<void> {
    const accountState = await this.getAccountState({
      ownerAddress: signerAddress,
    });

    if (accountState.walletType !== 'deposit-wallet') {
      return;
    }

    const apiKey = await this.getApiKey({ address: signerAddress });
    await syncDepositWalletCollateralBalanceAllowance({
      protocol: this.#getProtocol(),
      signerAddress,
      apiKey,
    });
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

    this.syncDepositWalletBalanceAllowanceForSignerIfNeeded({
      signerAddress: signer.address,
    }).catch((error) => {
      DevLogger.log(
        'PolymarketProvider: Deposit wallet claim balance-allowance sync failed',
        {
          operation: 'deposit_wallet_claim_balance_allowance_sync',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );

      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('confirmClaim', {
          operation: 'deposit_wallet_claim_balance_allowance_sync',
          walletType: 'deposit-wallet',
        }),
      );
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

    const depositTokenAddress = protocol.collateral.tradingToken;

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

    const buildDepositTransferTransaction = (toAddress: string) => {
      const depositTransactionCallData = generateTransferData('transfer', {
        toAddress,
        amount: '0x0',
      });

      if (!depositTransactionCallData) {
        throw new Error(
          'Failed to generate transfer data for deposit transaction',
        );
      }

      return {
        params: {
          to: depositTokenAddress as Hex,
          data: depositTransactionCallData as Hex,
        },
        type: TransactionType.predictDeposit,
      };
    };

    if (accountState.walletType === 'deposit-wallet') {
      const legacySafeAddress = computeProxyAddress(signer.address);
      const legacySafeDeployed = await isSmartContractAddress(
        legacySafeAddress,
        numberToHex(POLYGON_MAINNET_CHAIN_ID),
      );

      if (legacySafeDeployed) {
        const sweepTransaction = await buildLegacySafeMigrationSweepTransaction(
          {
            signer,
            legacySafeAddress,
            depositWalletAddress: accountState.address,
            protocol,
          },
        );

        if (sweepTransaction) {
          transactions.push(sweepTransaction);
        }
      }

      transactions.push(buildDepositTransferTransaction(accountState.address));

      return {
        chainId: CHAIN_IDS.POLYGON,
        transactions,
      };
    }

    if (!accountState.isDeployed) {
      throw new Error(
        'Legacy Safe account state must be deployed for deposits',
      );
    }

    transactions.push(buildDepositTransferTransaction(accountState.address));

    const preExistingSafeUsdceBalance = await this.#getLegacyUsdceBalance({
      safeAddress: accountState.address,
      protocol,
    });
    const maintenanceTransaction = await buildDepositMaintenanceTransaction({
      signer,
      safeAddress: accountState.address,
      protocol,
      preExistingSafeUsdceBalance,
    });

    if (maintenanceTransaction) {
      transactions.push(maintenanceTransaction);
    }

    return {
      chainId: CHAIN_IDS.POLYGON,
      transactions,
    };
  }

  async #hasPolymarketActivity({
    address,
  }: {
    address: string;
  }): Promise<boolean> {
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints();
    const queryParams = new URLSearchParams({
      user: address,
      limit: '1',
    });
    const response = await fetch(
      `${DATA_API_ENDPOINT}/activity?${queryParams.toString()}`,
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Polymarket activity');
    }

    const activityRaw: unknown = await response.json();

    if (!Array.isArray(activityRaw)) {
      throw new Error('Polymarket activity response must be an array');
    }

    return activityRaw.length > 0;
  }

  public async getAccountState(
    params: GetAccountStateParams,
  ): Promise<AccountState> {
    try {
      const { ownerAddress, forceRefresh } = params;

      if (!ownerAddress) {
        throw new Error('Owner address is required');
      }

      const normalizedOwnerAddress = getAddress(ownerAddress);

      if (!forceRefresh) {
        const cachedAccountState = this.#getCachedAccountState(
          normalizedOwnerAddress,
        );
        if (cachedAccountState) {
          return cachedAccountState;
        }
      }

      let legacySafeAddress: Hex;
      try {
        legacySafeAddress = computeProxyAddress(normalizedOwnerAddress);
      } catch (error) {
        throw new Error(
          `Failed to compute safe address: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }

      const legacySafeIsDeployed = await isSmartContractAddress(
        legacySafeAddress,
        numberToHex(POLYGON_MAINNET_CHAIN_ID),
      );

      if (legacySafeIsDeployed) {
        const hasActivity = await this.#hasPolymarketActivity({
          address: legacySafeAddress,
        });

        if (hasActivity) {
          const accountState: AccountState = {
            address: legacySafeAddress,
            isDeployed: true,
            walletType: 'safe',
          };
          this.#setCachedAccountState(normalizedOwnerAddress, accountState);
          return accountState;
        }
      }

      const depositWalletAddress = deriveDepositWalletAddress(
        normalizedOwnerAddress,
      );
      const depositWalletIsDeployed = await isSmartContractAddress(
        depositWalletAddress,
        numberToHex(POLYGON_MAINNET_CHAIN_ID),
      );
      const accountState: AccountState = {
        address: depositWalletAddress,
        isDeployed: depositWalletIsDeployed,
        walletType: 'deposit-wallet',
      };

      this.#setCachedAccountState(normalizedOwnerAddress, accountState);

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

    const protocol = this.#getProtocol();
    const accountState =
      this.#getCachedAccountState(address) ??
      (await this.getAccountState({ ownerAddress: address }));

    if (accountState.walletType === 'safe') {
      const [pusdBalance, legacyUsdceBalance] = await Promise.all([
        getBalance({
          address: accountState.address,
          tokenAddress: protocol.collateral.tradingToken,
        }),
        this.#getLegacyUsdceBalance({
          safeAddress: accountState.address,
          protocol,
        }),
      ]);

      return (
        pusdBalance +
        Number(legacyUsdceBalance) / 10 ** COLLATERAL_TOKEN_DECIMALS
      );
    }

    const depositPusdRaw = await getRawBalance({
      address: accountState.address,
      tokenAddress: protocol.collateral.tradingToken,
    });
    const legacySafeAddress = computeProxyAddress(address);
    const legacySafeDeployed = await isSmartContractAddress(
      legacySafeAddress,
      numberToHex(POLYGON_MAINNET_CHAIN_ID),
    );

    let legacyPusdRaw = 0n;
    let legacyUsdceRaw = 0n;
    if (legacySafeDeployed) {
      [legacyPusdRaw, legacyUsdceRaw] = await Promise.all([
        getRawBalance({
          address: legacySafeAddress,
          tokenAddress: protocol.collateral.tradingToken,
        }),
        this.#getLegacyUsdceBalance({
          safeAddress: legacySafeAddress,
          protocol,
        }),
      ]);
    }

    return (
      Number(depositPusdRaw + legacyPusdRaw + legacyUsdceRaw) /
      10 ** COLLATERAL_TOKEN_DECIMALS
    );
  }

  private getErc20TransferRecipient(data?: string): Hex | undefined {
    if (!data) {
      return undefined;
    }

    try {
      const [recipient] = ERC20_TRANSFER_INTERFACE.decodeFunctionData(
        'transfer',
        data,
      );
      return getAddress(String(recipient)) as Hex;
    } catch {
      return undefined;
    }
  }

  private getDepositWalletDepositTransaction(transactionMeta: TransactionMeta):
    | {
        ownerAddress: Hex;
        depositWalletAddress: Hex;
      }
    | undefined {
    const ownerAddress = transactionMeta.txParams.from;

    if (!ownerAddress) {
      return undefined;
    }

    const nestedTransactions = transactionMeta.nestedTransactions ?? [];
    const predictDepositTransactions = nestedTransactions.filter(
      (transaction) =>
        transaction.type === TransactionType.predictDeposit ||
        transaction.type === TransactionType.predictDepositAndOrder,
    );

    if (predictDepositTransactions.length !== 1) {
      return undefined;
    }

    const [depositTransaction] = predictDepositTransactions;
    const protocol = this.#getProtocol();

    try {
      if (
        !depositTransaction.to ||
        getAddress(depositTransaction.to) !==
          getAddress(protocol.collateral.tradingToken)
      ) {
        return undefined;
      }
    } catch {
      return undefined;
    }

    const recipient = this.getErc20TransferRecipient(depositTransaction.data);

    if (!recipient) {
      return undefined;
    }

    const depositWalletAddress = deriveDepositWalletAddress(ownerAddress);

    if (getAddress(recipient) !== getAddress(depositWalletAddress)) {
      return undefined;
    }

    return {
      ownerAddress: getAddress(ownerAddress) as Hex,
      depositWalletAddress,
    };
  }

  public isDepositWalletDepositTransaction(
    transactionMeta: TransactionMeta,
  ): boolean {
    return Boolean(this.getDepositWalletDepositTransaction(transactionMeta));
  }

  private async ensureDepositWalletReady({
    ownerAddress,
    depositWalletAddress,
    protocol,
    getSigner,
    operation = 'deposit_wallet_preflight',
  }: {
    ownerAddress: string;
    depositWalletAddress: Hex;
    protocol: PolymarketProtocolDefinition;
    getSigner: (address?: string) => Signer;
    operation?: string;
  }): Promise<boolean> {
    let updatedState = false;
    let depositWalletDeploymentConfirmed = false;

    DevLogger.log('PolymarketProvider: Deposit wallet preflight started', {
      operation,
      walletType: 'deposit-wallet',
      from: ownerAddress,
      depositWalletAddress,
    });

    const depositWalletIsDeployed = await isSmartContractAddress(
      depositWalletAddress,
      numberToHex(POLYGON_MAINNET_CHAIN_ID),
    );

    if (!depositWalletIsDeployed) {
      const createResponse = await requestDepositWalletCreate({
        ownerAddress,
      });
      const transactionID =
        getDepositWalletRelayerTransactionId(createResponse);

      if (!transactionID) {
        throw new Error(
          'Polymarket deposit wallet creation response missing transactionID',
        );
      }

      DevLogger.log('PolymarketProvider: Waiting for deposit wallet create', {
        operation: 'deposit_wallet_create',
        walletType: 'deposit-wallet',
        transactionID,
        from: ownerAddress,
        depositWalletAddress,
      });

      await waitForDepositWalletTransaction({
        transactionID,
        requireCompletion: true,
      });

      DevLogger.log(
        'PolymarketProvider: Waiting for deposit wallet relayer registry',
        {
          operation: 'deposit_wallet_relayer_registry',
          walletType: 'deposit-wallet',
          from: ownerAddress,
          depositWalletAddress,
        },
      );

      await waitForDepositWalletDeployed({
        walletAddress: depositWalletAddress,
      });
      depositWalletDeploymentConfirmed = true;

      this.#setCachedAccountState(ownerAddress, {
        address: depositWalletAddress,
        isDeployed: true,
        walletType: 'deposit-wallet',
      });
      this.setPolymarketAccountCreatedTrait();
      updatedState = true;
    }

    const preflightPlan = await planDepositWalletPreflight({
      walletAddress: depositWalletAddress,
      protocol,
    });

    DevLogger.log('PolymarketProvider: Deposit wallet preflight planned', {
      operation: 'deposit_wallet_allowance_preflight',
      walletType: 'deposit-wallet',
      from: ownerAddress,
      depositWalletAddress,
      missingRequirementsCount: preflightPlan.missingRequirements.length,
    });

    if (preflightPlan.transactions.length > 0) {
      if (!depositWalletDeploymentConfirmed) {
        await waitForDepositWalletDeployed({
          walletAddress: depositWalletAddress,
        });
      }

      const signer = getSigner(ownerAddress);
      const executeResponse = await executeDepositWalletBatch({
        signer,
        walletAddress: depositWalletAddress,
        calls: toDepositWalletCalls(preflightPlan.transactions),
      });
      const transactionID =
        getDepositWalletRelayerTransactionId(executeResponse);

      if (!transactionID) {
        throw new Error(
          'Polymarket deposit wallet batch response missing transactionID',
        );
      }

      DevLogger.log('PolymarketProvider: Waiting for deposit wallet batch', {
        operation: 'deposit_wallet_batch',
        walletType: 'deposit-wallet',
        transactionID,
        from: ownerAddress,
        depositWalletAddress,
        missingRequirementsCount: preflightPlan.missingRequirements.length,
      });

      await waitForDepositWalletTransaction({
        transactionID,
        requireCompletion: true,
      });
      updatedState = true;
    }

    DevLogger.log('PolymarketProvider: Deposit wallet preflight completed', {
      operation,
      walletType: 'deposit-wallet',
      from: ownerAddress,
      depositWalletAddress,
    });

    return updatedState;
  }

  public async beforePublishDepositWalletDeposit({
    transactionMeta,
    getSigner,
  }: {
    transactionMeta: TransactionMeta;
    getSigner: (address?: string) => Signer;
  }): Promise<boolean> {
    const depositWalletDeposit =
      this.getDepositWalletDepositTransaction(transactionMeta);

    if (!depositWalletDeposit) {
      return true;
    }

    const { ownerAddress, depositWalletAddress } = depositWalletDeposit;
    const protocol = this.#getProtocol();

    try {
      await this.ensureDepositWalletReady({
        ownerAddress,
        depositWalletAddress,
        protocol,
        getSigner,
      });

      return true;
    } catch (error) {
      DevLogger.log('PolymarketProvider: Deposit wallet preflight failed', {
        operation: 'deposit_wallet_preflight',
        walletType: 'deposit-wallet',
        from: ownerAddress,
        depositWalletAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('beforePublishDepositWalletDeposit', {
          operation: 'deposit_wallet_preflight',
          walletType: 'deposit-wallet',
        }),
      );
      throw error;
    }
  }

  private async syncDepositWalletBalanceAllowanceForOrderIfNeeded({
    protocol,
    signerAddress,
    apiKey,
  }: {
    protocol: PolymarketProtocolDefinition;
    signerAddress: string;
    apiKey: ApiKeyCreds;
  }): Promise<void> {
    try {
      await syncDepositWalletCollateralBalanceAllowance({
        protocol,
        signerAddress,
        apiKey,
      });
    } catch (error) {
      DevLogger.log(
        'PolymarketProvider: Deposit wallet order balance-allowance sync failed',
        {
          operation: 'deposit_wallet_order_balance_allowance_sync',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('placeOrder:depositWalletBalanceAllowanceSync', {
          operation: 'deposit_wallet_order_balance_allowance_sync',
          walletType: 'deposit-wallet',
        }),
      );
    }
  }

  public async syncDepositWalletBalanceAllowanceForDepositTransaction({
    transactionMeta,
    signerAddress,
  }: {
    transactionMeta: TransactionMeta;
    signerAddress: string;
  }): Promise<void> {
    const depositWalletDeposit =
      this.getDepositWalletDepositTransaction(transactionMeta);

    if (!depositWalletDeposit) {
      return;
    }

    const apiKey = await this.getApiKey({ address: signerAddress });
    await syncDepositWalletCollateralBalanceAllowance({
      protocol: this.#getProtocol(),
      signerAddress,
      apiKey,
    });
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
      this.#getCachedAccountState(signer.address)?.address ??
      (await this.getAccountState({ ownerAddress: signer.address })).address;

    const withdrawTokenAddress = getProtocolWithdrawTokenAddress(protocol);

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
      this.#getCachedAccountState(signer.address)?.address ??
      computeProxyAddress(signer.address);

    const amount = getSafeTransferAmount(callData);
    const requestedAmountRaw = getSafeTransferAmountRaw(callData);

    const safeLegacyUsdceBalance = await this.#getLegacyUsdceBalance({
      safeAddress,
      protocol,
    });
    const signedWithdrawTransaction = await buildWithdrawTransaction({
      signer,
      safeAddress,
      requestedAmountRaw,
      protocol,
      safeLegacyUsdceBalance,
    });

    return {
      callData: signedWithdrawTransaction.params.data,
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
