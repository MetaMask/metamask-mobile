import Engine from '../../../../../core/Engine';
import {
  PredictPositionStatus,
  PredictPriceHistoryInterval,
  Side,
} from '../../types';
import { PolymarketProvider } from './PolymarketProvider';
import {
  createApiKey,
  encodeClaim,
  getContractConfig,
  getL2Headers,
  getMarketDetailsFromGammaApi,
  getOrderBook,
  getOrderTypedData,
  getParsedMarketsFromPolymarketApi,
  getPolymarketEndpoints,
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
      DATA_API_ENDPOINT: 'https://data.polymarket.com',
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
    getOrderBook: jest.fn(),
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
const mockGetMarketDetailsFromGammaApi =
  getMarketDetailsFromGammaApi as jest.Mock;
const mockGetContractConfig = getContractConfig as jest.Mock;
const mockGetL2Headers = getL2Headers as jest.Mock;
const mockGetOrderBook = getOrderBook as jest.Mock;
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

  it('getMarkets returns empty array when API fails', async () => {
    // Arrange
    const provider = createProvider();
    const apiError = new Error('API request failed');
    mockGetMarketsFromPolymarketApi.mockRejectedValue(apiError);

    // Act
    const result = await provider.getMarkets();

    // Assert
    expect(result).toEqual([]);
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

  it('getPositions filters out claimable positions when claimable parameter is false', async () => {
    // Arrange
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;

    const mockApiResponse = [
      {
        id: 'pos-1',
        market: 'c-1',
        outcome: 0,
        size: 1,
        price: 0.5,
        outcomeIndex: 0,
        cashPnl: 0,
        curPrice: 0.5,
        currentValue: 0.5,
        percentPnl: 0,
        initialValue: 0.5,
        avgPrice: 0.5,
        redeemable: true, // This should be filtered out
        negativeRisk: false,
        endDate: '2025-01-01T00:00:00Z',
        asset: 'asset-1',
        conditionId: 'c-1',
        icon: 'https://example.com/icon.png',
        title: 'Some Market',
        slug: 'some-market',
      },
      {
        id: 'pos-2',
        market: 'c-2',
        outcome: 0,
        size: 2,
        price: 0.6,
        outcomeIndex: 0,
        cashPnl: 0,
        curPrice: 0.6,
        currentValue: 1.2,
        percentPnl: 0,
        initialValue: 1.0,
        avgPrice: 0.5,
        redeemable: false, // This should be kept
        negativeRisk: false,
        endDate: '2025-01-01T00:00:00Z',
        asset: 'asset-2',
        conditionId: 'c-2',
        icon: 'https://example.com/icon2.png',
        title: 'Another Market',
        slug: 'another-market',
      },
    ];

    // Mock the parsed result with only non-claimable positions (API should filter when claimable=false)
    const mockParsedPositions = [
      {
        id: 'pos-2',
        providerId: 'polymarket',
        marketId: 'c-2',
        outcomeTokenId: 0,
        title: 'Another Market',
        icon: 'https://example.com/icon2.png',
        size: 2,
        outcome: 'Yes',
        cashPnl: 0,
        curPrice: 0.6,
        currentValue: 1.2,
        percentPnl: 0,
        initialValue: 1.0,
        avgPrice: 0.5,
        claimable: false, // This should be kept
        negativeRisk: false,
        endDate: '2025-01-01T00:00:00Z',
        asset: 'asset-2',
        outcomeIndex: 0,
        outcomeId: 'c-2',
        status: PredictPositionStatus.OPEN,
        realizedPnl: 0,
        amount: 2,
        price: 0.6,
      },
    ];

    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

    mockParsePolymarketPositions.mockResolvedValue(mockParsedPositions);

    // Act
    const result = await provider.getPositions({
      address: '0x123',
      claimable: false, // This should filter out claimable positions
    });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pos-2'); // Only the non-claimable position should remain
    expect(result[0].claimable).toBe(false);

    // Restore fetch
    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  // Helper function to setup place order test environment
  function setupPlaceOrderTest() {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockSigner = {
      address: mockAddress,
      signTypedMessage: mockSignTypedMessage,
      signPersonalMessage: mockSignPersonalMessage,
    };

    const provider = createProvider();

    // Mock the private buildOrderArtifacts method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockBuildOrderArtifacts = jest.spyOn(
      provider,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'buildOrderArtifacts' as any,
    );
    mockBuildOrderArtifacts.mockResolvedValue({
      chainId: 137,
      price: 0.5,
      negRisk: false,
      tickSize: '0.01',
      order: {
        makerAmount: '1000000',
        signature: '',
        salt: '12345',
        maker: mockAddress,
        taker: '0x0000000000000000000000000000000000000000',
        price: '500000000000000000',
        size: '1000000',
        side: 0,
        orderType: 'FOK',
      },
      contractConfig: {
        exchange: '0x1234567890123456789012345678901234567890',
        negRiskExchange: '0x0987654321098765432109876543210987654321',
        collateral: '0xCollateralAddress',
        conditionalTokens: '0xConditionalTokensAddress',
        negRiskAdapter: '0xNegRiskAdapterAddress',
      },
      exchangeContract: '0x1234567890123456789012345678901234567890',
      verifyingContract: '0x1234567890123456789012345678901234567890',
    });

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

    mockPriceValid.mockReturnValue(true);

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

    mockSubmitClobOrder.mockResolvedValue({
      success: true,
      response: {
        makingAmount: '1000000',
        orderID: 'order-123',
        status: 'success',
        takingAmount: '0',
        transactionsHashes: [],
      },
      error: undefined,
    });

    return {
      provider,
      mockAddress,
      mockSigner,
      mockBuildOrderArtifacts,
    };
  }

  describe('placeOrder', () => {
    it('successfully places a buy order and returns correct result', async () => {
      // Arrange
      const { provider, mockSigner, mockBuildOrderArtifacts } =
        setupPlaceOrderTest();
      const orderParams = {
        signer: mockSigner,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        side: Side.BUY,
        size: 1,
        providerId: 'polymarket',
      };

      // Act
      const result = await provider.placeOrder(orderParams);

      // Assert
      expect(result).toMatchObject({
        success: true,
        response: expect.any(Object),
        error: undefined,
      });
      expect(mockBuildOrderArtifacts).toHaveBeenCalledWith({
        address: mockSigner.address,
        orderParams: {
          outcomeId: 'outcome-456',
          outcomeTokenId: '0',
          side: Side.BUY,
          size: 1,
        },
      });
      expect(mockPriceValid).toHaveBeenCalledWith(0.5, '0.01');
    });

    it('successfully places a sell order and returns correct result', async () => {
      // Arrange
      const { provider, mockSigner, mockBuildOrderArtifacts } =
        setupPlaceOrderTest();
      const orderParams = {
        signer: mockSigner,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        side: Side.SELL,
        size: 1,
        providerId: 'polymarket',
      };

      // Act
      const result = await provider.placeOrder(orderParams);

      // Assert
      expect(result).toMatchObject({
        success: true,
        response: expect.any(Object),
        error: undefined,
      });
      expect(mockBuildOrderArtifacts).toHaveBeenCalledWith({
        address: mockSigner.address,
        orderParams: {
          outcomeId: 'outcome-456',
          outcomeTokenId: '0',
          side: Side.SELL,
          size: 1,
        },
      });
    });

    it('throws error when price is invalid', async () => {
      // Arrange
      const { provider, mockSigner } = setupPlaceOrderTest();
      mockPriceValid.mockReturnValue(false);
      const orderParams = {
        signer: mockSigner,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        side: Side.BUY,
        size: 1,
        providerId: 'polymarket',
      };

      // Act & Assert
      await expect(provider.placeOrder(orderParams)).rejects.toThrow(
        'invalid price (0.5), min: 0.01 - max: 0.99',
      );
    });

    it('handles order submission failure', async () => {
      // Arrange
      const { provider, mockSigner } = setupPlaceOrderTest();
      mockSubmitClobOrder.mockResolvedValue({
        success: false,
        response: undefined,
        error: 'Submission failed',
      });
      const orderParams = {
        signer: mockSigner,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        side: Side.BUY,
        size: 1,
        providerId: 'polymarket',
      };

      // Act
      const result = await provider.placeOrder(orderParams);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Submission failed');
    });

    it('calls all required utility functions with correct parameters', async () => {
      // Arrange
      const { provider, mockSigner, mockBuildOrderArtifacts } =
        setupPlaceOrderTest();
      const orderParams = {
        signer: mockSigner,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        side: Side.BUY,
        size: 2,
        providerId: 'polymarket',
      };

      // Act
      await provider.placeOrder(orderParams);

      // Assert
      expect(mockBuildOrderArtifacts).toHaveBeenCalledWith({
        address: mockSigner.address,
        orderParams: {
          outcomeId: 'outcome-456',
          outcomeTokenId: '0',
          side: Side.BUY,
          size: 2,
        },
      });
      expect(mockPriceValid).toHaveBeenCalledWith(0.5, '0.01');
      expect(mockSignTypedMessage).toHaveBeenCalled();
      expect(mockSubmitClobOrder).toHaveBeenCalled();
    });
  });

  describe('API key caching', () => {
    function setupApiKeyCachingTest() {
      jest.clearAllMocks();

      const mockAddress1 = '0x1111111111111111111111111111111111111111';
      const mockAddress2 = '0x2222222222222222222222222222222222222222';

      const mockSigner1 = {
        address: mockAddress1,
        signTypedMessage: mockSignTypedMessage,
      };
      const mockSigner2 = {
        address: mockAddress2,
        signTypedMessage: mockSignTypedMessage,
      };

      const provider = createProvider();

      // Mock the private buildOrderArtifacts method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockBuildOrderArtifacts = jest.spyOn(
        provider,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'buildOrderArtifacts' as any,
      );
      mockBuildOrderArtifacts.mockResolvedValue({
        chainId: 137,
        price: 0.5,
        negRisk: false,
        tickSize: '0.01',
        order: {
          makerAmount: '1000000',
          signature: '',
          salt: '12345',
          maker: mockAddress1,
          taker: '0x0000000000000000000000000000000000000000',
          price: '500000000000000000',
          size: '1000000',
          side: 0,
          orderType: 'FOK',
        },
        contractConfig: {
          exchange: '0x1234567890123456789012345678901234567890',
          negRiskExchange: '0x0987654321098765432109876543210987654321',
          collateral: '0xCollateralAddress',
          conditionalTokens: '0xConditionalTokensAddress',
          negRiskAdapter: '0xNegRiskAdapterAddress',
        },
        exchangeContract: '0x1234567890123456789012345678901234567890',
        verifyingContract: '0x1234567890123456789012345678901234567890',
      });

      // Setup minimal mocks needed for placeOrder
      mockSignTypedMessage.mockResolvedValue('0xsignature');
      mockPriceValid.mockReturnValue(true);
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
      mockSubmitClobOrder.mockResolvedValue({
        success: true,
        response: { orderId: 'test-order' },
        error: undefined,
      });

      return {
        provider,
        mockSigner1,
        mockSigner2,
        mockAddress1,
        mockAddress2,
      };
    }

    it('caches API keys by address and reuses them', async () => {
      // Arrange
      const { provider, mockSigner1 } = setupApiKeyCachingTest();
      const orderParams = {
        signer: mockSigner1,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        side: Side.BUY,
        size: 1,
        providerId: 'polymarket',
      };

      // Act - First call
      await provider.placeOrder(orderParams);

      // Act - Second call with same address
      await provider.placeOrder(orderParams);

      // Assert - createApiKey should only be called once due to caching
      expect(mockCreateApiKey).toHaveBeenCalledTimes(1);
      expect(mockCreateApiKey).toHaveBeenCalledWith({
        address: mockSigner1.address,
      });
    });

    it('creates separate API keys for different addresses', async () => {
      // Arrange
      const { provider, mockSigner1, mockSigner2 } = setupApiKeyCachingTest();

      const orderParams1 = {
        signer: mockSigner1,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        side: Side.BUY,
        size: 1,
        providerId: 'polymarket',
      };

      const orderParams2 = {
        signer: mockSigner2,
        outcomeId: 'outcome-456',
        outcomeTokenId: '0',
        side: Side.SELL,
        size: 1,
        providerId: 'polymarket',
      };

      // Act
      await provider.placeOrder(orderParams1);
      await provider.placeOrder(orderParams2);

      // Assert - createApiKey should be called twice for different addresses
      expect(mockCreateApiKey).toHaveBeenCalledTimes(2);
      expect(mockCreateApiKey).toHaveBeenCalledWith({
        address: mockSigner1.address,
      });
      expect(mockCreateApiKey).toHaveBeenCalledWith({
        address: mockSigner2.address,
      });
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

  describe('calculateBetAmounts', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calculates expected share quantity for BUY side', async () => {
      // Arrange
      const provider = createProvider();
      const mockOrderBook = {
        asks: [
          { price: '0.6', size: '100' }, // 100 shares at $0.60 = $60
          { price: '0.55', size: '200' }, // 200 shares at $0.55 = $110
          { price: '0.5', size: '300' }, // 300 shares at $0.50 = $150
        ],
        bids: [],
      };
      mockGetOrderBook.mockResolvedValue(mockOrderBook);

      // Act - Buy $150 worth of shares
      const result = await provider.calculateBetAmounts({
        providerId: 'polymarket',
        outcomeTokenId: 'token-123',
        userBetAmount: 150, // USD amount to spend
      });

      // Assert - Should fill from best prices first (lowest prices)
      // i=2: price 0.5, value = 300 * 0.5 = 150, exactly matches amount, so quantity = 300, sum = 150
      // i=1: price 0.55, remaining = 0, so partial = 0, returns with sharePrice = 0.55
      expect(result.toWin).toBe(300);
      expect(result.sharePrice).toBe(0.55);
    });

    it('calculates expected share quantity for larger BUY amount', async () => {
      // Arrange
      const provider = createProvider();
      const mockOrderBook = {
        asks: [
          { price: '0.4', size: '100' }, // 100 shares at $0.40 = $40
          { price: '0.45', size: '200' }, // 200 shares at $0.45 = $90
          { price: '0.5', size: '300' }, // 300 shares at $0.50 = $150
        ],
        bids: [],
      };
      mockGetOrderBook.mockResolvedValue(mockOrderBook);

      // Act - Buy $250 worth of shares
      const result = await provider.calculateBetAmounts({
        providerId: 'polymarket',
        outcomeTokenId: 'token-123',
        userBetAmount: 250, // USD amount to spend
      });

      // Assert - Should fill from best prices first (lowest prices)
      // i=2: price 0.5, value = 300 * 0.5 = 150, sum = 0 + 150 = 150 <= 250, quantity = 300, sum = 150
      // i=1: price 0.45, value = 200 * 0.45 = 90, sum + value = 150 + 90 = 240 <= 250, quantity = 300 + 200 = 500, sum = 240
      // i=0: price 0.4, value = 100 * 0.4 = 40, sum + value = 240 + 40 = 280 > 250, remaining = 250 - 240 = 10, partial = 10 / 0.4 = 25, total quantity = 500 + 25 = 525
      expect(result.toWin).toBe(525);
      expect(result.sharePrice).toBe(0.4);
    });

    it('throws error when not enough liquidity for BUY amount', async () => {
      // Arrange
      const provider = createProvider();
      const mockOrderBook = {
        asks: [
          { price: '0.6', size: '50' }, // Only 50 shares available at $0.60 = $30 total
        ],
        bids: [],
      };
      mockGetOrderBook.mockResolvedValue(mockOrderBook);

      // Act & Assert - Try to buy $100 worth but only $30 available
      await expect(
        provider.calculateBetAmounts({
          providerId: 'polymarket',
          outcomeTokenId: 'token-123',
          userBetAmount: 100, // USD amount to spend
        }),
      ).rejects.toThrow('not enough shares to match user bet amount');
    });

    it('returns result when sufficient liquidity exists for BUY', async () => {
      // Arrange
      const provider = createProvider();
      const mockOrderBook = {
        asks: [
          { price: '0.6', size: '100' }, // 100 shares at $0.60 = $60
          { price: '0.55', size: '200' }, // 200 shares at $0.55 = $110
        ],
        bids: [],
      };
      mockGetOrderBook.mockResolvedValue(mockOrderBook);

      // Act - Buy $150 worth of shares (sufficient liquidity)
      const result = await provider.calculateBetAmounts({
        providerId: 'polymarket',
        outcomeTokenId: 'token-123',
        userBetAmount: 150, // USD amount to spend
      });
      expect(mockSubmitClobOrder).toHaveBeenCalledWith({
        headers: offchainTradeParams.headers,
        clobOrder: offchainTradeParams.clobOrder,
        feeAuthorization: undefined,
      });

      // Assert - Should return result with calculated shares and price
      // i=1: price 0.55, value = 200 * 0.55 = 110, sum = 0 + 110 = 110 <= 150, quantity = 200, sum = 110
      // i=0: price 0.6, value = 100 * 0.6 = 60, sum + value = 110 + 60 = 170 > 150, remaining = 150 - 110 = 40, partial = 40 / 0.6 = 66.666..., total quantity = 200 + 66.666... = 266.666...
      expect(result.toWin).toBeCloseTo(266.66666666666663, 10);
      expect(result.sharePrice).toBe(0.6);
    });

    it('calculates partial shares when BUY amount exceeds some positions', async () => {
      // Arrange
      const provider = createProvider();
      const mockOrderBook = {
        asks: [
          { price: '0.55', size: '200' }, // 200 shares at $0.55 = $110
          { price: '0.6', size: '100' }, // 100 shares at $0.60 = $60, total $170
        ],
        bids: [],
      };
      mockGetOrderBook.mockResolvedValue(mockOrderBook);

      // Act - Buy $150 worth of shares
      const result = await provider.calculateBetAmounts({
        providerId: 'polymarket',
        outcomeTokenId: 'token-123',
        userBetAmount: 150, // USD amount to spend
      });

      // Assert - Should fill from best available prices (lowest first)
      // i=1: price 0.6, value = 100 * 0.6 = 60, sum = 0 + 60 = 60 <= 150, quantity = 100, sum = 60
      // i=0: price 0.55, value = 200 * 0.55 = 110, sum + value = 60 + 110 = 170 > 150, remaining = 150 - 60 = 90, partial = 90 / 0.55 = 163.636..., total quantity = 100 + 163.636... = 263.636...
      expect(result.toWin).toBeCloseTo(263.6363636363636, 10);
      expect(result.sharePrice).toBe(0.55);
    });

    it('throws error when BUY amount exactly matches total available liquidity', async () => {
      // Arrange
      const provider = createProvider();
      const mockOrderBook = {
        asks: [
          { price: '0.45', size: '200' }, // 200 shares at $0.45 = $90
          { price: '0.4', size: '100' }, // 100 shares at $0.4 = $40, total $130
        ],
        bids: [],
      };
      mockGetOrderBook.mockResolvedValue(mockOrderBook);

      // Act & Assert - Buy exactly $130 worth of shares (all available liquidity)
      // The algorithm exhausts all positions but doesn't return early since no position exceeded the amount
      await expect(
        provider.calculateBetAmounts({
          providerId: 'polymarket',
          outcomeTokenId: 'token-123',
          userBetAmount: 130, // USD amount to spend
        }),
      ).rejects.toThrow('not enough shares to match user bet amount');
    });

    it('throws error when order book is not available', async () => {
      // Arrange
      const provider = createProvider();
      mockGetOrderBook.mockResolvedValue(null);

      // Act & Assert
      await expect(
        provider.calculateBetAmounts({
          providerId: 'polymarket',
          outcomeTokenId: 'token-123',
          userBetAmount: 100,
        }),
      ).rejects.toThrow('no orderbook');
    });

    it('throws error when order book has no asks positions', async () => {
      // Arrange
      const provider = createProvider();
      const mockOrderBook = {
        asks: [], // No asks for BUY
        bids: [],
      };
      mockGetOrderBook.mockResolvedValue(mockOrderBook);

      // Act & Assert
      await expect(
        provider.calculateBetAmounts({
          providerId: 'polymarket',
          outcomeTokenId: 'token-123',
          userBetAmount: 100,
        }),
      ).rejects.toThrow('not enough shares to match user bet amount');
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
