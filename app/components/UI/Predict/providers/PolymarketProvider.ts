import type {
  SignTypedDataVersion,
  TypedMessageParams,
} from '@metamask/keyring-controller';
import {
  IPredictProvider,
  PredictEvent,
  Market,
  MarketCategory,
  MarketStatus,
  Order,
  OrderParams,
  OrderResult,
  Position,
} from '../types';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { getPolymarketEndpoints } from '../utils/polymarket';

export type SignTypedMessageFn = (
  params: TypedMessageParams,
  version: SignTypedDataVersion,
) => Promise<string>;

export class PolymarketProvider implements IPredictProvider {
  readonly providerId = 'polymarket';

  #isTestnet: boolean;

  constructor(options: { isTestnet?: boolean }) {
    this.#isTestnet = options.isTestnet || false;
  }

  async connect(): Promise<void> {
    // TODO: Implement polymarket connection
    // - Authenticate and get API key
  }

  async disconnect(): Promise<void> {
    // TODO: Implement polymarket disconnection
  }

  async getEvents(params?: {
    category?: MarketCategory;
  }): Promise<PredictEvent[]> {
    try {
      const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();

      const { category = 'trending' } = params || {};
      DevLogger.log(
        'Getting markets via Polymarket API for category:',
        category,
      );

      let queryParams =
        'limit=20&active=true&archived=false&closed=false&ascending=false&offset=0';

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

  async prepareOrder(params: OrderParams): Promise<Order> {
    // TODO: Implement polymarket prepareOrder
    return {
      id: '',
      params,
      result: {
        status: 'error',
        message: 'Not implemented',
      },
      transactions: [],
      isOffchainTrade: false,
    };
  }

  async submitOrderTrade(_order: Order): Promise<OrderResult> {
    // TODO: Implement polymarket submitOrderTrade
    return {
      status: 'error',
      message: 'Not implemented',
    };
  }
}
