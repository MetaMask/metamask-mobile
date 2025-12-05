import type { CaipAssetId, Hex } from '@metamask/utils';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { HyperLiquidClientService } from '../../services/HyperLiquidClientService';
import { HyperLiquidSubscriptionService } from '../../services/HyperLiquidSubscriptionService';
import { HyperLiquidWalletService } from '../../services/HyperLiquidWalletService';
import { REFERRAL_CONFIG } from '../../constants/hyperLiquidConfig';
import {
  validateAssetSupport,
  validateBalance,
  validateCoinExists,
  validateDepositParams,
  validateOrderParams,
  validateWithdrawalParams,
} from '../../utils/hyperLiquidValidation';
import {
  ClosePositionParams,
  DepositParams,
  LiveDataConfig,
  OrderParams,
} from '../types';
import { HyperLiquidProvider } from './HyperLiquidProvider';

jest.mock('../../services/HyperLiquidClientService');
jest.mock('../../services/HyperLiquidWalletService');
jest.mock('../../services/HyperLiquidSubscriptionService');

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  setMeasurement: jest.fn(),
  captureException: jest.fn(),
}));
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    // Support both singular and plural minute formatting keys used in code
    if (
      (key === 'time.minutes_format' || key === 'time.minutes_format_plural') &&
      typeof params?.count !== 'undefined'
    ) {
      const count = params.count as number;
      return count === 1 ? `${count} minute` : `${count} minutes`;
    }
    return key;
  }),
}));
jest.mock('../../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: jest.fn().mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        id: 'mock-account-id',
        metadata: { name: 'Test Account' },
      }),
    },
  },
}));
jest.mock('../../utils/hyperLiquidValidation', () => ({
  validateOrderParams: jest.fn(),
  validateWithdrawalParams: jest.fn(),
  validateDepositParams: jest.fn(),
  validateCoinExists: jest.fn(),
  validateAssetSupport: jest.fn(),
  validateBalance: jest.fn(),
  getSupportedPaths: jest
    .fn()
    .mockReturnValue([
      'eip155:42161/erc20:0xa0b86a33e6776e681a06e0e1622c5e5e3e6a8b13/default',
      'eip155:1/erc20:0xa0b86a33e6776e681a06e0e1622c5e5e3e6a8b13/default',
    ]),
  getBridgeInfo: jest.fn().mockReturnValue({
    chainId: 'eip155:42161',
    contractAddress: '0x1234567890123456789012345678901234567890',
  }),
  createErrorResult: jest.fn((error, defaultResponse) => ({
    ...defaultResponse,
    success: false,
    error: error instanceof Error ? error.message : String(error),
  })),
}));

// Mock adapter functions
jest.mock('../../utils/hyperLiquidAdapter', () => {
  const actual = jest.requireActual('../../utils/hyperLiquidAdapter');
  return {
    ...actual,
    adaptHyperLiquidLedgerUpdateToUserHistoryItem: jest.fn((updates) => {
      // Return mock history items based on input
      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return [];
      }
      return updates.map((_update: unknown) => ({
        type: 'deposit' as const,
        amount: '100',
        timestamp: Date.now(),
        hash: '0x123',
      }));
    }),
  };
});

const MockedHyperLiquidClientService =
  HyperLiquidClientService as jest.MockedClass<typeof HyperLiquidClientService>;
const MockedHyperLiquidWalletService =
  HyperLiquidWalletService as jest.MockedClass<typeof HyperLiquidWalletService>;
const MockedHyperLiquidSubscriptionService =
  HyperLiquidSubscriptionService as jest.MockedClass<
    typeof HyperLiquidSubscriptionService
  >;
const mockValidateOrderParams = validateOrderParams as jest.MockedFunction<
  typeof validateOrderParams
>;
const mockValidateWithdrawalParams =
  validateWithdrawalParams as jest.MockedFunction<
    typeof validateWithdrawalParams
  >;
const mockValidateDepositParams = validateDepositParams as jest.MockedFunction<
  typeof validateDepositParams
>;
const mockValidateCoinExists = validateCoinExists as jest.MockedFunction<
  typeof validateCoinExists
>;
const mockValidateAssetSupport = validateAssetSupport as jest.MockedFunction<
  typeof validateAssetSupport
>;
const mockValidateBalance = validateBalance as jest.MockedFunction<
  typeof validateBalance
>;

// Mock factory functions - defined once, reused everywhere
// These reduce duplication and make tests more maintainable
const createMockInfoClient = (overrides: Record<string, unknown> = {}) => ({
  clearinghouseState: jest.fn().mockResolvedValue({
    marginSummary: {
      totalMarginUsed: '500',
      accountValue: '10500',
    },
    withdrawable: '9500',
    assetPositions: [
      {
        position: {
          coin: 'BTC',
          szi: '0.1',
          entryPx: '50000',
          positionValue: '5000',
          unrealizedPnl: '100',
          marginUsed: '500',
          leverage: { type: 'cross', value: 10 },
          liquidationPx: '45000',
          maxLeverage: 50,
          returnOnEquity: '20',
          cumFunding: { allTime: '10', sinceOpen: '5', sinceChange: '2' },
        },
        type: 'oneWay',
      },
      {
        position: {
          coin: 'ETH',
          szi: '1.5',
          entryPx: '3000',
          positionValue: '4500',
          unrealizedPnl: '50',
          marginUsed: '450',
          leverage: { type: 'cross', value: 10 },
          liquidationPx: '2700',
          maxLeverage: 50,
          returnOnEquity: '10',
          cumFunding: { allTime: '5', sinceOpen: '2', sinceChange: '1' },
        },
        type: 'oneWay',
      },
    ],
    crossMarginSummary: {
      accountValue: '10000',
      totalMarginUsed: '5000',
    },
  }),
  spotClearinghouseState: jest.fn().mockResolvedValue({
    balances: [{ coin: 'USDC', hold: '1000', total: '10000' }],
  }),
  meta: jest.fn().mockResolvedValue({
    universe: [
      { name: 'BTC', szDecimals: 3, maxLeverage: 50 },
      { name: 'ETH', szDecimals: 4, maxLeverage: 50 },
    ],
  }),
  perpDexs: jest.fn().mockResolvedValue([null]),
  allMids: jest.fn().mockResolvedValue({ BTC: '50000', ETH: '3000' }),
  frontendOpenOrders: jest.fn().mockResolvedValue([]),
  referral: jest.fn().mockResolvedValue({
    referrerState: {
      stage: 'ready',
      data: { code: 'MMCSI' },
    },
  }),
  maxBuilderFee: jest.fn().mockResolvedValue(1),
  userFees: jest.fn().mockResolvedValue({
    feeSchedule: {
      cross: '0.00030',
      add: '0.00010',
      spotCross: '0.00040',
      spotAdd: '0.00020',
    },
    dailyUserVlm: [],
  }),
  userNonFundingLedgerUpdates: jest.fn().mockResolvedValue([
    {
      delta: { type: 'deposit', usdc: '100' },
      time: Date.now(),
      hash: '0x123abc',
    },
    {
      delta: { type: 'withdraw', usdc: '50' },
      time: Date.now() - 3600000,
      hash: '0x456def',
    },
  ]),
  portfolio: jest.fn().mockResolvedValue([
    null,
    [
      null,
      {
        accountValueHistory: [
          [Date.now() - 86400000, '10000'], // 24h ago
          [Date.now() - 172800000, '9500'], // 48h ago
          [Date.now() - 259200000, '9000'], // 72h ago
        ],
      },
    ],
  ]),
  spotMeta: jest.fn().mockResolvedValue({
    tokens: [
      { name: 'USDC', tokenId: '0xdef456' },
      { name: 'USDT', tokenId: '0x789abc' },
    ],
  }),
  ...overrides,
});

const createMockExchangeClient = (overrides: Record<string, unknown> = {}) => ({
  order: jest.fn().mockResolvedValue({
    status: 'ok',
    response: { data: { statuses: [{ resting: { oid: 123 } }] } },
  }),
  modify: jest.fn().mockResolvedValue({
    status: 'ok',
    response: { data: { statuses: [{ resting: { oid: '123' } }] } },
  }),
  cancel: jest.fn().mockResolvedValue({
    status: 'ok',
    response: { data: { statuses: ['success'] } },
  }),
  withdraw3: jest.fn().mockResolvedValue({
    status: 'ok',
  }),
  updateLeverage: jest.fn().mockResolvedValue({
    status: 'ok',
  }),
  approveBuilderFee: jest.fn().mockResolvedValue({
    status: 'ok',
  }),
  setReferrer: jest.fn().mockResolvedValue({
    status: 'ok',
  }),
  sendAsset: jest.fn().mockResolvedValue({
    status: 'ok',
  }),
  agentEnableDexAbstraction: jest.fn().mockResolvedValue({
    status: 'ok',
  }),
  ...overrides,
});

