import type {
  SignTypedDataVersion,
  TypedMessageParams,
} from '@metamask/keyring-controller';
import {
  IPredictProvider,
  Market,
  Order,
  OrderParams,
  OrderResult,
  Position,
} from '../types';
import { getPolymarketEndpoints } from '../utils/polymarketUtils';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

const POLYMARKET_API_ENDPOINT = 'https://gamma-api.polymarket.com';

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

  async getMarkets(): Promise<Market[]> {
    try {
      DevLogger.log('Getting markets via Polymarket API');
      const response = await fetch(
        `${POLYMARKET_API_ENDPOINT}/markets?limit=5&closed=false&active=true`,
      );
      const data = await response.json();
      DevLogger.log('Polymarket response data:', data);

      const markets = data.map((market: Market) => ({
        id: market.id.toString(),
        question: market.question || '',
        outcomes: market.outcomes || '[]',
        outcomePrices: market.outcomePrices,
        image: market.image || '',
        volume: market.volume,
        providerId: 'polymarket',
        status: market.status === 'closed' ? 'closed' : 'open',
        image_url: market.image,
        icon: market.icon,
      }));

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
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints(false);

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
