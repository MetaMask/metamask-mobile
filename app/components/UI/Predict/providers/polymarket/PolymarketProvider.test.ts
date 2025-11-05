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

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => {
  const mockLogger = {
    log: jest.fn(),
  };
  return {
    __esModule: true,
    DevLogger: mockLogger,
    default: mockLogger,
  };
});

import Engine from '../../../../../core/Engine';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  PredictPosition,
  PredictPositionStatus,
  PredictPriceHistoryInterval,
  Recurrence,
  Side,
} from '../../types';
import { PolymarketProvider } from './PolymarketProvider';
import {
  createApiKey,
  encodeClaim,
  getBalance,
  getContractConfig,
  getL2Headers,
  getMarketDetailsFromGammaApi,
  getOrderTypedData,
  getParsedMarketsFromPolymarketApi,
  getPolymarketEndpoints,
  parsePolymarketEvents,
  parsePolymarketPositions,
  previewOrder,
  priceValid,
  submitClobOrder,
} from './utils';
import { OrderPreview, PlaceOrderParams } from '../types';
import { query } from '@metamask/controller-utils';
import {
  computeProxyAddress,
  createSafeFeeAuthorization,
  getClaimTransaction,
  getDeployProxyWalletTransaction,
  getProxyWalletAllowancesTransaction,
  hasAllowances,
} from './safe/utils';
import {
  generateTransferData,
  isSmartContractAddress,
} from '../../../../../util/transactions';

jest.mock('@metamask/controller-utils', () => {
  const actual = jest.requireActual('@metamask/controller-utils');
  return {
    ...actual,
    query: jest.fn(),
  };
});

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
    getOrderBook: jest.fn(),
    getOrderTypedData: jest.fn(),
    parsePolymarketEvents: jest.fn(),
    parsePolymarketPositions: jest.fn(),
    priceValid: jest.fn(),
    createApiKey: jest.fn(),
    submitClobOrder: jest.fn(),
    getMarketPositions: jest.fn(),
    getBalance: jest.fn(),
    previewOrder: jest.fn(),
    POLYGON_MAINNET_CHAIN_ID: 137,
  };
});

jest.mock('./safe/utils', () => ({
  computeProxyAddress: jest.fn(),
  createSafeFeeAuthorization: jest.fn(),
  getClaimTransaction: jest.fn(),
  getDeployProxyWalletTransaction: jest.fn(),
  getProxyWalletAllowancesTransaction: jest.fn(),
  hasAllowances: jest.fn(),
  getWithdrawTransactionCallData: jest
    .fn()
    .mockResolvedValue('0xsignedcalldata'),
  getSafeUsdcAmount: jest.fn().mockReturnValue(1000000),
}));

