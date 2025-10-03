import Engine from '../../../../../core/Engine';
import {
  OffchainTradeParams,
  Side,
  Recurrence,
  PredictPositionStatus,
  PredictPriceHistoryInterval,
} from '../../types';
import {
  buildMarketOrderCreationArgs,
  calculateMarketPrice,
  createApiKey,
  encodeApprove,
  encodeClaim,
  encodeErc1155Approve,
  getContractConfig,
  getL2Headers,
  getMarketDetailsFromGammaApi,
  getMarketsFromPolymarketApi,
  getParsedMarketsFromPolymarketApi,
  getOrderTypedData,
  getPolymarketEndpoints,
  getTickSize,
  parsePolymarketEvents,
  parsePolymarketPositions,
  priceValid,
  submitClobOrder,
} from './utils';
import { SellOrderParams, type BuyOrderParams } from '../types';
import { PolymarketProvider } from './PolymarketProvider';
import { OrderType } from './types';
import { computeSafeAddress, createSafeFeeAuthorization } from './safe/utils';

// Mock external dependencies
jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
      getNetworkClientById: jest.fn(),
    },
    KeyringController: {
      signTypedMessage: jest.fn(),
      signPersonalMessage: jest.fn(),
    },
  },
}));

jest.mock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    getPolymarketEndpoints: jest.fn(() => ({
      DATA_API_ENDPOINT: 'https://data-api.polymarket.com',
      GAMMA_API_ENDPOINT: 'https://gamma-api.polymarket.com',
      CLOB_ENDPOINT: 'https://clob.polymarket.com',
      GEOBLOCK_API_ENDPOINT: 'https://polymarket.com/api/geoblock',
    })),
    getParsedMarketsFromPolymarketApi: jest.fn(),
    getMarketsFromPolymarketApi: jest.fn(),
    getMarketDetailsFromGammaApi: jest.fn(),
    getTickSize: jest.fn(),
    calculateMarketPrice: jest.fn(),
    buildMarketOrderCreationArgs: jest.fn(),
    encodeApprove: jest.fn(),
    encodeClaim: jest.fn(),
    encodeErc1155Approve: jest.fn(),
    getContractConfig: jest.fn(),
    getL2Headers: jest.fn(),
    getOrderTypedData: jest.fn(),
    parsePolymarketEvents: jest.fn(),
    parsePolymarketPositions: jest.fn(),
    priceValid: jest.fn(),
    createApiKey: jest.fn(),
    submitClobOrder: jest.fn(),
    POLYGON_MAINNET_CHAIN_ID: 137,
  };
});

jest.mock('./safe/utils', () => ({
  computeSafeAddress: jest.fn(),
  createSafeFeeAuthorization: jest.fn(),
}));

const mockFindNetworkClientIdByChainId = Engine.context.NetworkController
  .findNetworkClientIdByChainId as jest.Mock;
const mockGetNetworkClientById = Engine.context.NetworkController
  .getNetworkClientById as jest.Mock;
const mockSignTypedMessage = Engine.context.KeyringController
  .signTypedMessage as jest.Mock;
const mockSignPersonalMessage = Engine.context.KeyringController
  .signPersonalMessage as jest.Mock;
const mockGetMarketsFromPolymarketApi =
  getParsedMarketsFromPolymarketApi as jest.Mock;
const mockGetMarketFromPolymarketApi = getMarketsFromPolymarketApi as jest.Mock;
const mockGetMarketDetailsFromGammaApi =
  getMarketDetailsFromGammaApi as jest.Mock;
const mockGetTickSize = getTickSize as jest.Mock;
const mockCalculateMarketPrice = calculateMarketPrice as jest.Mock;
const mockBuildMarketOrderCreationArgs =
  buildMarketOrderCreationArgs as jest.Mock;
