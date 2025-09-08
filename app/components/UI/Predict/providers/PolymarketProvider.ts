import {
  SignTypedDataVersion,
  type TypedMessageParams,
} from '@metamask/keyring-controller';
import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { ROUNDING_CONFIG } from '../constants/polymarket';
import {
  IPredictProvider,
  Market,
  MarketCategory,
  MarketStatus,
  OrderParams,
  Position,
  PredictEvent,
  ProcessOrderResult,
  Side,
} from '../types';
import {
  ApiKeyCreds,
  OrderData,
  OrderType,
  SignatureType,
  TickSize,
} from '../types/polymarket';
import {
  buildMarketOrderCreationArgs,
  calculateMarketPrice,
  createApiKey,
  encodeApprove,
  getContractConfig,
  getMarket,
  getOrderTypedData,
  getPolymarketEndpoints,
  getTickSize,
  POLYGON_MAINNET_CHAIN_ID,
  priceValid,
  submitClobOrder,
} from '../utils/polymarket';

export type SignTypedMessageFn = (
  params: TypedMessageParams,
  version: SignTypedDataVersion,
) => Promise<string>;

export class PolymarketProvider implements IPredictProvider {
  readonly providerId = 'polymarket';

  #isTestnet: boolean;
  #apiKeysByAddress: Map<string, ApiKeyCreds> = new Map();

  constructor(options: { isTestnet?: boolean }) {
    this.#isTestnet = options.isTestnet || false;
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
    orderParams: { marketId, outcomeId, side, amount },
  }: {
    address: string;
    orderParams: OrderParams;
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
    const tokenId = outcomeId;

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
      roundConfig: ROUNDING_CONFIG[tickSize],
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

  async getApiKey({ address }: { address: string }): Promise<ApiKeyCreds> {
    const cachedApiKey = this.#apiKeysByAddress.get(address);
    if (cachedApiKey) {
      return cachedApiKey;
    }

    const apiKeyCreds = await createApiKey({ address });
    this.#apiKeysByAddress.set(address, apiKeyCreds);
    return apiKeyCreds;
  }

  async getEvents(params?: {
    category?: MarketCategory;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<PredictEvent[]> {
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

      const categoryTagMap: Record<MarketCategory, string> = {
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

      DevLogger.log('Processed markets:', events);
      return events;
    } catch (error) {
      DevLogger.log('Error getting markets via Polymarket API:', error);
      return [];
    }
  }

  async getMarkets(params?: { category?: MarketCategory }): Promise<Market[]> {
    try {
      const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();

      const { category = 'trending' } = params || {};
      DevLogger.log(
        'Getting markets via Polymarket API for category:',
        category,
      );

      let queryParams =
        'limit=3&active=true&archived=false&closed=false&order=volume24hr&ascending=false&offset=0';

      const categoryTagMap: Record<MarketCategory, string> = {
        trending: '&exclude_tag_id=100639&order=volume24hr',
        new: '&order=startDate&exclude_tag_id=100639&exclude_tag_id=102169',
        sports: '&tag_slug=sports&&exclude_tag_id=100639&order=volume24hr',
        crypto: '&tag_slug=crypto&order=volume24hr',
        politics: '&tag_slug=politics&order=volume24hr',
      };

      queryParams += categoryTagMap[category];

      const response = await fetch(
        `${GAMMA_API_ENDPOINT}/events/pagination?${queryParams}`,
      );
      const data = await response.json();
      DevLogger.log('Polymarket response data:', data);

      const events = data?.data;

      if (!events || !Array.isArray(events)) {
        return [];
      }

      const markets = events.flatMap((event: PredictEvent) =>
        event.markets.map((market: Market) => ({
          id: market.id?.toString() || '',
          question: market.question || '',
          outcomes: market.outcomes || '[]',
          outcomePrices: market.outcomePrices,
          image: market.image || '',
          volume: market.volume,
          providerId: 'polymarket',
          status: (market.status === 'closed'
            ? 'closed'
            : 'open') as MarketStatus,
          image_url: market.image,
          icon: market.icon,
          conditionId: market.conditionId,
          clobTokenIds: market.clobTokenIds,
          tokenIds: JSON.parse(market.clobTokenIds),
        })),
      );

      DevLogger.log('Processed markets:', markets);
      return markets;
    } catch (error) {
      DevLogger.log('Error getting markets via Polymarket API:', error);
      return [];
    }
  }

  async getPositions({
    address,
    limit = 10,
    offset = 0,
  }: {
    address: string;
    limit?: number;
    offset?: number;
  }): Promise<Position[]> {
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
    const positionsData = await response.json();
    positionsData.forEach((position: Position) => {
      position.providerId = this.providerId;
    });

    return positionsData;
  }

  async processOrder({
    address,
    orderParams: { marketId, outcomeId, side, amount },
  }: {
    address: string;
    orderParams: OrderParams;
  }): Promise<ProcessOrderResult> {
    const { chainId, order, verifyingContract } =
      await this.buildOrderArtifacts({
        address,
        orderParams: { marketId, outcomeId, side, amount },
      });

    const typedData = getOrderTypedData({
      order,
      chainId,
      verifyingContract,
    });

    const signature = await Engine.context.KeyringController.signTypedMessage(
      { data: typedData, from: address },
      SignTypedDataVersion.V4,
    );

    const signedOrder = {
      ...order,
      signature,
    };

    // Ensure API key is available in memory; connect if needed
    const signerApiKey = await this.getApiKey({ address });

    const responseData = await submitClobOrder({
      apiKey: signerApiKey,
      clobOrder: {
        order: { ...signedOrder, side, salt: parseInt(signedOrder.salt, 10) },
        owner: signerApiKey.apiKey,
        orderType: OrderType.FOK,
      },
    });

    return {
      status: responseData.success ? 'success' : 'error',
      response: responseData,
      providerId: this.providerId,
    };
  }

  async prepareBuyTransaction({
    address,
    orderParams: { marketId, outcomeId, amount },
  }: {
    address: string;
    orderParams: OrderParams;
  }): Promise<{ callData: Hex; toAddress: string; chainId: number }> {
    const side = Side.BUY;
    const {
      chainId,
      price,
      tickSize,
      order,
      contractConfig,
      exchangeContract,
    } = await this.buildOrderArtifacts({
      address,
      orderParams: { marketId, outcomeId, side, amount },
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

    return { callData, toAddress: contractConfig.collateral, chainId };
  }
}