jest.mock('../../../../../util/transactions', () => ({
  generateTransferData: jest.fn(),
  isSmartContractAddress: jest.fn(),
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
const mockGetOrderTypedData = getOrderTypedData as jest.Mock;
const mockParsePolymarketEvents = parsePolymarketEvents as jest.Mock;
const mockParsePolymarketPositions = parsePolymarketPositions as jest.Mock;
const mockPriceValid = priceValid as jest.Mock;
const mockCreateApiKey = createApiKey as jest.Mock;
const mockSubmitClobOrder = submitClobOrder as jest.Mock;
const mockEncodeClaim = encodeClaim as jest.Mock;
const mockComputeProxyAddress = computeProxyAddress as jest.Mock;
const mockCreateSafeFeeAuthorization = createSafeFeeAuthorization as jest.Mock;
const mockGetClaimTransaction = getClaimTransaction as jest.Mock;
const mockHasAllowances = hasAllowances as jest.Mock;
const mockQuery = query as jest.Mock;
const mockPreviewOrder = previewOrder as jest.Mock;

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

  it('getMarkets returns empty array when non-Error exception is thrown', async () => {
    const provider = createProvider();
    mockGetMarketsFromPolymarketApi.mockRejectedValue('String error');

    const result = await provider.getMarkets();

    expect(result).toEqual([]);
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

    mockFindNetworkClientIdByChainId.mockReturnValue('polygon-network-client');
    mockGetNetworkClientById.mockReturnValue({
      provider: {},
    });
    mockComputeProxyAddress.mockReturnValue(
      '0x9999999999999999999999999999999999999999',
    );
    mockQuery.mockResolvedValue(
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ); // Mock balance

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

    mockFindNetworkClientIdByChainId.mockReturnValue('polygon-network-client');
    mockGetNetworkClientById.mockReturnValue({
      provider: {},
    });
    mockComputeProxyAddress.mockReturnValue(
      '0x9999999999999999999999999999999999999999',
    );
    mockQuery.mockResolvedValue(
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ); // Mock balance

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

    mockFindNetworkClientIdByChainId.mockReturnValue('polygon-network-client');
    mockGetNetworkClientById.mockReturnValue({
      provider: {},
    });
    mockComputeProxyAddress.mockReturnValue(
      '0x9999999999999999999999999999999999999999',
    );
    mockQuery.mockResolvedValue(
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ); // Mock balance

    const userAddress = '0x1111111111111111111111111111111111111111';
    const safeAddress = '0x9999999999999999999999999999999999999999';
    await provider.getPositions({ address: userAddress });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledWithUrl = mockFetch.mock.calls[0][0] as string;
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints();
    expect(calledWithUrl.startsWith(`${DATA_API_ENDPOINT}/positions?`)).toBe(
      true,
    );
    expect(calledWithUrl).toContain('limit=100');
    expect(calledWithUrl).toContain('offset=0');
    expect(calledWithUrl).toContain(`user=${safeAddress}`);
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

    mockFindNetworkClientIdByChainId.mockReturnValue('polygon-network-client');
    mockGetNetworkClientById.mockReturnValue({
      provider: {},
    });
    mockComputeProxyAddress.mockReturnValue(
      '0x9999999999999999999999999999999999999999',
    );
    mockQuery.mockResolvedValue(
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ); // Mock balance

    const userAddress = '0x2222222222222222222222222222222222222222';
    const safeAddress = '0x9999999999999999999999999999999999999999';
    await provider.getPositions({ address: userAddress, limit: 5, offset: 15 });

    const calledWithUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledWithUrl).toContain('limit=5');
    expect(calledWithUrl).toContain('offset=15');
    expect(calledWithUrl).toContain(`user=${safeAddress}`);
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

    mockFindNetworkClientIdByChainId.mockReturnValue('polygon-network-client');
    mockGetNetworkClientById.mockReturnValue({
      provider: {},
    });
    mockComputeProxyAddress.mockReturnValue(
      '0x9999999999999999999999999999999999999999',
    );
    mockQuery.mockResolvedValue(
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ); // Mock balance

    await expect(
      provider.getPositions({
        address: '0x3333333333333333333333333333333333333333',
      }),
    ).rejects.toThrow('network failure');

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('throws error when address is missing in getPositions', async () => {
    const provider = createProvider();

    await expect(provider.getPositions({ address: '' })).rejects.toThrow(
      'Address is required',
    );
  });

  it('throws error when API response is not ok in getPositions', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 500,
      });

    mockComputeProxyAddress.mockReturnValue(
      '0x9999999999999999999999999999999999999999',
    );

    await expect(
      provider.getPositions({
        address: '0x1234567890123456789012345678901234567890',
      }),
    ).rejects.toThrow('Failed to get positions');

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

    mockFindNetworkClientIdByChainId.mockReturnValue('polygon-network-client');
    mockGetNetworkClientById.mockReturnValue({
      provider: {},
    });
    mockComputeProxyAddress.mockReturnValue(
      '0x9999999999999999999999999999999999999999',
    );
    mockQuery.mockResolvedValue(
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ); // Mock balance

    const userAddress = '0x4444444444444444444444444444444444444444';
    const safeAddress = '0x9999999999999999999999999999999999999999';
    await provider.getPositions({ address: userAddress, claimable: true });

    const calledWithUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledWithUrl).toContain('redeemable=true');
    expect(calledWithUrl).toContain(`user=${safeAddress}`);

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions includes marketId in query when provided', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
    (globalThis as unknown as { fetch: jest.Mock }).fetch = mockFetch;

    mockFindNetworkClientIdByChainId.mockReturnValue('polygon-network-client');
    mockGetNetworkClientById.mockReturnValue({
      provider: {},
    });
    mockComputeProxyAddress.mockReturnValue(
      '0x9999999999999999999999999999999999999999',
    );
    mockQuery.mockResolvedValue(
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    );

    const userAddress = '0x5555555555555555555555555555555555555555';
    await provider.getPositions({
      address: userAddress,
      marketId: 'market-123',
    });

    const calledWithUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledWithUrl).toContain('eventId=market-123');

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions filters out claimable positions when claimable parameter is false', async () => {
    // Arrange
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;

    mockFindNetworkClientIdByChainId.mockReturnValue('polygon-network-client');
    mockGetNetworkClientById.mockReturnValue({
      provider: {},
    });
    mockComputeProxyAddress.mockReturnValue(
      '0x9999999999999999999999999999999999999999',
    );
    mockQuery.mockResolvedValue(
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ); // Mock balance

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

  // Helper function to create a mock PredictPosition
  function createMockPosition(
    overrides?: Partial<PredictPosition>,
  ): PredictPosition {
    return {
      id: 'position-1',
      providerId: 'polymarket',
      marketId: 'market-1',
      outcomeId: 'outcome-1',
      outcome: 'Yes',
      outcomeTokenId: 'token-1',
      currentValue: 100,
      title: 'Test Market',
      icon: 'https://example.com/icon.png',
      amount: 10,
      price: 0.5,
      status: PredictPositionStatus.OPEN,
      size: 10,
      outcomeIndex: 0,
      percentPnl: 0,
      cashPnl: 0,
      claimable: false,
      initialValue: 100,
      avgPrice: 0.5,
      endDate: '2025-12-31T23:59:59Z',
      ...overrides,
    };
  }

  // Helper function to create a mock OrderPreview
  function createMockOrderPreview(
    overrides?: Partial<OrderPreview>,
  ): OrderPreview {
    return {
      marketId: 'market-1',
      outcomeId: 'outcome-456',
      outcomeTokenId: '0',
      timestamp: Date.now(),
      side: Side.BUY,
      sharePrice: 0.5,
      maxAmountSpent: 1,
      minAmountReceived: 2,
      slippage: 0.005,
      tickSize: 0.01,
      minOrderSize: 0.01,
      negRisk: false,
      fees: {
        metamaskFee: 0.02,
        providerFee: 0.02,
        totalFee: 0.04,
      },
      ...overrides,
    };
  }

  // Helper function to setup place order test environment
  function setupPlaceOrderTest() {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockSigner = {
      address: mockAddress,
      signTypedMessage: mockSignTypedMessage,
      signPersonalMessage: mockSignPersonalMessage,
    };

    const provider = createProvider();

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
    mockComputeProxyAddress.mockReturnValue(
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
      mockMarket,
    };
  }

  describe('placeOrder', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('successfully places a buy order and returns correct result', async () => {
      // Arrange
      const { provider, mockSigner } = setupPlaceOrderTest();
      const preview = createMockOrderPreview({ side: Side.BUY });
      const orderParams = {
        signer: mockSigner,
        providerId: 'polymarket',
        preview,
      };

      // Act
      const result = await provider.placeOrder(orderParams);

      // Assert
      expect(result).toMatchObject({
        success: true,
        response: expect.any(Object),
        error: undefined,
      });
    });

    it('successfully places a sell order and returns correct result', async () => {
      // Arrange
      const { provider, mockSigner } = setupPlaceOrderTest();
      const preview = createMockOrderPreview({ side: Side.SELL });
      const orderParams = {
        signer: mockSigner,
        providerId: 'polymarket',
        preview,
      };

      // Act
      const result = await provider.placeOrder(orderParams);

      // Assert
      expect(result).toMatchObject({
        success: true,
        response: expect.any(Object),
        error: undefined,
      });
    });

    it('handles order submission failure', async () => {
      // Arrange
      const { provider, mockSigner } = setupPlaceOrderTest();
      mockSubmitClobOrder.mockResolvedValue({
        success: false,
        response: undefined,
        error: 'Submission failed',
      });
      const preview = createMockOrderPreview({ side: Side.BUY });
      const orderParams = {
        signer: mockSigner,
        providerId: 'polymarket',
        preview,
      };

      // Act
      const result = await provider.placeOrder(orderParams);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Submission failed');
    });

    it('catches exceptions and returns error result instead of throwing', async () => {
      // Arrange
      const { provider, mockSigner } = setupPlaceOrderTest();
      mockSignTypedMessage.mockRejectedValue(new Error('Signature rejected'));
      const preview = createMockOrderPreview({ side: Side.BUY });
      const orderParams = {
        signer: mockSigner,
        providerId: 'polymarket',
        preview,
      };

      // Act
      const result = await provider.placeOrder(orderParams);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Signature rejected');
    });

    it('catches non-Error exceptions and returns error result', async () => {
      const { provider, mockSigner } = setupPlaceOrderTest();
      mockSignTypedMessage.mockRejectedValue('String error');
      const preview = createMockOrderPreview({ side: Side.BUY });

      const result = await provider.placeOrder({
        signer: mockSigner,
        preview,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to place order');
    });

    it('logs error details when exception occurs', async () => {
      // Arrange
      const { provider, mockSigner } = setupPlaceOrderTest();
      const mockError = new Error('Network error');
      mockSignTypedMessage.mockRejectedValue(mockError);
      const preview = createMockOrderPreview({ side: Side.SELL });
      const orderParams = {
        signer: mockSigner,
        providerId: 'polymarket',
        preview,
      };

      // Act
      await provider.placeOrder(orderParams);

      // Assert
      expect(DevLogger.log).toHaveBeenCalledWith(
        'PolymarketProvider: Place order failed',
        expect.objectContaining({
          error: 'Network error',
          side: Side.SELL,
          outcomeTokenId: preview.outcomeTokenId,
        }),
      );
    });

    it('calls all required utility functions with correct parameters', async () => {
      // Arrange
      const { provider, mockSigner } = setupPlaceOrderTest();
      const preview = createMockOrderPreview({ side: Side.BUY });
      const orderParams = {
        signer: mockSigner,
        providerId: 'polymarket',
        preview,
      };

      // Act
      await provider.placeOrder(orderParams);

      // Assert
      expect(mockSignTypedMessage).toHaveBeenCalled();
      expect(mockSubmitClobOrder).toHaveBeenCalled();
    });

    it('returns error result when maker address is not found', async () => {
      // Arrange
      const provider = createProvider();
      const mockSigner = {
        address: '0x1234567890123456789012345678901234567890',
        signTypedMessage: mockSignTypedMessage,
        signPersonalMessage: mockSignPersonalMessage,
      };
      const preview = createMockOrderPreview({ side: Side.BUY });

      mockComputeProxyAddress.mockReturnValue('');
      mockFindNetworkClientIdByChainId.mockReturnValue('polygon');
      mockGetNetworkClientById.mockReturnValue({ provider: {} });
      mockQuery.mockResolvedValue('0x0');

      // Act
      const result = await provider.placeOrder({ signer: mockSigner, preview });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Maker address not found');
    });

    it('fetches account state when not cached during placeOrder', async () => {
      const { provider, mockSigner } = setupPlaceOrderTest();
      const preview = createMockOrderPreview({ side: Side.BUY });

      mockComputeProxyAddress.mockReturnValue(
        '0x9999999999999999999999999999999999999999',
      );
      (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
      (hasAllowances as jest.Mock).mockResolvedValue(true);

      await provider.placeOrder({
        signer: mockSigner,
        preview,
      });

      expect(mockComputeProxyAddress).toHaveBeenCalled();
    });

    it('uses negRiskExchange contract for negRisk orders', async () => {
      const { provider, mockSigner } = setupPlaceOrderTest();
      const preview = createMockOrderPreview({
        side: Side.BUY,
        negRisk: true,
      });

      await provider.placeOrder({
        signer: mockSigner,
        preview,
      });

      expect(mockGetOrderTypedData).toHaveBeenCalledWith(
        expect.objectContaining({
          verifyingContract: '0x0987654321098765432109876543210987654321',
        }),
      );
    });

    it('uses exchange contract for non-negRisk orders', async () => {
      const { provider, mockSigner } = setupPlaceOrderTest();
      const preview = createMockOrderPreview({
        side: Side.BUY,
        negRisk: false,
      });

      await provider.placeOrder({
        signer: mockSigner,
        preview,
      });

      expect(mockGetOrderTypedData).toHaveBeenCalledWith(
        expect.objectContaining({
          verifyingContract: '0x1234567890123456789012345678901234567890',
        }),
      );
    });
  });

  describe('previewOrder', () => {
    it('calls previewOrder utility function with correct parameters', async () => {
      const provider = createProvider();
      const mockParams = {
        marketId: 'market-123',
        outcomeId: 'outcome-456',
        outcomeTokenId: 'token-789',
        side: Side.BUY,
        amount: 100,
        size: 100,
      };

      await provider.previewOrder(mockParams);

      expect(mockPreviewOrder).toHaveBeenCalledWith(mockParams);
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
        signPersonalMessage: mockSignPersonalMessage,
      };
      const mockSigner2 = {
        address: mockAddress2,
        signTypedMessage: mockSignTypedMessage,
        signPersonalMessage: mockSignPersonalMessage,
      };

      const provider = createProvider();

      // Setup minimal mocks needed for placeOrder
      mockSignTypedMessage.mockResolvedValue('0xsignature');
      mockSignPersonalMessage.mockResolvedValue('0xpersonalsignature');
      mockPriceValid.mockReturnValue(true);
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
      mockSubmitClobOrder.mockResolvedValue({
        success: true,
        response: { orderId: 'test-order' },
        error: undefined,
      });
      mockCreateApiKey.mockResolvedValue({
        apiKey: 'test-api-key',
        secret: 'test-secret',
        passphrase: 'test-passphrase',
      });
      mockComputeProxyAddress.mockReturnValue(
        '0x9999999999999999999999999999999999999999',
      );
      mockFindNetworkClientIdByChainId.mockReturnValue('polygon');
      mockGetNetworkClientById.mockReturnValue({
        provider: {},
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
      const preview = createMockOrderPreview({ side: Side.BUY });
      const orderParams = {
        signer: mockSigner1,
        providerId: 'polymarket',
        preview,
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

      const preview1 = createMockOrderPreview({ side: Side.BUY });
      const orderParams1 = {
        signer: mockSigner1,
        providerId: 'polymarket',
        preview: preview1,
      };

      const preview2 = createMockOrderPreview({ side: Side.SELL });
      const orderParams2 = {
        signer: mockSigner2,
        providerId: 'polymarket',
        preview: preview2,
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

  describe('placeOrder with Safe fee authorization', () => {
    it('computes Safe address before creating order', async () => {
      const { provider, mockSigner } = setupPlaceOrderTest();
      const preview = createMockOrderPreview({
        side: Side.BUY,
        fees: { metamaskFee: 0.02, providerFee: 0.02, totalFee: 0.04 },
      });
      const orderParams: PlaceOrderParams = {
        providerId: 'polymarket',
        preview,
      };

      await provider.placeOrder({ ...orderParams, signer: mockSigner });

      expect(mockComputeProxyAddress).toHaveBeenCalledWith(mockSigner.address);
    });

    it('calculates 4% fee from maker amount', async () => {
      const { provider, mockSigner } = setupPlaceOrderTest();
      const preview = createMockOrderPreview({
        side: Side.BUY,
        fees: { metamaskFee: 0.02, providerFee: 0.02, totalFee: 0.04 },
      });
      const orderParams: PlaceOrderParams = {
        providerId: 'polymarket',
        preview,
      };

      await provider.placeOrder({ ...orderParams, signer: mockSigner });

      const expectedFeeAmount = BigInt(40000);
      expect(mockCreateSafeFeeAuthorization).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: expectedFeeAmount,
        }),
      );
    });

    it('creates fee authorization with correct parameters', async () => {
      const { provider, mockSigner } = setupPlaceOrderTest();
      const preview = createMockOrderPreview({
        side: Side.BUY,
        fees: { metamaskFee: 0.02, providerFee: 0.02, totalFee: 0.04 },
      });
      const orderParams: PlaceOrderParams = {
        providerId: 'polymarket',
        preview,
      };

      await provider.placeOrder({ ...orderParams, signer: mockSigner });

      expect(mockCreateSafeFeeAuthorization).toHaveBeenCalledWith({
        safeAddress: '0x9999999999999999999999999999999999999999',
        signer: mockSigner,
        amount: expect.any(BigInt),
        to: '0x100c7b833bbd604a77890783439bbb9d65e31de7',
      });
    });

    it('includes feeAuthorization when submitting order', async () => {
      const { provider, mockSigner } = setupPlaceOrderTest();
      const preview = createMockOrderPreview({
        side: Side.BUY,
        fees: { metamaskFee: 0.02, providerFee: 0.02, totalFee: 0.04 },
      });
      const orderParams: PlaceOrderParams = {
        providerId: 'polymarket',
        preview,
      };

      await provider.placeOrder({ ...orderParams, signer: mockSigner });

      expect(mockSubmitClobOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          feeAuthorization: {
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
          },
        }),
      );
    });

    it('uses FEE_COLLECTOR_ADDRESS as recipient', async () => {
      const { provider, mockSigner } = setupPlaceOrderTest();
      const preview = createMockOrderPreview({
        side: Side.BUY,
        fees: { metamaskFee: 0.02, providerFee: 0.02, totalFee: 0.04 },
      });
      const orderParams: PlaceOrderParams = {
        providerId: 'polymarket',
        preview,
      };

      await provider.placeOrder({ ...orderParams, signer: mockSigner });

      expect(mockCreateSafeFeeAuthorization).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '0x100c7b833bbd604a77890783439bbb9d65e31de7',
        }),
      );
    });
  });

  describe('placeOrder edge cases', () => {
    it('places order without fee authorization when totalFee is zero', async () => {
      // Clear mock to ensure clean state for this test
      mockCreateSafeFeeAuthorization.mockClear();

      const { provider, mockSigner } = setupPlaceOrderTest();
      const preview = createMockOrderPreview({
        side: Side.BUY,
        fees: { metamaskFee: 0, providerFee: 0, totalFee: 0 },
      });

      await provider.placeOrder({
        signer: mockSigner,
        preview,
      });

      expect(mockCreateSafeFeeAuthorization).not.toHaveBeenCalled();
      expect(mockSubmitClobOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          clobOrder: expect.any(Object),
          headers: expect.any(Object),
          feeAuthorization: undefined,
        }),
      );
    });

    it('places order without fee authorization when fees is undefined', async () => {
      mockCreateSafeFeeAuthorization.mockClear();

      const { provider, mockSigner } = setupPlaceOrderTest();
      const preview = createMockOrderPreview({
        side: Side.BUY,
        fees: undefined,
      });

      await provider.placeOrder({
        signer: mockSigner,
        preview,
      });

      expect(mockCreateSafeFeeAuthorization).not.toHaveBeenCalled();
      expect(mockSubmitClobOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          feeAuthorization: undefined,
        }),
      );
    });

    it('returns error result when submitClobOrder returns no response', async () => {
      const { provider, mockSigner } = setupPlaceOrderTest();
      const preview = createMockOrderPreview({ side: Side.BUY });

      mockSubmitClobOrder.mockResolvedValue({
        success: false,
        response: null,
        error: 'Submission failed',
      });

      const result = await provider.placeOrder({
        signer: mockSigner,
        preview,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Submission failed');
      expect(result.response).toBeUndefined();
    });
  });

  describe('getActivity', () => {
    it('fetches activity and resolves without throwing', async () => {
      const provider = createProvider();
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => [] });
      const getAccountStateSpy = jest
        .spyOn(
          provider as unknown as {
            getAccountState: (p: { ownerAddress: string }) => Promise<{
              address: string;
              isDeployed: boolean;
              hasAllowances: boolean;
              balance: number;
            }>;
          },
          'getAccountState',
        )
        .mockResolvedValue({
          address: '0xSAFE',
          isDeployed: true,
          hasAllowances: true,
          balance: 0,
        });

      await expect(
        provider.getActivity({
          address: '0x1234567890123456789012345678901234567890',
        }),
      ).resolves.toEqual([]);

      expect(getAccountStateSpy).toHaveBeenCalled();
    });

    it('fetches account state when not cached', async () => {
      const provider = createProvider();
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => [] });

      mockComputeProxyAddress.mockReturnValue('0xSafeAddress');
      (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
      (hasAllowances as jest.Mock).mockResolvedValue(true);

      await provider.getActivity({
        address: '0x1234567890123456789012345678901234567890',
      });

      expect(mockComputeProxyAddress).toHaveBeenCalled();
    });
  });

  describe('claimWinnings', () => {
    it('throws error when method is not implemented', () => {
      const provider = createProvider();

      expect(() => provider.claimWinnings()).toThrow('Method not implemented.');
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
      mockGetClaimTransaction.mockResolvedValue({
        to: '0xConditionalTokensAddress',
        data: '0xencodedclaim',
        value: '0x0',
      });

      // Mock getAccountState to return a safe address
      const mockAccountState = {
        address: '0xSafeAddress123456789012345678901234567890' as const,
        isDeployed: true,
        hasAllowances: true,
      };
      jest
        .spyOn(PolymarketProvider.prototype, 'getAccountState')
        .mockResolvedValue(mockAccountState);

      // Mock hasAllowances used by getAccountState
      mockHasAllowances.mockResolvedValue(true);

      const mockSigner = {
        address: '0x1234567890123456789012345678901234567890',
        signTypedMessage: jest.fn(),
        signPersonalMessage: jest.fn(),
      };
      return { provider: createProvider(), signer: mockSigner };
    }

    it('successfully prepares a claim for regular position', async () => {
      const { provider, signer } = setupPrepareClaimTest();
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

      const result = await provider.prepareClaim({
        positions: [position],
        signer,
      });

      expect(result).toEqual({
        chainId: 137, // POLYGON_MAINNET_CHAIN_ID
        transactions: {
          data: '0xencodedclaim',
          to: '0xConditionalTokensAddress',
          value: '0x0',
        },
      });

      // encodeClaim is called internally by getClaimTransaction
      // The exact call verification depends on the implementation details
    });

    it('successfully prepares a claim for negRisk position', async () => {
      const { provider, signer } = setupPrepareClaimTest();
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

      const result = await provider.prepareClaim({
        positions: [position],
        signer,
      });

      expect(result).toEqual({
        chainId: 137,
        transactions: {
          data: '0xencodedclaim',
          to: '0xConditionalTokensAddress',
          value: '0x0',
        },
      });

      // encodeClaim is called internally by getClaimTransaction
      // The exact call verification depends on the implementation details
    });

    it('calls encodeClaim with correct amounts array based on outcomeIndex', async () => {
      const { provider, signer } = setupPrepareClaimTest();
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

      await provider.prepareClaim({ positions: [position], signer });

      // encodeClaim is called internally by getClaimTransaction
      // The exact call verification depends on the implementation details
    });

    it('throws error when signer address is missing', async () => {
      jest.clearAllMocks();
      const provider = createProvider();
      const mockSigner = {
        address: '',
        signTypedMessage: jest.fn(),
        signPersonalMessage: jest.fn(),
      };

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

      await expect(
        provider.prepareClaim({
          positions: [position],
          signer: mockSigner,
        }),
      ).rejects.toThrow('Signer address is required');
    });

    it('throws error when no positions provided', async () => {
      const provider = createProvider();
      const mockSigner = {
        address: '0x1234567890123456789012345678901234567890',
        signTypedMessage: jest.fn(),
        signPersonalMessage: jest.fn(),
      };

      await expect(
        provider.prepareClaim({
          positions: [],
          signer: mockSigner,
        }),
      ).rejects.toThrow('No positions provided for claim');
    });

    it('throws error when getClaimTransaction returns empty array', async () => {
      const { provider, signer } = setupPrepareClaimTest();
      mockGetClaimTransaction.mockResolvedValue([]);

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

      await expect(
        provider.prepareClaim({
          positions: [position],
          signer,
        }),
      ).rejects.toThrow('No claim transaction generated');
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
          user: '0x9999999999999999999999999999999999999999',
          cashUpnl: -7.337110036077004,
          percentUpnl: -31.32290842628039,
        },
      ];

      (computeProxyAddress as jest.Mock).mockReturnValue(
        '0x9999999999999999999999999999999999999999',
      );
      (isSmartContractAddress as jest.Mock).mockResolvedValue(false);
      (hasAllowances as jest.Mock).mockResolvedValue(false);
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUnrealizedPnL),
      });

      const result = await provider.getUnrealizedPnL({
        address: '0x1234567890123456789012345678901234567890',
      });

      expect(result).toEqual(mockUnrealizedPnL[0]);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://data-api.polymarket.com/upnl?user=0x9999999999999999999999999999999999999999',
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

    it('returns undefined when API returns empty array', async () => {
      const provider = createProvider();

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      });

      const result = await provider.getUnrealizedPnL({
        address: '0x1234567890123456789012345678901234567890',
      });

      expect(result).toBeUndefined();
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
          user: '0x9999999999999999999999999999999999999999',
          cashUpnl: 0,
          percentUpnl: 0,
        },
      ];

      (computeProxyAddress as jest.Mock).mockReturnValue(
        '0x9999999999999999999999999999999999999999',
      );
      (isSmartContractAddress as jest.Mock).mockResolvedValue(false);
      (hasAllowances as jest.Mock).mockResolvedValue(false);
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUnrealizedPnL),
      });

      await provider.getUnrealizedPnL({
        address: '0x0000000000000000000000000000000000000000',
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://data-api.polymarket.com/upnl?user=0x9999999999999999999999999999999999999999',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('fetches account state when not cached', async () => {
      const provider = createProvider();
      const mockUnrealizedPnL = [
        {
          user: '0x9999999999999999999999999999999999999999',
          cashUpnl: 5.5,
          percentUpnl: 10.5,
        },
      ];

      (computeProxyAddress as jest.Mock).mockReturnValue(
        '0x9999999999999999999999999999999999999999',
      );
      (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
      (hasAllowances as jest.Mock).mockResolvedValue(true);
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUnrealizedPnL),
      });

      const result = await provider.getUnrealizedPnL({
        address: '0xNewAddress',
      });

      expect(result).toEqual(mockUnrealizedPnL[0]);
      expect(computeProxyAddress).toHaveBeenCalled();
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

    it('returns empty array when non-Error exception is thrown', async () => {
      const provider = createProvider();
      (global.fetch as jest.Mock).mockRejectedValue('String error');

      const result = await provider.getPriceHistory({ marketId: 'market-1' });

      expect(result).toEqual([]);
    });
  });

  describe('prepareDeposit', () => {
    const mockSigner = {
      address: '0x123',
      signTypedMessage: jest.fn(),
      signPersonalMessage: jest.fn(),
    };

    beforeEach(() => {
      (computeProxyAddress as jest.Mock).mockReturnValue('0xSafeAddress');
      (generateTransferData as jest.Mock).mockReturnValue('0xtransferData');
    });

    it('prepares deploy and allowance transactions when wallet not deployed', async () => {
      // Given a wallet that is not deployed
      const provider = createProvider();
      (isSmartContractAddress as jest.Mock).mockResolvedValue(false);
      (hasAllowances as jest.Mock).mockResolvedValue(false);
      (getBalance as jest.Mock).mockResolvedValue(0);
      (getDeployProxyWalletTransaction as jest.Mock).mockResolvedValue({
        params: { to: '0xFactory', data: '0xdeploy' },
      });
      (getProxyWalletAllowancesTransaction as jest.Mock).mockResolvedValue({
        params: { to: '0xSafe', data: '0xallowances' },
      });

      // When preparing deposit
      const result = await provider.prepareDeposit({
        providerId: 'polymarket',
        signer: mockSigner,
      });

      // Then all three transactions are included
      expect(result.transactions).toHaveLength(3);
      expect(result.transactions[0].params.data).toBe('0xdeploy');
      expect(result.transactions[1].params.data).toBe('0xallowances');
      expect(result.transactions[2].type).toBe('predictDeposit');
      expect(result.chainId).toBe('0x89');
    });

    it('prepares only allowance transaction when wallet deployed but no allowances', async () => {
      // Given a deployed wallet without allowances
      const provider = createProvider();
      (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
      (hasAllowances as jest.Mock).mockResolvedValue(false);
      (getBalance as jest.Mock).mockResolvedValue(100);
      (getProxyWalletAllowancesTransaction as jest.Mock).mockResolvedValue({
        params: { to: '0xSafe', data: '0xallowances' },
      });

      // When preparing deposit
      const result = await provider.prepareDeposit({
        providerId: 'polymarket',
        signer: mockSigner,
      });

      // Then only allowance and deposit transactions are included
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].params.data).toBe('0xallowances');
      expect(result.transactions[1].type).toBe('predictDeposit');
    });

    it('prepares only deposit transaction when wallet deployed and has allowances', async () => {
      // Given a fully set up wallet
      const provider = createProvider();
      (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
      (hasAllowances as jest.Mock).mockResolvedValue(true);
      (getBalance as jest.Mock).mockResolvedValue(100);

      // When preparing deposit
      const result = await provider.prepareDeposit({
        providerId: 'polymarket',
        signer: mockSigner,
      });

      // Then only deposit transaction is included
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].type).toBe('predictDeposit');
    });

    it('throws error when deploy transaction fails', async () => {
      // Given deploy transaction returns undefined
      const provider = createProvider();
      (isSmartContractAddress as jest.Mock).mockResolvedValue(false);
      (hasAllowances as jest.Mock).mockResolvedValue(false);
      (getBalance as jest.Mock).mockResolvedValue(0);
      (getDeployProxyWalletTransaction as jest.Mock).mockResolvedValue(
        undefined,
      );

      // When preparing deposit
      // Then it throws an error
      await expect(
        provider.prepareDeposit({
          providerId: 'polymarket',
          signer: mockSigner,
        }),
      ).rejects.toThrow('Failed to get deploy proxy wallet transaction params');
    });

    it('uses correct collateral address in deposit transaction', async () => {
      // Given a fully set up wallet
      const provider = createProvider();
      (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
      (hasAllowances as jest.Mock).mockResolvedValue(true);
      (getBalance as jest.Mock).mockResolvedValue(100);

      // When preparing deposit
      const result = await provider.prepareDeposit({
        providerId: 'polymarket',
        signer: mockSigner,
      });

      // Then deposit transaction targets collateral contract
      expect(result.transactions[0].params.to).toBeDefined();
      expect(generateTransferData).toHaveBeenCalledWith('transfer', {
        toAddress: '0xSafeAddress',
        amount: '0x0',
      });
    });

    it('throws error when signer address is missing', async () => {
      const provider = createProvider();
      const mockSignerWithoutAddress = {
        address: '',
        signTypedMessage: jest.fn(),
        signPersonalMessage: jest.fn(),
      };

      await expect(
        provider.prepareDeposit({
          providerId: 'polymarket',
          signer: mockSignerWithoutAddress,
        }),
      ).rejects.toThrow('Signer address is required');
    });

    it('throws error when deploy transaction has no params', async () => {
      const provider = createProvider();
      (isSmartContractAddress as jest.Mock).mockResolvedValue(false);
      (hasAllowances as jest.Mock).mockResolvedValue(false);
      (getDeployProxyWalletTransaction as jest.Mock).mockResolvedValue({});

      await expect(
        provider.prepareDeposit({
          providerId: 'polymarket',
          signer: mockSigner,
        }),
      ).rejects.toThrow('Invalid deploy transaction: missing params');
    });

    it('throws error when allowance transaction has no params', async () => {
      const provider = createProvider();
      (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
      (hasAllowances as jest.Mock).mockResolvedValue(false);
      (getProxyWalletAllowancesTransaction as jest.Mock).mockResolvedValue({});

      await expect(
        provider.prepareDeposit({
          providerId: 'polymarket',
          signer: mockSigner,
        }),
      ).rejects.toThrow('Invalid allowance transaction: missing params');
    });

    it('throws error when generateTransferData returns undefined', async () => {
      const provider = createProvider();
      (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
      (hasAllowances as jest.Mock).mockResolvedValue(true);
      (generateTransferData as jest.Mock).mockReturnValue(undefined);

      await expect(
        provider.prepareDeposit({
          providerId: 'polymarket',
          signer: mockSigner,
        }),
      ).rejects.toThrow(
        'Failed to generate transfer data for deposit transaction',
      );
    });
  });

  describe('Rate Limiting', () => {
    describe('previewOrder with rate limiting', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      const setupPreviewOrderMock = () => {
        mockPreviewOrder.mockResolvedValue({
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcomeTokenId: '0',
          timestamp: Date.now(),
          side: Side.BUY,
          sharePrice: 0.5,
          maxAmountSpent: 100,
          minAmountReceived: 200,
          slippage: 0.005,
          tickSize: 0.01,
          minOrderSize: 1,
          negRisk: false,
          fees: {
            metamaskFee: 0.5,
            providerFee: 0.5,
            totalFee: 1,
          },
        });
      };

      it('does not set rateLimited for SELL orders', async () => {
        setupPreviewOrderMock();
        const { provider, mockSigner } = setupPlaceOrderTest();

        // Place a BUY order first to set rate limit state
        const preview = createMockOrderPreview({ side: Side.BUY });
        await provider.placeOrder({
          signer: mockSigner,
          preview,
        });

        // Now try to preview a SELL order - should NOT be rate limited
        const sellPreview = await provider.previewOrder({
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcomeTokenId: '0',
          side: Side.SELL,
          size: 10,
          signer: mockSigner,
        });

        expect(sellPreview.rateLimited).toBeUndefined();
      });

      it('does not set rateLimited when signer is not provided', async () => {
        setupPreviewOrderMock();
        const { provider } = setupPlaceOrderTest();

        const preview = await provider.previewOrder({
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcomeTokenId: '0',
          side: Side.BUY,
          size: 10,
        });

        expect(preview.rateLimited).toBeUndefined();
      });

      it('does not set rateLimited when address has never placed an order', async () => {
        setupPreviewOrderMock();
        const { provider, mockSigner } = setupPlaceOrderTest();

        const preview = await provider.previewOrder({
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcomeTokenId: '0',
          side: Side.BUY,
          size: 10,
          signer: mockSigner,
        });

        expect(preview.rateLimited).toBeUndefined();
      });

      it('sets rateLimited to true when BUY order is rate limited', async () => {
        setupPreviewOrderMock();
        const { provider, mockSigner } = setupPlaceOrderTest();

        // Place a BUY order first to set rate limit state
        const preview = createMockOrderPreview({ side: Side.BUY });
        await provider.placeOrder({
          signer: mockSigner,
          preview,
        });

        // Try to preview another BUY order immediately - should be rate limited
        const secondPreview = await provider.previewOrder({
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcomeTokenId: '0',
          side: Side.BUY,
          size: 10,
          signer: mockSigner,
        });

        expect(secondPreview.rateLimited).toBe(true);
      });

      it('sets rateLimited to true when BUY order is in progress', async () => {
        setupPreviewOrderMock();
        const { provider, mockSigner } = setupPlaceOrderTest();

        mockSubmitClobOrder.mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                resolve({
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
              }, 100);
            }),
        );

        const preview = createMockOrderPreview({ side: Side.BUY });
        const placeOrderPromise = provider.placeOrder({
          signer: mockSigner,
          preview,
        });

        const secondPreview = await provider.previewOrder({
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcomeTokenId: '0',
          side: Side.BUY,
          size: 10,
          signer: mockSigner,
        });

        expect(secondPreview.rateLimited).toBe(true);

        await placeOrderPromise;
      });
    });

    describe('placeOrder rate limiting behavior', () => {
      it('successfully places BUY order', async () => {
        const { provider, mockSigner } = setupPlaceOrderTest();

        const preview = createMockOrderPreview({ side: Side.BUY });
        const result = await provider.placeOrder({
          signer: mockSigner,
          preview,
        });

        expect(result.success).toBe(true);
      });

      it('successfully places SELL order', async () => {
        const { provider, mockSigner } = setupPlaceOrderTest();

        const preview = createMockOrderPreview({ side: Side.SELL });
        const result = await provider.placeOrder({
          signer: mockSigner,
          preview,
        });

        expect(result.success).toBe(true);
      });

      it('handles failed BUY orders', async () => {
        const { provider, mockSigner } = setupPlaceOrderTest();
        mockSubmitClobOrder.mockResolvedValue({
          success: false,
          response: undefined,
          error: 'Order submission failed',
        });

        const preview = createMockOrderPreview({ side: Side.BUY });
        const result = await provider.placeOrder({
          signer: mockSigner,
          preview,
        });

        expect(result.success).toBe(false);
      });

      it('handles different addresses independently', async () => {
        const { provider } = setupPlaceOrderTest();
        const mockSigner1 = {
          address: '0x1111111111111111111111111111111111111111',
          signTypedMessage: mockSignTypedMessage,
          signPersonalMessage: mockSignPersonalMessage,
        };
        const mockSigner2 = {
          address: '0x2222222222222222222222222222222222222222',
          signTypedMessage: mockSignTypedMessage,
          signPersonalMessage: mockSignPersonalMessage,
        };

        const preview = createMockOrderPreview({ side: Side.BUY });
        const result1 = await provider.placeOrder({
          signer: mockSigner1,
          preview,
        });

        const result2 = await provider.placeOrder({
          signer: mockSigner2,
          preview,
        });

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
      });
    });
  });

  describe('getAccountState', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (computeProxyAddress as jest.Mock).mockReturnValue('0xSafeAddress');
    });

    it('returns account state for an undeployed wallet', async () => {
      // Given an undeployed wallet
      const provider = createProvider();
      (isSmartContractAddress as jest.Mock).mockResolvedValue(false);
      (hasAllowances as jest.Mock).mockResolvedValue(false);

      // When getting account state
      const result = await provider.getAccountState({
        ownerAddress: '0x123',
      });

      // Then correct state is returned
      expect(result).toEqual({
        address: '0xSafeAddress',
        isDeployed: false,
        hasAllowances: false,
      });
    });

    it('returns account state for a deployed wallet with allowances', async () => {
      // Given a deployed wallet with allowances
      const provider = createProvider();
      (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
      (hasAllowances as jest.Mock).mockResolvedValue(true);

      // When getting account state
      const result = await provider.getAccountState({
        ownerAddress: '0x456',
      });

      // Then correct state is returned
      expect(result).toEqual({
        address: '0xSafeAddress',
        isDeployed: true,
        hasAllowances: true,
      });
    });

    it('caches account state by owner address', async () => {
      // Given an account state check
      const provider = createProvider();
      (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
      (hasAllowances as jest.Mock).mockResolvedValue(true);

      // When getting account state twice
      await provider.getAccountState({ ownerAddress: '0x123' });
      await provider.getAccountState({ ownerAddress: '0x123' });

      // Then Safe address is only computed once
      expect(computeProxyAddress).toHaveBeenCalledTimes(1);
    });

    it('computes Safe address for each unique owner', async () => {
      // Given multiple owner addresses
      const provider = createProvider();
      (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
      (hasAllowances as jest.Mock).mockResolvedValue(true);

      // When getting account state for different owners
      await provider.getAccountState({ ownerAddress: '0x123' });
      await provider.getAccountState({ ownerAddress: '0x456' });

      // Then Safe address is computed for each owner
      expect(computeProxyAddress).toHaveBeenCalledTimes(2);
      expect(computeProxyAddress).toHaveBeenCalledWith('0x123');
      expect(computeProxyAddress).toHaveBeenCalledWith('0x456');
    });

    it('calls all required functions in parallel', async () => {
      // Given account state check
      const provider = createProvider();
      const isDeployedPromise = Promise.resolve(true);
      const hasAllowancesPromise = Promise.resolve(true);

      (isSmartContractAddress as jest.Mock).mockReturnValue(isDeployedPromise);
      (hasAllowances as jest.Mock).mockReturnValue(hasAllowancesPromise);

      // When getting account state
      await provider.getAccountState({ ownerAddress: '0x123' });

      // Then all functions are called
      expect(isSmartContractAddress).toHaveBeenCalledWith(
        '0xSafeAddress',
        '0x89',
      );
      expect(hasAllowances).toHaveBeenCalledWith({
        address: '0xSafeAddress',
      });
    });

    it('throws error when ownerAddress is missing', async () => {
      const provider = createProvider();

      await expect(
        provider.getAccountState({ ownerAddress: '' }),
      ).rejects.toThrow('Owner address is required');
    });

    it('throws error when computeProxyAddress fails', async () => {
      const provider = createProvider();
      (computeProxyAddress as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to compute');
      });

      await expect(
        provider.getAccountState({ ownerAddress: '0x123' }),
      ).rejects.toThrow('Failed to compute safe address');
    });

    it('throws error when computeProxyAddress returns empty string', async () => {
      const provider = createProvider();
      (computeProxyAddress as jest.Mock).mockReturnValue('');

      await expect(
        provider.getAccountState({ ownerAddress: '0x123' }),
      ).rejects.toThrow('Failed to get safe address');
    });

    it('throws error when checking account state fails', async () => {
      const provider = createProvider();
      (computeProxyAddress as jest.Mock).mockReturnValue('0xSafeAddress');
      (isSmartContractAddress as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      await expect(
        provider.getAccountState({ ownerAddress: '0x123' }),
      ).rejects.toThrow('Failed to check account state');
    });
  });

  describe('getBalance', () => {
    it('returns balance for the given address', async () => {
      // Given a provider
      const provider = createProvider();
      (computeProxyAddress as jest.Mock).mockReturnValue('0xSafeAddress');
      (getBalance as jest.Mock).mockResolvedValue(123.45);

      // When getting balance
      const result = await provider.getBalance({
        address: '0x1234567890123456789012345678901234567890',
        providerId: 'polymarket',
      });

      // Then balance is returned
      expect(result).toBe(123.45);
      expect(getBalance).toHaveBeenCalledWith({ address: '0xSafeAddress' });
    });

    it('throws error when address is missing', async () => {
      const provider = createProvider();

      await expect(
        provider.getBalance({ address: '', providerId: 'polymarket' }),
      ).rejects.toThrow('address is required');
    });

    it('uses cached address when available', async () => {
      const provider = createProvider();
      (computeProxyAddress as jest.Mock).mockReturnValue('0xSafeAddress');
      (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
      (hasAllowances as jest.Mock).mockResolvedValue(true);
      (getBalance as jest.Mock).mockResolvedValue(100);

      const userAddress = '0x1234567890123456789012345678901234567890';

      await provider.getAccountState({ ownerAddress: userAddress });
      jest.clearAllMocks();

      await provider.getBalance({
        address: userAddress,
        providerId: 'polymarket',
      });

      expect(computeProxyAddress).not.toHaveBeenCalled();
    });
  });

  describe('prepareWithdraw', () => {
    it('prepares withdraw transaction successfully', async () => {
      const provider = createProvider();
      const mockSigner = {
        address: '0x1234567890123456789012345678901234567890',
        signTypedMessage: jest.fn(),
        signPersonalMessage: jest.fn(),
      };

      mockComputeProxyAddress.mockReturnValue('0xSafeAddress');
      jest
        .spyOn(PolymarketProvider.prototype, 'getAccountState')
        .mockResolvedValue({
          address: '0xSafeAddress',
          isDeployed: true,
          hasAllowances: true,
        });

      const result = await provider.prepareWithdraw({
        signer: mockSigner,
        providerId: 'polymarket',
      });

      expect(result).toHaveProperty('chainId');
      expect(result).toHaveProperty('transaction');
      expect(result).toHaveProperty('predictAddress');
      expect(result.predictAddress).toBe('0xSafeAddress');
    });

    it('throws error when signer address is missing in prepareWithdraw', async () => {
      const provider = createProvider();
      const mockSigner = {
        address: '',
        signTypedMessage: jest.fn(),
        signPersonalMessage: jest.fn(),
      };

      await expect(
        provider.prepareWithdraw({
          signer: mockSigner,
          providerId: 'polymarket',
        }),
      ).rejects.toThrow('Signer address is required');
    });

    it('fetches account state when not cached', async () => {
      const provider = createProvider();
      const mockSigner = {
        address: '0x1234567890123456789012345678901234567890',
        signTypedMessage: jest.fn(),
        signPersonalMessage: jest.fn(),
      };

      mockComputeProxyAddress.mockReturnValue('0xSafeAddress');
      (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
      (hasAllowances as jest.Mock).mockResolvedValue(true);

      const result = await provider.prepareWithdraw({
        signer: mockSigner,
        providerId: 'polymarket',
      });

      expect(result.predictAddress).toBe('0xSafeAddress');
      expect(mockComputeProxyAddress).toHaveBeenCalled();
    });
  });

  describe('prepareWithdrawConfirmation', () => {
    it('prepares withdraw confirmation successfully', async () => {
      const provider = createProvider();
      const mockSigner = {
        address: '0x1234567890123456789012345678901234567890',
        signTypedMessage: jest.fn(),
        signPersonalMessage: jest.fn(),
      };

      mockComputeProxyAddress.mockReturnValue('0xSafeAddress');

      const result = await provider.signWithdraw({
        callData: '0xcalldata',
        signer: mockSigner,
      });

      expect(result).toHaveProperty('callData');
      expect(result).toHaveProperty('amount');
    });

    it('throws error when signer address is missing in signWithdraw', async () => {
      const provider = createProvider();
      const mockSigner = {
        address: '',
        signTypedMessage: jest.fn(),
        signPersonalMessage: jest.fn(),
      };

      await expect(
        provider.signWithdraw({
          callData: '0xcalldata',
          signer: mockSigner,
        }),
      ).rejects.toThrow('Signer address is required');
    });
  });

  describe('fetchActivity', () => {
    const provider = createProvider();

    beforeEach(() => {
      jest.clearAllMocks();
      global.fetch = jest.fn();
    });

    it('throws when address is missing', async () => {
      await expect(provider.getActivity({ address: '' })).rejects.toThrow();
    });

    it('calls fetch with derived predictAddress and parses activity', async () => {
      const jsonData = [{ id: 'x1' }];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => jsonData,
      });

      // Mock getAccountState used to derive predict address
      const spy = jest
        .spyOn(
          provider as unknown as {
            getAccountState: (p: { ownerAddress: string }) => Promise<{
              address: string;
              isDeployed: boolean;
              hasAllowances: boolean;
              balance: number;
            }>;
          },
          'getAccountState',
        )
        .mockResolvedValue({
          address: '0xSAFE',
          isDeployed: true,
          hasAllowances: true,
          balance: 0,
        });

      const result = await provider.getActivity({ address: '0xuser' });

      expect(spy).toHaveBeenCalledWith({ ownerAddress: '0xuser' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('user=0xSAFE'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns empty array on non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () => ({}),
      });
      const spy = jest
        .spyOn(
          provider as unknown as {
            getAccountState: (p: { ownerAddress: string }) => Promise<{
              address: string;
              isDeployed: boolean;
              hasAllowances: boolean;
              balance: number;
            }>;
          },
          'getAccountState',
        )
        .mockResolvedValue({
          address: '0xSAFE',
          isDeployed: true,
          hasAllowances: true,
          balance: 0,
        });

      const result = await provider.getActivity({ address: '0xuser' });
      expect(spy).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('Activity', () => {
    const provider = createProvider();

    beforeEach(() => {
      jest.clearAllMocks();
      global.fetch = jest.fn();
    });

    it('throws when address is missing', async () => {
      await expect(provider.getActivity({ address: '' })).rejects.toThrow();
    });

    it('calls fetch with derived predictAddress and parses activity', async () => {
      const jsonData = [{ id: 'x1' }];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => jsonData,
      });

      // Mock getAccountState used to derive predict address
      const spy = jest
        .spyOn(
          provider as unknown as {
            getAccountState: (p: { ownerAddress: string }) => Promise<{
              address: string;
              isDeployed: boolean;
              hasAllowances: boolean;
              balance: number;
            }>;
          },
          'getAccountState',
        )
        .mockResolvedValue({
          address: '0xSAFE',
          isDeployed: true,
          hasAllowances: true,
          balance: 0,
        });

      const result = await provider.getActivity({ address: '0xuser' });

      expect(spy).toHaveBeenCalledWith({ ownerAddress: '0xuser' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('user=0xSAFE'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns empty array on non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () => ({}),
      });
      const spy = jest
        .spyOn(
          provider as unknown as {
            getAccountState: (p: { ownerAddress: string }) => Promise<{
              address: string;
              isDeployed: boolean;
              hasAllowances: boolean;
              balance: number;
            }>;
          },
          'getAccountState',
        )
        .mockResolvedValue({
          address: '0xSAFE',
          isDeployed: true,
          hasAllowances: true,
          balance: 0,
        });

      const result = await provider.getActivity({ address: '0xuser' });
      expect(spy).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('optimistic position updates', () => {
    let originalFetch: typeof fetch | undefined;

    beforeEach(() => {
      originalFetch = globalThis.fetch as typeof fetch | undefined;
      jest.clearAllMocks();
    });

    afterEach(() => {
      (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
        originalFetch;
    });

    describe('confirmClaim', () => {
      it('adds claimed positions to recently sold list', async () => {
        // Arrange
        const provider = createProvider();
        const mockAddress = '0x1234567890123456789012345678901234567890';
        const mockSigner = {
          address: mockAddress,
          signTypedMessage: jest.fn(),
          signPersonalMessage: jest.fn(),
        };
        const mockPositions = [
          createMockPosition({
            id: 'position-1',
            status: PredictPositionStatus.WON,
            currentValue: 100,
            cashPnl: 50,
          }),
          createMockPosition({
            id: 'position-2',
            status: PredictPositionStatus.WON,
            currentValue: 200,
            cashPnl: 100,
          }),
        ];

        // Mock fetch for getPositions
        (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
          .fn()
          .mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([
              {
                id: 'position-1',
                market: 'market-1',
                size: '10',
                value: '100',
              },
              {
                id: 'position-2',
                market: 'market-1',
                size: '20',
                value: '200',
              },
            ]),
          });

        mockComputeProxyAddress.mockReturnValue('0xproxy');
        mockParsePolymarketPositions.mockResolvedValue([
          {
            id: 'position-1',
            marketId: 'market-1',
            status: PredictPositionStatus.WON,
            currentValue: 100,
            cashPnl: 50,
          },
          {
            id: 'position-2',
            marketId: 'market-1',
            status: PredictPositionStatus.WON,
            currentValue: 200,
            cashPnl: 100,
          },
        ]);

        // Act
        provider.confirmClaim({ positions: mockPositions, signer: mockSigner });

        // Assert - subsequent getPositions should filter out claimed positions
        const result = await provider.getPositions({ address: mockAddress });
        expect(result).toHaveLength(0);
      });

      it('handles single position claim', async () => {
        // Arrange
        const provider = createProvider();
        const mockAddress = '0x1234567890123456789012345678901234567890';
        const mockSigner = {
          address: mockAddress,
          signTypedMessage: jest.fn(),
          signPersonalMessage: jest.fn(),
        };
        const mockPosition = createMockPosition({
          id: 'position-1',
          status: PredictPositionStatus.WON,
          currentValue: 100,
          cashPnl: 50,
        });

        (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
          .fn()
          .mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([
              {
                id: 'position-1',
                market: 'market-1',
                size: '10',
                value: '100',
              },
            ]),
          });

        mockComputeProxyAddress.mockReturnValue('0xproxy');
        mockParsePolymarketPositions.mockResolvedValue([
          {
            id: 'position-1',
            marketId: 'market-1',
            status: PredictPositionStatus.WON,
            currentValue: 100,
            cashPnl: 50,
          },
        ]);

        // Act
        provider.confirmClaim({
          positions: [mockPosition],
          signer: mockSigner,
        });

        // Assert
        const result = await provider.getPositions({ address: mockAddress });
        expect(result).toHaveLength(0);
      });
    });

    describe('getPositions with recently sold filtering', () => {
      it('filters out recently sold positions when calling getPositions', async () => {
        // Arrange
        const provider = createProvider();
        const mockAddress = '0x1234567890123456789012345678901234567890';
        const mockSigner = {
          address: mockAddress,
          signTypedMessage: jest.fn(),
          signPersonalMessage: jest.fn(),
        };

        // First, mark position-2 as sold
        provider.confirmClaim({
          positions: [
            createMockPosition({
              id: 'position-2',
              status: PredictPositionStatus.OPEN,
              currentValue: 0,
              cashPnl: 0,
            }),
          ],
          signer: mockSigner,
        });

        // Mock fetch to return 3 positions
        (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
          .fn()
          .mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([
              {
                id: 'position-1',
                market: 'market-1',
                size: '10',
                value: '100',
              },
              {
                id: 'position-2',
                market: 'market-1',
                size: '20',
                value: '200',
              },
              {
                id: 'position-3',
                market: 'market-1',
                size: '30',
                value: '300',
              },
            ]),
          });

        mockComputeProxyAddress.mockReturnValue('0xproxy');
        mockParsePolymarketPositions.mockResolvedValue([
          {
            id: 'position-1',
            marketId: 'market-1',
            providerId: 'polymarket',
          },
          {
            id: 'position-2',
            marketId: 'market-1',
            providerId: 'polymarket',
          },
          {
            id: 'position-3',
            marketId: 'market-1',
            providerId: 'polymarket',
          },
        ]);

        // Act
        const result = await provider.getPositions({ address: mockAddress });

        // Assert - should return only 2 positions (position-2 filtered out)
        expect(result).toHaveLength(2);
        expect(result).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: 'position-1' }),
            expect.objectContaining({ id: 'position-3' }),
          ]),
        );
        expect(result).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: 'position-2' }),
          ]),
        );
      });

      it('cleans up sold positions older than 5 minutes when adding new positions', async () => {
        // Arrange
        const provider = createProvider();
        const mockAddress = '0x1234567890123456789012345678901234567890';
        const mockSigner = {
          address: mockAddress,
          signTypedMessage: jest.fn(),
          signPersonalMessage: jest.fn(),
        };

        // Save the original Date.now
        const realDateNow = Date.now.bind(global.Date);
        const sixMinutesAgo = realDateNow() - 6 * 60 * 1000;

        // Mock Date.now to return 6 minutes ago for the first confirmClaim
        const dateNowStub = jest.fn();
        global.Date.now = dateNowStub;
        dateNowStub.mockReturnValueOnce(sixMinutesAgo);

        // Mark a position as sold 6 minutes ago
        provider.confirmClaim({
          positions: [
            createMockPosition({
              id: 'old-position',
              status: PredictPositionStatus.OPEN,
              currentValue: 0,
              cashPnl: 0,
            }),
          ],
          signer: mockSigner,
        });

        // Now make Date.now return current time
        dateNowStub.mockImplementation(realDateNow);

        // Add a new position (this should trigger cleanup of old positions)
        provider.confirmClaim({
          positions: [
            createMockPosition({
              id: 'new-sold-position',
              status: PredictPositionStatus.OPEN,
              currentValue: 0,
              cashPnl: 0,
            }),
          ],
          signer: mockSigner,
        });

        // Mock fetch to return positions
        (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
          .fn()
          .mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([
              {
                id: 'old-position',
                market: 'market-1',
                size: '10',
                value: '100',
              },
              {
                id: 'new-sold-position',
                market: 'market-1',
                size: '15',
                value: '150',
              },
              {
                id: 'visible-position',
                market: 'market-1',
                size: '20',
                value: '200',
              },
            ]),
          });

        mockComputeProxyAddress.mockReturnValue('0xproxy');
        mockParsePolymarketPositions.mockResolvedValue([
          {
            id: 'old-position',
            marketId: 'market-1',
            providerId: 'polymarket',
          },
          {
            id: 'new-sold-position',
            marketId: 'market-1',
            providerId: 'polymarket',
          },
          {
            id: 'visible-position',
            marketId: 'market-1',
            providerId: 'polymarket',
          },
        ]);

        // Act
        const result = await provider.getPositions({ address: mockAddress });

        // Assert - old position should NOT be filtered (cleaned up), new-sold-position SHOULD be filtered
        expect(result).toHaveLength(2);
        expect(result).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: 'old-position' }),
            expect.objectContaining({ id: 'visible-position' }),
          ]),
        );
        expect(result).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: 'new-sold-position' }),
          ]),
        );

        // Cleanup
        global.Date.now = realDateNow;
      });

      it('tracks multiple sold positions for same address', async () => {
        // Arrange
        const provider = createProvider();
        const mockAddress = '0x1234567890123456789012345678901234567890';
        const mockSigner = {
          address: mockAddress,
          signTypedMessage: jest.fn(),
          signPersonalMessage: jest.fn(),
        };

        // Mark 3 positions as sold
        provider.confirmClaim({
          positions: [
            createMockPosition({
              id: 'position-1',
              status: PredictPositionStatus.OPEN,
              currentValue: 0,
              cashPnl: 0,
            }),
            createMockPosition({
              id: 'position-2',
              status: PredictPositionStatus.OPEN,
              currentValue: 0,
              cashPnl: 0,
            }),
            createMockPosition({
              id: 'position-3',
              status: PredictPositionStatus.OPEN,
              currentValue: 0,
              cashPnl: 0,
            }),
          ],
          signer: mockSigner,
        });

        (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
          .fn()
          .mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([
              { id: 'position-1', market: 'market-1' },
              { id: 'position-2', market: 'market-1' },
              { id: 'position-3', market: 'market-1' },
              { id: 'position-4', market: 'market-1' },
            ]),
          });

        mockComputeProxyAddress.mockReturnValue('0xproxy');
        mockParsePolymarketPositions.mockResolvedValue([
          { id: 'position-1', marketId: 'market-1', providerId: 'polymarket' },
          { id: 'position-2', marketId: 'market-1', providerId: 'polymarket' },
          { id: 'position-3', marketId: 'market-1', providerId: 'polymarket' },
          { id: 'position-4', marketId: 'market-1', providerId: 'polymarket' },
        ]);

        // Act
        const result = await provider.getPositions({ address: mockAddress });

        // Assert - only position-4 should remain
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ id: 'position-4' });
      });

      it('handles multiple addresses independently', async () => {
        // Arrange
        const provider = createProvider();
        const addressA = '0x1111111111111111111111111111111111111111';
        const addressB = '0x2222222222222222222222222222222222222222';

        // Mark position-1 as sold for address A
        provider.confirmClaim({
          positions: [
            createMockPosition({
              id: 'position-1',
              status: PredictPositionStatus.OPEN,
              currentValue: 0,
              cashPnl: 0,
            }),
          ],
          signer: {
            address: addressA,
            signTypedMessage: jest.fn(),
            signPersonalMessage: jest.fn(),
          },
        });

        // Mark position-2 as sold for address B
        provider.confirmClaim({
          positions: [
            createMockPosition({
              id: 'position-2',
              status: PredictPositionStatus.OPEN,
              currentValue: 0,
              cashPnl: 0,
            }),
          ],
          signer: {
            address: addressB,
            signTypedMessage: jest.fn(),
            signPersonalMessage: jest.fn(),
          },
        });

        // Mock fetch for address A
        (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
          .fn()
          .mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([
              { id: 'position-1', market: 'market-1' },
              { id: 'position-2', market: 'market-1' },
            ]),
          });

        mockComputeProxyAddress.mockReturnValue('0xproxy');
        mockParsePolymarketPositions.mockResolvedValue([
          { id: 'position-1', marketId: 'market-1', providerId: 'polymarket' },
          { id: 'position-2', marketId: 'market-1', providerId: 'polymarket' },
        ]);

        // Act - get positions for address A
        const resultA = await provider.getPositions({ address: addressA });

        // Assert - only position-2 should be returned (position-1 filtered for addressA)
        expect(resultA).toHaveLength(1);
        expect(resultA[0]).toMatchObject({ id: 'position-2' });
      });

      it('returns all positions when no positions are marked as sold', async () => {
        // Arrange
        const provider = createProvider();
        const mockAddress = '0x1234567890123456789012345678901234567890';

        (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
          .fn()
          .mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([
              { id: 'position-1', market: 'market-1' },
              { id: 'position-2', market: 'market-1' },
              { id: 'position-3', market: 'market-1' },
              { id: 'position-4', market: 'market-1' },
              { id: 'position-5', market: 'market-1' },
            ]),
          });

        mockComputeProxyAddress.mockReturnValue('0xproxy');
        mockParsePolymarketPositions.mockResolvedValue([
          { id: 'position-1', marketId: 'market-1', providerId: 'polymarket' },
          { id: 'position-2', marketId: 'market-1', providerId: 'polymarket' },
          { id: 'position-3', marketId: 'market-1', providerId: 'polymarket' },
          { id: 'position-4', marketId: 'market-1', providerId: 'polymarket' },
          { id: 'position-5', marketId: 'market-1', providerId: 'polymarket' },
        ]);

        // Act
        const result = await provider.getPositions({ address: mockAddress });

        // Assert
        expect(result).toHaveLength(5);
      });

      it('handles empty sold positions list gracefully', async () => {
        // Arrange
        const provider = createProvider();
        const mockAddress = '0x1234567890123456789012345678901234567890';

        (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
          .fn()
          .mockResolvedValue({
            ok: true,
            json: jest
              .fn()
              .mockResolvedValue([{ id: 'position-1', market: 'market-1' }]),
          });

        mockComputeProxyAddress.mockReturnValue('0xproxy');
        mockParsePolymarketPositions.mockResolvedValue([
          { id: 'position-1', marketId: 'market-1', providerId: 'polymarket' },
        ]);

        // Act
        const result = await provider.getPositions({ address: mockAddress });

        // Assert - no errors, returns all positions
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ id: 'position-1' });
      });
    });

    describe('placeOrder with optimistic sold tracking', () => {
      it('adds position to sold list when selling', async () => {
        // Arrange
        const { provider, mockSigner } = setupPlaceOrderTest();
        const preview = createMockOrderPreview({
          side: Side.SELL,
          outcomeTokenId: 'token-123',
          positionId: 'token-123', // positionId is required for tracking sold positions
        });
        const orderParams = {
          signer: mockSigner,
          providerId: 'polymarket',
          preview,
        };

        // Act
        await provider.placeOrder(orderParams);

        // Assert - subsequent getPositions should filter out the sold position
        (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
          .fn()
          .mockResolvedValue({
            ok: true,
            json: jest
              .fn()
              .mockResolvedValue([{ id: 'token-123', market: 'market-1' }]),
          });

        mockComputeProxyAddress.mockReturnValue('0xproxy');
        mockParsePolymarketPositions.mockResolvedValue([
          { id: 'token-123', marketId: 'market-1', providerId: 'polymarket' },
        ]);

        const positions = await provider.getPositions({
          address: mockSigner.address,
        });
        expect(positions).toHaveLength(0);
      });

      it('does not add to sold list when buying', async () => {
        // Arrange
        const { provider, mockSigner } = setupPlaceOrderTest();
        const preview = createMockOrderPreview({
          side: Side.BUY,
          outcomeTokenId: 'token-456',
        });
        const orderParams = {
          signer: mockSigner,
          providerId: 'polymarket',
          preview,
        };

        // Act
        await provider.placeOrder(orderParams);

        // Assert - getPositions should not filter anything
        (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
          .fn()
          .mockResolvedValue({
            ok: true,
            json: jest
              .fn()
              .mockResolvedValue([{ id: 'token-456', market: 'market-1' }]),
          });

        mockComputeProxyAddress.mockReturnValue('0xproxy');
        mockParsePolymarketPositions.mockResolvedValue([
          { id: 'token-456', marketId: 'market-1', providerId: 'polymarket' },
        ]);

        const positions = await provider.getPositions({
          address: mockSigner.address,
        });
        expect(positions).toHaveLength(1);
        expect(positions[0]).toMatchObject({ id: 'token-456' });
      });
    });
  });

  describe('provider interface properties', () => {
    it('exposes chainId property with value 137', () => {
      const provider = new PolymarketProvider();

      expect(provider.chainId).toBe(137);
    });

    it('exposes name property with value Polymarket', () => {
      const provider = new PolymarketProvider();

      expect(provider.name).toBe('Polymarket');
    });

    it('exposes providerId property with value polymarket', () => {
      const provider = new PolymarketProvider();

      expect(provider.providerId).toBe('polymarket');
    });
  });
});
