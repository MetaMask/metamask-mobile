import {
  SignTypedDataVersion,
  type TypedMessageParams,
} from '@metamask/keyring-controller';
import { Hex } from '@metamask/utils';
import { parseUnits } from 'ethers/lib/utils';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  GetPriceHistoryParams,
  PredictActivity,
  PredictCategory,
  PredictClaim,
  PredictClaimStatus,
  PredictMarket,
  PredictPosition,
  PredictPriceHistoryPoint,
  Result,
} from '../../types';
import {
  CalculateBetAmountsParams,
  CalculateBetAmountsResponse,
  CalculateCashOutAmountsParams,
  CalculateCashOutAmountsResponse,
  ClaimOrderParams,
  GetMarketsParams,
  GetPositionsParams,
  PlaceOrderParams,
  PredictProvider,
  Signer,
} from '../types';
import {
  FEE_COLLECTOR_ADDRESS,
  POLYGON_MAINNET_CHAIN_ID,
  ROUNDING_CONFIG,
} from './constants';
import { computeSafeAddress, createSafeFeeAuthorization } from './safe/utils';
import {
  ApiKeyCreds,
  CONDITIONAL_TOKEN_DECIMALS,
  OrderArtifactsParams,
  OrderData,
  OrderType,
  PolymarketPosition,
  SignatureType,
  TickSize,
} from './types';
import {
  buildMarketOrderCreationArgs,
  calculateFeeAmount,
  calculateMarketPrice,
  createApiKey,
  encodeClaim,
  getContractConfig,
  getL2Headers,
  getMarketDetailsFromGammaApi,
  getMarketPositions,
  getMarketsFromPolymarketApi,
  getOrderBook,
  getOrderTypedData,
  getParsedMarketsFromPolymarketApi,
  getPolymarketEndpoints,
  getTickSize,
  parsePolymarketEvents,
  parsePolymarketPositions,
  priceValid,
  submitClobOrder,
} from './utils';

export type SignTypedMessageFn = (
  params: TypedMessageParams,
  version: SignTypedDataVersion,
) => Promise<string>;

export class PolymarketProvider implements PredictProvider {
  readonly providerId = 'polymarket';

  #apiKeysByAddress: Map<string, ApiKeyCreds> = new Map();

