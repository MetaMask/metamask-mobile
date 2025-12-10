import {
  SignTypedDataVersion,
  type TypedMessageParams,
} from '@metamask/keyring-controller';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { Hex, numberToHex } from '@metamask/utils';
import { parseUnits } from 'ethers/lib/utils';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger, { type LoggerErrorOptions } from '../../../../../util/Logger';
import { MetaMetrics } from '../../../../../core/Analytics';
import { UserProfileProperty } from '../../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import {
  generateTransferData,
  isSmartContractAddress,
} from '../../../../../util/transactions';
import { PREDICT_CONSTANTS, PREDICT_ERROR_CODES } from '../../constants/errors';
import {
  GetPriceHistoryParams,
  GetPriceParams,
  GetPriceResponse,
  PredictActivity,
  PredictCategory,
  PredictMarket,
  PredictPosition,
  PredictPositionStatus,
  PredictPriceHistoryPoint,
  PriceResult,
  Side,
  UnrealizedPnL,
} from '../../types';
import {
  AccountState,
  ClaimOrderParams,
  ClaimOrderResponse,
  GeoBlockResponse,
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
  Signer,
  SignWithdrawParams,
  SignWithdrawResponse,
} from '../types';
import {
  FEE_COLLECTOR_ADDRESS,
  MATIC_CONTRACTS,
  MIN_COLLATERAL_BALANCE_FOR_CLAIM,
  ORDER_RATE_LIMIT_MS,
  POLYGON_MAINNET_CHAIN_ID,
  POLYMARKET_PROVIDER_ID,
  ROUNDING_CONFIG,
} from './constants';
import {
  computeProxyAddress,
  createSafeFeeAuthorization,
  getClaimTransaction,
  getDeployProxyWalletTransaction,
  getProxyWalletAllowancesTransaction,
  getSafeUsdcAmount,
  getWithdrawTransactionCallData,
  hasAllowances,
} from './safe/utils';
import {
  ApiKeyCreds,
  OrderData,
  OrderType,
  PolymarketApiActivity,
  PolymarketPosition,
  SignatureType,
  TickSize,
  UtilsSide,
} from './types';
import {
  createApiKey,
  encodeErc20Transfer,
  generateSalt,
  getBalance,
  getContractConfig,
  getL2Headers,
  getMarketDetailsFromGammaApi,
  getOrderTypedData,
  getParsedMarketsFromPolymarketApi,
  getPolymarketEndpoints,
  parsePolymarketActivity,
  parsePolymarketEvents,
  parsePolymarketPositions,
  previewOrder,
  roundOrderAmount,
  submitClobOrder,
} from './utils';

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

  #apiKeysByAddress: Map<string, ApiKeyCreds> = new Map();
  #accountStateByAddress: Map<string, AccountState> = new Map();
  #lastBuyOrderTimestampByAddress: Map<string, number> = new Map();
  #buyOrderInProgressByAddress: Map<string, boolean> = new Map();
  #optimisticPositionUpdatesByAddress = new Map<
    string,
    Map<string, OptimisticPositionUpdate>
  >();

  private static readonly FALLBACK_CATEGORY: PredictCategory = 'trending';

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

      const [parsedMarket] = parsePolymarketEvents(
        [event],
        PolymarketProvider.FALLBACK_CATEGORY,
      );

      if (!parsedMarket) {
        throw new Error('Failed to parse market details');
      }

      return parsedMarket;
    } catch (error) {
      DevLogger.log('Error getting market details via Polymarket API:', error);
      throw error;
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
    const cachedApiKey = this.#apiKeysByAddress.get(address);
    if (cachedApiKey) {
      return cachedApiKey;
    }

    const apiKeyCreds = await createApiKey({ address });
    this.#apiKeysByAddress.set(address, apiKeyCreds);
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
      const markets = await getParsedMarketsFromPolymarketApi(params);
      return markets;
    } catch (error) {
      DevLogger.log('Error getting markets via Polymarket API:', error);

      // Log to Sentry - this error is swallowed (returns []) so controller won't see it
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

  public async getPriceHistory({
    marketId,
    fidelity,
    interval,
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

      if (interval) {
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

      // Log to Sentry - this error is swallowed (returns []) so controller won't see it
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('getPriceHistory', {
          marketId,
          fidelity,
          interval,
        }),
      );

      return [];
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
  }: Omit<GetPriceParams, 'providerId'>): Promise<GetPriceResponse> {
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
    claimable: boolean;
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
    claimable = false,
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
      redeemable: claimable.toString(),
    });

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

    const parsedPositions = await parsePolymarketPositions({
      positions: positionsData,
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
    params: Omit<PreviewOrderParams, 'providerId'> & { signer?: Signer },
  ): Promise<OrderPreview> {
    const basePreview = await previewOrder(params);

    if (params.signer) {
      if (this.isRateLimited(params.signer.address)) {
        return {
          ...basePreview,
          rateLimited: true,
        };
      }
    }

    return basePreview;
  }

  public async placeOrder(
    params: Omit<PlaceOrderParams, 'providerId'> & { signer: Signer },
  ): Promise<OrderResult> {
    const { signer, preview } = params;
    const {
      outcomeTokenId,
      side,
      maxAmountSpent,
      minAmountReceived,
      negRisk,
      fees,
      slippage,
      tickSize,
      positionId,
    } = preview;

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
      const chainId = POLYGON_MAINNET_CHAIN_ID;

      const makerAddress =
        this.#accountStateByAddress.get(signer.address)?.address ??
        computeProxyAddress(signer.address);

      if (!makerAddress) {
        throw new Error('Maker address not found');
      }

      /*
       * Introduce slippage into minAmountReceived to reduce failure rate.
       */
      const roundConfig = ROUNDING_CONFIG[tickSize.toString() as TickSize];
      const decimals = roundConfig.amount ?? 4;

      let _minWithSlippage = minAmountReceived * (1 - slippage);
      /*
       * For BUY orders, the minAmountWithSlippage needs to be capped at
       * maxAmountSpent + tickSize, otherwise, the order will fail due to
       * sharePrice being >= 1 (which is impossible).
       */
      if (side === Side.BUY) {
        _minWithSlippage = Math.max(
          _minWithSlippage,
          maxAmountSpent + tickSize,
        );
      }

      const minAmountWithSlippage = roundOrderAmount({
        amount: _minWithSlippage,
        decimals,
      });

      const makerAmount = parseUnits(maxAmountSpent.toString(), 6).toString();
      const takerAmount = parseUnits(
        minAmountWithSlippage.toString(),
        6,
      ).toString();

      /**
       * Do NOT change the order below.
       * This order needs to match the order on the relayer.
       */
      const order: OrderData & { salt: string } = {
        salt: generateSalt(),
        maker: makerAddress,
        signer: signer.address,
        taker: '0x0000000000000000000000000000000000000000',
        tokenId: outcomeTokenId,
        makerAmount,
        takerAmount,
        expiration: '0',
        nonce: '0',
        feeRateBps: '0',
        side: side === Side.BUY ? UtilsSide.BUY : UtilsSide.SELL,
        signatureType: SignatureType.POLY_GNOSIS_SAFE,
      };

      const contractConfig = getContractConfig(chainId);

      const exchangeContract = negRisk
        ? contractConfig.negRiskExchange
        : contractConfig.exchange;

      const verifyingContract = exchangeContract;

      const typedData = getOrderTypedData({
        order,
        chainId,
        verifyingContract,
      });

      const signature = await signer.signTypedMessage(
        { data: typedData, from: signer.address },
        SignTypedDataVersion.V4,
      );

      const signedOrder = {
        ...order,
        signature,
      };

      const signerApiKey = await this.getApiKey({ address: signer.address });

      const clobOrder = {
        order: { ...signedOrder, side, salt: parseInt(signedOrder.salt) },
        owner: signerApiKey.apiKey,
        orderType: OrderType.FOK,
      };

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

      let feeAuthorization;
      if (fees !== undefined && fees.totalFee > 0) {
        const safeAddress = computeProxyAddress(signer.address);
        const feeAmountInUsdc = BigInt(
          parseUnits(fees.totalFee.toString(), 6).toString(),
        );
        feeAuthorization = await createSafeFeeAuthorization({
          safeAddress,
          signer,
          amount: feeAmountInUsdc,
          to: FEE_COLLECTOR_ADDRESS,
        });
      }

      const { success, response, error } = await submitClobOrder({
        headers,
        clobOrder,
        feeAuthorization,
      });

      if (!success) {
        DevLogger.log('PolymarketProvider: Place order failed', {
          error,
          errorDetails: undefined,
          side,
          outcomeTokenId,
        });
        if (error.includes(`order couldn't be fully filled`)) {
          throw new Error(
            side === Side.BUY
              ? PREDICT_ERROR_CODES.BUY_ORDER_NOT_FULLY_FILLED
              : PREDICT_ERROR_CODES.SELL_ORDER_NOT_FULLY_FILLED,
          );
        }
        if (
          error.includes(`not available in your region`) ||
          error.includes(`unable to access this provider`)
        ) {
          throw new Error(PREDICT_ERROR_CODES.NOT_ELIGIBLE);
        }
        throw new Error(error ?? PREDICT_ERROR_CODES.PLACE_ORDER_FAILED);
      }

      if (side === Side.BUY) {
        this.#lastBuyOrderTimestampByAddress.set(signer.address, Date.now());

        // Create optimistic position update
        if (response.makingAmount && response.takingAmount) {
          try {
            const spentAmount = parseFloat(response.makingAmount);
            const receivedAmount = parseFloat(response.takingAmount);

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
            // Log but don't fail the order
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
        // SELL order - mark position for optimistic removal
        this.removeOptimisticPosition({
          address: signer.address,
          positionId,
          outcomeTokenId,
          marketId: preview.marketId,
        });
      }

      return {
        success,
        response: {
          id: response.orderID,
          spentAmount: response.makingAmount,
          receivedAmount: response.takingAmount,
          txHashes: response.transactionsHashes,
        },
        error,
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

      if (!positions || positions.length === 0) {
        throw new Error('No positions provided for claim');
      }

      if (!signer?.address) {
        throw new Error('Signer address is required for claim');
      }

      const signerBalance = await getBalance({ address: signer.address });

      let includeTransferTransaction = false;

      if (signerBalance < MIN_COLLATERAL_BALANCE_FOR_CLAIM) {
        includeTransferTransaction = true;
      }

      // Get safe address from cache or fetch it
      let safeAddress: string | undefined;
      try {
        safeAddress = computeProxyAddress(signer.address);
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
   * Fire-and-forget operation that logs errors but doesn't fail
   */
  private setPolymarketAccountCreatedTrait(): void {
    MetaMetrics.getInstance()
      .addTraitsToUser({
        [UserProfileProperty.CREATED_POLYMARKET_ACCOUNT_VIA_MM]: true,
      })
      .catch((error) => {
        // Log error but don't fail the deposit preparation
        Logger.error(error as Error, {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            provider: 'polymarket',
          },
          context: {
            name: 'PolymarketProvider',
            data: {
              method: 'setPolymarketAccountCreatedTrait',
            },
          },
        });
      });
  }

  public async prepareDeposit(
    params: PrepareDepositParams & { signer: Signer },
  ): Promise<PrepareDepositResponse> {
    const transactions = [];
    const { signer } = params;

    if (!signer?.address) {
      throw new Error('Signer address is required for deposit preparation');
    }

    const { collateral } = MATIC_CONTRACTS;

    if (!collateral) {
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

    if (!accountState.hasAllowances) {
      const allowanceTransaction = await getProxyWalletAllowancesTransaction({
        signer,
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

      transactions.push(allowanceTransaction);
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
        to: collateral as Hex,
        data: depositTransactionCallData as Hex,
      },
      type: TransactionType.predictDeposit,
    });

    return {
      chainId: CHAIN_IDS.POLYGON,
      transactions,
    };
  }

  public async getAccountState(params: {
    ownerAddress: string;
  }): Promise<AccountState> {
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
      try {
        [isDeployed, hasAllowancesResult] = await Promise.all([
          isSmartContractAddress(
            address,
            numberToHex(POLYGON_MAINNET_CHAIN_ID),
          ),
          hasAllowances({ address }),
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
    const cachedAddress = this.#accountStateByAddress.get(address);
    const predictAddress =
      cachedAddress?.address ?? computeProxyAddress(address);
    const balance = await getBalance({ address: predictAddress });
    return balance;
  }

  public async prepareWithdraw(
    params: PrepareWithdrawParams & { signer: Signer },
  ): Promise<PrepareWithdrawResponse> {
    const { signer } = params;

    if (!signer.address) {
      throw new Error('Signer address is required');
    }

    const safeAddress =
      this.#accountStateByAddress.get(signer.address)?.address ??
      (await this.getAccountState({ ownerAddress: signer.address })).address;

    const callData = encodeErc20Transfer({
      to: signer.address,
      value: '0x0',
    });

    return {
      chainId: CHAIN_IDS.POLYGON,
      transaction: {
        params: {
          to: MATIC_CONTRACTS.collateral as Hex,
          data: callData,
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

    if (!signer.address) {
      throw new Error('Signer address is required');
    }

    const safeAddress =
      this.#accountStateByAddress.get(signer.address)?.address ??
      computeProxyAddress(signer.address);

    const signedCallData = await getWithdrawTransactionCallData({
      data: callData,
      signer,
      safeAddress,
    });

    const amount = getSafeUsdcAmount(callData);

    return {
      callData: signedCallData,
      amount,
    };
  }
}
