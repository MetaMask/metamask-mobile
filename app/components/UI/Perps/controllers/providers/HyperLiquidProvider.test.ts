import {
  ClosePositionParams,
  DepositParams,
  LiveDataConfig,
  OrderParams,
} from '../types';
import { HyperLiquidProvider } from './HyperLiquidProvider';
import type { CaipAssetId, Hex } from '@metamask/utils';
import { HyperLiquidClientService } from '../../services/HyperLiquidClientService';
import { HyperLiquidWalletService } from '../../services/HyperLiquidWalletService';
import { HyperLiquidSubscriptionService } from '../../services/HyperLiquidSubscriptionService';
import {
  validateOrderParams,
  validateWithdrawalParams,
  validateDepositParams,
  validateCoinExists,
  validateAssetSupport,
  validateBalance,
} from '../../utils/hyperLiquidValidation';

// Mock dependencies
jest.mock('../../services/HyperLiquidClientService');
jest.mock('../../services/HyperLiquidWalletService');
jest.mock('../../services/HyperLiquidSubscriptionService');
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'time.minutes_format' && params?.count) {
      return params.count === 1
        ? `${params.count} minute`
        : `${params.count} minutes`;
    }
    return key;
  }),
}));
jest.mock('../../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: jest.fn().mockReturnValue({
        address: '0xdefaultaddress',
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

describe('HyperLiquidProvider', () => {
  let provider: HyperLiquidProvider;
  let mockClientService: jest.Mocked<HyperLiquidClientService>;
  let mockWalletService: jest.Mocked<HyperLiquidWalletService>;
  let mockSubscriptionService: jest.Mocked<HyperLiquidSubscriptionService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mocked service instances
    mockClientService = {
      initialize: jest.fn(),
      isInitialized: jest.fn().mockReturnValue(true),
      isTestnetMode: jest.fn().mockReturnValue(false),
      ensureInitialized: jest.fn(),
      getExchangeClient: jest.fn().mockReturnValue({
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
      }),
      getInfoClient: jest.fn().mockReturnValue({
        clearinghouseState: jest.fn().mockResolvedValue({
          assetPositions: [
            {
              position: {
                coin: 'BTC',
                szi: '0.1',
                entryPx: '50000',
                positionValue: '5000',
                unrealizedPnl: '100',
                marginUsed: '500',
                leverage: {
                  type: 'cross',
                  value: 10,
                },
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
            {
              position: {
                coin: 'ETH',
                szi: '1.5',
                entryPx: '3000',
                positionValue: '4500',
                unrealizedPnl: '50',
                marginUsed: '450',
                leverage: {
                  type: 'cross',
                  value: 10,
                },
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
          crossMarginSummary: {
            accountValue: '10000',
            totalMarginUsed: '5000',
          },
          withdrawable: '5000',
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
        allMids: jest.fn().mockResolvedValue({ BTC: '50000', ETH: '3000' }),
        frontendOpenOrders: jest.fn().mockResolvedValue([]),
      }),
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
      subscribeToPrices: jest.fn().mockReturnValue(jest.fn()),
      subscribeToPositions: jest.fn().mockReturnValue(jest.fn()),
      subscribeToOrderFills: jest.fn().mockReturnValue(jest.fn()),
      clearAll: jest.fn(),
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
    });

    it('should cancel an order successfully', async () => {
      const cancelParams = {
        orderId: '123',
        coin: 'BTC',
      };

      const result = await provider.cancelOrder(cancelParams);

      expect(result.success).toBe(true);
    });

    it('should close a position successfully', async () => {
      const closeParams: ClosePositionParams = {
        coin: 'BTC',
        orderType: 'market',
      };

      const result = await provider.closePosition(closeParams);

      expect(result.success).toBe(true);
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
      expect(accountState.totalBalance).toBe('20000'); // 10000 (spot) + 10000 (perps)
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
  });

  describe('Asset Mapping', () => {
    it('should build asset mapping on first operation', async () => {
      // Reset mocks to ensure fresh state
      jest.clearAllMocks();

      // Mock constructors again for the fresh provider
      MockedHyperLiquidClientService.mockImplementation(
        () => mockClientService,
      );
      MockedHyperLiquidWalletService.mockImplementation(
        () => mockWalletService,
      );
      MockedHyperLiquidSubscriptionService.mockImplementation(
        () => mockSubscriptionService,
      );

      // Create a fresh provider instance
      provider = new HyperLiquidProvider();

      // Clear the asset mapping to force it to be rebuilt
      Object.defineProperty(provider, 'coinToAssetId', {
        value: new Map(),
        writable: true,
      });
      Object.defineProperty(provider, 'assetIdToCoin', {
        value: new Map(),
        writable: true,
      });

      // Use getPositions which now calls ensureReady() and builds asset mapping
      await provider.getPositions();

      expect(mockClientService.getInfoClient().meta).toHaveBeenCalled();
    });

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
      expect(result.error).toContain('No price available for BTC');
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
    it('should validate valid deposit parameters', () => {
      mockValidateDepositParams.mockReturnValue({ isValid: true });

      const params: DepositParams = {
        amount: '100',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = provider.validateDeposit(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty amount', () => {
      mockValidateDepositParams.mockReturnValue({
        isValid: false,
        error: 'Amount is required and must be greater than 0',
      });

      const params: DepositParams = {
        amount: '',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Amount is required and must be greater than 0',
      );
    });

    it('should reject zero amount', () => {
      mockValidateDepositParams.mockReturnValue({
        isValid: false,
        error: 'Amount is required and must be greater than 0',
      });

      const params: DepositParams = {
        amount: '0',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Amount is required and must be greater than 0',
      );
    });

    it('should reject negative amount', () => {
      mockValidateDepositParams.mockReturnValue({
        isValid: false,
        error: 'Amount is required and must be greater than 0',
      });

      const params: DepositParams = {
        amount: '-10',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Amount is required and must be greater than 0',
      );
    });

    it('should reject invalid amount format', () => {
      mockValidateDepositParams.mockReturnValue({
        isValid: false,
        error: 'Amount is required and must be greater than 0',
      });

      const params: DepositParams = {
        amount: 'abc',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Amount is required and must be greater than 0',
      );
    });

    it('should reject amount below minimum for mainnet', () => {
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

      const result = provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Minimum deposit amount is 5 USDC');
    });

    it('should reject amount below minimum for testnet', () => {
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

      const result = provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Minimum deposit amount is 10 USDC');
    });

    it('should accept amount at minimum for mainnet', () => {
      mockClientService.isTestnetMode.mockReturnValue(false);
      mockValidateDepositParams.mockReturnValue({ isValid: true });

      const params: DepositParams = {
        amount: '5',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = provider.validateDeposit(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept amount at minimum for testnet', () => {
      mockClientService.isTestnetMode.mockReturnValue(true);
      mockValidateDepositParams.mockReturnValue({ isValid: true });

      const params: DepositParams = {
        amount: '10',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = provider.validateDeposit(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty assetId', () => {
      mockValidateDepositParams.mockReturnValue({
        isValid: false,
        error: 'AssetId is required for deposit validation',
      });

      const params: DepositParams = {
        amount: '100',
        assetId: '' as CaipAssetId,
      };

      const result = provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('AssetId is required for deposit validation');
    });

    it('should reject unsupported assetId', () => {
      mockValidateDepositParams.mockReturnValue({
        isValid: false,
        error: 'Asset not supported',
      });

      const params: DepositParams = {
        amount: '100',
        assetId:
          'eip155:1/erc20:0x1234567890123456789012345678901234567890/default',
      };

      const result = provider.validateDeposit(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('should handle decimal amounts correctly', () => {
      mockValidateDepositParams.mockReturnValue({ isValid: true });

      const params: DepositParams = {
        amount: '100.123456',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = provider.validateDeposit(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle large amounts correctly', () => {
      mockValidateDepositParams.mockReturnValue({ isValid: true });

      const params: DepositParams = {
        amount: '1000000',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = provider.validateDeposit(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle scientific notation', () => {
      mockValidateDepositParams.mockReturnValue({ isValid: true });

      const params: DepositParams = {
        amount: '1e6',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const result = provider.validateDeposit(params);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('calculateLiquidationPrice', () => {
    beforeEach(() => {
      // Set up mock for asset info
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC', maxLeverage: 20, szDecimals: 5 }],
        }),
      });
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
      expect(result).toBe('46153.85');
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
      expect(result).toBe('53658.54');
    });

    it('should throw error for leverage exceeding maintenance leverage', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC', maxLeverage: 20, szDecimals: 2 }],
        }),
      });

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
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC', maxLeverage: 40, szDecimals: 5 }],
        }),
      });

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

    it('should throw error when asset not found', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        meta: jest.fn().mockResolvedValue({
          universe: [],
        }),
      });

      await expect(
        provider.calculateMaintenanceMargin({ asset: 'UNKNOWN' }),
      ).rejects.toThrow('Asset UNKNOWN not found');
    });
  });

  describe('getMaxLeverage', () => {
    it('should return max leverage for an asset', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'ETH', maxLeverage: 30, szDecimals: 4 }],
        }),
      });

      const result = await provider.getMaxLeverage('ETH');

      expect(result).toBe(30);
    });

    it('should throw error when asset not found', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        meta: jest.fn().mockResolvedValue({
          universe: [],
        }),
      });

      await expect(provider.getMaxLeverage('UNKNOWN')).rejects.toThrow(
        'Asset UNKNOWN not found',
      );
    });

    it('should throw error on network failure', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        meta: jest.fn().mockRejectedValue(new Error('Network error')),
      });

      await expect(provider.getMaxLeverage('BTC')).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('Additional Error Handling and Edge Cases', () => {
    describe('ensureReady and buildAssetMapping', () => {
      it('should handle meta fetch failure in buildAssetMapping', async () => {
        // Create a fresh provider to test buildAssetMapping
        const freshProvider = new HyperLiquidProvider();

        // Mock failed meta fetch
        mockClientService.getInfoClient = jest.fn().mockReturnValue({
          meta: jest.fn().mockRejectedValue(new Error('Network timeout')),
        });

        MockedHyperLiquidClientService.mockImplementation(
          () => mockClientService,
        );

        // Try to place an order which will trigger ensureReady -> buildAssetMapping
        const orderParams: OrderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
        };

        const result = await freshProvider.placeOrder(orderParams);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Network timeout');
      });

      it('should handle string response from meta endpoint', async () => {
        // Test updatePositionTPSL with string meta response
        mockClientService.getInfoClient = jest.fn().mockReturnValue({
          meta: jest.fn().mockResolvedValue('error response string'),
          clearinghouseState: jest.fn().mockResolvedValue({
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
          frontendOpenOrders: jest.fn().mockResolvedValue([]),
          allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
        });

        mockWalletService.getUserAddressWithDefault.mockResolvedValue('0x123');

        const updateParams = {
          coin: 'BTC',
          takeProfitPrice: '55000',
        };

        const result = await provider.updatePositionTPSL(updateParams);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to fetch market metadata');
      });

      it('should handle meta response without universe property', async () => {
        mockClientService.getInfoClient = jest.fn().mockReturnValue({
          meta: jest.fn().mockResolvedValue({ notUniverse: [] }),
          clearinghouseState: jest.fn().mockResolvedValue({
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
          frontendOpenOrders: jest.fn().mockResolvedValue([]),
          allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
        });

        const updateParams = {
          coin: 'BTC',
          takeProfitPrice: '55000',
        };

        const result = await provider.updatePositionTPSL(updateParams);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to fetch market metadata');
      });
    });

    describe('Order placement edge cases', () => {
      it('should handle leverage update failure', async () => {
        mockClientService.getExchangeClient = jest.fn().mockReturnValue({
          updateLeverage: jest.fn().mockResolvedValue({
            status: 'error',
            response: { message: 'Leverage update failed' },
          }),
          order: jest.fn().mockResolvedValue({
            status: 'ok',
            response: { data: { statuses: [{ resting: { oid: '123' } }] } },
          }),
        });

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

      it('should handle market order without current price (fallback to API)', async () => {
        const orderParams: OrderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          // No currentPrice provided - should fetch from API
        };

        const result = await provider.placeOrder(orderParams);

        expect(result.success).toBe(true);
        expect(mockClientService.getInfoClient().allMids).toHaveBeenCalled();
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
        mockClientService.getExchangeClient = jest.fn().mockReturnValue({
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
        expect(result.error).toContain(
          'Connection error. Please check your network and try again.',
        );
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
        // Mock position exists
        mockClientService.getInfoClient = jest.fn().mockReturnValue({
          clearinghouseState: jest.fn().mockResolvedValue({
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
          meta: jest.fn().mockResolvedValue({
            universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 50 }],
          }),
          allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
          frontendOpenOrders: jest.fn().mockResolvedValue([
            {
              coin: 'BTC',
              oid: 123,
              reduceOnly: true,
              isTrigger: true,
              orderType: 'Take Profit',
            },
            {
              coin: 'BTC',
              oid: 124,
              reduceOnly: true,
              isTrigger: true,
              orderType: 'Stop Loss',
            },
          ]),
        });

        mockClientService.getExchangeClient = jest.fn().mockReturnValue({
          cancel: jest.fn().mockResolvedValue({
            status: 'ok',
            response: { data: { statuses: ['success', 'success'] } },
          }),
          order: jest.fn().mockResolvedValue({
            status: 'ok',
            response: { data: { statuses: [{ resting: { oid: '999' } }] } },
          }),
        });

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
        mockClientService.getInfoClient = jest.fn().mockReturnValue({
          clearinghouseState: jest
            .fn()
            .mockRejectedValue(new Error('Account state fetch failed')),
          spotClearinghouseState: jest.fn().mockResolvedValue({
            balances: [{ coin: 'USDC', hold: '1000', total: '10000' }],
          }),
        });

        mockWalletService.getUserAddressWithDefault.mockResolvedValue('0x123');

        await expect(provider.getAccountState()).rejects.toThrow(
          'Account state fetch failed',
        );
      });
    });

    describe('getMarketDataWithPrices error scenarios', () => {
      it('should handle missing perpsMeta', async () => {
        mockClientService.getInfoClient = jest.fn().mockReturnValue({
          meta: jest.fn().mockResolvedValue(null),
          allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
        });

        const result = await provider.getMarketDataWithPrices();

        expect(result).toEqual([]);
      });

      it('should handle missing allMids', async () => {
        mockClientService.getInfoClient = jest.fn().mockReturnValue({
          meta: jest.fn().mockResolvedValue({
            universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 50 }],
          }),
          allMids: jest.fn().mockResolvedValue(null),
        });

        const result = await provider.getMarketDataWithPrices();

        expect(result).toEqual([]);
      });

      it('should handle metaAndAssetCtxs call successfully', async () => {
        mockClientService.getInfoClient = jest.fn().mockReturnValue({
          meta: jest.fn().mockResolvedValue({
            universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 50 }],
          }),
          allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
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
        });

        const result = await provider.getMarketDataWithPrices();

        expect(Array.isArray(result)).toBe(true);
        expect(
          mockClientService.getInfoClient().metaAndAssetCtxs,
        ).toHaveBeenCalled();
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
        // We need l close to 1, so maintenanceLeverage close to 1, so maxLeverage close to 0.5
        const params = {
          entryPrice: 50000,
          leverage: 1, // Use 1x leverage
          direction: 'long' as const,
          asset: 'BTC',
        };

        mockClientService.getInfoClient = jest.fn().mockReturnValue({
          meta: jest.fn().mockResolvedValue({
            universe: [{ name: 'BTC', maxLeverage: 0.50001, szDecimals: 5 }], // Very low max leverage to create denominator < 0.0001
          }),
        });

        const result = await provider.calculateLiquidationPrice(params);

        // Should return entry price when denominator is too small
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

        mockClientService.getInfoClient = jest.fn().mockReturnValue({
          meta: jest.fn().mockResolvedValue({
            universe: [{ name: 'BTC', maxLeverage: 20, szDecimals: 5 }],
          }),
        });

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
  });
});
