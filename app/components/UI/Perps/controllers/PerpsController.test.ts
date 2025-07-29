/* eslint-disable @typescript-eslint/no-explicit-any */
import { Messenger } from '@metamask/base-controller';

import {
  getDefaultPerpsControllerState,
  PerpsController,
  type PerpsControllerState,
} from './PerpsController';
import { HyperLiquidProvider } from './providers/HyperLiquidProvider';
import { CaipAssetId, CaipChainId } from '@metamask/utils';

// Mock the HyperLiquid SDK first
jest.mock('@deeeed/hyperliquid-node20', () => ({
  ExchangeClient: jest.fn(),
  InfoClient: jest.fn(),
  SubscriptionClient: jest.fn(),
  WebSocketTransport: jest.fn(),
}));

// Mock the HyperLiquidProvider and its dependencies
jest.mock('./providers/HyperLiquidProvider');
jest.mock('../services/HyperLiquidClientService');
jest.mock('../services/HyperLiquidSubscriptionService');
jest.mock('../services/HyperLiquidWalletService');
jest.mock('../utils/hyperLiquidAdapter');
jest.mock('../utils/hyperLiquidValidation');
jest.mock('../constants/hyperLiquidConfig');

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: jest.fn(),
    },
    NetworkController: {
      state: {
        selectedNetworkClientId: 'mainnet',
      },
    },
    TransactionController: {
      addTransaction: jest.fn(),
    },
  },
}));

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