const mockEncodeApprove = encodeApprove as jest.Mock;
const mockGetContractConfig = getContractConfig as jest.Mock;
const mockGetL2Headers = getL2Headers as jest.Mock;
const mockGetOrderTypedData = getOrderTypedData as jest.Mock;
const mockParsePolymarketEvents = parsePolymarketEvents as jest.Mock;
const mockParsePolymarketPositions = parsePolymarketPositions as jest.Mock;
const mockPriceValid = priceValid as jest.Mock;
const mockCreateApiKey = createApiKey as jest.Mock;
const mockSubmitClobOrder = submitClobOrder as jest.Mock;
const mockEncodeClaim = encodeClaim as jest.Mock;
const mockEncodeErc1155Approve = encodeErc1155Approve as jest.Mock;
const mockComputeSafeAddress = computeSafeAddress as jest.Mock;
const mockCreateSafeFeeAuthorization = createSafeFeeAuthorization as jest.Mock;

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
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      });

    mockParsePolymarketPositions.mockResolvedValue([]);

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
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

    mockParsePolymarketPositions.mockResolvedValue(mockParsedPositions);

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
      ok: true,
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
    expect(calledWithUrl).toContain('limit=100');
    expect(calledWithUrl).toContain('offset=0');
    expect(calledWithUrl).toContain(`user=${userAddress}`);
    expect(calledWithUrl).toContain('sortBy=CURRENT');
    expect(calledWithUrl).toContain('redeemable=false');

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions applies offset and uses provided limit in the request', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
    (globalThis as unknown as { fetch: jest.Mock }).fetch = mockFetch;

    const userAddress = '0x2222222222222222222222222222222222222222';
    await provider.getPositions({ address: userAddress, limit: 5, offset: 15 });

    const calledWithUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledWithUrl).toContain('limit=5');
    expect(calledWithUrl).toContain('offset=15');
    expect(calledWithUrl).toContain(`user=${userAddress}`);
    expect(calledWithUrl).toContain('sortBy=CURRENT');
    expect(calledWithUrl).toContain('redeemable=false');

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

  it('getPositions uses claimable parameter correctly', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
    (globalThis as unknown as { fetch: jest.Mock }).fetch = mockFetch;

    const userAddress = '0x4444444444444444444444444444444444444444';
    await provider.getPositions({ address: userAddress, claimable: true });

    const calledWithUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledWithUrl).toContain('redeemable=true');
    expect(calledWithUrl).toContain(`user=${userAddress}`);

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  // Helper function to setup order test environment
  function setupOrderTest() {
    jest.clearAllMocks();

    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockSigner = {
      address: mockAddress,
      signTypedMessage: mockSignTypedMessage,
      signPersonalMessage: mockSignPersonalMessage,
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
      status: PredictPositionStatus.OPEN,
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
      claimable: false,
    };

    // Setup default mocks
    mockFindNetworkClientIdByChainId.mockReturnValue('polygon');
    mockGetNetworkClientById.mockReturnValue({
      provider: {},
    });
    mockSignTypedMessage.mockResolvedValue('0xsignature');
    mockSignPersonalMessage.mockResolvedValue('0xpersonalsignature');
    mockCreateApiKey.mockResolvedValue({
      apiKey: 'test-api-key',
      secret: 'test-secret',
      passphrase: 'test-passphrase',
    });
    mockComputeSafeAddress.mockResolvedValue(
      '0x9999999999999999999999999999999999999999',
    );
    mockCreateSafeFeeAuthorization.mockResolvedValue({
      type: 'safe-transaction',
      authorization: {
        tx: {
          to: '0xCollateralAddress',
          operation: 0,
          data: '0xdata',
          value: '0',
        },
        sig: '0xsig',
      },
    });

    mockGetTickSize.mockResolvedValue({
      minimum_tick_size: '0.01',
    });
    mockCalculateMarketPrice.mockResolvedValue(0.5);
    mockPriceValid.mockReturnValue(true);

    // Mock market data with valid JSON strings for fields that get parsed
    mockGetMarketFromPolymarketApi.mockResolvedValue([
      {
        id: 'outcome-456',
        conditionId: 'outcome-456',
        negRisk: false,
        clobTokenIds: '["token1", "token2"]', // Valid JSON string
        outcomes: '["YES", "NO"]', // Valid JSON string
        outcomePrices: '["0.5", "0.5"]', // Valid JSON string
      },
    ]);

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
    mockEncodeErc1155Approve.mockReturnValue('0xencodederc1155');

    mockGetContractConfig.mockReturnValue({
      exchange: '0x1234567890123456789012345678901234567890',
      negRiskExchange: '0x0987654321098765432109876543210987654321',
      collateral: '0xCollateralAddress',
      conditionalTokens: '0xConditionalTokensAddress',
      negRiskAdapter: '0xNegRiskAdapterAddress',
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

    // Apply any overrides to mocks if needed

    return {
      provider: createProvider(),
      mockAddress,
      mockSigner,
      mockMarket,
      mockPosition,
    };
  }

  describe('prepareOrder', () => {
    it('successfully prepares a buy order and returns correct result', async () => {
      const { provider, mockSigner, mockMarket } = setupOrderTest();
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
      const { provider, mockSigner, mockMarket } = setupOrderTest();
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
      const { provider, mockSigner, mockMarket } = setupOrderTest();

      mockPriceValid.mockReturnValue(false);
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
      const { provider, mockSigner, mockPosition } = setupOrderTest();
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
      const { provider, mockSigner, mockPosition } = setupOrderTest();
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

  describe('prepareBuyOrder with Safe fee authorization', () => {
    it('computes Safe address before creating order', async () => {
      const { provider, mockSigner, mockMarket } = setupOrderTest();
      const orderParams: BuyOrderParams = {
        signer: mockSigner,
        market: mockMarket,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        size: 1,
      };

      await provider.prepareBuyOrder(orderParams);

      expect(mockComputeSafeAddress).toHaveBeenCalledWith(mockSigner);
    });

    it('calculates 4% fee from maker amount', async () => {
      const { provider, mockSigner, mockMarket } = setupOrderTest();
      const orderParams: BuyOrderParams = {
        signer: mockSigner,
        market: mockMarket,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        size: 1,
      };

      await provider.prepareBuyOrder(orderParams);

      const expectedFeeAmount = (BigInt(1000000) * BigInt(4)) / BigInt(100);
      expect(mockCreateSafeFeeAuthorization).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: expectedFeeAmount,
        }),
      );
    });

    it('creates fee authorization with correct parameters', async () => {
      const { provider, mockSigner, mockMarket } = setupOrderTest();
      const orderParams: BuyOrderParams = {
        signer: mockSigner,
        market: mockMarket,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        size: 1,
      };

      await provider.prepareBuyOrder(orderParams);

      expect(mockCreateSafeFeeAuthorization).toHaveBeenCalledWith({
        safeAddress: '0x9999999999999999999999999999999999999999',
        signer: mockSigner,
        amount: expect.any(BigInt),
        to: '0xe6a2026d58eaff3c7ad7ba9386fb143388002382',
      });
    });

    it('includes feeAuthorization in offchainTradeParams', async () => {
      const { provider, mockSigner, mockMarket } = setupOrderTest();
      const orderParams: BuyOrderParams = {
        signer: mockSigner,
        market: mockMarket,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        size: 1,
      };

      const result = await provider.prepareBuyOrder(orderParams);

      expect(result.offchainTradeParams).toBeDefined();
      expect(result.offchainTradeParams).toHaveProperty('feeAuthorization');
      expect(result.offchainTradeParams?.feeAuthorization).toEqual({
        type: 'safe-transaction',
        authorization: {
          tx: {
            to: '0xCollateralAddress',
            operation: 0,
            data: '0xdata',
            value: '0',
          },
          sig: '0xsig',
        },
      });
    });

    it('uses FEE_COLLECTOR_ADDRESS as recipient', async () => {
      const { provider, mockSigner, mockMarket } = setupOrderTest();
      const orderParams: BuyOrderParams = {
        signer: mockSigner,
        market: mockMarket,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        size: 1,
      };

      await provider.prepareBuyOrder(orderParams);

      expect(mockCreateSafeFeeAuthorization).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '0xe6a2026d58eaff3c7ad7ba9386fb143388002382',
        }),
      );
    });
  });

  describe('submitOffchainTrade with fee authorization', () => {
    it('passes feeAuthorization to submitClobOrder when provided', async () => {
      const provider = createProvider();
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

      const feeAuth = {
        type: 'safe-transaction' as const,
        authorization: {
          tx: {
            to: '0xCollateralAddress',
            operation: 0,
            data: '0xdata',
            value: '0',
          },
          sig: '0xsig',
        },
      };

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
        feeAuthorization: feeAuth,
      };

      await provider.submitOffchainTrade(offchainTradeParams);

      expect(mockSubmitClobOrder).toHaveBeenCalledWith({
        headers: offchainTradeParams.headers,
        clobOrder: offchainTradeParams.clobOrder,
        feeAuthorization: feeAuth,
      });
    });

    it('handles undefined feeAuthorization', async () => {
      const provider = createProvider();
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

      await provider.submitOffchainTrade(offchainTradeParams);

      expect(mockSubmitClobOrder).toHaveBeenCalledWith({
        headers: offchainTradeParams.headers,
        clobOrder: offchainTradeParams.clobOrder,
        feeAuthorization: undefined,
      });
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
    function setupSubmitOffchainTradeTest() {
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
      return { provider: createProvider() };
    }

    it('successfully submits offchain trade', async () => {
      const { provider } = setupSubmitOffchainTradeTest();
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
        feeAuthorization: undefined,
      });
    });

    it('handles submission failure', async () => {
      const { provider } = setupSubmitOffchainTradeTest();

      mockSubmitClobOrder.mockResolvedValue({
        success: false,
        errorMsg: 'Submission failed',
      });
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

  describe('prepareClaim', () => {
    function setupPrepareClaimTest() {
      jest.clearAllMocks();
      mockGetContractConfig.mockReturnValue({
        exchange: '0x1234567890123456789012345678901234567890',
        negRiskExchange: '0x0987654321098765432109876543210987654321',
        collateral: '0xCollateralAddress',
        conditionalTokens: '0xConditionalTokensAddress',
        negRiskAdapter: '0xNegRiskAdapterAddress',
      });
      mockEncodeClaim.mockReturnValue('0xencodedclaim');
      return { provider: createProvider() };
    }

    it('successfully prepares a claim for regular position', () => {
      const { provider } = setupPrepareClaimTest();
      const position = {
        id: 'position-1',
        providerId: 'polymarket',
        marketId: 'market-1',
        outcomeId: 'outcome-456',
        outcomeIndex: 0,
        outcome: 'Yes',
        outcomeTokenId: '0',
        title: 'Test Market Position',
        icon: 'test-icon.png',
        amount: 1.5,
        price: 0.5,
        size: 1.5,
        negRisk: false,
        redeemable: true,
        status: PredictPositionStatus.OPEN,
        realizedPnl: 0,
        curPrice: 0.5,
        conditionId: 'outcome-456',
        percentPnl: 0,
        cashPnl: 0,
        initialValue: 0.5,
        avgPrice: 0.5,
        currentValue: 0.5,
        endDate: '2025-01-01T00:00:00Z',
        claimable: false,
      };

      const result = provider.prepareClaim({ position });

      expect(result).toMatchObject({
        positionId: 'position-1',
        chainId: 137, // POLYGON_MAINNET_CHAIN_ID
        status: 'idle',
        txParams: {
          data: '0xencodedclaim',
          to: '0xConditionalTokensAddress',
          value: '0x0',
        },
      });

      expect(mockEncodeClaim).toHaveBeenCalledWith('outcome-456', false, [
        BigInt('1500000'),
        0n,
      ]);
    });

    it('successfully prepares a claim for negRisk position', () => {
      const { provider } = setupPrepareClaimTest();
      const position = {
        id: 'position-2',
        providerId: 'polymarket',
        marketId: 'market-2',
        outcomeId: 'outcome-789',
        outcomeIndex: 1,
        outcome: 'No',
        outcomeTokenId: '1',
        title: 'Test NegRisk Position',
        icon: 'test-icon.png',
        amount: 2.0,
        price: 0.3,
        size: 2.0,
        negRisk: true,
        redeemable: true,
        status: PredictPositionStatus.OPEN,
        realizedPnl: 0,
        curPrice: 0.3,
        conditionId: 'outcome-789',
        percentPnl: 0,
        cashPnl: 0,
        initialValue: 0.3,
        avgPrice: 0.3,
        currentValue: 0.3,
        endDate: '2025-01-01T00:00:00Z',
        claimable: false,
      };

      const result = provider.prepareClaim({ position });

      expect(result).toMatchObject({
        positionId: 'position-2',
        chainId: 137,
        status: 'idle',
        txParams: {
          data: '0xencodedclaim',
          to: '0xNegRiskAdapterAddress',
          value: '0x0',
        },
      });

      expect(mockEncodeClaim).toHaveBeenCalledWith('outcome-789', true, [
        0n,
        BigInt('2000000'),
      ]);
    });

    it('calls encodeClaim with correct amounts array based on outcomeIndex', () => {
      const { provider } = setupPrepareClaimTest();
      const position = {
        id: 'position-3',
        providerId: 'polymarket',
        marketId: 'market-3',
        outcomeId: 'outcome-123',
        outcomeIndex: 1,
        outcome: 'No',
        outcomeTokenId: '1',
        title: 'Test Position Index 1',
        icon: 'test-icon.png',
        amount: 0.75,
        price: 0.4,
        size: 0.75,
        negRisk: false,
        redeemable: true,
        status: PredictPositionStatus.OPEN,
        realizedPnl: 0,
        curPrice: 0.4,
        conditionId: 'outcome-123',
        percentPnl: 0,
        cashPnl: 0,
        initialValue: 0.4,
        avgPrice: 0.4,
        currentValue: 0.4,
        endDate: '2025-01-01T00:00:00Z',
        claimable: false,
      };

      provider.prepareClaim({ position });

      expect(mockEncodeClaim).toHaveBeenCalledWith('outcome-123', false, [
        0n,
        BigInt('750000'),
      ]);
    });
  });

  describe('isEligible', () => {
    const originalFetch = globalThis.fetch;

    function setupIsEligibleTest() {
      jest.clearAllMocks();
      return { provider: createProvider() };
    }

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('returns true when user is not geoblocked', async () => {
      const { provider } = setupIsEligibleTest();
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ blocked: false }),
      };
      globalThis.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await provider.isEligible();

      expect(result).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://polymarket.com/api/geoblock',
      );
    });

    it('returns false when user is geoblocked', async () => {
      const { provider } = setupIsEligibleTest();
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ blocked: true }),
      };
      globalThis.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await provider.isEligible();

      expect(result).toBe(false);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://polymarket.com/api/geoblock',
      );
    });

    it('returns false when API response does not contain blocked field', async () => {
      const { provider } = setupIsEligibleTest();
      const mockResponse = {
        json: jest.fn().mockResolvedValue({}),
      };
      globalThis.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await provider.isEligible();

      expect(result).toBe(false);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://polymarket.com/api/geoblock',
      );
    });

    it('returns false when API response blocked field is undefined', async () => {
      const { provider } = setupIsEligibleTest();
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ blocked: undefined }),
      };
      globalThis.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await provider.isEligible();

      expect(result).toBe(false);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://polymarket.com/api/geoblock',
      );
    });

    it('returns false when fetch request fails', async () => {
      const { provider } = setupIsEligibleTest();
      globalThis.fetch = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      const result = await provider.isEligible();

      expect(result).toBe(false);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://polymarket.com/api/geoblock',
      );
    });

    it('returns false when JSON parsing fails', async () => {
      const provider = createProvider();
      const mockResponse = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      globalThis.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await provider.isEligible();

      expect(result).toBe(false);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://polymarket.com/api/geoblock',
      );
    });

    it('handles non-Error exceptions gracefully', async () => {
      const provider = createProvider();
      globalThis.fetch = jest.fn().mockRejectedValue('String error');

      const result = await provider.isEligible();

      expect(result).toBe(false);
    });

    it('returns false for malformed API response', async () => {
      const provider = createProvider();
      const mockResponse = {
        json: jest.fn().mockResolvedValue('invalid response'),
      };
      globalThis.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await provider.isEligible();

      expect(result).toBe(false);
    });
  });

  describe('getMarketDetails', () => {
    const mockEvent = {
      id: 'market-1',
      question: 'Will it rain tomorrow?',
      markets: [
        { outcome: 'YES', price: 0.6 },
        { outcome: 'NO', price: 0.4 },
      ],
    };

    const mockParsedMarket = {
      id: 'market-1',
      question: 'Will it rain tomorrow?',
      outcomes: ['YES', 'NO'],
      status: 'open',
      providerId: 'polymarket',
    };

    it('get market details successfully', async () => {
      const provider = createProvider();
      mockGetMarketDetailsFromGammaApi.mockResolvedValue(mockEvent);
      mockParsePolymarketEvents.mockReturnValue([mockParsedMarket]);

      const result = await provider.getMarketDetails({ marketId: 'market-1' });

      expect(result).toEqual(mockParsedMarket);
      expect(mockGetMarketDetailsFromGammaApi).toHaveBeenCalledWith({
        marketId: 'market-1',
      });
      expect(mockParsePolymarketEvents).toHaveBeenCalledWith(
        [mockEvent],
        'trending',
      );
    });

    it('throw error when marketId is missing', async () => {
      const provider = createProvider();

      await expect(provider.getMarketDetails({ marketId: '' })).rejects.toThrow(
        'marketId is required',
      );

      await expect(
        provider.getMarketDetails({ marketId: null as unknown as string }),
      ).rejects.toThrow('marketId is required');
    });

    it('throw error when getMarketDetailsFromGammaApi fails', async () => {
      const provider = createProvider();
      const errorMessage = 'API request failed';
      mockGetMarketDetailsFromGammaApi.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        provider.getMarketDetails({ marketId: 'market-1' }),
      ).rejects.toThrow(errorMessage);
    });

    it('throw error when parsePolymarketEvents returns empty array', async () => {
      const provider = createProvider();
      mockGetMarketDetailsFromGammaApi.mockResolvedValue(mockEvent);
      mockParsePolymarketEvents.mockReturnValue([]);

      await expect(
        provider.getMarketDetails({ marketId: 'market-1' }),
      ).rejects.toThrow('Failed to parse market details');
    });

    it('throw error when parsed market is undefined', async () => {
      const provider = createProvider();
      mockGetMarketDetailsFromGammaApi.mockResolvedValue(mockEvent);
      mockParsePolymarketEvents.mockReturnValue([undefined]);

      await expect(
        provider.getMarketDetails({ marketId: 'market-1' }),
      ).rejects.toThrow('Failed to parse market details');
    });
  });

  describe('getUnrealizedPnL', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = jest.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      jest.restoreAllMocks();
    });

    it('successfully fetches unrealized P&L data', async () => {
      const provider = createProvider();
      const mockUnrealizedPnL = [
        {
          user: '0x1234567890123456789012345678901234567890',
          cashUpnl: -7.337110036077004,
          percentUpnl: -31.32290842628039,
        },
      ];

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUnrealizedPnL),
      });

      const result = await provider.getUnrealizedPnL({
        address: '0x1234567890123456789012345678901234567890',
      });

      expect(result).toEqual(mockUnrealizedPnL[0]);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://data-api.polymarket.com/upnl?user=0x1234567890123456789012345678901234567890',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('throws error when API response is not ok', async () => {
      const provider = createProvider();

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(
        provider.getUnrealizedPnL({
          address: '0x1234567890123456789012345678901234567890',
        }),
      ).rejects.toThrow('Failed to fetch unrealized P&L');
    });

    it('throws error when API returns empty array', async () => {
      const provider = createProvider();

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      });

      await expect(
        provider.getUnrealizedPnL({
          address: '0x1234567890123456789012345678901234567890',
        }),
      ).rejects.toThrow('No unrealized P&L data found');
    });

    it('throws error when API returns non-array response', async () => {
      const provider = createProvider();

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      await expect(
        provider.getUnrealizedPnL({
          address: '0x1234567890123456789012345678901234567890',
        }),
      ).rejects.toThrow('No unrealized P&L data found');
    });

    it('handles network errors', async () => {
      const provider = createProvider();

      (globalThis.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      await expect(
        provider.getUnrealizedPnL({
          address: '0x1234567890123456789012345678901234567890',
        }),
      ).rejects.toThrow('Network error');
    });

    it('handles JSON parsing errors', async () => {
      const provider = createProvider();

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      await expect(
        provider.getUnrealizedPnL({
          address: '0x1234567890123456789012345678901234567890',
        }),
      ).rejects.toThrow('Invalid JSON');
    });

    it('uses default address when not provided', async () => {
      const provider = createProvider();
      const mockUnrealizedPnL = [
        {
          user: '0x0000000000000000000000000000000000000000',
          cashUpnl: 0,
          percentUpnl: 0,
        },
      ];

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUnrealizedPnL),
      });

      await provider.getUnrealizedPnL({
        address: '0x0000000000000000000000000000000000000000',
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://data-api.polymarket.com/upnl?user=0x0000000000000000000000000000000000000000',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    });
  });

  describe('getPriceHistory', () => {
    const mockHistoryData = {
      history: [
        { t: 1234567890, p: 0.45 },
        { t: 1234567900, p: 0.47 },
        { t: 1234567910, p: 0.49 },
      ],
    };

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('get price history successfully', async () => {
      const provider = createProvider();
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockHistoryData),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await provider.getPriceHistory({ marketId: 'market-1' });

      expect(result).toEqual([
        { timestamp: 1234567890, price: 0.45 },
        { timestamp: 1234567900, price: 0.47 },
        { timestamp: 1234567910, price: 0.49 },
      ]);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/prices-history?market=market-1',
        { method: 'GET' },
      );
    });

    it('include fidelity parameter in request', async () => {
      const provider = createProvider();
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockHistoryData),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await provider.getPriceHistory({
        marketId: 'market-1',
        fidelity: 100,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/prices-history?market=market-1&fidelity=100',
        { method: 'GET' },
      );
    });

    it('include interval parameter in request', async () => {
      const provider = createProvider();
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockHistoryData),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await provider.getPriceHistory({
        marketId: 'market-1',
        interval: PredictPriceHistoryInterval.ONE_HOUR,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/prices-history?market=market-1&interval=1h',
        { method: 'GET' },
      );
    });

    it('include both fidelity and interval parameters', async () => {
      const provider = createProvider();
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockHistoryData),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await provider.getPriceHistory({
        marketId: 'market-1',
        fidelity: 50,
        interval: PredictPriceHistoryInterval.ONE_DAY,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/prices-history?market=market-1&fidelity=50&interval=1d',
        { method: 'GET' },
      );
    });

    it('throw error when marketId is missing', async () => {
      const provider = createProvider();

      await expect(provider.getPriceHistory({ marketId: '' })).rejects.toThrow(
        'marketId parameter is required',
      );

      await expect(
        provider.getPriceHistory({ marketId: null as unknown as string }),
      ).rejects.toThrow('marketId parameter is required');
    });

    it('return empty array when response is not ok', async () => {
      const provider = createProvider();
      const mockResponse = {
        ok: false,
        status: 404,
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await provider.getPriceHistory({ marketId: 'market-1' });

      expect(result).toEqual([]);
    });

    it('return empty array when fetch throws error', async () => {
      const provider = createProvider();
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await provider.getPriceHistory({ marketId: 'market-1' });

      expect(result).toEqual([]);
    });

    it('return empty array when response has no history array', async () => {
      const provider = createProvider();
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await provider.getPriceHistory({ marketId: 'market-1' });

      expect(result).toEqual([]);
    });

    it('return empty array when history is not an array', async () => {
      const provider = createProvider();
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ history: 'not-an-array' }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await provider.getPriceHistory({ marketId: 'market-1' });

      expect(result).toEqual([]);
    });

    it('filter out entries with missing timestamp', async () => {
      const provider = createProvider();
      const mockData = {
        history: [
          { t: 1234567890, p: 0.45 },
          { p: 0.47 }, // Missing timestamp
          { t: 1234567910, p: 0.49 },
        ],
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await provider.getPriceHistory({ marketId: 'market-1' });

      expect(result).toEqual([
        { timestamp: 1234567890, price: 0.45 },
        { timestamp: 1234567910, price: 0.49 },
      ]);
    });

    it('filter out entries with missing price', async () => {
      const provider = createProvider();
      const mockData = {
        history: [
          { t: 1234567890, p: 0.45 },
          { t: 1234567900 }, // Missing price
          { t: 1234567910, p: 0.49 },
        ],
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await provider.getPriceHistory({ marketId: 'market-1' });

      expect(result).toEqual([
        { timestamp: 1234567890, price: 0.45 },
        { timestamp: 1234567910, price: 0.49 },
      ]);
    });

    it('filter out entries with non-numeric timestamp or price', async () => {
      const provider = createProvider();
      const mockData = {
        history: [
          { t: 1234567890, p: 0.45 },
          { t: 'invalid', p: 0.47 },
          { t: 1234567900, p: 'invalid' },
          { t: null, p: 0.48 },
          { t: 1234567910, p: null },
          { t: 1234567920, p: 0.49 },
        ],
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await provider.getPriceHistory({ marketId: 'market-1' });

      expect(result).toEqual([
        { timestamp: 1234567890, price: 0.45 },
        { timestamp: 1234567920, price: 0.49 },
      ]);
    });

    it('return empty array when history has no valid entries', async () => {
      const provider = createProvider();
      const mockData = {
        history: [{ t: 'invalid', p: 'invalid' }, { t: null, p: null }, {}],
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await provider.getPriceHistory({ marketId: 'market-1' });

      expect(result).toEqual([]);
    });

    it('handle JSON parsing error', async () => {
      const provider = createProvider();
      const mockResponse = {
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await provider.getPriceHistory({ marketId: 'market-1' });

      expect(result).toEqual([]);
    });

    it('handle empty history array', async () => {
      const provider = createProvider();
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ history: [] }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await provider.getPriceHistory({ marketId: 'market-1' });

      expect(result).toEqual([]);
    });
  });
});
