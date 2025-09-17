import {
  SignTypedDataVersion,
  type TypedMessageParams,
} from '@metamask/keyring-controller';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  OffchainTradeParams,
  OffchainTradeResponse,
  OnchainTradeParams,
  PredictActivity,
  PredictMarket,
  PredictOrder,
  PredictPosition,
  Side,
} from '../../types';
import { GetMarketsParams, OrderParams, PredictProvider } from '../types';
import { ROUNDING_CONFIG } from './constants';
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
import {
  buildMarketOrderCreationArgs,
  calculateMarketPrice,
  createApiKey,
  encodeApprove,
  encodeErc1155Approve,
  getContractConfig,
  getL2Headers,
  getMarketFromPolymarketApi,
  getMarketsFromPolymarketApi,
  getOrderTypedData,
  getPolymarketEndpoints,
  getTickSize,
  parsePolymarketPositions,
  POLYGON_MAINNET_CHAIN_ID,
  priceValid,
  submitClobOrder,
} from './utils';
import { generateOrderId } from '../../utils/orders';

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
    orderParams: { outcomeTokenId, side, amount, outcomeId },
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
      calculateMarketPrice(tokenId, side, amount, OrderType.FOK),
      getMarketFromPolymarketApi({ conditionId }),
    ]);

    const tickSize = tickSizeResponse.minimum_tick_size;

    const negRisk = marketData.negRisk;

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
      const markets = await getMarketsFromPolymarketApi(params);
      return markets;
    } catch (error) {
      DevLogger.log('Error getting markets via Polymarket API:', error);
      return [];
    }
  }

  public async getPositions({
    address,
    limit = 100, // todo: reduce this once we've decided on the pagination approach
    offset = 0,
  }: {
    address: string;
    limit?: number;
    offset?: number;
  }): Promise<PredictPosition[]> {
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints();

    const response = await fetch(
      `${DATA_API_ENDPOINT}/positions?limit=${limit}&offset=${offset}&user=${address}&sortBy=CURRENT`,
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
    market,
    outcomeId,
    outcomeTokenId,
    amount,
  }: OrderParams): Promise<PredictOrder> {
    const { address, signTypedMessage } = signer;
    const side = Side.BUY;

    const {
      chainId,
      price,
      order,
      contractConfig,
      exchangeContract,
      verifyingContract,
      negRisk,
      tickSize,
    } = await this.buildOrderArtifacts({
      address,
      orderParams: {
        outcomeId,
        outcomeTokenId,
        side,
        amount,
      },
    });

    if (!priceValid(price, tickSize as TickSize)) {
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

    const calls: OnchainTradeParams[] = [
      {
        data: callData,
        to: contractConfig.collateral,
        chainId,
        from: address,
        value: '0x0',
      },
    ];

    if (negRisk) {
      const adapterCallData = encodeApprove({
        spender: contractConfig.negRiskAdapter,
        amount: BigInt(order.makerAmount),
      });
      calls.push({
        data: adapterCallData,
        to: contractConfig.collateral,
        chainId,
        from: address,
        value: '0x0',
      });
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

    return {
      id: generateOrderId(),
      chainId,
      providerId: this.providerId,
      marketId: market?.id,
      outcomeId,
      outcomeTokenId,
      isBuy: true,
      amount,
      price,
      status: 'idle',
      error: undefined,
      timestamp: Date.now(),
      lastUpdated: Date.now(),
      onchainTradeParams: calls,
      offchainTradeParams: { clobOrder, headers },
    };
  }

  private async prepareSellTransaction({
    signer,
    market,
    outcomeId,
    outcomeTokenId,
    amount,
  }: OrderParams): Promise<PredictOrder> {
    const { address, signTypedMessage } = signer;
    const side = Side.SELL;
    const {
      chainId,
      price,
      tickSize,
      order,
      contractConfig,
      exchangeContract,
      verifyingContract,
      negRisk,
    } = await this.buildOrderArtifacts({
      address,
      orderParams: { outcomeId, outcomeTokenId, side, amount },
    });

    if (!priceValid(price, tickSize)) {
      throw new Error(
        `invalid price (${price}), min: ${parseFloat(tickSize)} - max: ${
          1 - parseFloat(tickSize)
        }`,
      );
    }

    const calls = [];

    // TODO: check if the user already has approved the exchange contract
    const callData = encodeErc1155Approve({
      spender: exchangeContract,
      approved: true,
    });

    calls.push({
      data: callData,
      to: contractConfig.conditionalTokens,
      chainId,
      from: address,
      value: '0x0',
    });

    if (negRisk) {
      const adapterCallData = encodeErc1155Approve({
        spender: contractConfig.negRiskAdapter,
        approved: true,
      });
      calls.push({
        data: adapterCallData,
        to: contractConfig.conditionalTokens,
        chainId,
        from: address,
        value: '0x0',
      });
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

    return {
      id: generateOrderId(),
      providerId: this.providerId,
      marketId: market?.id,
      outcomeId,
      outcomeTokenId,
      isBuy: false,
      amount,
      price,
      chainId,
      status: 'idle',
      error: undefined,
      timestamp: Date.now(),
      lastUpdated: Date.now(),
      onchainTradeParams: calls,
      offchainTradeParams: { clobOrder, headers },
    };
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

  public async isEligible(): Promise<boolean> {
    // TODO: Implement once Polymarket Geo-Blocking API is available
    return true;
  }
}
