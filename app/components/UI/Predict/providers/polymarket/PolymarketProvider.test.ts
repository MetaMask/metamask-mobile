import Engine from '../../../../../core/Engine';
import { OffchainTradeParams, Side, Recurrence } from '../../types';
import {
  buildMarketOrderCreationArgs,
  calculateMarketPrice,
  createApiKey,
  encodeApprove,
  getContractConfig,
  getL2Headers,
  getMarketFromPolymarketApi,
  getMarketsFromPolymarketApi,
  getOrderTypedData,
  getPolymarketEndpoints,
  getTickSize,
  parsePolymarketPositions,
  priceValid,
  submitClobOrder,
} from './utils';
import { SellOrderParams, type BuyOrderParams } from '../types';
import { PolymarketProvider } from './PolymarketProvider';
import { OrderType } from './types';

// Mock external dependencies
jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
    KeyringController: {
      signTypedMessage: jest.fn(),
    },
  },
}));

jest.mock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    getPolymarketEndpoints: jest.fn(() => ({
      DATA_API_ENDPOINT: 'https://data.polymarket.com',
      GAMMA_API_ENDPOINT: 'https://gamma-api.polymarket.com',
      CLOB_ENDPOINT: 'https://clob.polymarket.com',
    })),
    getMarketsFromPolymarketApi: jest.fn(),
    getMarketFromPolymarketApi: jest.fn(),
    getTickSize: jest.fn(),
    calculateMarketPrice: jest.fn(),
    buildMarketOrderCreationArgs: jest.fn(),
    encodeApprove: jest.fn(),
    getContractConfig: jest.fn(),
    getL2Headers: jest.fn(),
    getOrderTypedData: jest.fn(),
    parsePolymarketPositions: jest.fn(),
    priceValid: jest.fn(),
    createApiKey: jest.fn(),
    submitClobOrder: jest.fn(),
    POLYGON_MAINNET_CHAIN_ID: 137,
  };
});

const mockFindNetworkClientIdByChainId = Engine.context.NetworkController
  .findNetworkClientIdByChainId as jest.Mock;
const mockSignTypedMessage = Engine.context.KeyringController
  .signTypedMessage as jest.Mock;
const mockGetMarketsFromPolymarketApi =
  getMarketsFromPolymarketApi as jest.Mock;
const mockGetMarketFromPolymarketApi = getMarketFromPolymarketApi as jest.Mock;
const mockGetTickSize = getTickSize as jest.Mock;
const mockCalculateMarketPrice = calculateMarketPrice as jest.Mock;
const mockBuildMarketOrderCreationArgs =
  buildMarketOrderCreationArgs as jest.Mock;
const mockEncodeApprove = encodeApprove as jest.Mock;
const mockGetContractConfig = getContractConfig as jest.Mock;
const mockGetL2Headers = getL2Headers as jest.Mock;
const mockGetOrderTypedData = getOrderTypedData as jest.Mock;
const mockParsePolymarketPositions = parsePolymarketPositions as jest.Mock;
const mockPriceValid = priceValid as jest.Mock;
const mockCreateApiKey = createApiKey as jest.Mock;
const mockSubmitClobOrder = submitClobOrder as jest.Mock;

