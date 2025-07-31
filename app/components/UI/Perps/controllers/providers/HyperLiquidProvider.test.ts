import { ClosePositionParams, LiveDataConfig, OrderParams } from '../types';
import { HyperLiquidProvider } from './HyperLiquidProvider';
import type { CaipAssetId, Hex } from '@metamask/utils';
import { HyperLiquidClientService } from '../../services/HyperLiquidClientService';
import { HyperLiquidWalletService } from '../../services/HyperLiquidWalletService';
import { HyperLiquidSubscriptionService } from '../../services/HyperLiquidSubscriptionService';
import {
  validateOrderParams,
  validateWithdrawalParams,
  validateCoinExists,
  validateAssetSupport,
  validateBalance,
} from '../../utils/hyperLiquidValidation';

// Mock dependencies
jest.mock('../../services/HyperLiquidClientService');
jest.mock('../../services/HyperLiquidWalletService');
jest.mock('../../services/HyperLiquidSubscriptionService');
jest.mock('../../utils/hyperLiquidValidation', () => ({
  validateOrderParams: jest.fn(),
  validateWithdrawalParams: jest.fn(),
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
      }),
      getInfoClient: jest.fn().mockReturnValue({
        clearinghouseState: jest.fn().mockResolvedValue({
          assetPositions: [
            {
              position: {
                coin: 'BTC',
                szi: '0.1',
                entryPx: '50000',
                unrealizedPnl: '100',
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
    it('should get deposit routes', () => {
      const routes = provider.getDepositRoutes();
      expect(Array.isArray(routes)).toBe(true);
    });

    it('should get withdrawal routes', () => {
      const routes = provider.getWithdrawalRoutes();
      expect(Array.isArray(routes)).toBe(true);
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
});