// Mock transaction utilities
jest.mock('../../../../util/transactions', () => ({
  generateTransferData: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnrestrictedMessenger = Messenger<any, any>;

describe('PerpsController', () => {
  let mockHyperLiquidProvider: jest.Mocked<HyperLiquidProvider>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock HyperLiquidProvider with all required methods
    mockHyperLiquidProvider = {
      protocolId: 'hyperliquid',
      initialize: jest.fn(),
      isReadyToTrade: jest.fn(),
      toggleTestnet: jest.fn(),
      getPositions: jest.fn(),
      getAccountState: jest.fn(),
      getMarkets: jest.fn(),
      placeOrder: jest.fn(),
      editOrder: jest.fn(),
      cancelOrder: jest.fn(),
      closePosition: jest.fn(),
      deposit: jest.fn(),
      withdraw: jest.fn(),
      getDepositRoutes: jest.fn(),
      getWithdrawalRoutes: jest.fn(),
      subscribeToPrices: jest.fn(),
      subscribeToPositions: jest.fn(),
      subscribeToOrderFills: jest.fn(),
      setLiveDataConfig: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as jest.Mocked<HyperLiquidProvider>;

    // Mock the HyperLiquidProvider constructor
    (
      HyperLiquidProvider as jest.MockedClass<typeof HyperLiquidProvider>
    ).mockImplementation(() => mockHyperLiquidProvider);
  });

  /**
   * Helper function to create a PerpsController with proper messenger setup
   */
  function withController<ReturnValue>(
    fn: (args: {
      controller: PerpsController;
      messenger: UnrestrictedMessenger;
    }) => ReturnValue,
    options: {
      state?: Partial<PerpsControllerState>;
      mocks?: {
        getSelectedAccount?: jest.MockedFunction<() => unknown>;
        getNetworkState?: jest.MockedFunction<() => unknown>;
      };
    } = {},
  ): ReturnValue {
    const { state = {}, mocks = {} } = options;

    const messenger = new Messenger<any, any>();

    // Register mock external actions
    messenger.registerActionHandler(
      'AccountsController:getSelectedAccount',
      mocks.getSelectedAccount ??
        jest.fn().mockReturnValue({
          id: 'mock-account-id',
          address: '0x1234567890123456789012345678901234567890',
          metadata: { name: 'Test Account' },
        }),
    );

    messenger.registerActionHandler(
      'NetworkController:getState',
      mocks.getNetworkState ??
        jest.fn().mockReturnValue({
          selectedNetworkClientId: 'mainnet',
        }),
    );

    const restrictedMessenger = messenger.getRestricted({
      name: 'PerpsController',
      allowedActions: [
        'AccountsController:getSelectedAccount' as never,
        'NetworkController:getState' as never,
      ],
      allowedEvents: [
        'AccountsController:selectedAccountChange' as never,
        'NetworkController:stateChange' as never,
      ],
    });

    const controller = new PerpsController({
      messenger: restrictedMessenger,
      state,
    });

    return fn({ controller, messenger });
  }

  describe('constructor', () => {
    it('should initialize with default state', () => {
      withController(({ controller }) => {
        expect(controller.state).toEqual(getDefaultPerpsControllerState());
        expect(controller.state.activeProvider).toBe('hyperliquid');
        expect(controller.state.positions).toEqual([]);
        expect(controller.state.accountState).toBeNull();
        expect(controller.state.connectionStatus).toBe('disconnected');
      });
    });

    it('should initialize with custom state', () => {
      const customState: Partial<PerpsControllerState> = {
        activeProvider: 'hyperliquid',
        isTestnet: false,
        positions: [
          {
            coin: 'BTC',
            size: '1.0',
            entryPrice: '50000',
            positionValue: '50000',
            unrealizedPnl: '1000',
            marginUsed: '25000',
            leverage: {
              type: 'isolated',
              value: 2,
            },
            liquidationPrice: '40000',
            maxLeverage: 100,
            returnOnEquity: '4.0',
            cumulativeFunding: {
              allTime: '0',
              sinceOpen: '0',
              sinceChange: '0',
            },
          },
        ],
      };

      withController(
        ({ controller }) => {
          expect(controller.state.activeProvider).toBe('hyperliquid');
          expect(controller.state.isTestnet).toBe(false);
          expect(controller.state.positions).toHaveLength(1);
          expect(controller.state.positions[0].coin).toBe('BTC');
        },
        { state: customState },
      );
    });
  });

  describe('provider management', () => {
    it('should get active provider', () => {
      withController(({ controller }) => {
        // Mock provider initialization
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        // Initialize first to avoid the error
        controller.initializeProviders();

        // Should not throw when properly initialized
        expect(() => controller.getActiveProvider()).not.toThrow();
      });
    });

    it('should toggle testnet', async () => {
      withController(async ({ controller }) => {
        const initialTestnetState = controller.state.isTestnet;

        const result = await controller.toggleTestnet();

        expect(result.success).toBe(true);
        expect(controller.state.isTestnet).toBe(!initialTestnetState);
        expect(controller.state.connectionStatus).toBe('disconnected');
      });
    });

    it('should get current network', () => {
      withController(
        ({ controller }) => {
          expect(controller.getCurrentNetwork()).toBe('testnet'); // Default in tests
        },
        { state: { isTestnet: true } },
      );

      withController(
        ({ controller }) => {
          expect(controller.getCurrentNetwork()).toBe('mainnet');
        },
        { state: { isTestnet: false } },
      );
    });
  });

  describe('account management', () => {
    it('should get positions and update state', async () => {
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
        },
      ];

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.getPositions.mockResolvedValue(mockPositions);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        const result = await controller.getPositions();

        expect(result).toEqual(mockPositions);
        expect(controller.state.positions).toEqual(mockPositions);
        expect(controller.state.lastError).toBeNull();
        expect(mockHyperLiquidProvider.getPositions).toHaveBeenCalled();
      });
    });

    it('should get account state and update state', async () => {
      const mockAccountState = {
        availableBalance: '1000',
        totalBalance: '1500',
        marginUsed: '500',
        unrealizedPnl: '100',
      };

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.getAccountState.mockResolvedValue(
          mockAccountState,
        );
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        const result = await controller.getAccountState();

        expect(result).toEqual(mockAccountState);
        expect(controller.state.accountState).toEqual(mockAccountState);
        expect(controller.state.lastError).toBeNull();
        expect(mockHyperLiquidProvider.getAccountState).toHaveBeenCalled();
      });
    });

    it('should handle errors when getting positions', async () => {
      withController(async ({ controller }) => {
        const errorMessage = 'Network error';
        mockHyperLiquidProvider.getPositions.mockRejectedValue(
          new Error(errorMessage),
        );
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();

        await expect(controller.getPositions()).rejects.toThrow(errorMessage);
        expect(controller.state.lastError).toBe(errorMessage);
        expect(controller.state.positions).toEqual([]); // Should not modify positions on error
      });
    });
  });

  describe('trading operations', () => {
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

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.placeOrder.mockResolvedValue(mockOrderResult);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        const result = await controller.placeOrder(orderParams);

        expect(result).toEqual(mockOrderResult);
        expect(mockHyperLiquidProvider.placeOrder).toHaveBeenCalledWith(
          orderParams,
        );
        // Test focuses on the result, not internal pending state management
      });
    });

    it('should handle order failure', async () => {
      const orderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market' as const,
      };

      const mockOrderResult = {
        success: false,
        error: 'Insufficient balance',
      };

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.placeOrder.mockResolvedValue(mockOrderResult);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        const result = await controller.placeOrder(orderParams);

        expect(result).toEqual(mockOrderResult);
        // Test focuses on the result, not internal pending state management
      });
    });

    it('should cancel order successfully', async () => {
      const cancelParams = {
        coin: 'BTC',
        orderId: 'order-123',
      };

      const mockCancelResult = {
        success: true,
        orderId: 'order-123',
      };

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.cancelOrder.mockResolvedValue(mockCancelResult);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        const result = await controller.cancelOrder(cancelParams);

        expect(result).toEqual(mockCancelResult);
        expect(mockHyperLiquidProvider.cancelOrder).toHaveBeenCalledWith(
          cancelParams,
        );
      });
    });
  });

  describe('deposit state management', () => {
    it('should reset deposit state', () => {
      withController(({ controller }) => {
        controller.resetDepositState();

        expect(controller.state.depositStatus).toBe('idle');
        expect(controller.state.depositFlowType).toBeNull();
        expect(controller.state.depositSteps.totalSteps).toBe(0);
        expect(controller.state.depositError).toBeNull();
        expect(controller.state.currentDepositTxHash).toBeNull();
        expect(controller.state.requiresModalDismissal).toBe(false);
      });
    });

    it('should get deposit routes', () => {
      const mockRoutes = [
        {
          assetId:
            'eip155:42161/erc20:0x1234567890123456789012345678901234567890/default' as CaipAssetId,
          chainId: 'eip155:42161' as CaipChainId,
          contractAddress:
            '0x5678901234567890123456789012345678901234' as `0x${string}`,
        },
      ];

      withController(({ controller }) => {
        mockHyperLiquidProvider.getDepositRoutes.mockReturnValue(mockRoutes);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        // Initialize first
        controller.initializeProviders();

        const result = controller.getDepositRoutes();

        expect(result).toEqual(mockRoutes);
        expect(mockHyperLiquidProvider.getDepositRoutes).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when provider not initialized', () => {
      withController(({ controller }) => {
        // Reset the initialization state by setting isInitialized to false
        // This simulates the case where initializeProviders() hasn't been called yet
        (controller as any).isInitialized = false;
        expect(() => controller.getActiveProvider()).toThrow(
          'PerpsController not initialized. Call initialize() first.',
        );
      });
    });

    it('should update error state when provider fails', async () => {
      withController(async ({ controller }) => {
        const errorMessage = 'Provider initialization failed';
        mockHyperLiquidProvider.initialize.mockRejectedValue(
          new Error(errorMessage),
        );

        // Should not throw, but should log error
        await controller.initializeProviders();

        // Error should be logged but controller should continue to work
        expect(controller.state.lastError).toBe(null); // initializeProviders doesn't update state directly
      });
    });
  });

  describe('deposit operations', () => {
    it('should validate deposit parameters', async () => {
      withController(async ({ controller }) => {
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        await controller.initializeProviders();

        // Test missing amount
        const result1 = await controller.deposit({
          amount: '',
          assetId:
            'eip155:42161/erc20:0x1234567890123456789012345678901234567890/default',
        });
        expect(result1.success).toBe(false);
        expect(result1.error).toBe(
          'Amount is required and must be greater than 0',
        );

        // Test missing assetId
        const result2 = await controller.deposit({
          amount: '100',
          assetId: '' as any,
        });
        expect(result2.success).toBe(false);
        expect(result2.error).toBe(
          'AssetId is required for deposit validation',
        );
      });
    });

    it('should handle deposit route analysis', async () => {
      withController(async ({ controller }) => {
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        mockHyperLiquidProvider.getDepositRoutes.mockReturnValue([
          {
            assetId:
              'eip155:42161/erc20:0x1234567890123456789012345678901234567890/default' as any,
            chainId: 'eip155:42161' as any,
            contractAddress:
              '0x5678901234567890123456789012345678901234' as any,
          },
        ]);

        await controller.initializeProviders();

        // Mock the analyzeDepositRoute to throw error for unsupported assets
        const result = await controller.deposit({
          amount: '100',
          assetId:
            'eip155:1/erc20:0x9999999999999999999999999999999999999999/default',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain(
          'Only direct deposits are currently supported',
        );
      });
    });
  });

  describe('live data subscriptions', () => {
    it('should subscribe to price updates', () => {
      withController(({ controller }) => {
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        mockHyperLiquidProvider.subscribeToPrices.mockReturnValue(jest.fn());

        controller.initializeProviders();

        const params = {
          symbols: ['BTC', 'ETH'],
          callback: jest.fn(),
        };

        const unsubscribe = controller.subscribeToPrices(params);

        expect(mockHyperLiquidProvider.subscribeToPrices).toHaveBeenCalledWith(
          params,
        );
        expect(typeof unsubscribe).toBe('function');
      });
    });

    it('should subscribe to position updates', () => {
      withController(({ controller }) => {
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        mockHyperLiquidProvider.subscribeToPositions.mockReturnValue(jest.fn());

        controller.initializeProviders();

        const params = {
          callback: jest.fn(),
        };

        const unsubscribe = controller.subscribeToPositions(params);

        expect(
          mockHyperLiquidProvider.subscribeToPositions,
        ).toHaveBeenCalledWith(params);
        expect(typeof unsubscribe).toBe('function');
      });
    });

    it('should subscribe to order fill updates', () => {
      withController(({ controller }) => {
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        mockHyperLiquidProvider.subscribeToOrderFills.mockReturnValue(
          jest.fn(),
        );

        controller.initializeProviders();

        const params = {
          callback: jest.fn(),
        };

        const unsubscribe = controller.subscribeToOrderFills(params);

        expect(
          mockHyperLiquidProvider.subscribeToOrderFills,
        ).toHaveBeenCalledWith(params);
        expect(typeof unsubscribe).toBe('function');
      });
    });

    it('should configure live data settings', () => {
      withController(({ controller }) => {
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        mockHyperLiquidProvider.setLiveDataConfig.mockReturnValue(undefined);

        controller.initializeProviders();

        const config = {
          priceThrottleMs: 1000,
          positionThrottleMs: 2000,
        };

        controller.setLiveDataConfig(config);

        expect(mockHyperLiquidProvider.setLiveDataConfig).toHaveBeenCalledWith(
          config,
        );
      });
    });
  });

  describe('additional trading operations', () => {
    it('should edit order successfully', async () => {
      const editParams = {
        orderId: 'order-123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          size: '0.2',
          orderType: 'limit' as const,
          price: '51000',
        },
      };

      const mockEditResult = {
        success: true,
        orderId: 'order-123',
      };

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.editOrder.mockResolvedValue(mockEditResult);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        const result = await controller.editOrder(editParams);

        expect(result).toEqual(mockEditResult);
        expect(mockHyperLiquidProvider.editOrder).toHaveBeenCalledWith(
          editParams,
        );
      });
    });

    it('should close position successfully', async () => {
      const closeParams = {
        coin: 'BTC',
        size: '0.5',
        orderType: 'market' as const,
      };

      const mockCloseResult = {
        success: true,
        orderId: 'close-order-123',
      };

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.closePosition.mockResolvedValue(
          mockCloseResult,
        );
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        const result = await controller.closePosition(closeParams);

        expect(result).toEqual(mockCloseResult);
        expect(mockHyperLiquidProvider.closePosition).toHaveBeenCalledWith(
          closeParams,
        );
      });
    });

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
          szDecimals: 4,
          maxLeverage: 25,
          marginTableId: 2,
        },
      ];

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.getMarkets.mockResolvedValue(mockMarkets);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        const result = await controller.getMarkets();

        expect(result).toEqual(mockMarkets);
        expect(mockHyperLiquidProvider.getMarkets).toHaveBeenCalled();
      });
    });

    it('should filter markets by symbols', async () => {
      const mockMarkets = [
        {
          name: 'BTC',
          szDecimals: 3,
          maxLeverage: 50,
          marginTableId: 1,
        },
        {
          name: 'ETH',
          szDecimals: 4,
          maxLeverage: 25,
          marginTableId: 2,
        },
      ];

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.getMarkets.mockResolvedValue(mockMarkets);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        const result = await controller.getMarkets({ symbols: ['BTC'] });

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('BTC');
      });
    });

    it('should handle withdraw operation', async () => {
      const withdrawParams = {
        amount: '100',
        destination: '0x1234567890123456789012345678901234567890' as any,
      };

      const mockWithdrawResult = {
        success: true,
        txHash: '0xabcdef123456789',
      };

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.withdraw.mockResolvedValue(mockWithdrawResult);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        const result = await controller.withdraw(withdrawParams);

        expect(result).toEqual(mockWithdrawResult);
        expect(mockHyperLiquidProvider.withdraw).toHaveBeenCalledWith(
          withdrawParams,
        );
      });
    });
  });

  describe('provider switching', () => {
    it('should switch provider successfully', async () => {
      withController(async ({ controller }) => {
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        await controller.initializeProviders();

        const result = await controller.switchProvider('hyperliquid');

        expect(result.success).toBe(true);
        expect(result.providerId).toBe('hyperliquid');
        expect(controller.state.activeProvider).toBe('hyperliquid');
        expect(controller.state.connectionStatus).toBe('disconnected');
      });
    });

    it('should handle switch to non-existent provider', async () => {
      withController(async ({ controller }) => {
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        await controller.initializeProviders();

        const result = await controller.switchProvider('nonexistent');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Provider nonexistent not available');
        expect(result.providerId).toBe('hyperliquid'); // Should remain unchanged
      });
    });
  });

  describe('cleanup operations', () => {
    it('should disconnect provider', async () => {
      withController(async ({ controller }) => {
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        mockHyperLiquidProvider.disconnect.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        await controller.disconnect();

        expect(mockHyperLiquidProvider.disconnect).toHaveBeenCalled();
      });
    });

    it('should get withdrawal routes', () => {
      withController(({ controller }) => {
        mockHyperLiquidProvider.getWithdrawalRoutes.mockReturnValue([]);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        controller.initializeProviders();
        const result = controller.getWithdrawalRoutes();

        expect(result).toEqual([]);
        expect(mockHyperLiquidProvider.getWithdrawalRoutes).toHaveBeenCalled();
      });
    });
  });

  describe('fetchHistoricalCandles', () => {
    it('should fetch historical candles successfully', async () => {
      withController(async ({ controller }) => {
        // Arrange
        const mockCandleData = {
          coin: 'BTC',
          interval: '1h',
          candles: [
            {
              time: 1700000000000,
              open: '50000',
              high: '51000',
              low: '49000',
              close: '50500',
              volume: '100',
            },
            {
              time: 1700003600000,
              open: '50500',
              high: '51500',
              low: '50000',
              close: '51000',
              volume: '150',
            },
          ],
        };

        // Mock provider to have a clientService with fetchHistoricalCandles method
        const mockClientService = {
          fetchHistoricalCandles: jest.fn().mockResolvedValue(mockCandleData),
        };

        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        (mockHyperLiquidProvider as any).clientService = mockClientService;

        await controller.initializeProviders();

        // Act
        const result = await controller.fetchHistoricalCandles(
          'BTC',
          '1h',
          100,
        );

        // Assert
        expect(result).toEqual(mockCandleData);
        expect(mockClientService.fetchHistoricalCandles).toHaveBeenCalledWith(
          'BTC',
          '1h',
          100,
        );
      });
    });

    it('should handle errors when fetching historical candles', async () => {
      withController(async ({ controller }) => {
        // Arrange
        const errorMessage = 'Failed to fetch historical candles';
        const mockClientService = {
          fetchHistoricalCandles: jest
            .fn()
            .mockRejectedValue(new Error(errorMessage)),
        };

        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        (mockHyperLiquidProvider as any).clientService = mockClientService;

        await controller.initializeProviders();

        // Act & Assert
        await expect(
          controller.fetchHistoricalCandles('BTC', '1h', 100),
        ).rejects.toThrow(errorMessage);
        expect(mockClientService.fetchHistoricalCandles).toHaveBeenCalledWith(
          'BTC',
          '1h',
          100,
        );
      });
    });

    it('should throw error when provider does not support historical candles', async () => {
      withController(async ({ controller }) => {
        // Arrange
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        // Don't add clientService to simulate unsupported provider

        await controller.initializeProviders();

        // Act & Assert
        await expect(
          controller.fetchHistoricalCandles('BTC', '1h', 100),
        ).rejects.toThrow(
          'Historical candles not supported by current provider',
        );
      });
    });

    it('should throw error when controller not initialized', async () => {
      withController(async ({ controller }) => {
        // Arrange - don't initialize the controller
        (controller as any).isInitialized = false;

        // Act & Assert
        await expect(
          controller.fetchHistoricalCandles('BTC', '1h', 100),
        ).rejects.toThrow(
          'PerpsController not initialized. Call initialize() first.',
        );
      });
    });

    it('should handle different intervals and limits', async () => {
      withController(async ({ controller }) => {
        // Arrange
        const mockCandleData = {
          coin: 'ETH',
          interval: '15m',
          candles: [],
        };

        const mockClientService = {
          fetchHistoricalCandles: jest.fn().mockResolvedValue(mockCandleData),
        };

        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        (mockHyperLiquidProvider as any).clientService = mockClientService;

        await controller.initializeProviders();

        // Act
        const result = await controller.fetchHistoricalCandles(
          'ETH',
          '15m',
          50,
        );

        // Assert
        expect(result).toEqual(mockCandleData);
        expect(mockClientService.fetchHistoricalCandles).toHaveBeenCalledWith(
          'ETH',
          '15m',
          50,
        );
      });
    });
  });
});