describe('PolymarketProvider', () => {
  const createProvider = () => new PolymarketProvider();

  it('exposes the correct providerId', () => {
    const provider = createProvider();
    expect(provider.providerId).toBe('polymarket');
  });

  it('getMarkets returns an array with some length', async () => {
    const provider = createProvider();

    const mockMarkets = [
      {
        id: 'market-1',
        title: 'Test Market 1',
        description: 'A test market',
        icon: 'https://example.com/icon1.png',
        closed: false,
        series: 'Test Series',
        tags: [{ slug: 'trending' }, { slug: 'crypto' }],
        markets: [
          {
            conditionId: 'cond-1',
            question: 'Will Bitcoin reach $100k?',
            description: 'Bitcoin price prediction',
            icon: 'https://example.com/market1.png',
            image: 'https://example.com/market1.png',
            groupItemTitle: 'Bitcoin',
            closed: false,
            volume: '1000000',
            clobTokenIds: '["0","1"]',
            outcomes: '["Yes","No"]',
            outcomePrices: '["0.6","0.4"]',
          },
        ],
      },
      {
        id: 'market-2',
        title: 'Test Market 2',
        description: 'Another test market',
        icon: 'https://example.com/icon2.png',
        closed: false,
        series: 'Test Series 2',
        tags: [{ slug: 'sports' }],
        markets: [
          {
            conditionId: 'cond-2',
            question: 'Will the Lakers win?',
            description: 'NBA prediction',
            icon: 'https://example.com/market2.png',
            image: 'https://example.com/market2.png',
            groupItemTitle: 'Lakers',
            closed: false,
            volume: '500000',
            clobTokenIds: '["0","1"]',
            outcomes: '["Yes","No"]',
            outcomePrices: '["0.7","0.3"]',
          },
        ],
      },
    ];

    mockGetMarketsFromPolymarketApi.mockResolvedValue(mockMarkets);

    const markets = await provider.getMarkets();
    expect(Array.isArray(markets)).toBe(true);
    expect(markets.length).toBeGreaterThan(0);
    expect(markets.length).toBe(2);
    expect(mockGetMarketsFromPolymarketApi).toHaveBeenCalledWith(undefined);
  });

  it('getPositions returns an empty array when API returns none', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockResolvedValue({
        json: jest.fn().mockResolvedValue([]),
      });

    mockParsePolymarketPositions.mockReturnValue([]);

    const result = await provider.getPositions({
      address: '0x0000000000000000000000000000000000000000',
    });

    expect(result).toEqual([]);
    expect(mockParsePolymarketPositions).toHaveBeenCalledWith({
      positions: [],
    });

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions maps providerId to polymarket on each returned position', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;

    // Mock API response with PolymarketPosition format
    const mockApiResponse = [
      {
        providerId: 'external',
        conditionId: 'c-1',
        icon: 'https://example.com/icon.png',
        title: 'Some Market',
        slug: 'some-market',
        size: 2,
        outcome: 'Yes',
        outcomeIndex: 0,
        cashPnl: 1.23,
        curPrice: 0.45,
        currentValue: 0.9,
        percentPnl: 10,
        initialValue: 0.82,
        avgPrice: 0.41,
        redeemable: false,
        negativeRisk: false,
        endDate: '2025-01-01T00:00:00Z',
        asset: 'asset-1',
      },
    ];

    // Mock the parsed result
    const mockParsedPositions = [
      {
        providerId: 'polymarket',
        marketId: 'c-1',
        outcomeTokenId: 0,
        title: 'Some Market',
        icon: 'https://example.com/icon.png',
        size: 2,
        outcome: 'Yes',
        cashPnl: 1.23,
        curPrice: 0.45,
        currentValue: 0.9,
        percentPnl: 10,
        initialValue: 0.82,
        avgPrice: 0.41,
        redeemable: false,
        negativeRisk: false,
        endDate: '2025-01-01T00:00:00Z',
        asset: 'asset-1',
      },
    ];

    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

    mockParsePolymarketPositions.mockReturnValue(mockParsedPositions);

    const result = await provider.getPositions({
      address: '0x0000000000000000000000000000000000000000',
    });

    expect(result).toHaveLength(1);
    expect(result[0].providerId).toBe('polymarket');
    expect(result[0].marketId).toBe('c-1');
    expect(result[0].outcomeTokenId).toBe(0);
    expect(mockParsePolymarketPositions).toHaveBeenCalledWith({
      positions: mockApiResponse,
    });

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions uses default pagination and correct query params', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    const mockFetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });
    (globalThis as unknown as { fetch: jest.Mock }).fetch = mockFetch;

    const userAddress = '0x1111111111111111111111111111111111111111';
    await provider.getPositions({ address: userAddress });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledWithUrl = mockFetch.mock.calls[0][0] as string;
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints();
    expect(calledWithUrl.startsWith(`${DATA_API_ENDPOINT}/positions?`)).toBe(
      true,
    );
    expect(calledWithUrl).toContain('limit=10');
    expect(calledWithUrl).toContain('offset=0');
    expect(calledWithUrl).toContain(`user=${userAddress}`);

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions applies offset and uses provided limit in the request', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    const mockFetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });
    (globalThis as unknown as { fetch: jest.Mock }).fetch = mockFetch;

    const userAddress = '0x2222222222222222222222222222222222222222';
    await provider.getPositions({ address: userAddress, limit: 5, offset: 15 });

    const calledWithUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledWithUrl).toContain('limit=5');
    expect(calledWithUrl).toContain('offset=15');
    expect(calledWithUrl).toContain(`user=${userAddress}`);

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions rejects when the network request fails', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockRejectedValue(new Error('network failure'));

    await expect(
      provider.getPositions({
        address: '0x3333333333333333333333333333333333333333',
      }),
    ).rejects.toThrow('network failure');

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  describe('prepareOrder', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockSigner = {
      address: mockAddress,
      signTypedMessage: mockSignTypedMessage,
    };

    const mockMarket = {
      id: 'market-1',
      providerId: 'polymarket',
      slug: 'test-market',
      title: 'Test Market',
      description: 'A test market for prediction',
      image: 'test-image.png',
      status: 'open' as const,
      recurrence: Recurrence.NONE,
      categories: [],
      outcomes: [],
    };

    const mockPosition = {
      id: 'position-1',
      providerId: 'polymarket',
      marketId: 'market-1',
      outcomeId: 'outcome-456',
      outcome: 'Yes',
      outcomeTokenId: '0',
      title: 'Test Market Position',
      icon: 'test-icon.png',
      amount: 1,
      price: 0.5,
      status: 'open' as const,
      size: 1,
      outcomeIndex: 0,
      realizedPnl: 0,
      curPrice: 0.5,
      conditionId: 'outcome-456',
      percentPnl: 0,
      cashPnl: 0,
      redeemable: false,
      initialValue: 0.5,
      avgPrice: 0.5,
      currentValue: 0.5,
      endDate: '2025-01-01T00:00:00Z',
    };

    beforeEach(() => {
      jest.clearAllMocks();

      // Setup default mocks
      mockFindNetworkClientIdByChainId.mockReturnValue('polygon');
      mockSignTypedMessage.mockResolvedValue('0xsignature');
      mockCreateApiKey.mockResolvedValue({
        apiKey: 'test-api-key',
        secret: 'test-secret',
        passphrase: 'test-passphrase',
      });

      mockGetTickSize.mockResolvedValue({
        minimum_tick_size: '0.01',
      });
      mockCalculateMarketPrice.mockResolvedValue(0.5);
      mockPriceValid.mockReturnValue(true);

      // Mock market data with valid JSON strings for fields that get parsed
      mockGetMarketFromPolymarketApi.mockResolvedValue({
        id: 'outcome-456',
        conditionId: 'outcome-456',
        negRisk: false,
        clobTokenIds: '["token1", "token2"]', // Valid JSON string
        outcomes: '["YES", "NO"]', // Valid JSON string
        outcomePrices: '["0.5", "0.5"]', // Valid JSON string
      });

      mockBuildMarketOrderCreationArgs.mockReturnValue({
        makerAmount: '1000000',
        signature: '',
        salt: '12345',
        maker: mockAddress,
        taker: '0x0000000000000000000000000000000000000000',
        price: '500000000000000000',
        size: '1000000',
        side: 0,
        orderType: 'FOK',
      });

      mockEncodeApprove.mockReturnValue('0xencoded');

      mockGetContractConfig.mockReturnValue({
        exchange: '0x1234567890123456789012345678901234567890',
        negRiskExchange: '0x0987654321098765432109876543210987654321',
        collateral: '0xCollateralAddress',
      });

      mockGetOrderTypedData.mockReturnValue({
        types: {},
        primaryType: 'Order',
        domain: {},
        message: {},
      });

      mockGetL2Headers.mockReturnValue({
        POLY_ADDRESS: 'address',
        POLY_SIGNATURE: 'signature',
        POLY_TIMESTAMP: 'timestamp',
        POLY_API_KEY: 'apiKey',
        POLY_PASSPHRASE: 'passphrase',
      });
    });

    it('successfully prepares a buy order and returns correct result', async () => {
      const provider = createProvider();
      const orderParams: BuyOrderParams = {
        signer: mockSigner,
        market: mockMarket,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        size: 1,
      };

      const result = await provider.prepareBuyOrder(orderParams);

      expect(result).toMatchObject({
        id: expect.any(String),
        providerId: 'polymarket',
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        isBuy: true,
        size: 1,
        price: 0.5,
        status: 'idle',
        timestamp: expect.any(Number),
        lastUpdated: Date.now(),
      });

      expect(result.onchainTradeParams).toBeDefined();
      expect(result.offchainTradeParams).toBeDefined();
    });

    it('calls all required utility functions with correct parameters for buy order', async () => {
      const provider = createProvider();
      const orderParams: BuyOrderParams = {
        signer: mockSigner,
        market: mockMarket,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        size: 2,
      };

      await provider.prepareBuyOrder(orderParams);

      expect(mockCalculateMarketPrice).toHaveBeenCalledWith(
        '0',
        Side.BUY,
        2,
        OrderType.FOK,
      );
      expect(mockPriceValid).toHaveBeenCalledWith(0.5, '0.01');
    });

    it('throws error when price is invalid', async () => {
      mockPriceValid.mockReturnValue(false);

      const provider = createProvider();
      const orderParams: BuyOrderParams = {
        signer: mockSigner,
        market: mockMarket,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        size: 1,
      };

      await expect(provider.prepareBuyOrder(orderParams)).rejects.toThrow(
        'invalid price (0.5), min: 0.01 - max: 0.99',
      );
    });

    it('successfully prepares a sell order and returns correct result', async () => {
      const provider = createProvider();
      const orderParams: SellOrderParams = {
        signer: mockSigner,
        position: mockPosition,
      };

      const result = await provider.prepareSellOrder(orderParams);

      expect(result).toMatchObject({
        id: expect.any(String),
        providerId: 'polymarket',
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        isBuy: false,
        size: 1,
        price: 0.5,
        status: 'idle',
        timestamp: expect.any(Number),
        lastUpdated: Date.now(),
      });

      expect(result.onchainTradeParams).toBeDefined();
      expect(result.offchainTradeParams).toBeDefined();
    });

    it('calls all required utility functions with correct parameters for sell order', async () => {
      const provider = createProvider();
      const orderParams: SellOrderParams = {
        signer: mockSigner,
        position: mockPosition,
      };

      await provider.prepareSellOrder(orderParams);

      expect(mockCalculateMarketPrice).toHaveBeenCalledWith(
        '0',
        Side.SELL,
        1,
        OrderType.FOK,
      );
      expect(mockPriceValid).toHaveBeenCalledWith(0.5, '0.01');
    });
  });

  describe('getMarketDetails', () => {
    it('throws error when method is not implemented', () => {
      const provider = createProvider();

      expect(() =>
        provider.getMarketDetails({ marketId: 'market-123' }),
      ).toThrow('Method not implemented.');
    });
  });

  describe('getActivity', () => {
    it('throws error when method is not implemented', () => {
      const provider = createProvider();

      expect(() =>
        provider.getActivity({
          address: '0x1234567890123456789012345678901234567890',
        }),
      ).toThrow('Method not implemented.');
    });
  });

  describe('claimWinnings', () => {
    it('throws error when method is not implemented', () => {
      const provider = createProvider();

      expect(() => provider.claimWinnings()).toThrow('Method not implemented.');
    });
  });

  describe('submitOffchainTrade', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockSubmitClobOrder.mockResolvedValue({
        success: true,
        errorMsg: '',
        makingAmount: '1000000',
        orderID: 'order-123',
        status: 'success',
        takingAmount: '0',
        transactionsHashes: [],
      });
    });

    it('successfully submits offchain trade', async () => {
      const provider = createProvider();
      const offchainTradeParams: OffchainTradeParams = {
        clobOrder: {
          order: {
            maker: '0x123',
            taker: '0x000',
            tokenId: '0',
            makerAmount: '1000000',
            takerAmount: '0',
            side: Side.BUY,
            feeRateBps: '0',
            nonce: '123',
            expiration: '0',
            signatureType: 0,
            salt: 12345,
            signature: '0xsignature',
          },
          owner: 'test-owner',
          orderType: OrderType.FOK,
        },
        headers: {
          POLY_ADDRESS: 'address',
          POLY_SIGNATURE: 'signature',
          POLY_TIMESTAMP: 'timestamp',
          POLY_API_KEY: 'apiKey',
          POLY_PASSPHRASE: 'passphrase',
        },
      };

      const result = await provider.submitOffchainTrade(offchainTradeParams);

      expect(result).toMatchObject({
        success: true,
        response: expect.any(Object),
      });
      expect(mockSubmitClobOrder).toHaveBeenCalledWith({
        headers: offchainTradeParams.headers,
        clobOrder: offchainTradeParams.clobOrder,
      });
    });

    it('handles submission failure', async () => {
      mockSubmitClobOrder.mockResolvedValue({
        success: false,
        errorMsg: 'Submission failed',
      });

      const provider = createProvider();
      const offchainTradeParams: OffchainTradeParams = {
        clobOrder: {
          order: {
            maker: '0x123',
            taker: '0x000',
            tokenId: '0',
            makerAmount: '1000000',
            takerAmount: '0',
            side: Side.BUY,
            feeRateBps: '0',
            nonce: '123',
            expiration: '0',
            signatureType: 0,
            salt: 12345,
            signature: '0xsignature',
          },
          owner: 'test-owner',
          orderType: OrderType.FOK,
        },
        headers: {
          POLY_ADDRESS: 'address',
          POLY_SIGNATURE: 'signature',
          POLY_TIMESTAMP: 'timestamp',
          POLY_API_KEY: 'apiKey',
          POLY_PASSPHRASE: 'passphrase',
        },
      };

      const result = await provider.submitOffchainTrade(offchainTradeParams);

      expect(result.success).toBe(false);
    });
  });
});
