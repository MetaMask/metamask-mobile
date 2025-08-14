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

export type SignTypedMessageFn = (
  params: TypedMessageParams,
  version: SignTypedDataVersion,
) => Promise<string>;

export class PolymarketProvider implements IPredictProvider {
  readonly providerId = 'polymarket';

  #signTypedMessage: SignTypedMessageFn;
  #isTestnet: boolean;

  constructor(options: {
    signTypedMessage: SignTypedMessageFn;
    isTestnet?: boolean;
  }) {
    this.#signTypedMessage = options.signTypedMessage;
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

  async getPositions(): Promise<Position[]> {
    // TODO: Implement polymarket getPositions
    return [];
  }

  async prepareOrder(params: OrderParams): Promise<Order> {
    // TODO: Implement polymarket prepareOrder
    return {
      id: '',
      params,
      result: {
        status: 'error',
        messsage: 'Not implemented',
      },
      transactions: [],
      isOffchainTrade: false,
    };
  }

  async submitOrderTrade(_order: Order): Promise<OrderResult> {
    // TODO: Implement polymarket submitOrderTrade
    return {
      status: 'error',
      messsage: 'Not implemented',
    };
  }
}
