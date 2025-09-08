import {
  SignTypedDataVersion,
  type TypedMessageParams,
} from '@metamask/keyring-controller';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { ROUNDING_CONFIG } from './constants';
import {
  OffchainTradeParams,
  OffchainTradeResponse,
  PredictActivity,
  PredictCategory,
  PredictMarket,
  PredictOrder,
  PredictPosition,
  Side,
} from '../../types';
import {
  buildMarketOrderCreationArgs,
  calculateMarketPrice,
  createApiKey,
  encodeApprove,
  getContractConfig,
  getL2Headers,
  getMarket,
  getOrderTypedData,
  getPolymarketEndpoints,
  getTickSize,
  parsePolymarketEvents,
  parsePolymarketPositions,
  POLYGON_MAINNET_CHAIN_ID,
  priceValid,
  submitClobOrder,
} from './utils';
import { GetMarketsParams, OrderParams, PredictProvider } from '../types';
import {
  ApiKeyCreds,
  OrderArtifactsParams,
  OrderData,
  OrderType,
  PolymarketOffchainTradeParams,
  PolymarketPosition,
  SignatureType,
  TickSize,
} from './types';

export type SignTypedMessageFn = (
  params: TypedMessageParams,
  version: SignTypedDataVersion,
) => Promise<string>;

export class PolymarketProvider implements PredictProvider {
  readonly providerId = 'polymarket';

  #isTestnet: boolean;
  #apiKeysByAddress: Map<string, ApiKeyCreds> = new Map();

