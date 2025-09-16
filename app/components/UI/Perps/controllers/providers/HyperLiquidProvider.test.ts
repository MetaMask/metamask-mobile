import type { CaipAssetId, Hex } from '@metamask/utils';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
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

// Mock dependencies
jest.mock('../../services/HyperLiquidClientService');
jest.mock('../../services/HyperLiquidWalletService');
jest.mock('../../services/HyperLiquidSubscriptionService');

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  setMeasurement: jest.fn(),
}));
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
      }),
      getInfoClient: jest.fn().mockReturnValue({
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
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'ready',
            data: { code: 'TESTNET' },
          },
        }),
        maxBuilderFee: jest.fn().mockResolvedValue(1),
        userFees: jest.fn().mockResolvedValue({
          feeSchedule: {
            cross: '0.00030', // 0.030% taker with discount
            add: '0.00010', // 0.010% maker with discount
            spotCross: '0.00040',
            spotAdd: '0.00020',
          },
          dailyUserVlm: [],
        }),
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

    it('should close a position successfully', async () => {
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
      // Position without TP/SL
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
        frontendOpenOrders: jest.fn().mockResolvedValue([]),
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 50 }],
        }),
        allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'ready',
            data: { code: 'TESTNET' },
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
        allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'ready',
            data: { code: 'TESTNET' },
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
        allMids: jest.fn().mockResolvedValue({ ETH: '3000' }),
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'ready',
            data: { code: 'TESTNET' },
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
        frontendOpenOrders: jest.fn().mockResolvedValue([
          // No TP/SL orders, just a regular limit order
          {
            coin: 'BTC',
            oid: 9999,
            reduceOnly: false,
            isTrigger: false,
            orderType: 'Limit',
            limitPx: '49000',
          },
        ]),
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 50 }],
        }),
        allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'ready',
            data: { code: 'TESTNET' },
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

      // Should not log TP/SL related messages
      expect(DevLogger.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Found open TP/SL orders'),
        expect.any(Object),
      );
    });

    it('should handle close position when position not found', async () => {
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        clearinghouseState: jest.fn().mockResolvedValue({
          marginSummary: {
            totalMarginUsed: '500',
            accountValue: '10500',
          },
          withdrawable: '9500',
          assetPositions: [], // No positions
        }),
        frontendOpenOrders: jest.fn().mockResolvedValue([]),
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC', szDecimals: 3, maxLeverage: 50 }],
        }),
        allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
      });

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
        allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'ready',
            data: { code: 'TESTNET' },
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
        allMids: jest.fn().mockResolvedValue({ BTC: '50000' }),
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'ready',
            data: { code: 'TESTNET' },
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
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'ETH', maxLeverage: 30, szDecimals: 4 }],
        }),
      });

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
          maxBuilderFee: jest.fn().mockResolvedValue(1),
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
          maxBuilderFee: jest.fn().mockResolvedValue(1),
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
          referral: jest.fn().mockResolvedValue({
            referrerState: {
              stage: 'ready',
              data: { code: 'TESTNET' },
            },
          }),
          maxBuilderFee: jest.fn().mockResolvedValue(1),
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

      it('should handle meta and predictedFundings calls successfully', async () => {
        mockClientService.getInfoClient = jest.fn().mockReturnValue({
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
        });

        const result = await provider.getMarketDataWithPrices();

        expect(Array.isArray(result)).toBe(true);
        expect(mockClientService.getInfoClient().meta).toHaveBeenCalled();
        expect(
          mockClientService.getInfoClient().predictedFundings,
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
        });

        expect(result.feeRate).toBe(0.00145); // 0.045% taker + 0.1% MetaMask fee
        expect(result.feeAmount).toBe(145); // 100000 * 0.00145
      });

      it('should calculate fees for limit orders as taker', async () => {
        const result = await provider.calculateFees({
          orderType: 'limit',
          isMaker: false,
          amount: '100000',
        });

        expect(result.feeRate).toBe(0.00145); // 0.045% taker + 0.1% MetaMask fee
        expect(result.feeAmount).toBe(145); // Includes MetaMask fee
      });

      it('should calculate fees for limit orders as maker', async () => {
        const result = await provider.calculateFees({
          orderType: 'limit',
          isMaker: true,
          amount: '100000',
        });

        expect(result.feeRate).toBe(0.00115); // 0.015% maker + 0.1% MetaMask fee
        expect(result.feeAmount).toBeCloseTo(115, 10); // Includes MetaMask fee
      });

      it('should handle zero amount', async () => {
        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '0',
        });

        expect(result.feeRate).toBe(0.00145); // Includes 0.1% MetaMask fee
        expect(result.feeAmount).toBe(0);
      });

      it('should handle undefined amount', async () => {
        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
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
        });

        expect(result.feeRate).toBe(0.00145); // Includes 0.1% MetaMask fee
        expect(result.feeAmount).toBe(0); // parseFloat('invalid') returns NaN, which * 0.00045 = NaN, but we expect 0
      });

      it('should return FeeCalculationResult with correct structure', async () => {
        const result = await provider.calculateFees({
          orderType: 'market',
          isMaker: false,
          amount: '100000',
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
        });

        // Should use base rates without discounts
        expect(result.feeRate).toBe(0.00145); // 0.045% + 0.1% MetaMask
        expect(result.feeAmount).toBe(145);
      });

      describe('placeholder methods for future implementation', () => {
        it('should have getUserVolume method returning 0', async () => {
          // Access private method for testing
          interface ProviderWithPrivateMethods {
            getUserVolume(): Promise<number>;
            getUserStaking(): Promise<number>;
          }
          const testableProvider =
            provider as unknown as ProviderWithPrivateMethods;
          const getUserVolume = testableProvider.getUserVolume;
          expect(getUserVolume).toBeDefined();
          const volume = await getUserVolume.call(provider);
          expect(volume).toBe(0);
        });

        it('should have getUserStaking method returning 0', async () => {
          // Access private method for testing
          interface ProviderWithPrivateMethods {
            getUserVolume(): Promise<number>;
            getUserStaking(): Promise<number>;
          }
          const testableProvider =
            provider as unknown as ProviderWithPrivateMethods;
          const getUserStaking = testableProvider.getUserStaking;
          expect(getUserStaking).toBeDefined();
          const staking = await getUserStaking.call(provider);
          expect(staking).toBe(0);
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
  });

  describe('Builder Fee and Referral Integration', () => {
    beforeEach(() => {
      // Mock the new builder fee and referral methods
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        maxBuilderFee: jest.fn().mockResolvedValue(0.001), // 0.1% approval
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
        allMids: jest.fn().mockResolvedValue({ BTC: '50000', ETH: '3000' }),
        frontendOpenOrders: jest.fn().mockResolvedValue([]),
      });

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
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        maxBuilderFee: jest.fn().mockResolvedValue(0), // Not approved
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
        allMids: jest.fn().mockResolvedValue({ BTC: '50000', ETH: '3000' }),
        frontendOpenOrders: jest.fn().mockResolvedValue([]),
      });

      // Mock builder fee approval to fail
      mockClientService.getExchangeClient = jest.fn().mockReturnValue({
        approveBuilderFee: jest
          .fn()
          .mockRejectedValue(new Error('Builder fee approval failed')),
        setReferrer: jest.fn().mockResolvedValue({
          status: 'ok',
        }),
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

      expect(result.success).toBe(false);
      expect(result.error).toContain('Builder fee approval failed');
    });

    it('should handle referral code setup failure', async () => {
      // Mock builder fee already approved
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        maxBuilderFee: jest.fn().mockResolvedValue(0.001), // Already approved
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
        allMids: jest.fn().mockResolvedValue({ BTC: '50000', ETH: '3000' }),
        frontendOpenOrders: jest.fn().mockResolvedValue([]),
      });

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

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error ensuring referral code is set');
    });

    it('should skip referral setup when referral code is not ready', async () => {
      // Mock referral code not ready
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        maxBuilderFee: jest.fn().mockResolvedValue(0.001),
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'not_ready',
            data: { code: REFERRAL_CONFIG.mainnetCode },
          },
          referredBy: null,
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

      // Should not call setReferrer when referral code is not ready
      expect(
        mockClientService.getExchangeClient().setReferrer,
      ).not.toHaveBeenCalled();
    });

    it('should skip referral setup when user already has a referral', async () => {
      // Mock user already has a referral
      mockClientService.getInfoClient = jest.fn().mockReturnValue({
        maxBuilderFee: jest.fn().mockResolvedValue(0.001),
        referral: jest.fn().mockResolvedValue({
          referrerState: {
            stage: 'ready',
            data: { code: REFERRAL_CONFIG.mainnetCode },
          },
          referredBy: { code: 'EXISTING_REFERRAL' }, // User already has referral
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

      // Should not call setReferrer when user already has a referral
      expect(
        mockClientService.getExchangeClient().setReferrer,
      ).not.toHaveBeenCalled();
    });
  });
});
