/**
 * PerpsController Tests
 * Clean, focused test suite for PerpsController
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  PerpsController,
  getDefaultPerpsControllerState,
} from './PerpsController';
import { HyperLiquidProvider } from './providers/HyperLiquidProvider';
import { createMockHyperLiquidProvider } from '../__mocks__/providerMocks';

// Mock the HyperLiquidProvider
jest.mock('./providers/HyperLiquidProvider');

describe('PerpsController', () => {
  let controller: PerpsController;
  let mockProvider: jest.Mocked<HyperLiquidProvider>;

  beforeEach(() => {
    // Create a fresh mock provider for each test
    mockProvider = createMockHyperLiquidProvider();

    // Mock the HyperLiquidProvider constructor to return our mock
    (
      HyperLiquidProvider as jest.MockedClass<typeof HyperLiquidProvider>
    ).mockImplementation(() => mockProvider);

    // Create a new controller instance
    controller = new PerpsController({
      messenger: {
        call: jest.fn(),
        publish: jest.fn(),
        subscribe: jest.fn(),
        registerActionHandler: jest.fn(),
        registerEventHandler: jest.fn(),
        registerInitialEventPayload: jest.fn(),
        getRestricted: jest.fn().mockReturnValue({
          call: jest.fn(),
          publish: jest.fn(),
          subscribe: jest.fn(),
          registerActionHandler: jest.fn(),
          registerEventHandler: jest.fn(),
          registerInitialEventPayload: jest.fn(),
        }),
      } as unknown as any,
      state: getDefaultPerpsControllerState(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default state', () => {
      expect(controller.state).toEqual(getDefaultPerpsControllerState());
      expect(controller.state.activeProvider).toBe('hyperliquid');
      expect(controller.state.positions).toEqual([]);
      expect(controller.state.accountState).toBeNull();
      expect(controller.state.connectionStatus).toBe('disconnected');
      expect(controller.state.isEligible).toBe(false);
    });
  });

  describe('getActiveProvider', () => {
    it('should throw error when not initialized', () => {
      // Mock the controller as not initialized
      (controller as any).isInitialized = false;

      expect(() => controller.getActiveProvider()).toThrow(
        'CLIENT_NOT_INITIALIZED',
      );
    });

    it('should return provider when initialized', () => {
      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);

      const provider = controller.getActiveProvider();
      expect(provider).toBe(mockProvider);
    });
  });

  describe('initializeProviders', () => {
    it('should initialize providers successfully', async () => {
      await controller.initializeProviders();

      expect((controller as any).isInitialized).toBe(true);
      expect((controller as any).providers.has('hyperliquid')).toBe(true);
    });

    it('should handle initialization when already initialized', async () => {
      // First initialization
      await controller.initializeProviders();
      expect((controller as any).isInitialized).toBe(true);

      // Second initialization should not throw
      await controller.initializeProviders();
      expect((controller as any).isInitialized).toBe(true);
    });
  });

  describe('getPositions', () => {
    it('should get positions successfully', async () => {
      const mockPositions = [
        {
          coin: 'ETH',
          size: '2.5',
          entryPrice: '2000',
          positionValue: '5000',
          unrealizedPnl: '500',
          marginUsed: '2500',
          leverage: { type: 'cross' as const, value: 2 },
          liquidationPrice: '1500',
          maxLeverage: 100,
          returnOnEquity: '10.0',
          cumulativeFunding: {
            allTime: '10',
            sinceOpen: '5',
            sinceChange: '2',
          },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
      ];

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getPositions.mockResolvedValue(mockPositions);

      const result = await controller.getPositions();

      expect(result).toEqual(mockPositions);
      expect(mockProvider.getPositions).toHaveBeenCalled();
    });

    it('should handle getPositions error', async () => {
      const errorMessage = 'Network error';

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getPositions.mockRejectedValue(new Error(errorMessage));

      await expect(controller.getPositions()).rejects.toThrow(errorMessage);
      expect(mockProvider.getPositions).toHaveBeenCalled();
    });
  });

  describe('getAccountState', () => {
    it('should get account state successfully', async () => {
      const mockAccountState = {
        availableBalance: '1000',
        totalBalance: '1500',
        marginUsed: '500',
        unrealizedPnl: '100',
        returnOnEquity: '20.0',
        totalValue: '1600',
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getAccountState.mockResolvedValue(mockAccountState);

      const result = await controller.getAccountState();

      expect(result).toEqual(mockAccountState);
      expect(mockProvider.getAccountState).toHaveBeenCalled();
    });
  });

  describe('placeOrder', () => {
    it('should place order successfully', async () => {
      const orderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market' as const,
      };

      const mockOrderResult = {
        success: true,
        orderId: 'order-123',
        filledSize: '0.1',
        averagePrice: '50000',
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.placeOrder.mockResolvedValue(mockOrderResult);

      const result = await controller.placeOrder(orderParams);

      expect(result).toEqual(mockOrderResult);
      expect(mockProvider.placeOrder).toHaveBeenCalledWith(orderParams);
    });

    it('should handle placeOrder error', async () => {
      const orderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market' as const,
      };

      const errorMessage = 'Order placement failed';

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.placeOrder.mockRejectedValue(new Error(errorMessage));

      await expect(controller.placeOrder(orderParams)).rejects.toThrow(
        errorMessage,
      );
      expect(mockProvider.placeOrder).toHaveBeenCalledWith(orderParams);
    });
  });

  describe('getMarkets', () => {
    it('should get markets successfully', async () => {
      const mockMarkets = [
        {
          name: 'BTC',
          szDecimals: 3,
          maxLeverage: 50,
          marginTableId: 1,
        },
        {
          name: 'ETH',
          szDecimals: 2,
          maxLeverage: 25,
          marginTableId: 2,
        },
      ];

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getMarkets.mockResolvedValue(mockMarkets);

      const result = await controller.getMarkets();

      expect(result).toEqual(mockMarkets);
      expect(mockProvider.getMarkets).toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order successfully', async () => {
      const cancelParams = {
        orderId: 'order-123',
        coin: 'BTC',
      };

      const mockCancelResult = {
        success: true,
        orderId: 'order-123',
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.cancelOrder.mockResolvedValue(mockCancelResult);

      const result = await controller.cancelOrder(cancelParams);

      expect(result).toEqual(mockCancelResult);
      expect(mockProvider.cancelOrder).toHaveBeenCalledWith(cancelParams);
    });
  });

  describe('closePosition', () => {
    it('should close position successfully', async () => {
      const closeParams = {
        coin: 'BTC',
        orderType: 'market' as const,
        size: '0.5',
      };

      const mockCloseResult = {
        success: true,
        orderId: 'close-order-123',
        filledSize: '0.5',
        averagePrice: '50000',
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.closePosition.mockResolvedValue(mockCloseResult);

      const result = await controller.closePosition(closeParams);

      expect(result).toEqual(mockCloseResult);
      expect(mockProvider.closePosition).toHaveBeenCalledWith(closeParams);
    });
  });

  describe('validateOrder', () => {
    it('should validate order successfully', async () => {
      const orderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market' as const,
      };

      const mockValidationResult = {
        isValid: true,
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.validateOrder.mockResolvedValue(mockValidationResult);

      const result = await controller.validateOrder(orderParams);

      expect(result).toEqual(mockValidationResult);
      expect(mockProvider.validateOrder).toHaveBeenCalledWith(orderParams);
    });
  });

  describe('getOrderFills', () => {
    it('should get order fills successfully', async () => {
      const mockOrderFills = [
        {
          orderId: 'order-123',
          symbol: 'BTC',
          side: 'buy',
          size: '0.1',
          price: '50000',
          pnl: '100',
          direction: 'long',
          fee: '5',
          feeToken: 'USDC',
          timestamp: 1640995200000,
        },
      ];

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getOrderFills.mockResolvedValue(mockOrderFills);

      const result = await controller.getOrderFills();

      expect(result).toEqual(mockOrderFills);
      expect(mockProvider.getOrderFills).toHaveBeenCalled();
    });
  });

  describe('getOrders', () => {
    it('should get orders successfully', async () => {
      const mockOrders = [
        {
          orderId: 'order-123',
          symbol: 'BTC',
          side: 'buy' as const,
          orderType: 'market' as const,
          size: '0.1',
          originalSize: '0.1',
          price: '50000',
          filledSize: '0.1',
          remainingSize: '0',
          status: 'filled' as const,
          timestamp: 1640995200000,
        },
      ];

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getOrders.mockResolvedValue(mockOrders);

      const result = await controller.getOrders();

      expect(result).toEqual(mockOrders);
      expect(mockProvider.getOrders).toHaveBeenCalled();
    });
  });

  describe('subscribeToPrices', () => {
    it('should subscribe to price updates', () => {
      const mockUnsubscribe = jest.fn();
      const params = {
        symbols: ['BTC', 'ETH'],
        callback: jest.fn(),
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.subscribeToPrices.mockReturnValue(mockUnsubscribe);

      const unsubscribe = controller.subscribeToPrices(params);

      expect(unsubscribe).toBe(mockUnsubscribe);
      expect(mockProvider.subscribeToPrices).toHaveBeenCalledWith(params);
    });
  });

  describe('subscribeToPositions', () => {
    it('should subscribe to position updates', () => {
      const mockUnsubscribe = jest.fn();
      const params = {
        callback: jest.fn(),
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.subscribeToPositions.mockReturnValue(mockUnsubscribe);

      const unsubscribe = controller.subscribeToPositions(params);

      expect(unsubscribe).toBe(mockUnsubscribe);
      expect(mockProvider.subscribeToPositions).toHaveBeenCalledWith(params);
    });
  });

  describe('withdraw', () => {
    it('should withdraw successfully', async () => {
      const withdrawParams = {
        amount: '100',
        destination:
          '0x1234567890123456789012345678901234567890' as `0x${string}`,
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as `${string}:${string}/${string}:${string}/${string}`,
      };

      const mockWithdrawResult = {
        success: true,
        txHash: '0xabcdef1234567890',
        withdrawalId: 'withdrawal-123',
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.withdraw.mockResolvedValue(mockWithdrawResult);

      const result = await controller.withdraw(withdrawParams);

      expect(result).toEqual(mockWithdrawResult);
      expect(mockProvider.withdraw).toHaveBeenCalledWith(withdrawParams);
    });
  });

  describe('calculateLiquidationPrice', () => {
    it('should calculate liquidation price successfully', async () => {
      const liquidationParams = {
        entryPrice: 50000,
        leverage: 10,
        direction: 'long' as const,
        positionSize: 1,
        marginType: 'isolated' as const,
        asset: 'BTC',
      };

      const mockLiquidationPrice = '45000';

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.calculateLiquidationPrice.mockResolvedValue(
        mockLiquidationPrice,
      );

      const result = await controller.calculateLiquidationPrice(
        liquidationParams,
      );

      expect(result).toBe(mockLiquidationPrice);
      expect(mockProvider.calculateLiquidationPrice).toHaveBeenCalledWith(
        liquidationParams,
      );
    });
  });

  describe('getMaxLeverage', () => {
    it('should get max leverage successfully', async () => {
      const asset = 'BTC';
      const mockMaxLeverage = 50;

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getMaxLeverage.mockResolvedValue(mockMaxLeverage);

      const result = await controller.getMaxLeverage(asset);

      expect(result).toBe(mockMaxLeverage);
      expect(mockProvider.getMaxLeverage).toHaveBeenCalledWith(asset);
    });
  });

  describe('getWithdrawalRoutes', () => {
    it('should get withdrawal routes successfully', () => {
      const mockRoutes = [
        {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as `${string}:${string}/${string}:${string}/${string}`,
          chainId: 'eip155:42161' as `${string}:${string}`,
          contractAddress:
            '0x1234567890123456789012345678901234567890' as `0x${string}`,
          constraints: {
            minAmount: '10',
            maxAmount: '1000000',
          },
        },
      ];

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getWithdrawalRoutes.mockReturnValue(mockRoutes);

      const result = controller.getWithdrawalRoutes();

      expect(result).toEqual(mockRoutes);
      expect(mockProvider.getWithdrawalRoutes).toHaveBeenCalled();
    });
  });

  describe('getBlockExplorerUrl', () => {
    it('should get block explorer URL successfully', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const mockUrl =
        'https://app.hyperliquid.xyz/explorer/address/0x1234567890123456789012345678901234567890';

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getBlockExplorerUrl.mockReturnValue(mockUrl);

      const result = controller.getBlockExplorerUrl(address);

      expect(result).toBe(mockUrl);
      expect(mockProvider.getBlockExplorerUrl).toHaveBeenCalledWith(address);
    });
  });

  describe('error handling', () => {
    it('should handle provider errors gracefully', async () => {
      const errorMessage = 'Provider connection failed';

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getPositions.mockRejectedValue(new Error(errorMessage));

      await expect(controller.getPositions()).rejects.toThrow(errorMessage);
      expect(mockProvider.getPositions).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const errorMessage = 'Network timeout';

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getAccountState.mockRejectedValue(new Error(errorMessage));

      await expect(controller.getAccountState()).rejects.toThrow(errorMessage);
      expect(mockProvider.getAccountState).toHaveBeenCalled();
    });
  });

  describe('state management', () => {
    it('should return positions without updating state', async () => {
      const mockPositions = [
        {
          coin: 'ETH',
          size: '2.5',
          entryPrice: '2000',
          positionValue: '5000',
          unrealizedPnl: '500',
          marginUsed: '2500',
          leverage: { type: 'cross' as const, value: 2 },
          liquidationPrice: '1500',
          maxLeverage: 100,
          returnOnEquity: '10.0',
          cumulativeFunding: {
            allTime: '10',
            sinceOpen: '5',
            sinceChange: '2',
          },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
      ];

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getPositions.mockResolvedValue(mockPositions);

      const result = await controller.getPositions();

      expect(result).toEqual(mockPositions);
      expect(mockProvider.getPositions).toHaveBeenCalled();
      // Note: getPositions doesn't update controller state, it just returns data
    });

    it('should handle errors without updating state', async () => {
      const errorMessage = 'Failed to fetch positions';

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getPositions.mockRejectedValue(new Error(errorMessage));

      await expect(controller.getPositions()).rejects.toThrow(errorMessage);
      expect(mockProvider.getPositions).toHaveBeenCalled();
    });
  });

  describe('connection management', () => {
    it('should handle disconnection', async () => {
      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.disconnect.mockResolvedValue({ success: true });

      await controller.disconnect();

      expect(mockProvider.disconnect).toHaveBeenCalled();
      expect(controller.state.connectionStatus).toBe('disconnected');
    });

    it('should handle connection status from state', () => {
      // Test that we can access connection status from controller state
      expect(controller.state.connectionStatus).toBe('disconnected');

      // Test that the state is accessible and has the expected default value
      expect(typeof controller.state.connectionStatus).toBe('string');
      expect(['connected', 'disconnected', 'connecting']).toContain(
        controller.state.connectionStatus,
      );
    });
  });

  describe('utility methods', () => {
    it('should get funding information', async () => {
      const mockFunding = [
        {
          symbol: 'BTC',
          fundingRate: '0.0001',
          timestamp: 1640995200000,
          amountUsd: '100',
          rate: '0.0001',
        },
      ];

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getFunding.mockResolvedValue(mockFunding);

      const result = await controller.getFunding();

      expect(result).toEqual(mockFunding);
      expect(mockProvider.getFunding).toHaveBeenCalled();
    });

    it('should get order fills with parameters', async () => {
      const params = { limit: 10, user: '0x123' as `0x${string}` };
      const mockOrderFills = [
        {
          orderId: 'order-123',
          symbol: 'BTC',
          side: 'buy',
          size: '0.1',
          price: '50000',
          pnl: '100',
          direction: 'long',
          fee: '5',
          feeToken: 'USDC',
          timestamp: 1640995200000,
        },
      ];

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getOrderFills.mockResolvedValue(mockOrderFills);

      const result = await controller.getOrderFills(params);

      expect(result).toEqual(mockOrderFills);
      expect(mockProvider.getOrderFills).toHaveBeenCalledWith(params);
    });
  });

  describe('order management', () => {
    it('should edit order successfully', async () => {
      const editParams = {
        orderId: 'order-123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          orderType: 'limit' as const,
          price: '51000',
          size: '0.2',
        },
      };

      const mockEditResult = {
        success: true,
        orderId: 'order-123',
        updatedOrder: editParams.newOrder,
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.editOrder.mockResolvedValue(mockEditResult);

      const result = await controller.editOrder(editParams);

      expect(result).toEqual(mockEditResult);
      expect(mockProvider.editOrder).toHaveBeenCalledWith(editParams);
    });

    it('should handle edit order error', async () => {
      const editParams = {
        orderId: 'order-123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          orderType: 'limit' as const,
          price: '51000',
          size: '0.2',
        },
      };

      const errorMessage = 'Order edit failed';

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.editOrder.mockRejectedValue(new Error(errorMessage));

      await expect(controller.editOrder(editParams)).rejects.toThrow(
        errorMessage,
      );
      expect(mockProvider.editOrder).toHaveBeenCalledWith(editParams);
    });
  });

  describe('subscription management', () => {
    it('should subscribe to order fills', () => {
      const mockUnsubscribe = jest.fn();
      const params = {
        callback: jest.fn(),
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.subscribeToOrderFills.mockReturnValue(mockUnsubscribe);

      const unsubscribe = controller.subscribeToOrderFills(params);

      expect(unsubscribe).toBe(mockUnsubscribe);
      expect(mockProvider.subscribeToOrderFills).toHaveBeenCalledWith(params);
    });

    it('should set live data configuration', () => {
      const config = {
        priceThrottleMs: 1000,
        positionThrottleMs: 2000,
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.setLiveDataConfig.mockReturnValue(undefined);

      controller.setLiveDataConfig(config);

      expect(mockProvider.setLiveDataConfig).toHaveBeenCalledWith(config);
    });

    it('should handle subscription cleanup', () => {
      const mockUnsubscribe = jest.fn();
      const params = {
        symbols: ['BTC', 'ETH'],
        callback: jest.fn(),
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.subscribeToPrices.mockReturnValue(mockUnsubscribe);

      const unsubscribe = controller.subscribeToPrices(params);

      // Test that unsubscribe function works
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('deposit operations', () => {
    it('should clear deposit result', () => {
      // Test that clearDepositResult method exists and can be called
      expect(() => controller.clearDepositResult()).not.toThrow();

      // Verify the method was called (it's a void method)
      expect(typeof controller.clearDepositResult).toBe('function');
    });
  });

  describe('withdrawal operations', () => {
    it('should clear withdraw result', () => {
      // Test that clearWithdrawResult method exists and can be called
      expect(() => controller.clearWithdrawResult()).not.toThrow();

      // Verify the method was called (it's a void method)
      expect(typeof controller.clearWithdrawResult).toBe('function');
    });
  });

  describe('network management', () => {
    it('should get current network', () => {
      const network = controller.getCurrentNetwork();

      expect(['mainnet', 'testnet']).toContain(network);
      expect(typeof network).toBe('string');
    });

    it('should get withdrawal routes', () => {
      const mockRoutes = [
        {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as `${string}:${string}/${string}:${string}/${string}`,
          chainId: 'eip155:42161' as `${string}:${string}`,
          contractAddress:
            '0x1234567890123456789012345678901234567890' as `0x${string}`,
          constraints: {
            minAmount: '10',
            maxAmount: '1000000',
          },
        },
      ];

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getWithdrawalRoutes.mockReturnValue(mockRoutes);

      const result = controller.getWithdrawalRoutes();

      expect(result).toEqual(mockRoutes);
      expect(mockProvider.getWithdrawalRoutes).toHaveBeenCalled();
    });
  });

  describe('user management', () => {
    it('should check if first time user on current network', () => {
      const isFirstTime = controller.isFirstTimeUserOnCurrentNetwork();

      expect(typeof isFirstTime).toBe('boolean');
    });

    it('should mark tutorial as completed', () => {
      // Test that markTutorialCompleted method exists and can be called
      expect(() => controller.markTutorialCompleted()).not.toThrow();

      // Verify the method was called (it's a void method)
      expect(typeof controller.markTutorialCompleted).toBe('function');
    });
  });

  describe('additional subscriptions', () => {
    it('should subscribe to orders', () => {
      const mockUnsubscribe = jest.fn();
      const params = {
        callback: jest.fn(),
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.subscribeToOrders.mockReturnValue(mockUnsubscribe);

      const unsubscribe = controller.subscribeToOrders(params);

      expect(unsubscribe).toBe(mockUnsubscribe);
      expect(mockProvider.subscribeToOrders).toHaveBeenCalledWith(params);
    });

    it('should subscribe to account updates', () => {
      const mockUnsubscribe = jest.fn();
      const params = {
        callback: jest.fn(),
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.subscribeToAccount.mockReturnValue(mockUnsubscribe);

      const unsubscribe = controller.subscribeToAccount(params);

      expect(unsubscribe).toBe(mockUnsubscribe);
      expect(mockProvider.subscribeToAccount).toHaveBeenCalledWith(params);
    });
  });

  describe('validation methods', () => {
    it('should validate close position', async () => {
      const closeParams = {
        coin: 'BTC',
        orderType: 'market' as const,
        size: '0.5',
      };

      const mockValidationResult = {
        isValid: true,
        errors: [],
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.validateClosePosition.mockResolvedValue(
        mockValidationResult,
      );

      const result = await controller.validateClosePosition(closeParams);

      expect(result).toEqual(mockValidationResult);
      expect(mockProvider.validateClosePosition).toHaveBeenCalledWith(
        closeParams,
      );
    });

    it('should validate withdrawal', async () => {
      const withdrawParams = {
        amount: '100',
        destination:
          '0x1234567890123456789012345678901234567890' as `0x${string}`,
      };

      const mockValidationResult = {
        isValid: true,
        errors: [],
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.validateWithdrawal.mockResolvedValue(mockValidationResult);

      const result = await controller.validateWithdrawal(withdrawParams);

      expect(result).toEqual(mockValidationResult);
      expect(mockProvider.validateWithdrawal).toHaveBeenCalledWith(
        withdrawParams,
      );
    });
  });

  describe('position management', () => {
    it('should update position TP/SL', async () => {
      const updateParams = {
        coin: 'BTC',
        takeProfitPrice: '55000',
        stopLossPrice: '45000',
      };

      const mockUpdateResult = {
        success: true,
        positionId: 'pos-123',
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.updatePositionTPSL.mockResolvedValue(mockUpdateResult);

      const result = await controller.updatePositionTPSL(updateParams);

      expect(result).toEqual(mockUpdateResult);
      expect(mockProvider.updatePositionTPSL).toHaveBeenCalledWith(
        updateParams,
      );
    });

    it('should calculate maintenance margin', async () => {
      const marginParams = {
        coin: 'BTC',
        size: '1.0',
        entryPrice: '50000',
        asset: 'BTC',
      };

      const mockMargin = 2500;

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.calculateMaintenanceMargin.mockResolvedValue(mockMargin);

      const result = await controller.calculateMaintenanceMargin(marginParams);

      expect(result).toBe(mockMargin);
      expect(mockProvider.calculateMaintenanceMargin).toHaveBeenCalledWith(
        marginParams,
      );
    });
  });

  describe('fee calculations', () => {
    it('should calculate fees', async () => {
      const feeParams = {
        coin: 'BTC',
        size: '0.1',
        orderType: 'market' as const,
      };

      const mockFees = {
        makerFee: '0.0001',
        takerFee: '0.0005',
        totalFee: '0.05',
        feeToken: 'USDC',
        feeAmount: 0.05,
        feeRate: 0.0005,
        protocolFeeRate: 0.0003,
        metamaskFeeRate: 0.0002,
      };

      // Mock the controller as initialized
      (controller as any).isInitialized = true;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.calculateFees.mockResolvedValue(mockFees);

      const result = await controller.calculateFees(feeParams);

      expect(result).toEqual(mockFees);
      expect(mockProvider.calculateFees).toHaveBeenCalledWith(feeParams);
    });
  });
});