  constructor(options: { isTestnet?: boolean }) {
    this.#isTestnet = options.isTestnet || false;
  }
  public getMarketDetails(_params: {
    marketId: string;
  }): Promise<PredictMarket> {
    throw new Error('Method not implemented.');
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
    orderParams: { marketId, outcomeTokenId, side, amount },
  }: {
    address: string;
    orderParams: OrderArtifactsParams;
  }): Promise<{
    chainId: number;
    price: number;
    tickSize: TickSize;
    order: OrderData & { salt: string };
    contractConfig: ReturnType<typeof getContractConfig>;
    exchangeContract: string;
    verifyingContract: string;
  }> {
    const chainId = POLYGON_MAINNET_CHAIN_ID;
    const conditionId = marketId;
    const tokenId = outcomeTokenId;

    const marketData = await getMarket({ conditionId });

    const [tickSizeResponse, price] = await Promise.all([
      getTickSize({ tokenId }),
      calculateMarketPrice(tokenId, side, amount, OrderType.FOK),
    ]);

    const tickSize = tickSizeResponse.minimum_tick_size;

    const order = await buildMarketOrderCreationArgs({
      signer: address,
      maker: address,
      signatureType: SignatureType.EOA,
      userMarketOrder: {
        tokenID: tokenId,
        price,
        amount,
        side,
        orderType: OrderType.FOK,
      },
      roundConfig: ROUNDING_CONFIG[tickSize as TickSize],
    });

    const negRisk = !!marketData.neg_risk;

    const contractConfig = getContractConfig(chainId);

    const exchangeContract = negRisk
      ? contractConfig.negRiskExchange
      : contractConfig.exchange;

    const verifyingContract = exchangeContract;

    return {
      chainId,
      price,
      tickSize,
      order,
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
      const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();

      const { category = 'trending', q, limit = 20, offset = 0 } = params || {};
      DevLogger.log(
        'Getting markets via Polymarket API for category:',
        category,
        'search:',
        q,
        'limit:',
        limit,
        'offset:',
        offset,
      );

      let queryParamsEvents = `limit=${limit}&active=true&archived=false&closed=false&ascending=false&offset=${offset}`;
      const queryParamsSearch = `limit_per_type=${limit}&page=${
        Math.floor(offset / limit) + 1
      }&ascending=false`;

      const categoryTagMap: Record<PredictCategory, string> = {
        trending: '&exclude_tag_id=100639&order=volume24hr',
        new: '&order=startDate&exclude_tag_id=100639&exclude_tag_id=102169',
        sports: '&tag_slug=sports&&exclude_tag_id=100639&order=volume24hr',
        crypto: '&tag_slug=crypto&order=volume24hr',
        politics: '&tag_slug=politics&order=volume24hr',
      };

      queryParamsEvents += categoryTagMap[category];

      // Use search endpoint if q parameter is provided
      const endpoint = q
        ? `${GAMMA_API_ENDPOINT}/public-search?q=${encodeURIComponent(
            q,
          )}&${queryParamsSearch}`
        : `${GAMMA_API_ENDPOINT}/events/pagination?${queryParamsEvents}`;

      const response = await fetch(endpoint);
      const data = await response.json();

      DevLogger.log('Polymarket response data:', data);

      // Handle different response structures
      const events = q ? data?.events : data?.data;

      if (!events || !Array.isArray(events)) {
        return [];
      }

      const parsedMarkets: PredictMarket[] = parsePolymarketEvents(
        events,
        category,
      );

      DevLogger.log('Processed markets:', parsedMarkets);
      return parsedMarkets;
    } catch (error) {
      DevLogger.log('Error getting markets via Polymarket API:', error);
      return [];
    }
  }

  public async getPositions({
    address,
    limit = 10,
    offset = 0,
  }: {
    address: string;
    limit?: number;
    offset?: number;
  }): Promise<PredictPosition[]> {
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints();

    const response = await fetch(
      `${DATA_API_ENDPOINT}/positions?limit=${limit}&offset=${offset}&user=${address}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    const positionsData = (await response.json()) as PolymarketPosition[];
    const parsedPositions = parsePolymarketPositions({
      positions: positionsData,
    });

    return parsedPositions;
  }

  public async prepareOrder(params: OrderParams): Promise<PredictOrder> {
    const { isBuy } = params;
    if (isBuy) {
      return this.prepareBuyTransaction(params);
    }
    return this.prepareSellTransaction(params);
  }

  private async prepareBuyTransaction({
    signer,
    marketId,
    outcomeId,
    outcomeTokenId,
    amount,
  }: OrderParams): Promise<PredictOrder> {
    const { address, signTypedMessage } = signer;
    const side = Side.BUY;
    const {
      chainId,
      price,
      tickSize,
      order,
      contractConfig,
      exchangeContract,
      verifyingContract,
    } = await this.buildOrderArtifacts({
      address,
      orderParams: { marketId, outcomeTokenId, side, amount },
    });

    if (!priceValid(price, tickSize)) {
      throw new Error(
        `invalid price (${price}), min: ${parseFloat(tickSize)} - max: ${
          1 - parseFloat(tickSize)
        }`,
      );
    }

    const callData = encodeApprove({
      spender: exchangeContract,
      amount: BigInt(order.makerAmount),
    });

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

    return {
      id: 'temp-id',
      providerId: this.providerId,
      marketId,
      outcomeId,
      outcomeTokenId,
      isBuy: true,
      amount,
      price,
      status: 'idle',
      error: undefined,
      timestamp: Date.now(),
      lastUpdated: Date.now(),
      onchainTradeParams: {
        data: callData,
        to: contractConfig.collateral,
        chainId,
        from: address,
        value: '0x0',
      },
      offchainTradeParams: { clobOrder, headers },
    };
  }

  private async prepareSellTransaction(
    _params: OrderParams,
  ): Promise<PredictOrder> {
    throw new Error('Sell transactions not implemented yet');
  }

  public async submitOffchainTrade(
    params: OffchainTradeParams,
  ): Promise<OffchainTradeResponse> {
    const { clobOrder, headers } =
      params as unknown as PolymarketOffchainTradeParams;

    const response = await submitClobOrder({
      headers,
      clobOrder,
    });

    return {
      success: response.success,
      response,
    };
  }
}