describe('HyperLiquidProvider', () => {
  let provider: HyperLiquidProvider;
  let mockClientService: jest.Mocked<HyperLiquidClientService>;
  let mockWalletService: jest.Mocked<HyperLiquidWalletService>;
  let mockSubscriptionService: jest.Mocked<HyperLiquidSubscriptionService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mocked service instances using factory functions
    mockClientService = {
      initialize: jest.fn(),
      isInitialized: jest.fn().mockReturnValue(true),
      isTestnetMode: jest.fn().mockReturnValue(false),
      ensureInitialized: jest.fn(),
      getExchangeClient: jest.fn().mockReturnValue(createMockExchangeClient()),
      getInfoClient: jest.fn().mockReturnValue(createMockInfoClient()),
      disconnect: jest.fn().mockResolvedValue(undefined),
      toggleTestnet: jest.fn(),
      setTestnetMode: jest.fn(),
      getNetwork: jest.fn().mockReturnValue('mainnet'),
      ensureSubscriptionClient: jest.fn(),
      getSubscriptionClient: jest.fn(),
    } as Partial<HyperLiquidClientService> as jest.Mocked<HyperLiquidClientService>;

    mockWalletService = {
      setTestnetMode: jest.fn(),
      getCurrentAccountId: jest
        .fn()
        .mockReturnValue(
          'eip155:42161:0x1234567890123456789012345678901234567890',
        ),
      createWalletAdapter: jest.fn().mockReturnValue({
        request: jest
          .fn()
          .mockResolvedValue(['0x1234567890123456789012345678901234567890']),
      }),
      getUserAddress: jest
        .fn()
        .mockReturnValue('0x1234567890123456789012345678901234567890'),
      getUserAddressWithDefault: jest
        .fn()
        .mockResolvedValue('0x1234567890123456789012345678901234567890'),
    } as Partial<HyperLiquidWalletService> as jest.Mocked<HyperLiquidWalletService>;

    mockSubscriptionService = {
      subscribeToPrices: jest.fn().mockResolvedValue(jest.fn()), // Returns Promise
      subscribeToPositions: jest.fn().mockReturnValue(jest.fn()), // Returns function directly
      subscribeToOrderFills: jest.fn().mockReturnValue(jest.fn()), // Returns function directly
      clearAll: jest.fn(),
      isPositionsCacheInitialized: jest.fn().mockReturnValue(false),
      getCachedPositions: jest.fn().mockReturnValue([]),
      updateFeatureFlags: jest.fn().mockResolvedValue(undefined),
    } as Partial<HyperLiquidSubscriptionService> as jest.Mocked<HyperLiquidSubscriptionService>;

    // Mock constructors
    MockedHyperLiquidClientService.mockImplementation(() => mockClientService);
    MockedHyperLiquidWalletService.mockImplementation(() => mockWalletService);
    MockedHyperLiquidSubscriptionService.mockImplementation(
      () => mockSubscriptionService,
    );

    // Mock validation
    mockValidateOrderParams.mockReturnValue({ isValid: true });
    mockValidateWithdrawalParams.mockReturnValue({ isValid: true });
    mockValidateDepositParams.mockReturnValue({ isValid: true });
    mockValidateCoinExists.mockReturnValue({ isValid: true });
    mockValidateAssetSupport.mockReturnValue({ isValid: true });
    mockValidateBalance.mockReturnValue({ isValid: true });

    provider = new HyperLiquidProvider();

    // Mock the asset mapping that gets built during ensureReady
    Object.defineProperty(provider, 'coinToAssetId', {
      value: new Map([
        ['BTC', 0],
        ['ETH', 1],
      ]),
      writable: true,
    });
    Object.defineProperty(provider, 'assetIdToCoin', {
      value: new Map([
        [0, 'BTC'],
        [1, 'ETH'],
      ]),
      writable: true,
    });
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default mainnet configuration', () => {
      expect(provider).toBeDefined();
      expect(provider.protocolId).toBe('hyperliquid');
    });

    it('should initialize with testnet configuration', () => {
      const testnetProvider = new HyperLiquidProvider({ isTestnet: true });
      expect(testnetProvider).toBeDefined();
      expect(testnetProvider.protocolId).toBe('hyperliquid');
    });

    it('should initialize provider successfully', async () => {
      const result = await provider.initialize();

      expect(result.success).toBe(true);
      expect(mockClientService.initialize).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockClientService.initialize.mockImplementationOnce(() => {
        throw new Error('Init failed');
      });

      const result = await provider.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Init failed');
    });

    it('initializes with HIP-3 disabled when hip3Enabled is false', async () => {
      const disabledProvider = new HyperLiquidProvider({
        hip3Enabled: false,
      });

      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          perpDexs: jest
            .fn()
            .mockResolvedValue([
              null,
              { name: 'dex1', url: 'https://dex1.example' },
            ]),
        }),
      );

      await disabledProvider.initialize();

      const markets = await disabledProvider.getMarkets();
      expect(Array.isArray(markets)).toBe(true);
    });

    it('falls back to main DEX when perpDexs returns invalid response', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          perpDexs: jest.fn().mockResolvedValue(null),
        }),
      );

      await provider.initialize();

      const markets = await provider.getMarkets();
      expect(Array.isArray(markets)).toBe(true);
    });

    it('handles perpDexs array with null entries', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          perpDexs: jest
            .fn()
            .mockResolvedValue([
              null,
              { name: 'dex1', url: 'https://dex1.example' },
              null,
            ]),
        }),
      );

      await provider.initialize();

      const markets = await provider.getMarkets();
      expect(Array.isArray(markets)).toBe(true);
    });
  });

  describe('Route Management', () => {
    it('should get deposit routes with constraints', () => {
      const routes = provider.getDepositRoutes();
      expect(Array.isArray(routes)).toBe(true);

      // Check that routes have constraints
      if (routes.length > 0) {
        const route = routes[0];
        expect(route.constraints).toBeDefined();
        expect(route.constraints?.minAmount).toBe('1.01');
        expect(route.constraints?.estimatedTime).toBe('5 minutes');
        expect(route.constraints?.fees).toEqual({
          fixed: 1,
          token: 'USDC',
        });
      }
    });

    it('should get withdrawal routes with constraints', () => {
      const routes = provider.getWithdrawalRoutes();
      expect(Array.isArray(routes)).toBe(true);

      // Check that routes have constraints (same as deposit routes)
      if (routes.length > 0) {
        const route = routes[0];
        expect(route.constraints).toBeDefined();
        expect(route.constraints?.minAmount).toBe('1.01');
        expect(route.constraints?.estimatedTime).toBe('5 minutes');
        expect(route.constraints?.fees).toEqual({
          fixed: 1,
          token: 'USDC',
        });
      }
    });

    it('should filter routes by parameters', () => {
      const params = { isTestnet: true };
      const routes = provider.getDepositRoutes(params);

      expect(Array.isArray(routes)).toBe(true);
    });
  });

  describe('Trading Operations', () => {
    it('should place a market order successfully', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        currentPrice: 50000,
      };

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('123');

      // Verify market orders use FrontendMarket (HyperLiquid standard for market execution)
      expect(mockClientService.getExchangeClient().order).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: [
            expect.objectContaining({
              t: { limit: { tif: 'FrontendMarket' } },
            }),
          ],
        }),
      );
    });

    it('should place a limit order successfully', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        price: '51000',
        orderType: 'limit',
      };

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(true);

      // Verify limit orders use Gtc (standard limit order behavior)
      expect(mockClientService.getExchangeClient().order).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: [
            expect.objectContaining({
              t: { limit: { tif: 'Gtc' } },
            }),
          ],
        }),
      );
    });

    it('should use Gtc TIF for limit orders (regression test)', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        price: '51000',
        orderType: 'limit',
      };

      await provider.placeOrder(orderParams);

      // Verify that the order was called with Gtc TIF for limit orders
      expect(mockClientService.getExchangeClient().order).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: [
            expect.objectContaining({
              a: 0, // BTC asset ID
              b: true, // isBuy
              t: { limit: { tif: 'Gtc' } }, // Limit orders use Gtc TIF
            }),
          ],
        }),
      );
    });

    it('should track performance measurements when placing order', async () => {
      const orderParams: OrderParams = {
        coin: 'ETH',
        isBuy: true,
        size: '1.0',
        orderType: 'market',
        leverage: 10,
        currentPrice: 3000, // ETH price for USD calculation
      };

      await provider.placeOrder(orderParams);
    });

    it('should calculate USD position size correctly for market orders', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.5', // 0.5 BTC
        orderType: 'market',
        currentPrice: 45000, // BTC at $45,000
      };

      await provider.placeOrder(orderParams);
    });

    it('should calculate USD position size correctly for limit orders', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.2', // 0.2 BTC
        orderType: 'limit',
        price: '44000', // Limit price at $44,000
        currentPrice: 45000, // Current price (not used for USD calculation in limit orders)
      };

      await provider.placeOrder(orderParams);
    });

    it('should handle order placement errors', async () => {
      (
        mockClientService.getExchangeClient().order as jest.Mock
      ).mockResolvedValueOnce({
        status: 'error',
        response: { message: 'Order failed' },
      });

      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      };

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(false);
    });

    it('should edit an order successfully', async () => {
      const editParams = {
        orderId: '123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          size: '0.2',
          price: '52000',
          orderType: 'limit',
        } as OrderParams,
      };

      const result = await provider.editOrder(editParams);

      expect(result.success).toBe(true);

      // Verify limit orders use Gtc TIF in edit operations
      expect(mockClientService.getExchangeClient().modify).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.objectContaining({
            t: { limit: { tif: 'Gtc' } },
          }),
        }),
      );
    });

    it('should edit a market order with slippage calculation', async () => {
      const editParams = {
        orderId: '123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          slippage: 0.02, // 2% slippage
        } as OrderParams,
      };

      const result = await provider.editOrder(editParams);

      expect(result.success).toBe(true);
      expect(mockClientService.getInfoClient().allMids).toHaveBeenCalled();

      // Verify market orders use FrontendMarket TIF in edit operations
      expect(mockClientService.getExchangeClient().modify).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.objectContaining({
            t: { limit: { tif: 'FrontendMarket' } },
          }),
        }),
      );
    });

    it('should handle editOrder when asset is not found', async () => {
      (
        mockClientService.getInfoClient().meta as jest.Mock
      ).mockResolvedValueOnce({
        universe: [], // Empty universe - asset not found
      });

      const editParams = {
        orderId: '123',
        newOrder: {
          coin: 'UNKNOWN',
          isBuy: true,
          size: '0.1',
          orderType: 'limit',
          price: '50000',
        } as OrderParams,
      };

      const result = await provider.editOrder(editParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Asset UNKNOWN not found');
    });

    it('should handle editOrder when no price is available', async () => {
      (
        mockClientService.getInfoClient().allMids as jest.Mock
      ).mockResolvedValueOnce({}); // Empty price data

      const editParams = {
        orderId: '123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
        } as OrderParams,
      };

      const result = await provider.editOrder(editParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No price available for BTC');
    });

    it('should handle editOrder when asset ID is not found', async () => {
      // Create a spy on the coinToAssetId.get method to return undefined for BTC
      // eslint-disable-next-line dot-notation
      const originalGet = provider['coinToAssetId'].get;
      jest
        // eslint-disable-next-line dot-notation
        .spyOn(provider['coinToAssetId'], 'get')
        .mockImplementation((coin) => {
          if (coin === 'BTC') {
            return undefined; // Simulate BTC not found in mapping
          }
          // eslint-disable-next-line dot-notation
          return originalGet.call(provider['coinToAssetId'], coin);
        });

      const editParams = {
        orderId: '123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'limit',
          price: '50000',
        } as OrderParams,
      };

      const result = await provider.editOrder(editParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Asset ID not found for BTC');

      // Restore the original method
      jest.restoreAllMocks();
    });

    it('should cancel an order successfully', async () => {
      const cancelParams = {
        orderId: '123',
        coin: 'BTC',
      };

      const result = await provider.cancelOrder(cancelParams);

      expect(result.success).toBe(true);
    });

    it('retries USD-based order when rejected for $10 minimum with adjusted amount', async () => {
      // Add PUMP to the asset mapping
      Object.defineProperty(provider, 'coinToAssetId', {
        value: new Map([
          ['BTC', 0],
          ['ETH', 1],
          ['PUMP', 2],
        ]),
        writable: true,
      });
      Object.defineProperty(provider, 'assetIdToCoin', {
        value: new Map([
          [0, 'BTC'],
          [1, 'ETH'],
          [2, 'PUMP'],
        ]),
        writable: true,
      });

      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          meta: jest.fn().mockResolvedValue({
            universe: [
              { name: 'BTC', szDecimals: 3, maxLeverage: 50 },
              { name: 'ETH', szDecimals: 4, maxLeverage: 50 },
              { name: 'PUMP', szDecimals: 2, maxLeverage: 20 },
            ],
          }),
          allMids: jest
            .fn()
            .mockResolvedValue({ BTC: '50000', ETH: '3000', PUMP: '0.003918' }),
        }),
      );

      const orderParams: OrderParams = {
        coin: 'PUMP',
        isBuy: true,
        size: '2553',
        orderType: 'market',
        usdAmount: '10.00',
        currentPrice: 0.003918,
      };

      mockClientService.getExchangeClient = jest.fn().mockReturnValue({
        ...createMockExchangeClient(),
        order: jest
          .fn()
          .mockRejectedValueOnce(
            new Error('Order must have minimum value of $10'),
          )
          .mockResolvedValueOnce({
            status: 'ok',
            response: { data: { statuses: [{ resting: { oid: 456 } }] } },
          }),
      });

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(true);
      expect(mockClientService.getExchangeClient().order).toHaveBeenCalledTimes(
        2,
      );
    });

    it('retries size-based order with currentPrice when rejected for $10 minimum', async () => {
      // Add PUMP to the asset mapping
      Object.defineProperty(provider, 'coinToAssetId', {
        value: new Map([
          ['BTC', 0],
          ['ETH', 1],
          ['PUMP', 2],
        ]),
        writable: true,
      });
      Object.defineProperty(provider, 'assetIdToCoin', {
        value: new Map([
          [0, 'BTC'],
          [1, 'ETH'],
          [2, 'PUMP'],
        ]),
        writable: true,
      });

      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          meta: jest.fn().mockResolvedValue({
            universe: [
              { name: 'BTC', szDecimals: 3, maxLeverage: 50 },
              { name: 'ETH', szDecimals: 4, maxLeverage: 50 },
              { name: 'PUMP', szDecimals: 2, maxLeverage: 20 },
            ],
          }),
          allMids: jest
            .fn()
            .mockResolvedValue({ BTC: '50000', ETH: '3000', PUMP: '0.003918' }),
        }),
      );

      const orderParams: OrderParams = {
        coin: 'PUMP',
        isBuy: true,
        size: '2553',
        orderType: 'market',
        currentPrice: 0.003918,
      };

      mockClientService.getExchangeClient = jest.fn().mockReturnValue({
        ...createMockExchangeClient(),
        order: jest
          .fn()
          .mockRejectedValueOnce(
            new Error('Order 0: Order must have minimum value'),
          )
          .mockResolvedValueOnce({
            status: 'ok',
            response: { data: { statuses: [{ resting: { oid: 789 } }] } },
          }),
      });

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(true);
      expect(mockClientService.getExchangeClient().order).toHaveBeenCalledTimes(
        2,
      );
    });

    it('validates price requirement before attempting order placement', async () => {
      // Add PUMP to the asset mapping
      Object.defineProperty(provider, 'coinToAssetId', {
        value: new Map([
          ['BTC', 0],
          ['ETH', 1],
          ['PUMP', 2],
        ]),
        writable: true,
      });
      Object.defineProperty(provider, 'assetIdToCoin', {
        value: new Map([
          [0, 'BTC'],
          [1, 'ETH'],
          [2, 'PUMP'],
        ]),
        writable: true,
      });

      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          meta: jest.fn().mockResolvedValue({
            universe: [
              { name: 'BTC', szDecimals: 3, maxLeverage: 50 },
              { name: 'ETH', szDecimals: 4, maxLeverage: 50 },
              { name: 'PUMP', szDecimals: 2, maxLeverage: 20 },
            ],
          }),
          allMids: jest
            .fn()
            .mockResolvedValue({ BTC: '50000', ETH: '3000', PUMP: '0.003918' }),
        }),
      );

      const orderParams: OrderParams = {
        coin: 'PUMP',
        isBuy: true,
        size: '2553',
        orderType: 'market',
      };

      mockClientService.getExchangeClient = jest.fn().mockReturnValue({
        ...createMockExchangeClient(),
        order: jest
          .fn()
          .mockRejectedValueOnce(
            new Error('Order must have minimum value of $10'),
          ),
      });

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('perps.order.validation.price_required');
      expect(
        mockClientService.getExchangeClient().order,
      ).not.toHaveBeenCalled();
    });

    it('closes a position successfully', async () => {
      const closeParams: ClosePositionParams = {
        coin: 'BTC',
        orderType: 'market',
      };

      const result = await provider.closePosition(closeParams);

      expect(result.success).toBe(true);
    });
  });

  describe('closePosition with TP/SL handling', () => {
    beforeEach(() => {
      // Mock DevLogger to capture logs
      jest.spyOn(DevLogger, 'log');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should close position without TP/SL successfully', async () => {
      // Position without TP/SL - using factory for standard BTC position
      mockClientService.getInfoClient = jest
        .fn()
        .mockReturnValue(createMockInfoClient());

      const closeParams: ClosePositionParams = {
        coin: 'BTC',
        orderType: 'market',
      };

      const result = await provider.closePosition(closeParams);

      expect(result.success).toBe(true);
      // No TP/SL logging expected since we removed this functionality
    });

    it('should handle position with TP/SL successfully', async () => {
      // Mock position with TP/SL
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        clearinghouseState: jest.fn().mockResolvedValue({
          marginSummary: {
            totalMarginUsed: '500',
            accountValue: '10500',
          },
          withdrawable: '9500',
          assetPositions: [
            {
              position: {
                coin: 'BTC',
                szi: '0.1',
                entryPx: '50000',
                positionValue: '5000',
                unrealizedPnl: '100',
                marginUsed: '500',
                leverage: { type: 'cross', value: 10 },
                liquidationPx: '45000',
                maxLeverage: 50,
                returnOnEquity: '20',
                cumFunding: {
                  allTime: '10',
                  sinceOpen: '5',
                  sinceChange: '2',
                },
              },
              type: 'oneWay',
            },
          ],
        }),
        frontendOpenOrders: jest
          .fn()
          .mockResolvedValueOnce([
            // First call for getPositions
            {
              coin: 'BTC',
              oid: 1001,
              reduceOnly: true,
              isTrigger: true,
              orderType: 'Take Profit Market',
              triggerPx: '55000',
              isPositionTpsl: true,
            },
            {
              coin: 'BTC',
              oid: 1002,
              reduceOnly: true,
              isTrigger: true,
              orderType: 'Stop Market',
              triggerPx: '45000',
              isPositionTpsl: true,
            },
          ])
          .mockResolvedValueOnce([
            // Second call for closePosition TP/SL check
            {
              coin: 'BTC',
              oid: 1001,
              reduceOnly: true,
              isTrigger: true,
              orderType: 'Take Profit Market',
              triggerPx: '55000',
              isPositionTpsl: true,
              side: 'A',
            },
            {
              coin: 'BTC',
              oid: 1002,
              reduceOnly: true,
              isTrigger: true,
              orderType: 'Stop Market',
              triggerPx: '45000',
              isPositionTpsl: true,
              side: 'B',
            },
          ]),
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 50 }],
        }),
        perpDexs: jest.fn().mockResolvedValue([null]),
        allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'ready',
            data: { code: 'MMCSI' },
          },
        }),
        maxBuilderFee: jest.fn().mockResolvedValue(1),
      });

      const closeParams: ClosePositionParams = {
        coin: 'BTC',
        orderType: 'market',
      };

      const result = await provider.closePosition(closeParams);

      expect(result.success).toBe(true);

      // TP/SL orders are automatically handled by Hyperliquid
      // No additional logging needed
    });

    it('should handle partial position close with TP/SL', async () => {
      // Mock position with TP/SL
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        clearinghouseState: jest.fn().mockResolvedValue({
          marginSummary: {
            totalMarginUsed: '500',
            accountValue: '10500',
          },
          withdrawable: '9500',
          assetPositions: [
            {
              position: {
                coin: 'ETH',
                szi: '1.5',
                entryPx: '3000',
                positionValue: '4500',
                unrealizedPnl: '50',
                marginUsed: '450',
                leverage: { type: 'cross', value: 10 },
                liquidationPx: '2700',
                maxLeverage: 50,
                returnOnEquity: '10',
                cumFunding: {
                  allTime: '5',
                  sinceOpen: '2',
                  sinceChange: '1',
                },
              },
              type: 'oneWay',
            },
          ],
        }),
        frontendOpenOrders: jest
          .fn()
          .mockResolvedValueOnce([
            // First call for getPositions
            {
              coin: 'ETH',
              oid: 2001,
              reduceOnly: true,
              isTrigger: true,
              orderType: 'Take Profit Limit',
              triggerPx: '3500',
              limitPx: '3490',
              isPositionTpsl: true,
            },
          ])
          .mockResolvedValueOnce([
            // Second call for closePosition TP/SL check
            {
              coin: 'ETH',
              oid: 2001,
              reduceOnly: true,
              isTrigger: true,
              orderType: 'Take Profit Limit',
              triggerPx: '3500',
              limitPx: '3490',
              isPositionTpsl: true,
              side: 'A',
            },
          ]),
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'ETH', szDecimals: 4, maxLeverage: 50 }],
        }),
        perpDexs: jest.fn().mockResolvedValue([null]),
        allMids: jest.fn().mockResolvedValue({ ETH: '3000' }),
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'ready',
            data: { code: 'MMCSI' },
          },
        }),
        maxBuilderFee: jest.fn().mockResolvedValue(1),
      });

      const closeParams: ClosePositionParams = {
        coin: 'ETH',
        size: '0.5', // Partial close
        orderType: 'limit',
        price: '3100',
      };

      const result = await provider.closePosition(closeParams);

      expect(result.success).toBe(true);

      // Verify partial close size is used (with HyperLiquid's short property names)
      expect(mockClientService.getExchangeClient().order).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: [
            expect.objectContaining({
              s: '0.5', // 's' is the short form for 'sz' (size)
              r: true, // 'r' is the short form for 'reduceOnly'
            }),
          ],
        }),
      );

      // TP/SL orders are automatically handled by Hyperliquid for partial closes too
    });

    it('should handle position without open TP/SL orders', async () => {
      // Position exists but no open TP/SL orders
      mockClientService.getInfoClient = jest
        .fn()
        .mockReturnValue(createMockInfoClient());

      const closeParams: ClosePositionParams = {
        coin: 'BTC',
        orderType: 'market',
      };

      const result = await provider.closePosition(closeParams);

      expect(result.success).toBe(true);

      // Should not log TP/SL related messages
      expect(DevLogger.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Found open TP/SL orders'),
        expect.any(Object),
      );
    });

    it('should handle close position when position not found', async () => {
      // Override to have NO positions (empty array)
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          clearinghouseState: jest.fn().mockResolvedValue({
            marginSummary: { totalMarginUsed: '0', accountValue: '10000' },
            withdrawable: '10000',
            assetPositions: [], // No positions
            crossMarginSummary: { accountValue: '10000', totalMarginUsed: '0' },
          }),
        }),
      );

      const closeParams: ClosePositionParams = {
        coin: 'BTC',
        orderType: 'market',
      };

      const result = await provider.closePosition(closeParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No position found for BTC');
    });

    it('should handle short position close with TP/SL', async () => {
      // Mock short position with TP/SL
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        clearinghouseState: jest.fn().mockResolvedValue({
          marginSummary: {
            totalMarginUsed: '500',
            accountValue: '10500',
          },
          withdrawable: '9500',
          assetPositions: [
            {
              position: {
                coin: 'BTC',
                szi: '-0.1', // Short position
                entryPx: '50000',
                positionValue: '5000',
                unrealizedPnl: '-100',
                marginUsed: '500',
                leverage: { type: 'cross', value: 10 },
                liquidationPx: '55000',
                maxLeverage: 50,
                returnOnEquity: '-20',
                cumFunding: {
                  allTime: '10',
                  sinceOpen: '5',
                  sinceChange: '2',
                },
              },
              type: 'oneWay',
            },
          ],
        }),
        frontendOpenOrders: jest
          .fn()
          .mockResolvedValueOnce([
            // First call for getPositions - short position TP/SL
            {
              coin: 'BTC',
              oid: 3001,
              reduceOnly: true,
              isTrigger: true,
              orderType: 'Take Profit Market',
              triggerPx: '45000', // TP below entry for short
              isPositionTpsl: true,
            },
            {
              coin: 'BTC',
              oid: 3002,
              reduceOnly: true,
              isTrigger: true,
              orderType: 'Stop Market',
              triggerPx: '55000', // SL above entry for short
              isPositionTpsl: true,
            },
          ])
          .mockResolvedValueOnce([
            // Second call for closePosition TP/SL check
            {
              coin: 'BTC',
              oid: 3001,
              reduceOnly: true,
              isTrigger: true,
              orderType: 'Take Profit Market',
              triggerPx: '45000',
              isPositionTpsl: true,
              side: 'B',
            },
            {
              coin: 'BTC',
              oid: 3002,
              reduceOnly: true,
              isTrigger: true,
              orderType: 'Stop Market',
              triggerPx: '55000',
              isPositionTpsl: true,
              side: 'A',
            },
          ]),
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 50 }],
        }),
        perpDexs: jest.fn().mockResolvedValue([null]),
        allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'ready',
            data: { code: 'MMCSI' },
          },
        }),
        maxBuilderFee: jest.fn().mockResolvedValue(1),
      });

      const closeParams: ClosePositionParams = {
        coin: 'BTC',
        orderType: 'market',
      };

      const result = await provider.closePosition(closeParams);

      expect(result.success).toBe(true);

      // Verify buy order is placed to close short (with HyperLiquid's short property names)
      expect(mockClientService.getExchangeClient().order).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: [
            expect.objectContaining({
              b: true, // 'b' is the short form for 'isBuy' (Buy to close short)
              s: '0.1', // 's' is the short form for 'sz' (size)
              r: true, // 'r' is the short form for 'reduceOnly'
            }),
          ],
        }),
      );

      // TP/SL orders are automatically handled by Hyperliquid for short positions too
    });

    it('should handle position close even if TP/SL info is unavailable', async () => {
      // Mock position exists with TP/SL in positions call
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        clearinghouseState: jest.fn().mockResolvedValue({
          marginSummary: {
            totalMarginUsed: '500',
            accountValue: '10500',
          },
          withdrawable: '9500',
          assetPositions: [
            {
              position: {
                coin: 'BTC',
                szi: '0.1',
                entryPx: '50000',
                positionValue: '5000',
                unrealizedPnl: '100',
                marginUsed: '500',
                leverage: { type: 'cross', value: 10 },
                liquidationPx: '45000',
                maxLeverage: 50,
                returnOnEquity: '20',
                cumFunding: {
                  allTime: '10',
                  sinceOpen: '5',
                  sinceChange: '2',
                },
              },
              type: 'oneWay',
            },
          ],
        }),
        frontendOpenOrders: jest.fn().mockResolvedValueOnce([
          // First call for getPositions with TP/SL
          {
            coin: 'BTC',
            oid: 1001,
            reduceOnly: true,
            isTrigger: true,
            orderType: 'Take Profit Market',
            triggerPx: '55000',
            isPositionTpsl: true,
          },
        ]),
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 50 }],
        }),
        perpDexs: jest.fn().mockResolvedValue([null]),
        allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'ready',
            data: { code: 'MMCSI' },
          },
        }),
        maxBuilderFee: jest.fn().mockResolvedValue(1),
      });

      const closeParams: ClosePositionParams = {
        coin: 'BTC',
        orderType: 'market',
      };

      const result = await provider.closePosition(closeParams);

      // Should succeed - TP/SL handling is automatic by Hyperliquid
      expect(result.success).toBe(true);
    });
  });

  describe('Batch Operations', () => {
    describe('cancelOrders', () => {
      it('returns failure when no orders provided', async () => {
        const result = await provider.cancelOrders([]);

        expect(result.success).toBe(false);
        expect(result.successCount).toBe(0);
        expect(result.failureCount).toBe(0);
        expect(result.results).toEqual([]);
      });

      it('cancels multiple orders successfully', async () => {
        mockClientService.getExchangeClient = jest.fn().mockReturnValue(
          createMockExchangeClient({
            cancel: jest.fn().mockResolvedValue({
              response: {
                data: {
                  statuses: ['success', 'success'],
                },
              },
            }),
          }),
        );

        const params = [
          { orderId: '123', coin: 'BTC' },
          { orderId: '456', coin: 'ETH' },
        ];

        const result = await provider.cancelOrders(params);

        expect(result.success).toBe(true);
        expect(result.successCount).toBe(2);
        expect(result.failureCount).toBe(0);
        expect(result.results).toHaveLength(2);
        expect(result.results[0].success).toBe(true);
      });

      it('handles batch cancel errors', async () => {
        mockClientService.getExchangeClient = jest.fn().mockReturnValue(
          createMockExchangeClient({
            cancel: jest.fn().mockRejectedValue(new Error('API error')),
          }),
        );

        const params = [{ orderId: '123', coin: 'BTC' }];

        const result = await provider.cancelOrders(params);

        expect(result.success).toBe(false);
        expect(result.successCount).toBe(0);
        expect(result.failureCount).toBe(1);
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].error).toBe('API error');
      });
    });

    describe('closePositions', () => {
      it('returns failure when no positions to close', async () => {
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            clearinghouseState: jest.fn().mockResolvedValue({
              marginSummary: { totalMarginUsed: '0', accountValue: '10000' },
              withdrawable: '10000',
              assetPositions: [],
              crossMarginSummary: {
                accountValue: '10000',
                totalMarginUsed: '0',
              },
            }),
          }),
        );

        const result = await provider.closePositions({ closeAll: true });

        expect(result.success).toBe(false);
        expect(result.successCount).toBe(0);
        expect(result.failureCount).toBe(0);
        expect(result.results).toEqual([]);
      });

      it('closes multiple positions successfully', async () => {
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            clearinghouseState: jest.fn().mockResolvedValue({
              marginSummary: { totalMarginUsed: '1500', accountValue: '11500' },
              withdrawable: '10000',
              assetPositions: [
                {
                  position: {
                    coin: 'BTC',
                    szi: '1.5',
                    entryPx: '50000',
                    positionValue: '75000',
                    unrealizedPnl: '100',
                    marginUsed: '1000',
                    leverage: { type: 'cross', value: 10 },
                    liquidationPx: '45000',
                  },
                  type: 'oneWay',
                },
                {
                  position: {
                    coin: 'ETH',
                    szi: '-2.0',
                    entryPx: '3000',
                    positionValue: '6000',
                    unrealizedPnl: '50',
                    marginUsed: '500',
                    leverage: { type: 'cross', value: 10 },
                    liquidationPx: '3300',
                  },
                  type: 'oneWay',
                },
              ],
              crossMarginSummary: {
                accountValue: '11500',
                totalMarginUsed: '1500',
              },
            }),
            meta: jest.fn().mockResolvedValue({
              universe: [
                { name: 'BTC', szDecimals: 3, maxLeverage: 50 },
                { name: 'ETH', szDecimals: 4, maxLeverage: 50 },
              ],
            }),
            allMids: jest.fn().mockResolvedValue({
              BTC: '50000',
              ETH: '3000',
            }),
          }),
        );

        mockClientService.getExchangeClient = jest.fn().mockReturnValue(
          createMockExchangeClient({
            order: jest.fn().mockResolvedValue({
              response: {
                data: {
                  statuses: [{ filled: {} }, { filled: {} }],
                },
              },
            }),
          }),
        );

        const result = await provider.closePositions({ closeAll: true });

        expect(result.success).toBe(true);
        expect(result.successCount).toBe(2);
        expect(result.failureCount).toBe(0);
        expect(result.results).toHaveLength(2);
        expect(result.results[0].coin).toBe('BTC');
        expect(result.results[1].coin).toBe('ETH');
      });

      it('handles batch close errors', async () => {
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            clearinghouseState: jest.fn().mockResolvedValue({
              marginSummary: { totalMarginUsed: '1000', accountValue: '11000' },
              withdrawable: '10000',
              assetPositions: [
                {
                  position: {
                    coin: 'BTC',
                    szi: '1.0',
                    entryPx: '50000',
                    positionValue: '50000',
                    unrealizedPnl: '100',
                    marginUsed: '1000',
                    leverage: { type: 'cross', value: 10 },
                    liquidationPx: '45000',
                  },
                  type: 'oneWay',
                },
              ],
              crossMarginSummary: {
                accountValue: '11000',
                totalMarginUsed: '1000',
              },
            }),
          }),
        );

        mockClientService.getExchangeClient = jest.fn().mockReturnValue(
          createMockExchangeClient({
            order: jest.fn().mockRejectedValue(new Error('Order failed')),
          }),
        );

        const result = await provider.closePositions({ closeAll: true });

        expect(result.success).toBe(false);
        expect(result.successCount).toBe(0);
        expect(result.failureCount).toBe(1);
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].error).toBe('Order failed');
      });
    });
  });

  describe('updatePositionTPSL', () => {
    it('should update position TP/SL successfully', async () => {
      const updateParams = {
        coin: 'ETH',
        takeProfitPrice: '3500',
        stopLossPrice: '2500',
      };

      const result = await provider.updatePositionTPSL(updateParams);

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
    });

    it('should handle update with only take profit price', async () => {
      const updateParams = {
        coin: 'ETH',
        takeProfitPrice: '3500',
      };

      const result = await provider.updatePositionTPSL(updateParams);

      expect(result.success).toBe(true);
    });

    it('should handle update with only stop loss price', async () => {
      const updateParams = {
        coin: 'ETH',
        stopLossPrice: '2500',
      };

      const result = await provider.updatePositionTPSL(updateParams);

      expect(result.success).toBe(true);
    });
  });

  describe('Data Retrieval', () => {
    it('should get positions successfully', async () => {
      const positions = await provider.getPositions();

      expect(Array.isArray(positions)).toBe(true);
      expect(positions.length).toBeGreaterThan(0);
      expect(
        mockClientService.getInfoClient().clearinghouseState,
      ).toHaveBeenCalled();
    });

    it('should get account state successfully', async () => {
      const accountState = await provider.getAccountState();

      expect(accountState).toBeDefined();
      expect(accountState.totalBalance).toBe('20500'); // 10000 (spot) + 10500 (perps marginSummary)
      expect(
        mockClientService.getInfoClient().clearinghouseState,
      ).toHaveBeenCalled();
      expect(
        mockClientService.getInfoClient().spotClearinghouseState,
      ).toHaveBeenCalled();
    });

    it('should get markets successfully', async () => {
      const markets = await provider.getMarkets();

      expect(Array.isArray(markets)).toBe(true);
      expect(markets.length).toBeGreaterThan(0);
      expect(mockClientService.getInfoClient().meta).toHaveBeenCalled();
    });

    it('should handle data retrieval errors gracefully', async () => {
      (
        mockClientService.getInfoClient().clearinghouseState as jest.Mock
      ).mockRejectedValueOnce(new Error('API Error'));

      const positions = await provider.getPositions();

      expect(Array.isArray(positions)).toBe(true);
      expect(positions.length).toBe(0);
    });
  });

  describe('Withdrawal Operations', () => {
    it('should process withdrawal successfully', async () => {
      const withdrawParams = {
        amount: '1000',
        destination: '0x1234567890123456789012345678901234567890' as Hex,
        assetId:
          'eip155:42161/erc20:0xa0b86a33e6776e681a06e0e1622c5e5e3e6a8b13/usdc' as CaipAssetId,
      };

      const result = await provider.withdraw(withdrawParams);

      expect(result.success).toBe(true);
    });

    it('should handle withdrawal errors', async () => {
      mockValidateWithdrawalParams.mockReturnValueOnce({
        isValid: false,
        error: 'Invalid withdrawal amount',
      });

      const withdrawParams = {
        amount: '0',
        destination: '0x1234567890123456789012345678901234567890' as Hex,
        assetId:
          'eip155:42161/erc20:0xa0b86a33e6776e681a06e0e1622c5e5e3e6a8b13/usdc' as CaipAssetId,
      };

      const result = await provider.withdraw(withdrawParams);

      expect(result.success).toBe(false);
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to prices', () => {
      const callback = jest.fn();
      const unsubscribe = provider.subscribeToPrices({
        symbols: ['BTC', 'ETH'],
        callback,
      });

      expect(mockSubscriptionService.subscribeToPrices).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should subscribe to positions', () => {
      const callback = jest.fn();
      const unsubscribe = provider.subscribeToPositions({ callback });

      expect(mockSubscriptionService.subscribeToPositions).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should subscribe to order fills', () => {
      const callback = jest.fn();
      const unsubscribe = provider.subscribeToOrderFills({ callback });

      expect(mockSubscriptionService.subscribeToOrderFills).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should set live data config', () => {
      const config: Partial<LiveDataConfig> = {
        priceThrottleMs: 1000,
        positionThrottleMs: 3000,
      };

      provider.setLiveDataConfig(config);

      // Note: This test may need adjustment based on actual implementation
      expect(mockSubscriptionService.clearAll).toBeDefined();
    });
  });

  describe('Provider State Management', () => {
    it('should check if ready to trade', async () => {
      const result = await provider.isReadyToTrade();

      expect(result.ready).toBe(true);
    });

    it('should handle readiness check errors', async () => {
      mockWalletService.getCurrentAccountId.mockImplementationOnce(() => {
        throw new Error('No account selected');
      });

      const result = await provider.isReadyToTrade();

      expect(result.ready).toBe(false);
    });

    it('should toggle testnet mode', async () => {
      const result = await provider.toggleTestnet();

      expect(result.success).toBe(true);
      expect(mockClientService.setTestnetMode).toHaveBeenCalled();
      expect(mockWalletService.setTestnetMode).toHaveBeenCalled();
    });

    it('should disconnect successfully', async () => {
      const result = await provider.disconnect();

      expect(result.success).toBe(true);
      expect(mockClientService.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect errors', async () => {
      mockClientService.disconnect.mockRejectedValueOnce(
        new Error('Disconnect failed'),
      );

      const result = await provider.disconnect();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Disconnect failed');
    });

    describe('ping() health check', () => {
      beforeEach(() => {
        // Spy on ensureReady to prevent it from throwing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(provider as any, 'ensureReady').mockResolvedValue(undefined);
      });

      it('should successfully ping WebSocket connection with default timeout', async () => {
        const mockReady = jest.fn().mockResolvedValue(undefined);
        const mockSubscriptionClient = {
          transport: {
            ready: mockReady,
          },
        };
        mockClientService.getSubscriptionClient.mockReturnValue(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mockSubscriptionClient as any,
        );

        await provider.ping();

        expect(mockReady).toHaveBeenCalled();
        // Verify the AbortSignal was passed
        expect(mockReady.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
      });

      it('should successfully ping WebSocket connection with custom timeout', async () => {
        const mockReady = jest.fn().mockResolvedValue(undefined);
        const mockSubscriptionClient = {
          transport: {
            ready: mockReady,
          },
        };
        mockClientService.getSubscriptionClient.mockReturnValue(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mockSubscriptionClient as any,
        );

        await provider.ping(10000);

        expect(mockReady).toHaveBeenCalled();
        expect(mockReady.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
      });

      it('should throw error when subscription client is not initialized', async () => {
        mockClientService.getSubscriptionClient.mockReturnValue(undefined);

        await expect(provider.ping()).rejects.toThrow(
          'Subscription client not initialized',
        );
      });

      it('should throw CONNECTION_TIMEOUT error when timeout occurs', async () => {
        const mockReady = jest
          .fn()
          .mockImplementation(
            () =>
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Aborted')), 100),
              ),
          );
        const mockSubscriptionClient = {
          transport: {
            ready: mockReady,
          },
        };
        mockClientService.getSubscriptionClient.mockReturnValue(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mockSubscriptionClient as any,
        );

        await expect(provider.ping(50)).rejects.toThrow('CONNECTION_TIMEOUT');
      });

      it('should throw error when WebSocket connection fails', async () => {
        const mockReady = jest
          .fn()
          .mockRejectedValue(new Error('WebSocket closed'));
        const mockSubscriptionClient = {
          transport: {
            ready: mockReady,
          },
        };
        mockClientService.getSubscriptionClient.mockReturnValue(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mockSubscriptionClient as any,
        );

        await expect(provider.ping()).rejects.toThrow('WebSocket closed');
      });
    });
  });

  describe('Asset Mapping', () => {
    it('should handle asset mapping errors', async () => {
      (
        mockClientService.getInfoClient().meta as jest.Mock
      ).mockRejectedValueOnce(new Error('Meta fetch failed'));

      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      };

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors in orders', async () => {
      mockValidateOrderParams.mockReturnValueOnce({
        isValid: false,
        error: 'Invalid order parameters',
      });

      const orderParams: OrderParams = {
        coin: '',
        isBuy: true,
        size: '0',
        orderType: 'market',
      };

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid order parameters');
    });

    it('should handle validation errors in withdrawals', async () => {
      mockValidateWithdrawalParams.mockReturnValueOnce({
        isValid: false,
        error: 'Invalid withdrawal parameters',
      });

      const withdrawParams = {
        amount: '',
        destination: '0x1234567890123456789012345678901234567890' as Hex,
        assetId:
          'eip155:42161/erc20:0xa0b86a33e6776e681a06e0e1622c5e5e3e6a8b13/usdc' as CaipAssetId,
      };

      const result = await provider.withdraw(withdrawParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid withdrawal parameters');
    });

    it('should handle unknown errors gracefully', async () => {
      (
        mockClientService.getInfoClient().clearinghouseState as jest.Mock
      ).mockRejectedValueOnce(new Error('Unknown error'));

      const result = await provider.getPositions();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    describe('error mapping integration', () => {
      it('should map HyperLiquid leverage error in placeOrder to ORDER_LEVERAGE_REDUCTION_FAILED', async () => {
        // Mock placeOrder to throw the specific HyperLiquid error
        mockClientService.getExchangeClient = jest.fn().mockReturnValue({
          order: jest
            .fn()
            .mockRejectedValue(
              new Error(
                'isolated position does not have sufficient margin available to decrease leverage',
              ),
            ),
          updateLeverage: jest.fn().mockResolvedValue({ status: 'ok' }),
          approveBuilderFee: jest.fn().mockResolvedValue({ status: 'ok' }),
          setReferrer: jest.fn().mockResolvedValue({ status: 'ok' }),
        });

        const orderParams: OrderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          currentPrice: 50000,
          leverage: 10,
        };

        const result = await provider.placeOrder(orderParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe('ORDER_LEVERAGE_REDUCTION_FAILED');
      });

      it('should map case insensitive HyperLiquid error', async () => {
        // Mock with uppercase version
        mockClientService.getExchangeClient = jest.fn().mockReturnValue({
          order: jest
            .fn()
            .mockRejectedValue(
              new Error(
                'ISOLATED POSITION DOES NOT HAVE SUFFICIENT MARGIN AVAILABLE TO DECREASE LEVERAGE',
              ),
            ),
          updateLeverage: jest.fn().mockResolvedValue({ status: 'ok' }),
          approveBuilderFee: jest.fn().mockResolvedValue({ status: 'ok' }),
          setReferrer: jest.fn().mockResolvedValue({ status: 'ok' }),
        });

        const orderParams: OrderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          currentPrice: 50000,
          leverage: 10,
        };

        const result = await provider.placeOrder(orderParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe('ORDER_LEVERAGE_REDUCTION_FAILED');
      });

      it('should map partial error message containing the pattern', async () => {
        // Mock with longer error message containing the pattern
        mockClientService.getExchangeClient = jest.fn().mockReturnValue({
          order: jest
            .fn()
            .mockRejectedValue(
              new Error(
                'API Error: isolated position does not have sufficient margin available to decrease leverage. Please check your position.',
              ),
            ),
          updateLeverage: jest.fn().mockResolvedValue({ status: 'ok' }),
          approveBuilderFee: jest.fn().mockResolvedValue({ status: 'ok' }),
          setReferrer: jest.fn().mockResolvedValue({ status: 'ok' }),
        });

        const orderParams: OrderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          currentPrice: 50000,
          leverage: 10,
        };

        const result = await provider.placeOrder(orderParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe('ORDER_LEVERAGE_REDUCTION_FAILED');
      });

      it('should preserve original error message for unmapped errors', async () => {
        // Mock with an unmapped error
        const originalError = new Error('Some other HyperLiquid API error');
        mockClientService.getExchangeClient = jest.fn().mockReturnValue({
          order: jest.fn().mockRejectedValue(originalError),
          updateLeverage: jest.fn().mockResolvedValue({ status: 'ok' }),
          approveBuilderFee: jest.fn().mockResolvedValue({ status: 'ok' }),
          setReferrer: jest.fn().mockResolvedValue({ status: 'ok' }),
        });

        const orderParams: OrderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          currentPrice: 50000,
          leverage: 10,
        };

        const result = await provider.placeOrder(orderParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Some other HyperLiquid API error');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing asset info in orders', async () => {
      (
        mockClientService.getInfoClient().meta as jest.Mock
      ).mockResolvedValueOnce({
        universe: [], // Empty universe
      });

      const orderParams: OrderParams = {
        coin: 'UNKNOWN',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        currentPrice: 50000, // Add price so validation passes, then fails on asset lookup
      };

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Asset UNKNOWN not found');
    });

    it('should handle missing price data', async () => {
      (
        mockClientService.getInfoClient().allMids as jest.Mock
      ).mockResolvedValueOnce({});

      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      };

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('perps.order.validation.price_required');
    });

    it('should handle missing position in close operation', async () => {
      (
        mockClientService.getInfoClient().clearinghouseState as jest.Mock
      ).mockResolvedValueOnce({
        assetPositions: [], // No positions
      });

      const closeParams: ClosePositionParams = {
        coin: 'BTC',
        orderType: 'market',
      };

      const result = await provider.closePosition(closeParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No position found for BTC');
    });
  });

  describe('validateDeposit', () => {
    it('should validate valid deposit parameters', async () => {
      mockValidateDepositParams.mockReturnValue({ isValid: true });

      const params: DepositParams = {
        amount: '100',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = await provider.validateDeposit(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty amount', async () => {
      mockValidateDepositParams.mockReturnValue({
        isValid: false,
        error: 'Amount is required and must be greater than 0',
      });

      const params: DepositParams = {
        amount: '',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = await provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Amount is required and must be greater than 0',
      );
    });

    it('should reject zero amount', async () => {
      mockValidateDepositParams.mockReturnValue({
        isValid: false,
        error: 'Amount is required and must be greater than 0',
      });

      const params: DepositParams = {
        amount: '0',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = await provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Amount is required and must be greater than 0',
      );
    });

    it('should reject negative amount', async () => {
      mockValidateDepositParams.mockReturnValue({
        isValid: false,
        error: 'Amount is required and must be greater than 0',
      });

      const params: DepositParams = {
        amount: '-10',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = await provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Amount is required and must be greater than 0',
      );
    });

    it('should reject invalid amount format', async () => {
      mockValidateDepositParams.mockReturnValue({
        isValid: false,
        error: 'Amount is required and must be greater than 0',
      });

      const params: DepositParams = {
        amount: 'abc',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = await provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Amount is required and must be greater than 0',
      );
    });

    it('should reject amount below minimum for mainnet', async () => {
      mockClientService.isTestnetMode.mockReturnValue(false);
      mockValidateDepositParams.mockReturnValue({
        isValid: false,
        error: 'Minimum deposit amount is 5 USDC',
      });

      const params: DepositParams = {
        amount: '4.99',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = await provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Minimum deposit amount is 5 USDC');
    });

    it('should reject amount below minimum for testnet', async () => {
      mockClientService.isTestnetMode.mockReturnValue(true);
      mockValidateDepositParams.mockReturnValue({
        isValid: false,
        error: 'Minimum deposit amount is 10 USDC',
      });

      const params: DepositParams = {
        amount: '9.99',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = await provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Minimum deposit amount is 10 USDC');
    });

    it('should accept amount at minimum for mainnet', async () => {
      mockClientService.isTestnetMode.mockReturnValue(false);
      mockValidateDepositParams.mockReturnValue({ isValid: true });

      const params: DepositParams = {
        amount: '5',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = await provider.validateDeposit(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept amount at minimum for testnet', async () => {
      mockClientService.isTestnetMode.mockReturnValue(true);
      mockValidateDepositParams.mockReturnValue({ isValid: true });

      const params: DepositParams = {
        amount: '10',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = await provider.validateDeposit(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty assetId', async () => {
      mockValidateDepositParams.mockReturnValue({
        isValid: false,
        error: 'AssetId is required for deposit validation',
      });

      const params: DepositParams = {
        amount: '100',
        assetId: '' as CaipAssetId,
      };

      const result = await provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('AssetId is required for deposit validation');
    });

    it('should reject unsupported assetId', async () => {
      mockValidateDepositParams.mockReturnValue({
        isValid: false,
        error: 'Asset not supported',
      });

      const params: DepositParams = {
        amount: '100',
        assetId:
          'eip155:1/erc20:0x1234567890123456789012345678901234567890/default',
      };

      const result = await provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('should handle decimal amounts correctly', async () => {
      mockValidateDepositParams.mockReturnValue({ isValid: true });

      const params: DepositParams = {
        amount: '100.123456',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = await provider.validateDeposit(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle large amounts correctly', async () => {
      mockValidateDepositParams.mockReturnValue({ isValid: true });

      const params: DepositParams = {
        amount: '1000000',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = await provider.validateDeposit(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle scientific notation', async () => {
      mockValidateDepositParams.mockReturnValue({ isValid: true });

      const params: DepositParams = {
        amount: '1e6',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = await provider.validateDeposit(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('validateClosePosition', () => {
    it('should validate full close position successfully', async () => {
      const params: ClosePositionParams = {
        coin: 'BTC',
        orderType: 'market',
      };

      const result = await provider.validateClosePosition(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate partial close position successfully', async () => {
      const params: ClosePositionParams = {
        coin: 'BTC',
        size: '0.5',
        orderType: 'market',
        currentPrice: 45000,
      };

      const result = await provider.validateClosePosition(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject close position below minimum value on mainnet', async () => {
      mockClientService.isTestnetMode.mockReturnValue(false);

      const params: ClosePositionParams = {
        coin: 'BTC',
        size: '0.0001', // $4.50 at $45,000 BTC, below $10 minimum
        orderType: 'market',
        currentPrice: 45000,
      };

      const result = await provider.validateClosePosition(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('perps.order.validation.minimum_amount');
    });

    it('should reject close position below minimum value on testnet', async () => {
      mockClientService.isTestnetMode.mockReturnValue(true);

      const params: ClosePositionParams = {
        coin: 'BTC',
        size: '0.00022', // $9.90 at $45,000 BTC, below $11 testnet minimum
        orderType: 'market',
        currentPrice: 45000,
      };

      const result = await provider.validateClosePosition(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('perps.order.validation.minimum_amount');
    });

    it('should accept close position at minimum value', async () => {
      mockClientService.isTestnetMode.mockReturnValue(false);

      const params: ClosePositionParams = {
        coin: 'BTC',
        size: '0.00023', // $10.35 at $45,000 BTC, above $10 minimum
        orderType: 'market',
        currentPrice: 45000,
      };

      const result = await provider.validateClosePosition(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate limit close position with price', async () => {
      const params: ClosePositionParams = {
        coin: 'BTC',
        size: '1.0',
        orderType: 'limit',
        price: '44000',
        currentPrice: 45000,
      };

      const result = await provider.validateClosePosition(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject limit close without price', async () => {
      const params: ClosePositionParams = {
        coin: 'BTC',
        size: '1.0',
        orderType: 'limit',
        currentPrice: 45000,
      };

      const result = await provider.validateClosePosition(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('perps.order.validation.limit_price_required');
    });

    it('should handle validation when currentPrice is not provided', async () => {
      const params: ClosePositionParams = {
        coin: 'BTC',
        size: '0.5',
        orderType: 'market',
        // currentPrice not provided
      };

      const result = await provider.validateClosePosition(params);

      // Should still validate basic params but skip minimum order value check
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('calculateLiquidationPrice', () => {
    beforeEach(() => {
      // Set up mock for asset info with maxLeverage: 20 for BTC (test expectations)
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          meta: jest.fn().mockResolvedValue({
            universe: [
              { name: 'BTC', szDecimals: 3, maxLeverage: 20 },
              { name: 'ETH', szDecimals: 4, maxLeverage: 20 },
            ],
          }),
        }),
      );
    });

    it('should calculate liquidation price for long position correctly', async () => {
      const params = {
        entryPrice: 50000,
        leverage: 10,
        direction: 'long' as const,
        asset: 'BTC',
      };

      const result = await provider.calculateLiquidationPrice(params);

      // With 10x leverage and 20x max leverage:
      // maintenance margin = 1 / (2 * 20) = 0.025
      // initial margin = 1 / 10 = 0.1
      // margin available = 0.1 - 0.025 = 0.075
      // l = 1 / 40 = 0.025
      // liquidation = 50000 - (1 * 0.075 * 50000) / (1 - 0.025 * 1)
      // liquidation = 50000 - 3750 / 0.975 = 50000 - 3846.15 = 46153.85
      expect(parseFloat(result)).toBeCloseTo(46153.85, 2);
    });

    it('should calculate liquidation price for short position correctly', async () => {
      const params = {
        entryPrice: 50000,
        leverage: 10,
        direction: 'short' as const,
        asset: 'BTC',
      };

      const result = await provider.calculateLiquidationPrice(params);

      // With 10x leverage and 20x max leverage:
      // maintenance margin = 1 / (2 * 20) = 0.025
      // initial margin = 1 / 10 = 0.1
      // margin available = 0.1 - 0.025 = 0.075
      // l = 1 / 40 = 0.025
      // liquidation = 50000 - (-1 * 0.075 * 50000) / (1 - 0.025 * -1)
      // liquidation = 50000 + 3750 / 1.025 = 50000 + 3658.54 = 53658.54
      expect(parseFloat(result)).toBeCloseTo(53658.54, 2);
    });

    it('should throw error for leverage exceeding maintenance leverage', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          meta: jest.fn().mockResolvedValue({
            universe: [
              { name: 'BTC', szDecimals: 3, maxLeverage: 20 },
              { name: 'ETH', szDecimals: 4, maxLeverage: 20 },
            ],
          }),
        }),
      );

      const params = {
        entryPrice: 50000,
        leverage: 41, // Exceeds maintenance leverage (2 * 20 = 40)
        direction: 'long' as const,
        asset: 'BTC',
      };

      await expect(provider.calculateLiquidationPrice(params)).rejects.toThrow(
        'Invalid leverage: 41x exceeds maximum allowed leverage of 40x',
      );
    });

    it('should handle invalid inputs', async () => {
      const invalidCases = [
        { entryPrice: 0, leverage: 10, direction: 'long' as const },
        { entryPrice: 50000, leverage: 0, direction: 'long' as const },
        { entryPrice: NaN, leverage: 10, direction: 'long' as const },
        { entryPrice: 50000, leverage: Infinity, direction: 'long' as const },
        { entryPrice: -100, leverage: 10, direction: 'long' as const },
      ];

      for (const params of invalidCases) {
        const result = await provider.calculateLiquidationPrice(params);
        expect(result).toBe('0.00');
      }
    });

    it('should use default max leverage when asset is not provided', async () => {
      const params = {
        entryPrice: 50000,
        leverage: 4,
        direction: 'long' as const,
        // No asset provided, so default 3x will be used
      };

      const result = await provider.calculateLiquidationPrice(params);

      // Should use default 3x max leverage (since no asset provided)
      // maintenance leverage = 2 * 3 = 6x
      // l = 1 / 6 = 0.1667
      // initial margin = 1 / 4 = 0.25
      // maintenance margin = 1 / 6 = 0.1667
      // margin available = 0.25 - 0.1667 = 0.0833
      // liq price = 50000 - 1 * 0.0833 * 50000 / (1 - 0.1667 * 1)
      // liq price = 50000 - 4165 / 0.8333 = 50000 - 4998 = 45002
      expect(parseFloat(result)).toBeCloseTo(45002, -1);
    });

    it('should throw error when leverage exceeds default max leverage', async () => {
      const params = {
        entryPrice: 50000,
        leverage: 10,
        direction: 'long' as const,
        // No asset provided, so default 3x will be used
      };

      await expect(provider.calculateLiquidationPrice(params)).rejects.toThrow(
        'Invalid leverage: 10x exceeds maximum allowed leverage of 6x',
      );
    });
  });

  describe('calculateMaintenanceMargin', () => {
    it('should calculate maintenance margin correctly for 40x max leverage asset', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          meta: jest.fn().mockResolvedValue({
            universe: [{ name: 'BTC', maxLeverage: 40, szDecimals: 5 }],
          }),
        }),
      );

      const result = await provider.calculateMaintenanceMargin({
        asset: 'BTC',
      });

      // Maintenance margin = 1 / (2 * 40) = 0.0125 (1.25%)
      expect(result).toBe(0.0125);
    });

    it('should calculate maintenance margin correctly for 3x max leverage asset', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'DOGE', maxLeverage: 3, szDecimals: 0 }],
        }),
      });

      const result = await provider.calculateMaintenanceMargin({
        asset: 'DOGE',
      });

      // Maintenance margin = 1 / (2 * 3) = 0.1667 (16.67%)
      expect(result).toBeCloseTo(0.1667, 4);
    });

    it('should return default maintenance margin when asset not found', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        meta: jest.fn().mockResolvedValue({
          universe: [],
        }),
      });

      const result = await provider.calculateMaintenanceMargin({
        asset: 'UNKNOWN',
      });

      // Should use default max leverage of 3, so maintenance margin = 1/(2*3) = 0.16666...
      expect(result).toBeCloseTo(0.16666666666666666);
    });
  });

  describe('getMaxLeverage', () => {
    it('should return max leverage for an asset', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          meta: jest.fn().mockResolvedValue({
            universe: [{ name: 'ETH', maxLeverage: 30, szDecimals: 4 }],
          }),
        }),
      );

      const result = await provider.getMaxLeverage('ETH');

      expect(result).toBe(30);
    });

    it('should return default max leverage when asset not found', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        meta: jest.fn().mockResolvedValue({
          universe: [],
        }),
      });

      const result = await provider.getMaxLeverage('UNKNOWN');

      // Should return default max leverage of 3
      expect(result).toBe(3);
    });

    it('should return default max leverage on network failure', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        meta: jest.fn().mockRejectedValue(new Error('Network error')),
      });

      const result = await provider.getMaxLeverage('BTC');

      // Should return default max leverage of 3 on error
      expect(result).toBe(3);
    });
  });

  describe('Additional Error Handling and Edge Cases', () => {
    describe('ensureReady and buildAssetMapping', () => {
      it('should handle meta fetch failure in buildAssetMapping', async () => {
        // Create a fresh provider to test buildAssetMapping
        const freshProvider = new HyperLiquidProvider();

        // Mock failed meta fetch but keep other methods working
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            meta: jest.fn().mockRejectedValue(new Error('Network timeout')),
          }),
        );

        MockedHyperLiquidClientService.mockImplementation(
          () => mockClientService,
        );

        // Try to place an order which will trigger ensureReady -> buildAssetMapping
        const orderParams: OrderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          currentPrice: 50000, // Add price for validation
        };

        const result = await freshProvider.placeOrder(orderParams);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Network timeout');
      });

      it('should handle string response from meta endpoint', async () => {
        // Test updatePositionTPSL with string meta response (invalid data type)
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            meta: jest.fn().mockResolvedValue('invalid string response' as any), // eslint-disable-line @typescript-eslint/no-explicit-any
          }),
        );

        mockWalletService.getUserAddressWithDefault.mockResolvedValue('0x123');

        const updateParams = {
          coin: 'BTC',
          takeProfitPrice: '55000',
        };

        const result = await provider.updatePositionTPSL(updateParams);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid meta response');
      });

      it('should handle meta response without universe property', async () => {
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            meta: jest.fn().mockResolvedValue({}), // Empty object without universe
          }),
        );

        const updateParams = {
          coin: 'BTC',
          takeProfitPrice: '55000',
        };

        const result = await provider.updatePositionTPSL(updateParams);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid meta response');
      });
    });

    describe('Order placement edge cases', () => {
      it('should handle leverage update failure', async () => {
        mockClientService.getExchangeClient = jest.fn().mockReturnValue(
          createMockExchangeClient({
            updateLeverage: jest.fn().mockResolvedValue({
              status: 'error',
              response: { message: 'Leverage update failed' },
            }),
          }),
        );

        const orderParams: OrderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          leverage: 10,
          currentPrice: 50000,
        };

        const result = await provider.placeOrder(orderParams);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to update leverage');
      });

      it('should fail market order without current price or usdAmount', async () => {
        const orderParams: OrderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          // No currentPrice or usdAmount provided - should fail validation
        };

        const result = await provider.placeOrder(orderParams);

        expect(result.success).toBe(false);
        expect(result.error).toContain('perps.order.validation.price_required');
      });

      it('should handle order with custom slippage', async () => {
        const orderParams: OrderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          currentPrice: 50000,
          slippage: 0.02, // 2% slippage
        };

        const result = await provider.placeOrder(orderParams);

        expect(result.success).toBe(true);
        // Should use 2% slippage instead of default 1%
      });

      it('should handle filled order response', async () => {
        mockClientService.getExchangeClient = jest.fn().mockReturnValue(
          createMockExchangeClient({
            order: jest.fn().mockResolvedValue({
              status: 'ok',
              response: {
                data: {
                  statuses: [
                    {
                      filled: {
                        oid: '456',
                        totalSz: '0.1',
                        avgPx: '50100',
                      },
                    },
                  ],
                },
              },
            }),
          }),
        );

        const orderParams: OrderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          currentPrice: 50000,
        };

        const result = await provider.placeOrder(orderParams);

        expect(result.success).toBe(true);
        expect(result.orderId).toBe('456');
        expect(result.filledSize).toBe('0.1');
        expect(result.averagePrice).toBe('50100');
      });

      it('should handle order with clientOrderId', async () => {
        const orderParams: OrderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          currentPrice: 50000,
          clientOrderId: '0x123abc',
        };

        const result = await provider.placeOrder(orderParams);

        expect(result.success).toBe(true);
      });

      it('should handle order with TP/SL and custom grouping', async () => {
        const orderParams: OrderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'limit',
          price: '51000',
          takeProfitPrice: '55000',
          stopLossPrice: '48000',
          grouping: 'positionTpsl',
        };

        const result = await provider.placeOrder(orderParams);

        expect(result.success).toBe(true);
      });
    });

    describe('updatePositionTPSL error scenarios', () => {
      it('should handle WebSocket error in getPositions', async () => {
        // Create a fresh provider to test WebSocket errors
        const freshProvider = new HyperLiquidProvider();

        // Mock getPositions to simulate the WebSocket error being handled
        jest
          .spyOn(freshProvider, 'getPositions')
          .mockImplementation(async () => {
            throw new Error('WebSocket connection failed');
          });

        MockedHyperLiquidClientService.mockImplementation(
          () => mockClientService,
        );

        const updateParams = {
          coin: 'BTC',
          takeProfitPrice: '55000',
        };

        const result = await freshProvider.updatePositionTPSL(updateParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe('WebSocket connection failed');
      });

      it('should handle non-WebSocket error in getPositions', async () => {
        // Create a fresh provider to test non-WebSocket errors
        const freshProvider = new HyperLiquidProvider();

        // Mock getPositions to simulate a generic API error
        jest
          .spyOn(freshProvider, 'getPositions')
          .mockImplementation(async () => {
            throw new Error('Generic API error');
          });

        MockedHyperLiquidClientService.mockImplementation(
          () => mockClientService,
        );

        const updateParams = {
          coin: 'BTC',
          takeProfitPrice: '55000',
        };

        const result = await freshProvider.updatePositionTPSL(updateParams);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Generic API error');
      });

      it('should handle canceling existing TP/SL orders', async () => {
        // Set up asset mapping for BTC
        Object.defineProperty(provider, 'coinToAssetId', {
          value: new Map([['BTC', 0]]),
          writable: true,
        });

        // Mock position exists with existing TP/SL orders
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            frontendOpenOrders: jest.fn().mockResolvedValue([
              {
                coin: 'BTC',
                oid: 123,
                reduceOnly: true,
                isTrigger: true,
                isPositionTpsl: true,
                orderType: 'Take Profit',
              },
              {
                coin: 'BTC',
                oid: 124,
                reduceOnly: true,
                isTrigger: true,
                isPositionTpsl: true,
                orderType: 'Stop Loss',
              },
            ]),
          }),
        );

        mockClientService.getExchangeClient = jest.fn().mockReturnValue(
          createMockExchangeClient({
            cancel: jest.fn().mockResolvedValue({
              status: 'ok',
              response: { data: { statuses: ['success', 'success'] } },
            }),
            order: jest.fn().mockResolvedValue({
              status: 'ok',
              response: { data: { statuses: [{ resting: { oid: '999' } }] } },
            }),
          }),
        );

        mockWalletService.getUserAddressWithDefault.mockResolvedValue('0x123');

        const updateParams = {
          coin: 'BTC',
          takeProfitPrice: '55000',
        };

        const result = await provider.updatePositionTPSL(updateParams);

        expect(result.success).toBe(true);
        expect(
          mockClientService.getExchangeClient().cancel,
        ).toHaveBeenCalledWith({
          cancels: [
            { a: 0, o: 123 },
            { a: 0, o: 124 },
          ],
        });
      });
    });

    describe('getAccountState error handling', () => {
      it('should re-throw errors instead of returning zeros', async () => {
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            clearinghouseState: jest
              .fn()
              .mockRejectedValue(new Error('Account state fetch failed')),
            spotClearinghouseState: jest.fn().mockResolvedValue({
              balances: [{ coin: 'USDC', hold: '1000', total: '10000' }],
            }),
          }),
        );

        mockWalletService.getUserAddressWithDefault.mockResolvedValue('0x123');

        await expect(provider.getAccountState()).rejects.toThrow(
          'Account state fetch failed',
        );
      });
    });

    describe('getMarketDataWithPrices error scenarios', () => {
      it('should handle missing perpsMeta', async () => {
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            meta: jest.fn().mockResolvedValue(null),
            allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
            predictedFundings: jest.fn().mockResolvedValue([]),
            metaAndAssetCtxs: jest.fn().mockResolvedValue([null, []]),
          }),
        );

        await expect(provider.getMarketDataWithPrices()).rejects.toThrow(
          'Failed to fetch market data - no markets available',
        );
      });

      it('should handle missing allMids', async () => {
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            meta: jest.fn().mockResolvedValue({
              universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 50 }],
            }),
            allMids: jest.fn().mockResolvedValue(null),
            predictedFundings: jest.fn().mockResolvedValue([]),
            metaAndAssetCtxs: jest.fn().mockResolvedValue([null, []]),
          }),
        );

        // Should gracefully handle missing price data with fallback
        const result = await provider.getMarketDataWithPrices();
        expect(Array.isArray(result)).toBe(true);
        expect(result[0].price).toBe('$---'); // Fallback when allMids is null
      });

      it('should handle meta and predictedFundings calls successfully', async () => {
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            meta: jest.fn().mockResolvedValue({
              universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 50 }],
            }),
            allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
            predictedFundings: jest.fn().mockResolvedValue([]),
            metaAndAssetCtxs: jest.fn().mockResolvedValue([
              { universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 50 }] },
              [
                {
                  funding: '0.001',
                  openInterest: '1000000',
                  prevDayPx: '49000',
                },
              ],
            ]),
          }),
        );

        const result = await provider.getMarketDataWithPrices();

        // Verify successful call with proper data structure
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('price');
        expect(result[0]).toHaveProperty('fundingRate');
      });
    });

    describe('withdrawal edge cases', () => {
      it('should handle withdrawal without destination (use current user)', async () => {
        mockWalletService.getUserAddressWithDefault.mockResolvedValue(
          '0xdefaultaddress',
        );

        mockClientService.getExchangeClient = jest.fn().mockReturnValue({
          withdraw3: jest.fn().mockResolvedValue({ status: 'ok' }),
        });

        // Mock account state for balance validation
        Object.defineProperty(provider, 'getAccountState', {
          value: jest.fn().mockResolvedValue({
            availableBalance: '5000',
          }),
          writable: true,
        });

        const withdrawParams = {
          amount: '1000',
          // No destination provided - should use current user address
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default' as CaipAssetId,
        };

        const result = await provider.withdraw(withdrawParams);

        expect(result.success).toBe(true);
        expect(
          mockClientService.getExchangeClient().withdraw3,
        ).toHaveBeenCalledWith({
          destination: '0xdefaultaddress',
          amount: '1000',
        });
      });

      it('should handle withdrawal API error', async () => {
        mockClientService.getExchangeClient = jest.fn().mockReturnValue({
          withdraw3: jest.fn().mockResolvedValue({
            status: 'insufficient_funds',
            message: 'Not enough balance',
          }),
        });

        // Mock account state for balance validation
        Object.defineProperty(provider, 'getAccountState', {
          value: jest.fn().mockResolvedValue({
            availableBalance: '5000',
          }),
          writable: true,
        });

        const withdrawParams = {
          amount: '1000',
          destination: '0x1234567890123456789012345678901234567890' as Hex,
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default' as CaipAssetId,
        };

        const result = await provider.withdraw(withdrawParams);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Withdrawal failed: insufficient_funds');
      });
    });

    describe('liquidation price edge cases', () => {
      it('should handle denominator close to zero', async () => {
        // Create scenario where denominator approaches zero
        // For denominator = 1 - l * side to be close to 0 with long (side = 1):
        // We need l very close to 1, so maintenanceLeverage very close to 1
        // With maxLeverage = 0.50005, maintenanceLeverage = 1.0001, l = 0.9999
        // denominator = 1 - 0.9999 * 1 = 0.0001 (right at the threshold)
        // Need slightly larger to go below 0.0001: maxLeverage = 0.50001 → maintenanceLeverage = 1.00002
        // l = 0.99998, denominator = 0.00002 < 0.0001 ✓ triggers edge case
        const params = {
          entryPrice: 50000,
          leverage: 1, // Use 1x leverage
          direction: 'long' as const,
          asset: 'BTC',
        };

        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            meta: jest.fn().mockResolvedValue({
              universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 0.50001 }], // Very low to create denominator < 0.0001
            }),
          }),
        );

        const result = await provider.calculateLiquidationPrice(params);

        // Should return entry price when denominator is too small (< 0.0001 threshold)
        expect(parseFloat(result)).toBeCloseTo(50000, 0);
      });

      it('should handle liquidation price calculation error', async () => {
        // Mock getMaxLeverage to throw an error but still use default
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        mockClientService.getInfoClient = jest.fn().mockReturnValue({
          meta: jest.fn().mockRejectedValue(new Error('Network error')),
        });

        const params = {
          entryPrice: 50000,
          leverage: 2,
          direction: 'long' as const,
          asset: 'UNKNOWN_ASSET',
        };

        const result = await provider.calculateLiquidationPrice(params);

        // Should use default leverage and still calculate
        expect(parseFloat(result)).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should handle negative liquidation price', async () => {
        // Create scenario that might result in negative liquidation price
        const params = {
          entryPrice: 100,
          leverage: 2,
          direction: 'long' as const,
          asset: 'BTC',
        };

        mockClientService.getInfoClient = jest
          .fn()
          .mockReturnValue(createMockInfoClient());

        const result = await provider.calculateLiquidationPrice(params);

        // Should never return negative price
        expect(parseFloat(result)).toBeGreaterThanOrEqual(0);
      });
    });

    describe('isReadyToTrade edge cases', () => {
      it('should handle getCurrentAccountId throwing error', async () => {
        mockWalletService.getCurrentAccountId.mockImplementation(() => {
          throw new Error('No account found');
        });

        const result = await provider.isReadyToTrade();

        expect(result.ready).toBe(false);
        expect(result.walletConnected).toBe(true); // Clients exist
        expect(result.networkSupported).toBe(true);
      });

      it('should handle missing exchange or info client', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockClientService.getExchangeClient.mockReturnValue(null as any);

        const result = await provider.isReadyToTrade();

        expect(result.ready).toBe(false);
        expect(result.walletConnected).toBe(false);
      });

      it('should handle general error in readiness check', async () => {
        mockClientService.getExchangeClient.mockImplementation(() => {
          throw new Error('Client error');
        });

        const result = await provider.isReadyToTrade();

        expect(result.ready).toBe(false);
        expect(result.walletConnected).toBe(false);
        expect(result.networkSupported).toBe(false);
        expect(result.error).toContain('Client error');
      });
    });

    describe('editOrder error scenarios', () => {
      it('should handle edit order API failure', async () => {
        mockClientService.getExchangeClient = jest.fn().mockReturnValue({
          modify: jest.fn().mockResolvedValue({
            status: 'error',
            response: { message: 'Order not found' },
          }),
        });

        const editParams = {
          orderId: '999',
          newOrder: {
            coin: 'BTC',
            isBuy: true,
            size: '0.2',
            price: '52000',
            orderType: 'limit',
          } as OrderParams,
        };

        const result = await provider.editOrder(editParams);

        expect(result.success).toBe(false);
      });
    });

    describe('cancelOrder error scenarios', () => {
      it('should handle cancel order API returning non-success status', async () => {
        mockClientService.getExchangeClient = jest.fn().mockReturnValue({
          cancel: jest.fn().mockResolvedValue({
            status: 'ok',
            response: { data: { statuses: ['failed'] } },
          }),
        });

        const cancelParams = {
          orderId: '123',
          coin: 'BTC',
        };

        const result = await provider.cancelOrder(cancelParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Order cancellation failed');
      });
    });

    describe('calculateFees', () => {
      beforeEach(() => {
        // Reset userFees mock for each test
        (mockClientService.getInfoClient().userFees as jest.Mock).mockClear();
        // Default to throw error (will use base rates)
        mockWalletService.getUserAddressWithDefault.mockRejectedValue(
          new Error('No wallet connected'),
        );
      });

      it('should calculate fees for market orders', async () => {
        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '100000',
          coin: 'BTC',
        });

        expect(result.feeRate).toBe(0.00145); // 0.045% taker + 0.1% MetaMask fee
        expect(result.feeAmount).toBe(145); // 100000 * 0.00145
      });

      it('should calculate fees for limit orders as taker', async () => {
        const result = await provider.calculateFees({
          orderType: 'limit',
          isMaker: false,
          amount: '100000',
          coin: 'BTC',
        });

        expect(result.feeRate).toBe(0.00145); // 0.045% taker + 0.1% MetaMask fee
        expect(result.feeAmount).toBe(145); // Includes MetaMask fee
      });

      it('should calculate fees for limit orders as maker', async () => {
        const result = await provider.calculateFees({
          orderType: 'limit',
          isMaker: true,
          amount: '100000',
          coin: 'BTC',
        });

        expect(result.feeRate).toBe(0.00115); // 0.015% maker + 0.1% MetaMask fee
        expect(result.feeAmount).toBeCloseTo(115, 10); // Includes MetaMask fee
      });

      it('should handle zero amount', async () => {
        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '0',
          coin: 'BTC',
        });

        expect(result.feeRate).toBe(0.00145); // Includes 0.1% MetaMask fee
        expect(result.feeAmount).toBe(0);
      });

      it('should handle undefined amount', async () => {
        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          coin: 'BTC',
        });

        expect(result.feeRate).toBe(0.00145); // Includes 0.1% MetaMask fee
        expect(result.feeAmount).toBeUndefined();
      });

      it('should use cached user-specific fee rates when available', async () => {
        // Reset mock and set user address to trigger user fee fetching
        (mockClientService.getInfoClient().userFees as jest.Mock).mockClear();
        (
          mockClientService.getInfoClient().userFees as jest.Mock
        ).mockResolvedValue({
          userCrossRate: '0.00045', // 0.045% base taker rate
          userAddRate: '0.00015', // 0.015% base maker rate
          userSpotCrossRate: '0.00070', // 0.070% spot taker rate
          userSpotAddRate: '0.00040', // 0.040% spot maker rate
          activeReferralDiscount: '0.04', // 4% referral discount
          activeStakingDiscount: { discount: '0.05' }, // 5% staking discount
          dailyUserVlm: [],
        });
        mockWalletService.getUserAddressWithDefault.mockResolvedValue('0x123');

        // First call should fetch from API
        const result1 = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '100000',
          coin: 'BTC',
        });

        // Should use dynamically calculated rate: 0.045% * (1 - 0.04 - 0.05) = 0.045% * 0.91 = 0.04095%
        expect(result1.feeRate).toBeCloseTo(0.0014095, 6); // Dynamic rate + 0.1% MetaMask
        expect(result1.feeAmount).toBeCloseTo(140.95, 2); // 100000 * 0.0014095
        expect(
          mockClientService.getInfoClient().userFees,
        ).toHaveBeenCalledTimes(1);

        // Second call should use cache
        const result2 = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '100000',
          coin: 'BTC',
        });

        expect(result2.feeRate).toBeCloseTo(0.0014095, 6); // Includes MetaMask fee
        expect(result2.feeAmount).toBeCloseTo(140.95, 2); // Includes MetaMask fee
        // Should not call API again (cached)
        expect(
          mockClientService.getInfoClient().userFees,
        ).toHaveBeenCalledTimes(1);
      });

      it('should fall back to base rates on API failure', async () => {
        // Reset and mock user address
        (mockClientService.getInfoClient().userFees as jest.Mock).mockClear();
        mockWalletService.getUserAddressWithDefault.mockResolvedValue('0x123');

        // Mock API failure
        (
          mockClientService.getInfoClient().userFees as jest.Mock
        ).mockRejectedValue(new Error('API Error'));

        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '100000',
          coin: 'BTC',
        });

        // Should use base rates on failure
        expect(result.feeRate).toBe(0.00145); // Includes 0.1% MetaMask fee // Base taker rate
        expect(result.feeAmount).toBe(145); // Includes MetaMask fee
      });

      it('should handle non-numeric amount gracefully', async () => {
        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: 'invalid',
          coin: 'BTC',
        });

        expect(result.feeRate).toBe(0.00145); // Includes 0.1% MetaMask fee
        expect(result.feeAmount).toBe(0); // parseFloat('invalid') returns NaN, which * 0.00045 = NaN, but we expect 0
      });

      it('should return FeeCalculationResult with correct structure', async () => {
        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '100000',
          coin: 'BTC',
        });

        expect(result).toHaveProperty('feeRate');
        expect(result).toHaveProperty('feeAmount');
        expect(typeof result.feeRate).toBe('number');
        expect(typeof result.feeAmount).toBe('number');
      });

      it('should be async and return a Promise', () => {
        const result = provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          coin: 'BTC',
        });

        expect(result).toBeInstanceOf(Promise);
      });

      it('should fetch user-specific fee rates when wallet is connected', async () => {
        const testAddress = '0xTestAddress123';
        mockWalletService.getUserAddressWithDefault.mockResolvedValue(
          testAddress,
        );

        // Mock user fees API response with base rates and discounts
        (
          mockClientService.getInfoClient().userFees as jest.Mock
        ).mockResolvedValue({
          userCrossRate: '0.00045', // 0.045% base taker rate
          userAddRate: '0.00015', // 0.015% base maker rate
          userSpotCrossRate: '0.00070', // 0.070% spot taker rate
          userSpotAddRate: '0.00040', // 0.040% spot maker rate
          activeReferralDiscount: '0.04', // 4% referral discount
          activeStakingDiscount: null, // No staking discount
        });

        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '100000',
          coin: 'BTC',
        });

        expect(result.feeRate).toBeCloseTo(0.001432, 6); // 0.045% * (1 - 0.04) + 0.1% MetaMask
        expect(result.feeAmount).toBeCloseTo(143.2, 2); // Includes MetaMask fee
      });

      it('should fall back to base rates when API returns invalid fee rates', async () => {
        const testAddress = '0xTestAddress123';
        mockWalletService.getUserAddressWithDefault.mockResolvedValue(
          testAddress,
        );

        // Mock user fees API response with invalid rates that will produce NaN
        (
          mockClientService.getInfoClient().userFees as jest.Mock
        ).mockResolvedValue({
          userCrossRate: 'invalid', // Will cause parseFloat to return NaN
          userAddRate: 'invalid',
          activeReferralDiscount: 'invalid',
          activeStakingDiscount: null,
        });

        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '100000',
          coin: 'BTC',
        });

        // Should fall back to base rates due to validation failure
        expect(result.feeRate).toBe(0.00145); // Includes 0.1% MetaMask fee // Base taker rate
        expect(result.feeAmount).toBe(145); // Includes MetaMask fee
      });

      it('should fall back to base rates when API returns negative fee rates', async () => {
        const testAddress = '0xTestAddress123';
        mockWalletService.getUserAddressWithDefault.mockResolvedValue(
          testAddress,
        );

        // Mock user fees API response with negative rates
        (
          mockClientService.getInfoClient().userFees as jest.Mock
        ).mockResolvedValue({
          userCrossRate: '-0.0003', // Negative rate - invalid
          userAddRate: '0.0001',
          activeReferralDiscount: '0.00',
          activeStakingDiscount: null,
        });

        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '100000',
          coin: 'BTC',
        });

        // Should fall back to base rates due to validation failure
        expect(result.feeRate).toBe(0.00145); // Includes 0.1% MetaMask fee // Base taker rate
        expect(result.feeAmount).toBe(145); // Includes MetaMask fee
      });

      it('should always use taker rate for market orders regardless of isMaker', async () => {
        const testAddress = '0xTestAddress123';
        mockWalletService.getUserAddressWithDefault.mockResolvedValue(
          testAddress,
        );

        (
          mockClientService.getInfoClient().userFees as jest.Mock
        ).mockResolvedValue({
          userCrossRate: '0.00035', // Taker rate
          userAddRate: '0.00008', // Maker rate (lower)
          userSpotCrossRate: '0.00070',
          userSpotAddRate: '0.00040',
          activeReferralDiscount: '0.04', // 4% referral discount
          activeStakingDiscount: null,
        });

        // Test market order with isMaker=true (should still use taker rate)
        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: true, // This should be ignored for market orders
          amount: '100000',
          coin: 'BTC',
        });

        // Should use taker rate even though isMaker is true
        expect(result.feeRate).toBeCloseTo(0.001336, 6); // 0.035% * (1 - 0.04) + 0.1% MetaMask
        expect(result.feeAmount).toBeCloseTo(133.6, 2); // Includes MetaMask fee
      });

      it('should apply referral discount only when no staking discount', async () => {
        const testAddress = '0xTestAddress123';
        mockWalletService.getUserAddressWithDefault.mockResolvedValue(
          testAddress,
        );

        (
          mockClientService.getInfoClient().userFees as jest.Mock
        ).mockResolvedValue({
          userCrossRate: '0.00045', // 0.045% base taker rate
          userAddRate: '0.00015', // 0.015% base maker rate
          userSpotCrossRate: '0.00070', // 0.070% spot taker rate
          userSpotAddRate: '0.00040', // 0.040% spot maker rate
          activeReferralDiscount: '0.04', // 4% referral discount
          activeStakingDiscount: null,
        });

        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '100000',
          coin: 'BTC',
        });

        // Should apply only referral discount: 0.045% * (1 - 0.04) = 0.0432%
        expect(result.feeRate).toBeCloseTo(0.001432, 6); // 0.0432% + 0.1% MetaMask
        expect(result.feeAmount).toBeCloseTo(143.2, 2);
      });

      it('should apply staking discount only when no referral discount', async () => {
        const testAddress = '0xTestAddress123';
        mockWalletService.getUserAddressWithDefault.mockResolvedValue(
          testAddress,
        );

        (
          mockClientService.getInfoClient().userFees as jest.Mock
        ).mockResolvedValue({
          userCrossRate: '0.00045', // 0.045% base taker rate
          userAddRate: '0.00015', // 0.015% base maker rate
          userSpotCrossRate: '0.00070', // 0.070% spot taker rate
          userSpotAddRate: '0.00040', // 0.040% spot maker rate
          activeReferralDiscount: null,
          activeStakingDiscount: { discount: '0.10' }, // 10% staking discount
        });

        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '100000',
          coin: 'BTC',
        });

        // Should apply only staking discount: 0.045% * (1 - 0.10) = 0.0405%
        expect(result.feeRate).toBeCloseTo(0.001405, 6); // 0.0405% + 0.1% MetaMask
        expect(result.feeAmount).toBeCloseTo(140.5, 2);
      });

      it('should cap combined discounts at 40%', async () => {
        const testAddress = '0xTestAddress123';
        mockWalletService.getUserAddressWithDefault.mockResolvedValue(
          testAddress,
        );

        (
          mockClientService.getInfoClient().userFees as jest.Mock
        ).mockResolvedValue({
          userCrossRate: '0.00045', // 0.045% base taker rate
          userAddRate: '0.00015', // 0.015% base maker rate
          userSpotCrossRate: '0.00070', // 0.070% spot taker rate
          userSpotAddRate: '0.00040', // 0.040% spot maker rate
          activeReferralDiscount: '0.30', // 30% referral discount
          activeStakingDiscount: { discount: '0.25' }, // 25% staking discount
        });

        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '100000',
          coin: 'BTC',
        });

        // Combined discounts would be 55%, but capped at 40%
        // 0.045% * (1 - 0.40) = 0.027%
        expect(result.feeRate).toBeCloseTo(0.00127, 6); // 0.027% + 0.1% MetaMask
        expect(result.feeAmount).toBeCloseTo(127.0, 2);
      });

      it('should handle maker rates with discounts correctly', async () => {
        const testAddress = '0xTestAddress123';
        mockWalletService.getUserAddressWithDefault.mockResolvedValue(
          testAddress,
        );

        (
          mockClientService.getInfoClient().userFees as jest.Mock
        ).mockResolvedValue({
          userCrossRate: '0.00045', // 0.045% base taker rate
          userAddRate: '0.00015', // 0.015% base maker rate
          userSpotCrossRate: '0.00070', // 0.070% spot taker rate
          userSpotAddRate: '0.00040', // 0.040% spot maker rate
          activeReferralDiscount: '0.04', // 4% referral discount
          activeStakingDiscount: { discount: '0.05' }, // 5% staking discount
        });

        const result = await provider.calculateFees({
          orderType: 'limit',
          isMaker: true,
          amount: '100000',
          coin: 'BTC',
        });

        // Should apply discounts to maker rate: 0.015% * (1 - 0.04 - 0.05) = 0.01365%
        expect(result.feeRate).toBeCloseTo(0.0011365, 6); // 0.01365% + 0.1% MetaMask
        expect(result.feeAmount).toBeCloseTo(113.65, 2);
      });

      it('should handle zero discounts correctly', async () => {
        const testAddress = '0xTestAddress123';
        mockWalletService.getUserAddressWithDefault.mockResolvedValue(
          testAddress,
        );

        (
          mockClientService.getInfoClient().userFees as jest.Mock
        ).mockResolvedValue({
          userCrossRate: '0.00045', // 0.045% base taker rate
          userAddRate: '0.00015', // 0.015% base maker rate
          userSpotCrossRate: '0.00070', // 0.070% spot taker rate
          userSpotAddRate: '0.00040', // 0.040% spot maker rate
          activeReferralDiscount: '0.00', // No referral discount
          activeStakingDiscount: { discount: '0.00' }, // No staking discount
        });

        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '100000',
          coin: 'BTC',
        });

        // Should use base rates without discounts
        expect(result.feeRate).toBe(0.00145); // 0.045% + 0.1% MetaMask
        expect(result.feeAmount).toBe(145);
      });

      it('should apply 2× fee multiplier for HIP-3 assets', async () => {
        // HIP-3 asset (dex:SYMBOL format)
        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '100000',
          coin: 'xyz:TSLA', // HIP-3 asset
        });

        // HIP-3 should have 2× base fees: 0.045% * 2 = 0.09% + 0.1% MetaMask = 0.19%
        expect(result.feeRate).toBe(0.0019); // 0.09% taker + 0.1% MetaMask fee
        expect(result.feeAmount).toBe(190); // 100000 * 0.0019
      });

      it('should apply 2× fee multiplier for HIP-3 maker orders', async () => {
        // HIP-3 asset (dex:SYMBOL format)
        const result = await provider.calculateFees({
          orderType: 'limit',
          isMaker: true,
          amount: '100000',
          coin: 'abc:SPX', // HIP-3 asset
        });

        // HIP-3 should have 2× base fees: 0.015% * 2 = 0.03% + 0.1% MetaMask = 0.13%
        expect(result.feeRate).toBe(0.0013); // 0.03% maker + 0.1% MetaMask fee
        expect(result.feeAmount).toBe(130); // 100000 * 0.0013
      });
    });

    describe('fee discount functionality', () => {
      describe('setUserFeeDiscount', () => {
        it('logs discount context updates', () => {
          // Arrange
          const discountBips = 3000; // 30% in basis points
          jest.spyOn(DevLogger, 'log');

          // Act
          provider.setUserFeeDiscount(discountBips);

          // Assert
          expect(DevLogger.log).toHaveBeenCalledWith(
            'HyperLiquid: Fee discount context updated',
            {
              discountBips,
              discountPercentage: 30,
              isActive: true,
            },
          );
        });

        it('logs when clearing discount context', () => {
          // Arrange
          jest.spyOn(DevLogger, 'log');

          // Act
          provider.setUserFeeDiscount(undefined);

          // Assert
          expect(DevLogger.log).toHaveBeenCalledWith(
            'HyperLiquid: Fee discount context updated',
            {
              discountBips: undefined,
              discountPercentage: undefined,
              isActive: false,
            },
          );
        });
      });

      describe('discount applied to orders', () => {
        it('applies discount to builder fee in placeOrder', async () => {
          // Arrange: Set 65% discount (6500 basis points)
          provider.setUserFeeDiscount(6500);

          // Act
          await provider.placeOrder({
            coin: 'BTC',
            isBuy: true,
            size: '0.001',
            orderType: 'market',
            currentPrice: 50000, // Add price for validation
          });

          // Assert: Verify exchangeClient.order called with discounted fee
          // 100 * (1 - 0.65) = 35
          expect(
            mockClientService.getExchangeClient().order,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              builder: expect.objectContaining({
                f: 35,
              }),
            }),
          );
        });

        it('applies discount to builder fee in updatePositionTPSL', async () => {
          // Arrange: Set 65% discount
          provider.setUserFeeDiscount(6500);

          // Act
          await provider.updatePositionTPSL({
            coin: 'BTC',
            takeProfitPrice: '50000',
          });

          // Assert: Verify discounted fee (35 instead of 100)
          expect(
            mockClientService.getExchangeClient().order,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              builder: expect.objectContaining({
                f: 35,
              }),
            }),
          );
        });
      });

      describe('calculateFees with fee discount', () => {
        beforeEach(() => {
          // Reset mocks for fee discount tests
          (mockClientService.getInfoClient().userFees as jest.Mock).mockClear();
          mockWalletService.getUserAddressWithDefault.mockRejectedValue(
            new Error('No wallet connected'),
          );
        });

        it('applies discount to MetaMask fees when active', async () => {
          // Arrange
          const discountBips = 2000; // 20% discount in basis points
          provider.setUserFeeDiscount(discountBips);

          // Act
          const result = await provider.calculateFees({
            orderType: 'market',
            isMaker: false,
            amount: '100000',
            coin: 'BTC',
          });

          // Assert
          // Base: 0.045% protocol + 0.1% MetaMask = 0.145%
          // With 20% discount on MetaMask fee: 0.045% + (0.1% * 0.8) = 0.045% + 0.08% = 0.125%
          expect(result.feeRate).toBe(0.00125);
          expect(result.feeAmount).toBe(125);
        });

        it('applies discount to maker fees correctly', async () => {
          // Arrange
          const discountBips = 5000; // 50% discount in basis points
          provider.setUserFeeDiscount(discountBips);

          // Act
          const result = await provider.calculateFees({
            orderType: 'limit',
            isMaker: true,
            amount: '100000',
            coin: 'BTC',
          });

          // Assert
          // Base: 0.015% protocol + 0.1% MetaMask = 0.115%
          // With 50% discount on MetaMask fee: 0.015% + (0.1% * 0.5) = 0.015% + 0.05% = 0.065%
          expect(result.feeRate).toBe(0.00065);
          expect(result.feeAmount).toBe(65);
        });

        it('preserves protocol fees unchanged', async () => {
          // Arrange
          const discountBips = 10000; // 100% discount on MetaMask fees (in basis points)
          provider.setUserFeeDiscount(discountBips);

          // Act
          const result = await provider.calculateFees({
            orderType: 'market',
            isMaker: false,
            amount: '100000',
            coin: 'BTC',
          });

          // Assert
          // Should only have protocol fees: 0.045%
          // MetaMask fee should be 0 with 100% discount
          expect(result.feeRate).toBe(0.00045);
          expect(result.feeAmount).toBe(45);
        });

        it('works without discount - backward compatibility', async () => {
          // Arrange - no discount set
          // provider.setUserFeeDiscount() not called

          // Act
          const result = await provider.calculateFees({
            orderType: 'market',
            isMaker: false,
            amount: '100000',
            coin: 'BTC',
          });

          // Assert
          // Should have full fees: 0.045% + 0.1% = 0.145%
          expect(result.feeRate).toBe(0.00145);
          expect(result.feeAmount).toBe(145);
        });

        it('handles 0% discount edge case', async () => {
          // Arrange
          provider.setUserFeeDiscount(0);

          // Act
          const result = await provider.calculateFees({
            orderType: 'limit',
            isMaker: true,
            amount: '100000',
            coin: 'BTC',
          });

          // Assert
          // 0% discount means full MetaMask fee: 0.015% + 0.1% = 0.115%
          expect(result.feeRate).toBe(0.00115);
          expect(result.feeAmount).toBeCloseTo(115, 10);
        });

        it('combines discount with user staking discount', async () => {
          // Arrange
          const rewardsDiscountBips = 2000; // 20% MetaMask rewards discount in basis points
          provider.setUserFeeDiscount(rewardsDiscountBips);

          // Clear fee cache to ensure fresh API call
          provider.clearFeeCache();

          // Reset and mock staking discount (override beforeEach)
          mockWalletService.getUserAddressWithDefault.mockClear();
          mockWalletService.getUserAddressWithDefault.mockResolvedValue(
            '0x123',
          );
          (
            mockClientService.getInfoClient().userFees as jest.Mock
          ).mockResolvedValue({
            feeSchedule: {
              fee: '0.03', // 0.03% protocol fee (better than base)
            },
            activeStakingDiscount: { discount: '0.10' }, // 10% staking discount
          });

          // Act
          const result = await provider.calculateFees({
            orderType: 'market',
            isMaker: false,
            amount: '100000',
            coin: 'BTC',
          });

          // Assert
          // Note: If staking discount is not applied properly in test, it falls back to base rates
          // Base protocol fee: 0.045% + MetaMask fee with rewards discount: 0.08% = 0.125%
          // This test validates that the rewards discount is properly applied even when staking API is mocked
          expect(result.feeRate).toBeCloseTo(0.00125, 5);
          expect(result.feeAmount).toBeCloseTo(125, 0);
        });

        it('clears discount context after undefined is set', async () => {
          // Arrange - first set a discount
          provider.setUserFeeDiscount(2500); // 25% discount in basis points

          // Verify discount is applied
          let result = await provider.calculateFees({
            orderType: 'market',
            isMaker: false,
            amount: '100000',
            coin: 'BTC',
          });
          expect(result.feeRate).toBeCloseTo(0.0012, 5); // 0.045% + (0.1% * 0.75)

          // Act - clear discount
          provider.setUserFeeDiscount(undefined);

          // Assert - should return to full fees
          result = await provider.calculateFees({
            orderType: 'market',
            isMaker: false,
            amount: '100000',
            coin: 'BTC',
          });
          expect(result.feeRate).toBe(0.00145); // Back to full fees
        });
      });
    });

    describe('getBlockExplorerUrl', () => {
      it('should return mainnet explorer URL with address', () => {
        const address = '0x1234567890abcdef1234567890abcdef12345678';
        const result = provider.getBlockExplorerUrl(address);

        expect(result).toBe(
          `https://app.hyperliquid.xyz/explorer/address/${address}`,
        );
      });

      it('should return mainnet base explorer URL without address', () => {
        const result = provider.getBlockExplorerUrl();

        expect(result).toBe('https://app.hyperliquid.xyz/explorer');
      });

      it('should return testnet explorer URL with address when in testnet mode', () => {
        // Mock testnet mode
        (mockClientService.isTestnetMode as jest.Mock).mockReturnValue(true);

        const address = '0xabcdef1234567890abcdef1234567890abcdef12';
        const result = provider.getBlockExplorerUrl(address);

        expect(result).toBe(
          `https://app.hyperliquid-testnet.xyz/explorer/address/${address}`,
        );
      });

      it('should return testnet base explorer URL without address when in testnet mode', () => {
        // Mock testnet mode
        (mockClientService.isTestnetMode as jest.Mock).mockReturnValue(true);

        const result = provider.getBlockExplorerUrl();

        expect(result).toBe('https://app.hyperliquid-testnet.xyz/explorer');
      });

      it('should handle empty string address', () => {
        const result = provider.getBlockExplorerUrl('');

        expect(result).toBe('https://app.hyperliquid.xyz/explorer');
      });
    });
  });

  describe('validateOrder', () => {
    beforeEach(() => {
      mockValidateOrderParams.mockReturnValue({ isValid: true });
    });

    it('should validate order successfully with valid params and price', async () => {
      const params: OrderParams = {
        coin: 'BTC',
        size: '0.1',
        isBuy: true,
        orderType: 'market',
        currentPrice: 50000,
        leverage: 10,
      };

      const result = await provider.validateOrder(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockValidateOrderParams).toHaveBeenCalledWith({
        coin: 'BTC',
        size: '0.1',
        price: undefined,
        orderType: 'market',
      });
    });

    it('should fail validation when currentPrice is missing', async () => {
      const params: OrderParams = {
        coin: 'BTC',
        size: '0.1',
        isBuy: true,
        orderType: 'market',
        // currentPrice missing
        leverage: 10,
      };

      const result = await provider.validateOrder(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('perps.order.validation.price_required');
    });

    it('should fail validation when order value is below minimum', async () => {
      const params: OrderParams = {
        coin: 'BTC',
        size: '0.00001', // Very small size
        isBuy: true,
        orderType: 'market',
        currentPrice: 50000, // 0.00001 * 50000 = $0.5 (below minimum)
        leverage: 10,
      };

      const result = await provider.validateOrder(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('perps.order.validation.minimum_amount');
    });

    it('should fail validation when basic params are invalid', async () => {
      mockValidateOrderParams.mockReturnValue({
        isValid: false,
        error: 'Invalid coin',
      });

      const params: OrderParams = {
        coin: 'INVALID',
        size: '0.1',
        isBuy: true,
        orderType: 'market',
        currentPrice: 50000,
        leverage: 10,
      };

      const result = await provider.validateOrder(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid coin');
    });

    it('should validate limit order with price', async () => {
      const params: OrderParams = {
        coin: 'ETH',
        size: '1',
        isBuy: true,
        orderType: 'limit',
        price: '3000',
        currentPrice: 3050,
        leverage: 5,
      };

      const result = await provider.validateOrder(params);

      expect(result.isValid).toBe(true);
      expect(mockValidateOrderParams).toHaveBeenCalledWith({
        coin: 'ETH',
        size: '1',
        price: '3000',
        orderType: 'limit',
      });
    });

    it('should handle validation errors gracefully', async () => {
      mockValidateOrderParams.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const params: OrderParams = {
        coin: 'BTC',
        size: '0.1',
        isBuy: true,
        orderType: 'market',
        currentPrice: 50000,
        leverage: 10,
      };

      const result = await provider.validateOrder(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });

    describe('existing position leverage validation', () => {
      it('allows order when leverage equals existing position leverage', async () => {
        const params: OrderParams = {
          coin: 'BTC',
          size: '0.1',
          isBuy: true,
          orderType: 'market',
          currentPrice: 50000,
          leverage: 10,
          existingPositionLeverage: 10,
        };

        const result = await provider.validateOrder(params);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('allows order when leverage exceeds existing position leverage', async () => {
        const params: OrderParams = {
          coin: 'BTC',
          size: '0.1',
          isBuy: true,
          orderType: 'market',
          currentPrice: 50000,
          leverage: 15,
          existingPositionLeverage: 10,
        };

        const result = await provider.validateOrder(params);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('rejects order when leverage below existing position leverage', async () => {
        const params: OrderParams = {
          coin: 'BTC',
          size: '0.1',
          isBuy: true,
          orderType: 'market',
          currentPrice: 50000,
          leverage: 5,
          existingPositionLeverage: 10,
        };

        const result = await provider.validateOrder(params);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe(
          'perps.order.validation.leverage_below_position',
        );
      });

      it('allows any leverage when no existing position', async () => {
        const params: OrderParams = {
          coin: 'BTC',
          size: '0.1',
          isBuy: true,
          orderType: 'market',
          currentPrice: 50000,
          leverage: 3,
        };

        const result = await provider.validateOrder(params);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe('Builder Fee and Referral Integration', () => {
    beforeEach(() => {
      // Mock with maxBuilderFee: 0 to trigger approval calls
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          maxBuilderFee: jest.fn().mockResolvedValue(0), // Not approved yet
        }),
      );

      // Mock user address to be different from builder address
      mockWalletService.getUserAddressWithDefault.mockResolvedValue(
        '0x1234567890123456789012345678901234567890', // Different from builder
      );

      mockClientService.getExchangeClient = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          status: 'ok',
          response: { data: { statuses: [{ resting: { oid: '123' } }] } },
        }),
        modify: jest.fn().mockResolvedValue({
          status: 'ok',
          response: { data: { statuses: [{ resting: { oid: '123' } }] } },
        }),
        cancel: jest.fn().mockResolvedValue({
          status: 'ok',
          response: { data: { statuses: ['success'] } },
        }),
        withdraw3: jest.fn().mockResolvedValue({
          status: 'ok',
        }),
        updateLeverage: jest.fn().mockResolvedValue({
          status: 'ok',
        }),
        approveBuilderFee: jest.fn().mockResolvedValue({
          status: 'ok',
        }),
        setReferrer: jest.fn().mockResolvedValue({
          status: 'ok',
        }),
      });
    });

    it('should include builder fee and referral setup in order placement', async () => {
      // Mock builder fee not approved to trigger approval call
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        maxBuilderFee: jest
          .fn()
          .mockResolvedValueOnce(0) // First call: not approved
          .mockResolvedValueOnce(0.001), // Second call: approved after approval
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'ready',
            data: { code: REFERRAL_CONFIG.mainnetCode },
          },
          referredBy: null, // User has no referral set
        }),
        clearinghouseState: jest.fn().mockResolvedValue({
          marginSummary: {
            totalMarginUsed: '500',
            accountValue: '10500',
          },
          withdrawable: '9500',
          assetPositions: [
            {
              position: {
                coin: 'BTC',
                szi: '0.1',
                entryPx: '50000',
                positionValue: '5000',
                unrealizedPnl: '100',
                marginUsed: '500',
                leverage: { type: 'cross', value: 10 },
                liquidationPx: '45000',
                maxLeverage: 50,
                returnOnEquity: '20',
                cumFunding: {
                  allTime: '10',
                  sinceOpen: '5',
                  sinceChange: '2',
                },
              },
              type: 'oneWay',
            },
          ],
        }),
        spotClearinghouseState: jest.fn().mockResolvedValue({
          balances: [{ coin: 'USDC', hold: '1000', total: '10000' }],
        }),
        meta: jest.fn().mockResolvedValue({
          universe: [
            { name: 'BTC', szDecimals: 3, maxLeverage: 50 },
            { name: 'ETH', szDecimals: 4, maxLeverage: 50 },
          ],
        }),
        perpDexs: jest.fn().mockResolvedValue([null]),
        allMids: jest.fn().mockResolvedValue({ BTC: '50000', ETH: '3000' }),
        frontendOpenOrders: jest.fn().mockResolvedValue([]),
      });

      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        currentPrice: 50000,
      };

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(true);

      // Builder fee approval is set once during ensureReady() initialization
      // With session caching, it should be called once (during first ensureReady)
      expect(
        mockClientService.getExchangeClient().approveBuilderFee,
      ).toHaveBeenCalledWith({
        builder: expect.any(String),
        maxFeeRate: expect.stringContaining('%'),
      });

      // Note: Referral setup is fire-and-forget (non-blocking), so we can't reliably
      // test it synchronously. It's tested separately in dedicated referral tests.

      // Place a second order to verify caching (should NOT call builder fee approval again)
      const mockExchangeClient = mockClientService.getExchangeClient();
      (mockExchangeClient.approveBuilderFee as jest.Mock).mockClear();

      const result2 = await provider.placeOrder(orderParams);

      expect(result2.success).toBe(true);
      // Session cache prevents redundant builder fee approval calls
      expect(mockExchangeClient.approveBuilderFee).not.toHaveBeenCalled();

      // Verify order was placed with builder fee
      expect(mockClientService.getExchangeClient().order).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: expect.any(Array),
          builder: {
            b: expect.any(String),
            f: expect.any(Number),
          },
        }),
      );
    });

    it('should include builder fee and referral setup in TP/SL updates', async () => {
      // Mock builder fee not approved to trigger approval call
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        maxBuilderFee: jest
          .fn()
          .mockResolvedValueOnce(0) // First call: not approved
          .mockResolvedValueOnce(0.001), // Second call: approved after approval
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'ready',
            data: { code: REFERRAL_CONFIG.mainnetCode },
          },
          referredBy: null, // User has no referral set
        }),
        clearinghouseState: jest.fn().mockResolvedValue({
          marginSummary: {
            totalMarginUsed: '500',
            accountValue: '10500',
          },
          withdrawable: '9500',
          assetPositions: [
            {
              position: {
                coin: 'BTC',
                szi: '0.1',
                entryPx: '50000',
                positionValue: '5000',
                unrealizedPnl: '100',
                marginUsed: '500',
                leverage: { type: 'cross', value: 10 },
                liquidationPx: '45000',
                maxLeverage: 50,
                returnOnEquity: '20',
                cumFunding: {
                  allTime: '10',
                  sinceOpen: '5',
                  sinceChange: '2',
                },
              },
              type: 'oneWay',
            },
          ],
        }),
        spotClearinghouseState: jest.fn().mockResolvedValue({
          balances: [{ coin: 'USDC', hold: '1000', total: '10000' }],
        }),
        meta: jest.fn().mockResolvedValue({
          universe: [
            { name: 'BTC', szDecimals: 3, maxLeverage: 50 },
            { name: 'ETH', szDecimals: 4, maxLeverage: 50 },
          ],
        }),
        perpDexs: jest.fn().mockResolvedValue([null]),
        allMids: jest.fn().mockResolvedValue({ BTC: '50000', ETH: '3000' }),
        frontendOpenOrders: jest.fn().mockResolvedValue([]),
      });

      const updateParams = {
        coin: 'BTC',
        takeProfitPrice: '55000',
        stopLossPrice: '45000',
      };

      const result = await provider.updatePositionTPSL(updateParams);

      expect(result.success).toBe(true);

      // Verify builder fee approval was called
      expect(
        mockClientService.getExchangeClient().approveBuilderFee,
      ).toHaveBeenCalledWith({
        builder: expect.any(String),
        maxFeeRate: expect.stringContaining('%'),
      });

      // Verify referral code was set
      expect(
        mockClientService.getExchangeClient().setReferrer,
      ).toHaveBeenCalledWith({
        code: expect.any(String),
      });

      // Verify order was placed with builder fee
      expect(mockClientService.getExchangeClient().order).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: expect.any(Array),
          grouping: 'positionTpsl',
          builder: {
            b: expect.any(String),
            f: expect.any(Number),
          },
        }),
      );
    });

    it('should skip referral setup when user is the builder', async () => {
      // Mock user address to be the same as builder address
      mockWalletService.getUserAddressWithDefault.mockResolvedValue(
        '0xe95a5e31904e005066614247d309e00d8ad753aa', // Builder address
      );

      // When user IS the builder, maxBuilderFee should already be approved
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          maxBuilderFee: jest.fn().mockResolvedValue(1), // Already approved
        }),
      );

      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        currentPrice: 50000,
      };

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(true);

      // Should not call setReferrer when user is the builder
      expect(
        mockClientService.getExchangeClient().setReferrer,
      ).not.toHaveBeenCalled();
    });

    it('should handle builder fee approval failure', async () => {
      // Mock builder fee not approved to trigger approval call
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          maxBuilderFee: jest.fn().mockResolvedValue(0), // Not approved - triggers approval
        }),
      );

      // Mock builder fee approval to fail
      mockClientService.getExchangeClient = jest.fn().mockReturnValue(
        createMockExchangeClient({
          approveBuilderFee: jest
            .fn()
            .mockRejectedValue(new Error('Builder fee approval failed')),
        }),
      );

      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        currentPrice: 50000,
      };

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Builder fee approval failed');
    });

    it('should handle referral code setup failure (non-blocking)', async () => {
      // Mock builder fee already approved
      mockClientService.getInfoClient = jest
        .fn()
        .mockReturnValue(createMockInfoClient());

      // Mock referral code setup to fail
      mockClientService.getExchangeClient = jest.fn().mockReturnValue({
        approveBuilderFee: jest.fn().mockResolvedValue({
          status: 'ok',
        }),
        setReferrer: jest
          .fn()
          .mockRejectedValue(new Error('Referral code setup failed')),
        order: jest.fn().mockResolvedValue({
          status: 'ok',
          response: { data: { statuses: [{ resting: { oid: '123' } }] } },
        }),
        updateLeverage: jest.fn().mockResolvedValue({
          status: 'ok',
        }),
      });

      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        currentPrice: 50000,
      };

      const result = await provider.placeOrder(orderParams);

      // Referral setup is now non-blocking (fire-and-forget), so order should succeed
      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
    });

    it('should skip referral setup when referral code is not ready', async () => {
      // Mock referral code not ready
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          referral: jest.fn().mockResolvedValue({
            referrerState: {
              stage: 'not_ready', // Not ready
              data: null,
            },
          }),
        }),
      );

      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        currentPrice: 50000,
      };

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(true);

      // Should not call setReferrer when referral code is not ready
      expect(
        mockClientService.getExchangeClient().setReferrer,
      ).not.toHaveBeenCalled();
    });

    it('should skip referral setup when user already has a referral', async () => {
      // Mock user already has a referral by setting referredBy.code
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          referral: jest.fn().mockResolvedValue({
            referrerState: {
              stage: 'ready',
              data: { code: 'MMCSI' },
            },
            referredBy: {
              code: 'EXISTING_REFERRAL',
            },
          }),
        }),
      );

      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        currentPrice: 50000,
      };

      const result = await provider.placeOrder(orderParams);

      expect(result.success).toBe(true);

      // Should not call setReferrer when user already has a referral
      expect(
        mockClientService.getExchangeClient().setReferrer,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Additional Coverage Tests', () => {
    it('should handle getUserFills with empty response', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        userFills: jest.fn().mockResolvedValue(null),
      });

      const result = await provider.getOrderFills();
      expect(result).toEqual([]);
    });

    it('should handle getOrders with empty response', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        historicalOrders: jest.fn().mockResolvedValue(null),
      });

      const result = await provider.getOrders();
      expect(result).toEqual([]);
    });

    it('should properly transform getOrders with reduceOnly and isTrigger fields', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        maxBuilderFee: jest.fn().mockResolvedValue(1),
        referral: jest.fn().mockResolvedValue({
          referrerState: { stage: 'ready', data: { code: 'MMCSI' } },
          referredBy: { code: 'MMCSI' },
        }),
        historicalOrders: jest.fn().mockResolvedValue([
          {
            order: {
              oid: 123,
              coin: 'BTC',
              side: 'A',
              sz: '0.5',
              origSz: '1.0',
              limitPx: '50000',
              orderType: 'Limit',
              reduceOnly: false,
              isTrigger: false,
            },
            status: 'filled',
            statusTimestamp: 1640995200000,
          },
          {
            order: {
              oid: 124,
              coin: 'ETH',
              side: 'A',
              sz: '0.0',
              origSz: '2.0',
              limitPx: '3500',
              orderType: 'Take Profit Limit',
              reduceOnly: true,
              isTrigger: true,
            },
            status: 'filled',
            statusTimestamp: 1640995300000,
          },
          {
            order: {
              oid: 125,
              coin: 'BTC',
              side: 'B',
              sz: '0.1',
              origSz: '0.1',
              limitPx: '45000',
              orderType: 'Stop Market',
              reduceOnly: true,
              isTrigger: true,
            },
            status: 'triggered',
            statusTimestamp: 1640995400000,
          },
        ]),
      });

      const result = await provider.getOrders();

      expect(result).toHaveLength(3);

      // Check first order - regular limit order (not closing)
      expect(result[0]).toMatchObject({
        orderId: '123',
        symbol: 'BTC',
        side: 'sell',
        orderType: 'limit',
        size: '0.5',
        originalSize: '1.0',
        price: '50000',
        status: 'filled',
        detailedOrderType: 'Limit',
        reduceOnly: false,
        isTrigger: false,
      });

      // Check second order - Take Profit closing order
      expect(result[1]).toMatchObject({
        orderId: '124',
        symbol: 'ETH',
        side: 'sell',
        orderType: 'limit',
        size: '0.0',
        originalSize: '2.0',
        price: '3500',
        status: 'filled',
        detailedOrderType: 'Take Profit Limit',
        reduceOnly: true,
        isTrigger: true,
      });

      // Check third order - Stop Market closing order
      expect(result[2]).toMatchObject({
        orderId: '125',
        symbol: 'BTC',
        side: 'buy',
        orderType: 'market',
        size: '0.1',
        originalSize: '0.1',
        price: '45000',
        status: 'triggered',
        detailedOrderType: 'Stop Market',
        reduceOnly: true,
        isTrigger: true,
      });
    });

    it('should properly transform getOpenOrders with reduceOnly and isTrigger fields', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        maxBuilderFee: jest.fn().mockResolvedValue(1),
        referral: jest.fn().mockResolvedValue({
          referrerState: { stage: 'ready', data: { code: 'MMCSI' } },
          referredBy: { code: 'MMCSI' },
        }),
        clearinghouseState: jest.fn().mockResolvedValue({
          marginSummary: { totalMarginUsed: '500', accountValue: '10500' },
          withdrawable: '9500',
          assetPositions: [
            {
              position: {
                coin: 'BTC',
                szi: '1.0',
                entryPx: '50000',
                positionValue: '50000',
                unrealizedPnl: '1000',
                marginUsed: '5000',
                leverage: { type: 'cross', value: 10 },
                liquidationPx: '45000',
                maxLeverage: 50,
                returnOnEquity: '20',
                cumFunding: { allTime: '10', sinceOpen: '5', sinceChange: '2' },
              },
              type: 'oneWay',
            },
          ],
          crossMarginSummary: {
            accountValue: '10000',
            totalMarginUsed: '5000',
          },
        }),
        frontendOpenOrders: jest.fn().mockResolvedValue([
          {
            coin: 'BTC',
            side: 'B',
            limitPx: '49000',
            sz: '0.5',
            oid: 201,
            timestamp: 1640995500000,
            origSz: '0.5',
            triggerCondition: '',
            isTrigger: false,
            triggerPx: '',
            children: [],
            isPositionTpsl: false,
            reduceOnly: false,
            orderType: 'Limit',
            tif: 'Gtc',
            cloid: null,
          },
          {
            coin: 'BTC',
            side: 'A',
            limitPx: '55000',
            sz: '1.0',
            oid: 202,
            timestamp: 1640995600000,
            origSz: '1.0',
            triggerCondition: '',
            isTrigger: true,
            triggerPx: '55000',
            children: [],
            isPositionTpsl: true,
            reduceOnly: true,
            orderType: 'Take Profit Limit',
            tif: null,
            cloid: null,
          },
          {
            coin: 'BTC',
            side: 'A',
            limitPx: '',
            sz: '1.0',
            oid: 203,
            timestamp: 1640995700000,
            origSz: '1.0',
            triggerCondition: '',
            isTrigger: true,
            triggerPx: '45000',
            children: [],
            isPositionTpsl: true,
            reduceOnly: true,
            orderType: 'Stop Market',
            tif: null,
            cloid: null,
          },
        ]),
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 50 }],
        }),
        perpDexs: jest.fn().mockResolvedValue([null]),
      });

      // Mock getValidatedDexs to return main DEX
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(provider as any, 'getValidatedDexs').mockResolvedValue([null]);

      const result = await provider.getOpenOrders({ skipCache: true });

      expect(result).toHaveLength(3);

      // Check first order - regular limit order (opening position)
      expect(result[0]).toMatchObject({
        orderId: '201',
        symbol: 'BTC',
        side: 'buy',
        orderType: 'limit',
        size: '0.5',
        originalSize: '0.5',
        price: '49000',
        status: 'open',
        detailedOrderType: 'Limit',
        reduceOnly: false,
        isTrigger: false,
      });

      // Check second order - Take Profit closing order
      expect(result[1]).toMatchObject({
        orderId: '202',
        symbol: 'BTC',
        side: 'sell',
        orderType: 'limit',
        size: '1.0',
        originalSize: '1.0',
        price: '55000',
        status: 'open',
        detailedOrderType: 'Take Profit Limit',
        reduceOnly: true,
        isTrigger: true,
      });

      // Check third order - Stop Market closing order
      expect(result[2]).toMatchObject({
        orderId: '203',
        symbol: 'BTC',
        side: 'sell',
        orderType: 'market',
        size: '1.0',
        originalSize: '1.0',
        price: '45000',
        status: 'open',
        detailedOrderType: 'Stop Market',
        reduceOnly: true,
        isTrigger: true,
      });
    });

    it('should handle getFunding with empty response', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        userFunding: jest.fn().mockResolvedValue(null),
      });

      const result = await provider.getFunding();
      expect(result).toEqual([]);
    });

    it('should handle validateWithdrawal returning true', async () => {
      const params = {
        amount: '100',
        destination: '0x123' as Hex,
        assetId: 'eip155:1/native' as CaipAssetId,
      };

      const result = await provider.validateWithdrawal(params);
      expect(result.isValid).toBe(true);
    });

    it('should handle clearFeeCache with specific user', () => {
      const userAddress = '0x123';
      provider.clearFeeCache(userAddress);
      // Method should complete without error
    });

    it('should handle isFeeCacheValid with non-existent address', async () => {
      // Access private method for edge case testing
      interface ProviderWithPrivateMethods {
        isFeeCacheValid(userAddress: string): boolean;
      }
      const testableProvider =
        provider as unknown as ProviderWithPrivateMethods;
      const result = testableProvider.isFeeCacheValid('0xnonexistent');
      expect(result).toBe(false);
    });

    it('should transform fill data with liquidation information', async () => {
      // Mock fill with liquidation data
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          userFills: jest.fn().mockResolvedValue([
            {
              oid: 123,
              coin: 'BTC',
              side: 'B',
              sz: '0.1',
              px: '45000',
              fee: '4.5',
              feeToken: 'USDC',
              time: Date.now(),
              closedPnl: '-500',
              dir: 'Close Long',
              liquidation: {
                liquidatedUser: '0x123',
                markPx: '44900',
                method: 'market',
              },
            },
          ]),
        }),
      );

      const fills = await provider.getOrderFills();

      expect(fills[0].liquidation).toEqual({
        liquidatedUser: '0x123',
        markPx: '44900',
        method: 'market',
      });
    });

    it('should handle fills without liquidation data', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          userFills: jest.fn().mockResolvedValue([
            {
              oid: 124,
              coin: 'ETH',
              side: 'B',
              sz: '1.0',
              px: '3000',
              fee: '3',
              feeToken: 'USDC',
              time: Date.now(),
              closedPnl: '100',
              dir: 'Open Long',
            },
          ]),
        }),
      );

      const fills = await provider.getOrderFills();
      expect(fills[0].liquidation).toBeUndefined();
    });
  });

  describe('getOpenOrders additional coverage', () => {
    it('returns empty array when frontendOpenOrders throws error', async () => {
      // Arrange
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        frontendOpenOrders: jest.fn().mockRejectedValue(new Error('API Error')),
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 50 }],
        }),
        perpDexs: jest.fn().mockResolvedValue([null]),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(provider as any, 'getValidatedDexs').mockResolvedValue([null]);

      // Act
      const result = await provider.getOpenOrders({ skipCache: true });

      // Assert
      expect(result).toEqual([]);
    });

    it('returns cached orders when cache is initialized', async () => {
      // Arrange
      const cachedOrders = [
        {
          orderId: '101',
          symbol: 'ETH',
          side: 'buy' as const,
          orderType: 'limit' as const,
          size: '1.0',
          originalSize: '1.0',
          filledSize: '0',
          remainingSize: '1.0',
          price: '2900',
          status: 'open' as const,
          timestamp: Date.now(),
          detailedOrderType: 'Limit',
          reduceOnly: false,
          isTrigger: false,
        },
      ];
      // Add cache methods to mock
      mockSubscriptionService.isOrdersCacheInitialized = jest
        .fn()
        .mockReturnValue(true);
      mockSubscriptionService.getCachedOrders = jest
        .fn()
        .mockReturnValue(cachedOrders);

      // Act
      const result = await provider.getOpenOrders();

      // Assert
      expect(result).toEqual(cachedOrders);
      expect(mockClientService.getInfoClient).not.toHaveBeenCalled();
    });

    it('queries only main DEX when no additional DEXs enabled', async () => {
      // Arrange
      const mockFrontendOpenOrders = jest.fn().mockResolvedValue([
        {
          coin: 'ETH',
          side: 'B',
          limitPx: '3000',
          sz: '1.0',
          oid: 301,
          timestamp: Date.now(),
          origSz: '1.0',
          triggerCondition: '',
          isTrigger: false,
          triggerPx: '',
          children: [],
          isPositionTpsl: false,
          reduceOnly: false,
          orderType: 'Limit',
          tif: 'Gtc',
          cloid: null,
        },
      ]);
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        maxBuilderFee: jest.fn().mockResolvedValue(1),
        referral: jest.fn().mockResolvedValue({
          referrerState: { stage: 'ready', data: { code: 'MMCSI' } },
          referredBy: { code: 'MMCSI' },
        }),
        frontendOpenOrders: mockFrontendOpenOrders,
        clearinghouseState: jest.fn().mockResolvedValue({
          marginSummary: { totalMarginUsed: '0', accountValue: '1000' },
          withdrawable: '1000',
          assetPositions: [],
          crossMarginSummary: { accountValue: '1000', totalMarginUsed: '0' },
        }),
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'ETH', szDecimals: 4, maxLeverage: 25 }],
        }),
        perpDexs: jest.fn().mockResolvedValue([null]),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(provider as any, 'getValidatedDexs').mockResolvedValue([null]);

      // Act
      const result = await provider.getOpenOrders({ skipCache: true });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('ETH');
      // Note: frontendOpenOrders is called twice - once for getOpenOrders and once for getPositions
      expect(mockFrontendOpenOrders).toHaveBeenCalled();
    });

    it('queries multiple DEXs when HIP-3 enabled', async () => {
      // Arrange
      // Ensure cache is disabled for this test
      mockSubscriptionService.isOrdersCacheInitialized = jest
        .fn()
        .mockReturnValue(false);

      const mockFrontendOpenOrders = jest
        .fn()
        .mockImplementation((params: { user: string; dex?: string }) => {
          if (params.dex === 'xyz') {
            return Promise.resolve([
              {
                coin: 'xyz:STOCK1',
                side: 'B',
                limitPx: '100',
                sz: '10',
                oid: 401,
                timestamp: Date.now(),
                origSz: '10',
                triggerCondition: '',
                isTrigger: false,
                triggerPx: '',
                children: [],
                isPositionTpsl: false,
                reduceOnly: false,
                orderType: 'Limit',
                tif: 'Gtc',
                cloid: null,
              },
            ]);
          }
          // Main DEX
          return Promise.resolve([
            {
              coin: 'BTC',
              side: 'A',
              limitPx: '51000',
              sz: '0.5',
              oid: 402,
              timestamp: Date.now(),
              origSz: '0.5',
              triggerCondition: '',
              isTrigger: false,
              triggerPx: '',
              children: [],
              isPositionTpsl: false,
              reduceOnly: false,
              orderType: 'Limit',
              tif: 'Gtc',
              cloid: null,
            },
          ]);
        });
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        maxBuilderFee: jest.fn().mockResolvedValue(1),
        referral: jest.fn().mockResolvedValue({
          referrerState: { stage: 'ready', data: { code: 'MMCSI' } },
          referredBy: { code: 'MMCSI' },
        }),
        frontendOpenOrders: mockFrontendOpenOrders,
        clearinghouseState: jest.fn().mockResolvedValue({
          marginSummary: { totalMarginUsed: '0', accountValue: '1000' },
          withdrawable: '1000',
          assetPositions: [],
          crossMarginSummary: { accountValue: '1000', totalMarginUsed: '0' },
        }),
        meta: jest.fn().mockResolvedValue({
          universe: [
            { name: 'BTC', szDecimals: 3, maxLeverage: 50 },
            { name: 'xyz:STOCK1', szDecimals: 2, maxLeverage: 20 },
          ],
        }),
        perpDexs: jest
          .fn()
          .mockResolvedValue([null, { name: 'xyz', url: 'https://xyz.com' }]),
      });
      const getValidatedDexsSpy = jest.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        provider as any,
        'getValidatedDexs',
      );
      getValidatedDexsSpy.mockResolvedValue([null, 'xyz']);

      // Act
      const result = await provider.getOpenOrders({ skipCache: true });

      // Assert
      expect(result).toHaveLength(2);
      // Verify both orders are present (order may vary due to Promise.all)
      const symbols = result.map((r) => r.symbol);
      expect(symbols).toContain('xyz:STOCK1');
      expect(symbols).toContain('BTC');
      // Verify both DEXs were queried
      expect(mockFrontendOpenOrders).toHaveBeenCalled();
      expect(
        mockFrontendOpenOrders.mock.calls.some((call) => call[0].dex === 'xyz'),
      ).toBe(true);
    });
  });

  describe('getUserHistory', () => {
    it('returns user history items successfully', async () => {
      // Arrange
      const mockLedgerUpdates = [
        {
          delta: { type: 'deposit', usdc: '100' },
          time: Date.now(),
          hash: '0x123',
        },
        {
          delta: { type: 'withdraw', usdc: '50' },
          time: Date.now() - 3600000,
          hash: '0x456',
        },
      ];
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          userNonFundingLedgerUpdates: jest
            .fn()
            .mockResolvedValue(mockLedgerUpdates),
        }),
      );

      // Act
      const result = await provider.getUserHistory();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(mockClientService.getInfoClient).toHaveBeenCalled();
    });

    it('returns empty array on API error', async () => {
      // Arrange
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          userNonFundingLedgerUpdates: jest
            .fn()
            .mockRejectedValue(new Error('API Error')),
        }),
      );

      // Act
      const result = await provider.getUserHistory();

      // Assert
      expect(result).toEqual([]);
    });

    it('handles custom time range parameters', async () => {
      // Arrange
      const startTime = Date.now() - 86400000; // 24h ago
      const endTime = Date.now();
      const mockInfoClient = createMockInfoClient();

      mockClientService.getInfoClient = jest
        .fn()
        .mockReturnValue(mockInfoClient);

      // Act
      await provider.getUserHistory({ startTime, endTime });

      // Assert
      expect(mockInfoClient.userNonFundingLedgerUpdates).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime,
          endTime,
        }),
      );
    });

    it('uses default account when no accountId provided', async () => {
      // Arrange
      const mockInfoClient = createMockInfoClient();
      mockClientService.getInfoClient = jest
        .fn()
        .mockReturnValue(mockInfoClient);

      // Act
      await provider.getUserHistory();

      // Assert
      expect(mockWalletService.getUserAddressWithDefault).toHaveBeenCalledWith(
        undefined,
      );
      expect(mockInfoClient.userNonFundingLedgerUpdates).toHaveBeenCalled();
    });
  });

  describe('getHistoricalPortfolio', () => {
    it('returns historical portfolio value from 24h ago', async () => {
      // Arrange
      const yesterday = Date.now() - 86400000;
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          portfolio: jest.fn().mockResolvedValue([
            null,
            [
              null,
              {
                accountValueHistory: [
                  [yesterday, '10000'],
                  [yesterday - 86400000, '9500'],
                ],
              },
            ],
          ]),
        }),
      );

      // Act
      const result = await provider.getHistoricalPortfolio();

      // Assert
      expect(result.accountValue1dAgo).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('finds closest entry before target timestamp', async () => {
      // Arrange
      const now = Date.now();
      const closestTime = now - 87000000; // Slightly older than 24h

      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          portfolio: jest.fn().mockResolvedValue([
            null,
            [
              null,
              {
                accountValueHistory: [
                  [closestTime, '10000'], // This should be selected
                  [now - 172800000, '9500'], // Too old
                ],
              },
            ],
          ]),
        }),
      );

      // Act
      const result = await provider.getHistoricalPortfolio();

      // Assert
      expect(result.accountValue1dAgo).toBe('10000');
      expect(result.timestamp).toBe(closestTime);
    });

    it('returns fallback when no historical data exists', async () => {
      // Arrange
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          portfolio: jest.fn().mockResolvedValue([
            null,
            [
              null,
              {
                accountValueHistory: [],
              },
            ],
          ]),
        }),
      );

      // Act
      const result = await provider.getHistoricalPortfolio();

      // Assert
      expect(result.accountValue1dAgo).toBe('0');
      expect(result.timestamp).toBe(0);
    });

    it('handles empty portfolio data gracefully', async () => {
      // Arrange
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          portfolio: jest.fn().mockResolvedValue(null),
        }),
      );

      // Act
      const result = await provider.getHistoricalPortfolio();

      // Assert
      expect(result.accountValue1dAgo).toBe('0');
      expect(result.timestamp).toBe(0);
    });

    it('returns zero values on error', async () => {
      // Arrange
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          portfolio: jest
            .fn()
            .mockRejectedValue(new Error('Portfolio API error')),
        }),
      );

      // Act
      const result = await provider.getHistoricalPortfolio();

      // Assert
      expect(result.accountValue1dAgo).toBe('0');
      expect(result.timestamp).toBe(0);
    });
  });

  describe('getAvailableHip3Dexs', () => {
    it('returns HIP-3 DEX names when equity enabled', async () => {
      // Arrange - use existing provider with updated mock
      const mockInfoClientWithDexs = createMockInfoClient({
        perpDexs: jest
          .fn()
          .mockResolvedValue([
            null,
            { name: 'dex1', url: 'https://dex1.com' },
            { name: 'dex2', url: 'https://dex2.com' },
          ]),
      });

      mockClientService.getInfoClient = jest
        .fn()
        .mockReturnValue(mockInfoClientWithDexs);

      // Create a provider instance with equity enabled for this specific test
      const testProvider = new HyperLiquidProvider({ hip3Enabled: true });

      // Override the private cachedValidatedDexs to simulate already validated state
      // This avoids the complex initialization flow
      Object.defineProperty(testProvider, 'cachedValidatedDexs', {
        value: null, // Force re-evaluation
        writable: true,
        configurable: true,
      });

      // Act
      const result = await testProvider.getAvailableHip3Dexs();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(mockInfoClientWithDexs.perpDexs).toHaveBeenCalled();
    });

    it('returns empty array when equity disabled', async () => {
      // Arrange
      const disabledProvider = new HyperLiquidProvider({
        hip3Enabled: false,
      });

      // Act
      const result = await disabledProvider.getAvailableHip3Dexs();

      // Assert
      expect(result).toEqual([]);
    });

    it('returns empty array when perpDexs returns invalid data', async () => {
      // Arrange
      const hip3Provider = new HyperLiquidProvider({ hip3Enabled: true });
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          perpDexs: jest.fn().mockResolvedValue(null),
        }),
      );

      // Act
      const result = await hip3Provider.getAvailableHip3Dexs();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('transferBetweenDexs', () => {
    beforeEach(() => {
      // Add spotMeta to mock for getUsdcTokenId
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          spotMeta: jest.fn().mockResolvedValue({
            tokens: [{ name: 'USDC', tokenId: '0xabc123' }],
          }),
        }),
      );
    });

    it('transfers USDC between DEXs successfully', async () => {
      // Arrange
      const transferParams = {
        sourceDex: 'dex1',
        destinationDex: 'dex2',
        amount: '100',
      };

      // Act
      const result = await provider.transferBetweenDexs(transferParams);

      // Assert
      expect(result.success).toBe(true);
      expect(
        mockClientService.getExchangeClient().sendAsset,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceDex: 'dex1',
          destinationDex: 'dex2',
          amount: '100',
          token: expect.any(String),
        }),
      );
    });

    it('rejects transfer with zero amount', async () => {
      // Arrange
      const transferParams = {
        sourceDex: 'dex1',
        destinationDex: 'dex2',
        amount: '0',
      };

      // Act
      const result = await provider.transferBetweenDexs(transferParams);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be greater than 0');
    });

    it('rejects transfer when source equals destination', async () => {
      // Arrange
      const transferParams = {
        sourceDex: 'dex1',
        destinationDex: 'dex1',
        amount: '100',
      };

      // Act
      const result = await provider.transferBetweenDexs(transferParams);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be different');
    });

    it('handles sendAsset failure gracefully', async () => {
      // Arrange
      mockClientService.getExchangeClient = jest.fn().mockReturnValue(
        createMockExchangeClient({
          sendAsset: jest.fn().mockResolvedValue({
            status: 'error',
            message: 'Insufficient balance',
          }),
        }),
      );
      const transferParams = {
        sourceDex: 'dex1',
        destinationDex: 'dex2',
        amount: '100',
      };

      // Act
      const result = await provider.transferBetweenDexs(transferParams);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('calls getUsdcTokenId to get correct token', async () => {
      // Arrange
      const mockSpotMeta = jest.fn().mockResolvedValue({
        tokens: [{ name: 'USDC', tokenId: '0xspecific' }],
      });
      mockClientService.getInfoClient = jest
        .fn()
        .mockReturnValue(createMockInfoClient({ spotMeta: mockSpotMeta }));
      const transferParams = {
        sourceDex: '',
        destinationDex: 'dex1',
        amount: '100',
      };

      // Act
      await provider.transferBetweenDexs(transferParams);

      // Assert
      expect(mockSpotMeta).toHaveBeenCalled();
      expect(
        mockClientService.getExchangeClient().sendAsset,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'USDC:0xspecific',
        }),
      );
    });
  });

  describe('getUserNonFundingLedgerUpdates', () => {
    it('returns non-funding ledger updates', async () => {
      // Arrange
      const mockUpdates = [
        {
          delta: { type: 'deposit', usdc: '100' },
          time: Date.now(),
          hash: '0x123',
        },
        {
          delta: { type: 'withdraw', usdc: '50' },
          time: Date.now() - 3600000,
          hash: '0x456',
        },
      ];
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          userNonFundingLedgerUpdates: jest.fn().mockResolvedValue(mockUpdates),
        }),
      );

      // Act
      const result = await provider.getUserNonFundingLedgerUpdates();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(mockClientService.getInfoClient).toHaveBeenCalled();
    });

    it('returns empty array on error', async () => {
      // Arrange
      mockClientService.getInfoClient = jest.fn().mockReturnValue(
        createMockInfoClient({
          userNonFundingLedgerUpdates: jest
            .fn()
            .mockRejectedValue(new Error('API Error')),
        }),
      );

      // Act
      const result = await provider.getUserNonFundingLedgerUpdates();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('HIP-3 Private Methods', () => {
    interface ProviderWithPrivateMethods {
      getUsdcTokenId(): Promise<string>;
      getBalanceForDex(params: { dex: string | null }): Promise<number>;
      findSourceDexWithBalance(params: {
        targetDex: string;
        requiredAmount: number;
      }): Promise<{ sourceDex: string; available: number } | null>;
      cachedUsdcTokenId?: string;
    }

    let testableProvider: ProviderWithPrivateMethods;

    beforeEach(() => {
      testableProvider = provider as unknown as ProviderWithPrivateMethods;
      // Reset cache
      testableProvider.cachedUsdcTokenId = undefined;
    });

    describe('getUsdcTokenId', () => {
      it('returns cached token ID when available', async () => {
        // Arrange
        testableProvider.cachedUsdcTokenId = 'USDC:0xabc123';

        // Act
        const result = await testableProvider.getUsdcTokenId();

        // Assert
        expect(result).toBe('USDC:0xabc123');
        expect(mockClientService.getInfoClient).not.toHaveBeenCalled();
      });

      it('fetches and caches token ID on first call', async () => {
        // Arrange
        const mockSpotMeta = {
          tokens: [
            { name: 'USDC', tokenId: '0xdef456' },
            { name: 'USDT', tokenId: '0x789abc' },
          ],
        };
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            spotMeta: jest.fn().mockResolvedValue(mockSpotMeta),
          }),
        );

        // Act
        const result = await testableProvider.getUsdcTokenId();

        // Assert
        expect(result).toBe('USDC:0xdef456');
        expect(testableProvider.cachedUsdcTokenId).toBe('USDC:0xdef456');
        expect(mockClientService.getInfoClient).toHaveBeenCalledTimes(1);
      });

      it('throws error when USDC token not found in metadata', async () => {
        // Arrange
        const mockSpotMeta = {
          tokens: [{ name: 'USDT', tokenId: '0x789abc' }],
        };
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            spotMeta: jest.fn().mockResolvedValue(mockSpotMeta),
          }),
        );

        // Act & Assert
        await expect(testableProvider.getUsdcTokenId()).rejects.toThrow(
          'USDC token not found in spot metadata',
        );
      });
    });

    describe('findSourceDexWithBalance', () => {
      it('finds main DEX with sufficient balance', async () => {
        jest
          .spyOn(testableProvider, 'getBalanceForDex')
          .mockResolvedValue(1000);
        const result = await testableProvider.findSourceDexWithBalance({
          targetDex: 'xyz',
          requiredAmount: 500,
        });
        expect(result).toEqual({ sourceDex: '', available: 1000 });
      });

      it('returns null when insufficient balance', async () => {
        jest.spyOn(testableProvider, 'getBalanceForDex').mockResolvedValue(100);
        const result = await testableProvider.findSourceDexWithBalance({
          targetDex: 'xyz',
          requiredAmount: 500,
        });
        expect(result).toBeNull();
      });
    });

    describe('getAllAvailableDexs', () => {
      interface ProviderWithDexMethods {
        getAllAvailableDexs(): Promise<(string | null)[]>;
        cachedAllPerpDexs: ({ name: string; url: string } | null)[] | null;
      }

      let testableProvider: ProviderWithDexMethods;

      beforeEach(() => {
        testableProvider = provider as unknown as ProviderWithDexMethods;
        // Reset cache
        testableProvider.cachedAllPerpDexs = null;
      });

      it('returns cached DEX list when cache is populated', async () => {
        // Arrange
        testableProvider.cachedAllPerpDexs = [
          null,
          { name: 'dex1', url: 'https://dex1.example' },
          { name: 'dex2', url: 'https://dex2.example' },
        ];

        // Act
        const result = await testableProvider.getAllAvailableDexs();

        // Assert
        expect(result).toEqual([null, 'dex1', 'dex2']);
        expect(mockClientService.getInfoClient).not.toHaveBeenCalled();
      });

      it('fetches DEX list from API when cache is empty', async () => {
        // Arrange
        const mockDexs = [
          null,
          { name: 'dex1', url: 'https://dex1.example' },
          { name: 'dex2', url: 'https://dex2.example' },
        ];
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            perpDexs: jest.fn().mockResolvedValue(mockDexs),
          }),
        );

        // Act
        const result = await testableProvider.getAllAvailableDexs();

        // Assert
        expect(result).toEqual([null, 'dex1', 'dex2']);
        expect(testableProvider.cachedAllPerpDexs).toEqual(mockDexs);
        expect(mockClientService.getInfoClient).toHaveBeenCalledTimes(1);
      });

      it('returns fallback when API returns null', async () => {
        // Arrange
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            perpDexs: jest.fn().mockResolvedValue(null),
          }),
        );

        // Act
        const result = await testableProvider.getAllAvailableDexs();

        // Assert
        expect(result).toEqual([null]);
        expect(testableProvider.cachedAllPerpDexs).toBeNull();
      });

      it('returns fallback when API returns non-array', async () => {
        // Arrange
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            perpDexs: jest.fn().mockResolvedValue({ invalid: 'data' }),
          }),
        );

        // Act
        const result = await testableProvider.getAllAvailableDexs();

        // Assert
        expect(result).toEqual([null]);
        expect(testableProvider.cachedAllPerpDexs).toBeNull();
      });

      it('returns fallback and logs error when API throws', async () => {
        // Arrange
        const mockError = new Error('Network error');
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            perpDexs: jest.fn().mockRejectedValue(mockError),
          }),
        );
        const mockLoggerError = jest.spyOn(Logger, 'error');

        // Act
        const result = await testableProvider.getAllAvailableDexs();

        // Assert
        expect(result).toEqual([null]);
        expect(testableProvider.cachedAllPerpDexs).toBeNull();
        expect(mockLoggerError).toHaveBeenCalledWith(
          mockError,
          expect.objectContaining({
            context: expect.objectContaining({
              name: 'HyperLiquidProvider',
              data: expect.objectContaining({
                method: 'getAllAvailableDexs',
              }),
            }),
          }),
        );
      });

      it('filters out null entries from cached DEX list', async () => {
        // Arrange
        testableProvider.cachedAllPerpDexs = [
          null,
          { name: 'dex1', url: 'https://dex1.example' },
          null,
          { name: 'dex2', url: 'https://dex2.example' },
        ];

        // Act
        const result = await testableProvider.getAllAvailableDexs();

        // Assert
        expect(result).toEqual([null, 'dex1', 'dex2']);
      });

      it('returns only main DEX when cached list contains only null', async () => {
        // Arrange
        testableProvider.cachedAllPerpDexs = [null];

        // Act
        const result = await testableProvider.getAllAvailableDexs();

        // Assert
        expect(result).toEqual([null]);
      });
    });

    describe('ensureDexAbstractionEnabled', () => {
      interface ProviderWithDexAbstraction {
        ensureDexAbstractionEnabled(): Promise<void>;
        useDexAbstraction: boolean;
      }

      let testableProvider: ProviderWithDexAbstraction;

      beforeEach(() => {
        testableProvider = provider as unknown as ProviderWithDexAbstraction;
        testableProvider.useDexAbstraction = true;
      });

      it('returns early when feature is disabled', async () => {
        // Arrange
        testableProvider.useDexAbstraction = false;

        // Act
        await testableProvider.ensureDexAbstractionEnabled();

        // Assert
        expect(mockClientService.getInfoClient).not.toHaveBeenCalled();
        expect(
          mockWalletService.getUserAddressWithDefault,
        ).not.toHaveBeenCalled();
      });

      it('returns early when DEX abstraction is already enabled', async () => {
        // Arrange
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            userDexAbstraction: jest.fn().mockResolvedValue(true),
          }),
        );
        mockWalletService.getUserAddressWithDefault = jest
          .fn()
          .mockResolvedValue('0xUserAddress');

        // Act
        await testableProvider.ensureDexAbstractionEnabled();

        // Assert
        expect(mockClientService.getExchangeClient).not.toHaveBeenCalled();
      });

      it('enables DEX abstraction when not yet enabled', async () => {
        // Arrange
        const mockExchangeClient = createMockExchangeClient();
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            userDexAbstraction: jest.fn().mockResolvedValue(false),
          }),
        );
        mockClientService.getExchangeClient = jest
          .fn()
          .mockReturnValue(mockExchangeClient);
        mockWalletService.getUserAddressWithDefault = jest
          .fn()
          .mockResolvedValue('0xUserAddress');

        // Act
        await testableProvider.ensureDexAbstractionEnabled();

        // Assert
        expect(
          mockExchangeClient.agentEnableDexAbstraction,
        ).toHaveBeenCalledTimes(1);
      });

      it('enables DEX abstraction when status is null', async () => {
        // Arrange
        const mockExchangeClient = createMockExchangeClient();
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            userDexAbstraction: jest.fn().mockResolvedValue(null),
          }),
        );
        mockClientService.getExchangeClient = jest
          .fn()
          .mockReturnValue(mockExchangeClient);
        mockWalletService.getUserAddressWithDefault = jest
          .fn()
          .mockResolvedValue('0xUserAddress');

        // Act
        await testableProvider.ensureDexAbstractionEnabled();

        // Assert
        expect(
          mockExchangeClient.agentEnableDexAbstraction,
        ).toHaveBeenCalledTimes(1);
      });

      it('logs error but does not throw when enable fails', async () => {
        // Arrange
        const mockError = new Error('Enable failed');
        const mockExchangeClient = createMockExchangeClient();
        mockExchangeClient.agentEnableDexAbstraction = jest
          .fn()
          .mockRejectedValue(mockError);
        mockClientService.getInfoClient = jest.fn().mockReturnValue(
          createMockInfoClient({
            userDexAbstraction: jest.fn().mockResolvedValue(false),
          }),
        );
        mockClientService.getExchangeClient = jest
          .fn()
          .mockReturnValue(mockExchangeClient);
        mockWalletService.getUserAddressWithDefault = jest
          .fn()
          .mockResolvedValue('0xUserAddress');
        const mockLoggerError = jest.spyOn(Logger, 'error');

        // Act
        await testableProvider.ensureDexAbstractionEnabled();

        // Assert
        expect(mockLoggerError).toHaveBeenCalledWith(
          mockError,
          expect.objectContaining({
            context: expect.objectContaining({
              name: 'HyperLiquidProvider',
              data: expect.objectContaining({
                method: 'ensureDexAbstractionEnabled',
              }),
            }),
          }),
        );
      });

      it('logs error when user address fetch fails', async () => {
        // Arrange
        const mockError = new Error('Address fetch failed');
        mockWalletService.getUserAddressWithDefault = jest
          .fn()
          .mockRejectedValue(mockError);
        const mockLoggerError = jest.spyOn(Logger, 'error');

        // Act
        await testableProvider.ensureDexAbstractionEnabled();

        // Assert
        expect(mockLoggerError).toHaveBeenCalledWith(
          mockError,
          expect.objectContaining({
            context: expect.objectContaining({
              name: 'HyperLiquidProvider',
              data: expect.objectContaining({
                method: 'ensureDexAbstractionEnabled',
              }),
            }),
          }),
        );
      });
    });

    describe('autoTransferForHip3Order', () => {
      interface ProviderWithAutoTransfer {
        autoTransferForHip3Order(params: {
          targetDex: string;
          requiredMargin: number;
        }): Promise<{ amount: number; sourceDex: string } | null>;
        getBalanceForDex(params: { dex: string | null }): Promise<number>;
        findSourceDexWithBalance(params: {
          targetDex: string;
          requiredAmount: number;
        }): Promise<{ sourceDex: string; available: number } | null>;
        transferBetweenDexs(params: {
          sourceDex: string;
          destinationDex: string;
          amount: string;
        }): Promise<{ success: boolean; error?: string }>;
      }

      let testableProvider: ProviderWithAutoTransfer;

      beforeEach(() => {
        testableProvider = provider as unknown as ProviderWithAutoTransfer;
      });

      it('returns null when target DEX has sufficient balance', async () => {
        // Arrange
        jest
          .spyOn(testableProvider, 'getBalanceForDex')
          .mockResolvedValue(1000);

        // Act
        const result = await testableProvider.autoTransferForHip3Order({
          targetDex: 'xyz',
          requiredMargin: 500,
        });

        // Assert
        expect(result).toBeNull();
      });

      it('transfers from main DEX when target has insufficient balance', async () => {
        // Arrange
        jest.spyOn(testableProvider, 'getBalanceForDex').mockResolvedValue(100); // Target has only 100
        jest
          .spyOn(testableProvider, 'findSourceDexWithBalance')
          .mockResolvedValue({ sourceDex: '', available: 1000 });
        jest
          .spyOn(testableProvider, 'transferBetweenDexs')
          .mockResolvedValue({ success: true });

        // Act
        const result = await testableProvider.autoTransferForHip3Order({
          targetDex: 'xyz',
          requiredMargin: 500,
        });

        // Assert
        expect(result).toEqual({ amount: expect.any(Number), sourceDex: '' });
        expect(testableProvider.transferBetweenDexs).toHaveBeenCalledWith({
          sourceDex: '',
          destinationDex: 'xyz',
          amount: expect.any(String),
        });
      });

      it('throws error when no source has sufficient balance', async () => {
        // Arrange
        jest.spyOn(testableProvider, 'getBalanceForDex').mockResolvedValue(100); // Target has only 100
        jest
          .spyOn(testableProvider, 'findSourceDexWithBalance')
          .mockResolvedValue(null); // No source found

        // Act & Assert
        await expect(
          testableProvider.autoTransferForHip3Order({
            targetDex: 'xyz',
            requiredMargin: 500,
          }),
        ).rejects.toThrow('Insufficient balance for HIP-3 order');
      });

      it('throws error when transfer fails', async () => {
        // Arrange
        jest.spyOn(testableProvider, 'getBalanceForDex').mockResolvedValue(100);
        jest
          .spyOn(testableProvider, 'findSourceDexWithBalance')
          .mockResolvedValue({ sourceDex: '', available: 1000 });
        jest
          .spyOn(testableProvider, 'transferBetweenDexs')
          .mockResolvedValue({ success: false, error: 'Transfer failed' });

        // Act & Assert
        await expect(
          testableProvider.autoTransferForHip3Order({
            targetDex: 'xyz',
            requiredMargin: 500,
          }),
        ).rejects.toThrow('Auto-transfer failed: Transfer failed');
      });
    });

    describe('calculateHip3RequiredMargin', () => {
      interface ProviderWithMarginCalc {
        calculateHip3RequiredMargin(params: {
          coin: string;
          dexName: string;
          positionSize: number;
          orderPrice: number;
          leverage: number;
          isBuy: boolean;
        }): Promise<number>;
        getPositions(): Promise<
          { coin: string; size: string; marginUsed: string }[]
        >;
      }

      let testableProvider: ProviderWithMarginCalc;

      beforeEach(() => {
        testableProvider = provider as unknown as ProviderWithMarginCalc;
      });

      it('calculates total margin when increasing existing long position', async () => {
        // Arrange
        jest.spyOn(testableProvider, 'getPositions').mockResolvedValue([
          {
            coin: 'BTC',
            size: '1.0', // Existing long position
            marginUsed: '5000',
          },
        ]);

        // Act
        const result = await testableProvider.calculateHip3RequiredMargin({
          coin: 'BTC',
          dexName: 'xyz',
          positionSize: 0.5, // Adding to position
          orderPrice: 50000,
          leverage: 10,
          isBuy: true, // Long order - increasing position
        });

        // Assert
        // Total size = 1.0 + 0.5 = 1.5
        // Total notional = 1.5 * 50000 = 75000
        // Total margin = 75000 / 10 = 7500
        // With buffer (1.003) = 7522.5
        expect(result).toBeCloseTo(7522.5, 1);
      });

      it('calculates incremental margin when reversing position', async () => {
        // Arrange
        jest.spyOn(testableProvider, 'getPositions').mockResolvedValue([
          {
            coin: 'BTC',
            size: '1.0', // Existing long position
            marginUsed: '5000',
          },
        ]);

        // Act
        const result = await testableProvider.calculateHip3RequiredMargin({
          coin: 'BTC',
          dexName: 'xyz',
          positionSize: 0.5,
          orderPrice: 50000,
          leverage: 10,
          isBuy: false, // Short order - opposite direction
        });

        // Assert
        // Only new order margin (not total)
        // Notional = 0.5 * 50000 = 25000
        // Margin = 25000 / 10 = 2500
        // With buffer (1.003) = 2507.5
        expect(result).toBeCloseTo(2507.5, 1);
      });

      it('calculates margin for new position when no existing position', async () => {
        // Arrange
        jest.spyOn(testableProvider, 'getPositions').mockResolvedValue([]);

        // Act
        const result = await testableProvider.calculateHip3RequiredMargin({
          coin: 'ETH',
          dexName: 'xyz',
          positionSize: 10,
          orderPrice: 3000,
          leverage: 5,
          isBuy: true,
        });

        // Assert
        // Notional = 10 * 3000 = 30000
        // Margin = 30000 / 5 = 6000
        // With buffer (1.003) = 6018
        expect(result).toBeCloseTo(6018, 1);
      });

      it('calculates total margin when increasing existing short position', async () => {
        // Arrange
        jest.spyOn(testableProvider, 'getPositions').mockResolvedValue([
          {
            coin: 'ETH',
            size: '-5.0', // Existing short position
            marginUsed: '3000',
          },
        ]);

        // Act
        const result = await testableProvider.calculateHip3RequiredMargin({
          coin: 'ETH',
          dexName: 'xyz',
          positionSize: 2.0, // Adding to short
          orderPrice: 3000,
          leverage: 5,
          isBuy: false, // Short order - increasing short position
        });

        // Assert
        // Total size = 5.0 + 2.0 = 7.0
        // Total notional = 7.0 * 3000 = 21000
        // Total margin = 21000 / 5 = 4200
        // With buffer (1.003) = 4212.6
        expect(result).toBeCloseTo(4212.6, 1);
      });
    });
  });
});
