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
    // TODO: Implement polymarket getMarkets
    return [];
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