  private static readonly FALLBACK_CATEGORY: PredictCategory = 'trending';

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
    throw new Error('Method not implemented.');
  }

  public claimWinnings(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  /**
   * Builds the order artifacts for the Polymarket provider
   * This is a private method that is used to build the order artifacts for the Polymarket provider
   * @param address - The address of the signer
   * @param orderParams - The order parameters
   * @returns The order artifacts
   */
  private async buildOrderArtifacts({
    address,
    orderParams: { outcomeTokenId, side, size, outcomeId },
  }: {
    address: string;
    orderParams: OrderArtifactsParams;
  }): Promise<{
    chainId: number;
    price: number;
    negRisk: boolean;
    tickSize: TickSize;
    order: OrderData & { salt: string };
    contractConfig: ReturnType<typeof getContractConfig>;
    exchangeContract: string;
    verifyingContract: string;
  }> {
    const chainId = POLYGON_MAINNET_CHAIN_ID;
    const tokenId = outcomeTokenId;
    const conditionId = outcomeId;
    const [tickSizeResponse, price, marketData] = await Promise.all([
      getTickSize({ tokenId }),
      calculateMarketPrice(tokenId, side, size, OrderType.FOK),
      getMarketsFromPolymarketApi({ conditionIds: [conditionId] }),
    ]);

    const tickSize = tickSizeResponse.minimum_tick_size;

    const negRisk = marketData[0].negRisk;

    const order = await buildMarketOrderCreationArgs({
      signer: address,
      maker: address,
      signatureType: SignatureType.EOA,
      userMarketOrder: {
        tokenID: tokenId,
        price,
        size,
        side,
        orderType: OrderType.FOK,
      },
      roundConfig: ROUNDING_CONFIG[tickSize as TickSize],
    });

    const contractConfig = getContractConfig(chainId);

    const exchangeContract = negRisk
      ? contractConfig.negRiskExchange
      : contractConfig.exchange;

    const verifyingContract = exchangeContract;

    return {
      chainId,
      price,
      order,
      negRisk,
      tickSize,
      contractConfig,
      exchangeContract,
      verifyingContract,
    };
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

  public async getMarkets(params?: GetMarketsParams): Promise<PredictMarket[]> {
    try {
      const markets = await getParsedMarketsFromPolymarketApi(params);
      return markets;
    } catch (error) {
      DevLogger.log('Error getting markets via Polymarket API:', error);
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
      return [];
    }
  }

  public async getPositions({
    address,
    limit = 100, // todo: reduce this once we've decided on the pagination approach
    offset = 0,
    claimable = false,
    marketId,
  }: GetPositionsParams): Promise<PredictPosition[]> {
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints();

    // NOTE: hardcoded address for testing
    // address = '0x33a90b4f8a9cccfe19059b0954e3f052d93efc00';

    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      user: address || '',
      sortBy: 'CURRENT',
      redeemable: claimable.toString(),
      ...(marketId && { eventId: marketId }),
    });

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

    return parsedPositions;
  }

  public async placeOrder<OrderResponse>(
    params: PlaceOrderParams & { signer: Signer },
  ): Promise<Result<OrderResponse>> {
    const { signer, outcomeId, outcomeTokenId, size, side } = params;
    const { address, signTypedMessage } = signer;

    const { chainId, price, order, verifyingContract, tickSize } =
      await this.buildOrderArtifacts({
        address,
        orderParams: {
          outcomeId,
          outcomeTokenId,
          side,
          size,
        },
      });

    if (!priceValid(price, tickSize as TickSize)) {
      throw new Error(
        `invalid price (${price}), min: ${parseFloat(tickSize)} - max: ${
          1 - parseFloat(tickSize)
        }`,
      );
    }

    const typedData = getOrderTypedData({
      order,
      chainId,
      verifyingContract,
    });

    const signature = await signTypedMessage(
      { data: typedData, from: address },
      SignTypedDataVersion.V4,
    );

    const signedOrder = {
      ...order,
      signature,
    };

    const signerApiKey = await this.getApiKey({ address });

    const clobOrder = {
      order: { ...signedOrder, side, salt: parseInt(signedOrder.salt, 10) },
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

    const feeAmount = calculateFeeAmount(order);
    let feeAuthorization;
    if (feeAmount > 0n) {
      const safeAddress = await computeSafeAddress(signer);
      feeAuthorization = await createSafeFeeAuthorization({
        safeAddress,
        signer,
        amount: feeAmount,
        to: FEE_COLLECTOR_ADDRESS,
      });
    }

    const { success, response, error } = await submitClobOrder({
      headers,
      clobOrder,
      feeAuthorization,
    });

    return {
      success,
      response,
      error,
    } as Result<OrderResponse>;
  }

  public prepareClaim(params: ClaimOrderParams): PredictClaim {
    const contractConfig = getContractConfig(POLYGON_MAINNET_CHAIN_ID);
    const { position } = params;
    const amounts: bigint[] = [0n, 0n];
    amounts[position.outcomeIndex] = BigInt(
      parseUnits(
        position.size.toString(),
        CONDITIONAL_TOKEN_DECIMALS,
      ).toString(),
    );

    const negRisk = !!position.negRisk;

    const to = (
      negRisk ? contractConfig.negRiskAdapter : contractConfig.conditionalTokens
    ) as Hex;
    const callData = encodeClaim(position.outcomeId, negRisk, amounts);

    const response: PredictClaim = {
      positionId: position.id,
      chainId: POLYGON_MAINNET_CHAIN_ID,
      status: PredictClaimStatus.IDLE,
      txParams: {
        data: callData,
        to,
        value: '0x0',
      },
    };
    return response;
  }

  public async isEligible(): Promise<boolean> {
    const { GEOBLOCK_API_ENDPOINT } = getPolymarketEndpoints();
    let eligible = false;
    try {
      const res = await fetch(GEOBLOCK_API_ENDPOINT);
      const { blocked } = (await res.json()) as { blocked: boolean };
      if (blocked !== undefined) {
        eligible = blocked === false;
      }
    } catch (error) {
      DevLogger.log('PolymarketProvider: Error checking geoblock status', {
        error:
          error instanceof Error
            ? error.message
            : `Error checking geoblock status: ${error}`,
        timestamp: new Date().toISOString(),
      });
    }
    return eligible;
  }

  public async calculateBetAmounts(
    params: CalculateBetAmountsParams,
  ): Promise<CalculateBetAmountsResponse> {
    const { outcomeTokenId, userBetAmount } = params;
    const book = await getOrderBook({ tokenId: outcomeTokenId });
    if (!book) {
      throw new Error('no orderbook');
    }

    const positions = book.asks;

    if (!positions) {
      throw new Error('no match');
    }

    let quantity = 0;
    let sum = 0;
    let lastPrice = 0;

    for (let i = positions.length - 1; i >= 0; i--) {
      const p = positions[i];
      const positionSize = parseFloat(p.size);
      const positionPrice = parseFloat(p.price);
      const positionValue = positionSize * positionPrice;

      lastPrice = positionPrice;

      if (sum + positionValue <= userBetAmount) {
        // If the entire position fits within remaining amount, add all of it
        quantity += positionSize;
        sum += positionValue;
      } else {
        // If this position would exceed the amount, calculate partial quantity needed
        const remainingAmount = userBetAmount - sum;
        const partialQuantity = remainingAmount / positionPrice;
        quantity += partialQuantity;
        return {
          toWin: quantity,
          sharePrice: positionPrice,
        };
      }
    }

    // If we consumed all available liquidity exactly matching the bet amount, return success
    if (sum === userBetAmount) {
      return {
        toWin: quantity,
        sharePrice: lastPrice,
      };
    }

    throw new Error('not enough shares to match user bet amount');
  }

  public async calculateCashOutAmounts(
    params: CalculateCashOutAmountsParams,
  ): Promise<CalculateCashOutAmountsResponse> {
    const { outcomeTokenId, marketId, address } = params;
    const marketPositions = await getMarketPositions({ marketId, address });
    const position = marketPositions.find(
      (p) => p.outcomeTokenId === outcomeTokenId,
    );

    if (!position) {
      throw new Error('position not found');
    }

    return {
      currentValue: position.currentValue,
      cashPnl: position.cashPnl,
      percentPnl: position.percentPnl,
    };
  }
}
