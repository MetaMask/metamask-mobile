/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Messenger } from '@metamask/base-controller';
import { successfulFetch } from '@metamask/controller-utils';

import {
  getDefaultPerpsControllerState,
  PerpsController,
  type PerpsControllerState,
} from './PerpsController';
import { HyperLiquidProvider } from './providers/HyperLiquidProvider';
import { CaipAssetId, CaipChainId, Hex } from '@metamask/utils';
import { DepositStatus } from './types';
import { CandlePeriod } from '../constants/chartConfig';

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

// Mock parseCaipAssetId from @metamask/utils
jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
  parseCaipAssetId: jest.fn((_assetId) => ({
    chainId: 'eip155:42161',
    assetNamespace: 'erc20',
    assetReference: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  })),
}));

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: jest.fn().mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        id: 'mock-account-id',
        metadata: { name: 'Test Account' },
      }),
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

// Mock trace utilities
jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    PerpsController: 'Perps Controller',
    PerpsOrderExecution: 'Perps Order Execution',
    PerpsDeposit: 'Perps Deposit',
    PerpsWithdrawal: 'Perps Withdrawal',
  },
  TraceOperation: {
    PerpsOperation: 'perps.operation',
    PerpsOrderSubmission: 'perps.order_submission',
    PerpsDeposit: 'perps.deposit',
    PerpsWithdrawal: 'perps.withdrawal',
  },
}));

// Mock successfulFetch for geo location testing
jest.mock('@metamask/controller-utils', () => {
  const actual = jest.requireActual('@metamask/controller-utils');

  return {
    ...actual,
    successfulFetch: jest.fn(),
  };
});

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
      validateDeposit: jest.fn().mockResolvedValue({ isValid: true }),
      validateOrder: jest.fn().mockResolvedValue({ isValid: true }),
      validateClosePosition: jest.fn().mockResolvedValue({ isValid: true }),
      validateWithdrawal: jest.fn().mockResolvedValue({ isValid: true }),
      subscribeToPrices: jest.fn(),
      subscribeToPositions: jest.fn(),
      subscribeToOrderFills: jest.fn(),
      setLiveDataConfig: jest.fn(),
      disconnect: jest.fn(),
      updatePositionTPSL: jest.fn(),
      calculateLiquidationPrice: jest.fn(),
      calculateMaintenanceMargin: jest.fn(),
      getMaxLeverage: jest.fn(),
      calculateFees: jest.fn(),
      getMarketDataWithPrices: jest.fn(),
      getBlockExplorerUrl: jest.fn(),
      getOrderFills: jest.fn(),
      getOrders: jest.fn(),
      getFunding: jest.fn(),
      getIsFirstTimeUser: jest.fn(),
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
        'TransactionController:transactionSubmitted' as never,
        'TransactionController:transactionConfirmed' as never,
        'TransactionController:transactionFailed' as never,
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
        expect(controller.state.isEligible).toBe(false);
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
        expect(controller.state.depositError).toBeNull();
        expect(controller.state.currentDepositTxHash).toBeNull();
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
        // @ts-ignore - Accessing private property for testing
        controller.isInitialized = false;
        expect(() => controller.getActiveProvider()).toThrow(
          'CLIENT_NOT_INITIALIZED',
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

        // Mock validateDeposit to return validation errors
        mockHyperLiquidProvider.validateDeposit
          .mockReturnValueOnce(
            Promise.resolve({
              isValid: false,
              error: 'Amount is required and must be greater than 0',
            }),
          )
          .mockReturnValueOnce(
            Promise.resolve({
              isValid: false,
              error: 'AssetId is required for deposit validation',
            }),
          );

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

        // Mock validateDeposit to return error for unsupported route
        mockHyperLiquidProvider.validateDeposit.mockReturnValue(
          Promise.resolve({
            isValid: false,
            error: 'Only direct deposits are currently supported',
          }),
        );

        await controller.initializeProviders();

        // Try to deposit with unsupported asset on chain ID 1 (mainnet) instead of 42161 (Arbitrum)
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

    it('should track performance when placing order', async () => {
      const orderParams = {
        coin: 'ETH',
        isBuy: true,
        size: '1.5',
        orderType: 'market' as const,
      };

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.placeOrder.mockResolvedValue({
          success: true,
          orderId: 'test-order-123',
        });
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        await controller.placeOrder(orderParams);

        // Verify trace was called with correct parameters
        const traceModule = jest.requireMock('../../../../util/trace');
        expect(traceModule.trace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: expect.stringContaining('Perps Order Execution'),
            tags: expect.objectContaining({
              market: 'ETH',
              leverage: 1,
            }),
          }),
        );
        expect(traceModule.endTrace).toHaveBeenCalled();
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
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
        destination: '0x1234567890123456789012345678901234567890' as any,
      };

      const mockPendingWithdrawal = {
        withdrawalId: 'hl_test-uuid-123',
        provider: 'hyperliquid',
        amount: '100',
        asset: 'USDC',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
        sourceChainId: 'eip155:999' as CaipChainId,
        destinationChainId: 'eip155:42161' as CaipChainId,
        destinationAddress: '0x1234567890123456789012345678901234567890' as Hex,
        initiatedAt: Date.now(),
        status: 'pending' as const,
        providerTxHash: undefined,
        estimatedArrivalTime: Date.now() + 5 * 60 * 1000,
        metadata: {
          isTestnet: false,
        },
      };

      const mockWithdrawResult = {
        success: true,
        txHash: '0xabcdef123456789',
        withdrawalId: 'hl_test-uuid-123',
        estimatedArrivalTime: mockPendingWithdrawal.estimatedArrivalTime,
        pendingWithdrawal: mockPendingWithdrawal,
      };

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.withdraw.mockResolvedValue(mockWithdrawResult);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        mockHyperLiquidProvider.getWithdrawalRoutes.mockReturnValue([
          {
            assetId:
              'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
            chainId: 'eip155:42161' as CaipChainId,
            contractAddress:
              '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7' as Hex,
            constraints: {
              minAmount: '1.01',
              estimatedTime: '5 minutes',
              fees: {
                fixed: 1,
                token: 'USDC',
              },
            },
          },
        ]);

        await controller.initializeProviders();
        const result = await controller.withdraw(withdrawParams);

        // Verify result returned from provider
        expect(result).toEqual(mockWithdrawResult);

        expect(mockHyperLiquidProvider.withdraw).toHaveBeenCalledWith(
          withdrawParams,
        );
      });
    });

    it('should handle withdraw when provider does not return pendingWithdrawal', async () => {
      const withdrawParams = {
        amount: '100',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
        destination: '0x1234567890123456789012345678901234567890' as any,
      };

      // Provider returns success but no pendingWithdrawal (legacy behavior)
      const mockWithdrawResult = {
        success: true,
        txHash: '0xabcdef123456789',
      };

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.withdraw.mockResolvedValue(mockWithdrawResult);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        mockHyperLiquidProvider.getWithdrawalRoutes.mockReturnValue([
          {
            assetId:
              'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
            chainId: 'eip155:42161' as CaipChainId,
            contractAddress:
              '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7' as Hex,
            constraints: {
              minAmount: '1.01',
              estimatedTime: '5 minutes',
              fees: {
                fixed: 1,
                token: 'USDC',
              },
            },
          },
        ]);

        await controller.initializeProviders();
        const result = await controller.withdraw(withdrawParams);

        // Verify result returned from provider
        expect(result).toEqual(mockWithdrawResult);

        // Verify provider was called correctly
        expect(mockHyperLiquidProvider.withdraw).toHaveBeenCalledWith(
          withdrawParams,
        );
      });
    });

    it('should validate withdrawal requires assetId', async () => {
      const withdrawParams = {
        amount: '100',
        // Missing assetId
        destination: '0x1234567890123456789012345678901234567890' as any,
      };

      withController(async ({ controller }) => {
        // Mock the withdraw method to return an error for missing assetId
        mockHyperLiquidProvider.withdraw.mockResolvedValue({
          success: false,
          error: 'assetId is required for withdrawals',
        });
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        await controller.initializeProviders();

        const result = await controller.withdraw(withdrawParams);

        expect(result.success).toBe(false);
        expect(result.error).toContain('assetId is required for withdrawals');
        expect(controller.state.lastError).toContain(
          'assetId is required for withdrawals',
        );

        // Provider should be called since controller doesn't validate
        expect(mockHyperLiquidProvider.withdraw).toHaveBeenCalledWith(
          withdrawParams,
        );
      });
    });

    it('should validate withdrawal requires positive amount', async () => {
      const withdrawParamsZero = {
        amount: '0',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
        destination: '0x1234567890123456789012345678901234567890' as any,
      };

      withController(async ({ controller }) => {
        // Mock the withdraw method to return validation errors
        mockHyperLiquidProvider.withdraw
          .mockResolvedValueOnce({
            success: false,
            error: 'Amount must be a positive number',
          })
          .mockResolvedValueOnce({
            success: false,
            error: 'Amount must be a positive number',
          })
          .mockResolvedValueOnce({
            success: false,
            error: 'Amount must be a positive number',
          });
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        await controller.initializeProviders();

        // Test zero amount
        const resultZero = await controller.withdraw(withdrawParamsZero);
        expect(resultZero.success).toBe(false);
        expect(resultZero.error).toContain('Amount must be a positive number');
        expect(controller.state.lastError).toContain(
          'Amount must be a positive number',
        );

        // Test negative amount
        const withdrawParamsNegative = { ...withdrawParamsZero, amount: '-10' };
        const resultNegative = await controller.withdraw(
          withdrawParamsNegative,
        );
        expect(resultNegative.success).toBe(false);
        expect(resultNegative.error).toContain(
          'Amount must be a positive number',
        );

        // Test missing amount
        const withdrawParamsMissing = {
          assetId: withdrawParamsZero.assetId,
          destination: withdrawParamsZero.destination,
          amount: undefined as any,
        };
        const resultMissing = await controller.withdraw(withdrawParamsMissing);
        expect(resultMissing.success).toBe(false);
        expect(resultMissing.error).toContain(
          'Amount must be a positive number',
        );

        // Provider should be called since controller doesn't validate
        expect(mockHyperLiquidProvider.withdraw).toHaveBeenCalledTimes(3);
      });
    });

    it('should handle withdrawal provider error result', async () => {
      const withdrawParams = {
        amount: '100',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
        destination: '0x1234567890123456789012345678901234567890' as any,
      };

      const mockErrorResult = {
        success: false,
        error: 'Insufficient balance in trading account',
      };

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.withdraw.mockResolvedValue(mockErrorResult);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        await controller.initializeProviders();

        const result = await controller.withdraw(withdrawParams);

        expect(result).toEqual(mockErrorResult);
        expect(controller.state.lastError).toBe(
          'Insufficient balance in trading account',
        );
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('should handle withdrawal provider exception', async () => {
      const withdrawParams = {
        amount: '100',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
        destination: '0x1234567890123456789012345678901234567890' as any,
      };

      const errorMessage = 'Network connection failed';

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.withdraw.mockRejectedValue(
          new Error(errorMessage),
        );
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        await controller.initializeProviders();

        const result = await controller.withdraw(withdrawParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
        expect(controller.state.lastError).toBe(errorMessage);
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('should handle withdrawal with provider returning error without message', async () => {
      const withdrawParams = {
        amount: '100',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
      };

      const mockErrorResult = {
        success: false,
        // No error message
      };

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.withdraw.mockResolvedValue(mockErrorResult);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });
        await controller.initializeProviders();

        const result = await controller.withdraw(withdrawParams);

        expect(result).toEqual(mockErrorResult);
        // Should use default error message when no error provided
        expect(controller.state.lastError).toBeTruthy();
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
          interval: CandlePeriod.ONE_HOUR,
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
          CandlePeriod.ONE_HOUR,
          100,
        );

        // Assert
        expect(result).toEqual(mockCandleData);
        expect(mockClientService.fetchHistoricalCandles).toHaveBeenCalledWith(
          'BTC',
          CandlePeriod.ONE_HOUR,
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
          controller.fetchHistoricalCandles('BTC', CandlePeriod.ONE_HOUR, 100),
        ).rejects.toThrow(errorMessage);
        expect(mockClientService.fetchHistoricalCandles).toHaveBeenCalledWith(
          'BTC',
          CandlePeriod.ONE_HOUR,
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
          controller.fetchHistoricalCandles('BTC', CandlePeriod.ONE_HOUR, 100),
        ).rejects.toThrow(
          'Historical candles not supported by current provider',
        );
      });
    });

    it('should throw error when controller not initialized', async () => {
      withController(async ({ controller }) => {
        // Arrange - don't initialize the controller
        // @ts-ignore - Accessing private property for testing
        controller.isInitialized = false;

        // Act & Assert
        await expect(
          controller.fetchHistoricalCandles('BTC', CandlePeriod.ONE_HOUR, 100),
        ).rejects.toThrow('CLIENT_NOT_INITIALIZED');
      });
    });

    it('should handle different intervals and limits', async () => {
      withController(async ({ controller }) => {
        // Arrange
        const mockCandleData = {
          coin: 'ETH',
          interval: CandlePeriod.FIFTEEN_MINUTES,
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
          CandlePeriod.FIFTEEN_MINUTES,
          50,
        );

        // Assert
        expect(result).toEqual(mockCandleData);
        expect(mockClientService.fetchHistoricalCandles).toHaveBeenCalledWith(
          'ETH',
          CandlePeriod.FIFTEEN_MINUTES,
          50,
        );
      });
    });
  });

  describe('Transaction Event Handlers', () => {
    describe('handleTransactionSubmitted', () => {
      it('should update deposit status to depositing when transaction is tracked', () => {
        // Arrange - Set up initial state with tracked transaction
        const txId = 'test-tx-id';
        const txHash = '0xabcdef123456';
        const depositInfo = {
          amount: '1000',
          token: 'USDC',
          timestamp: Date.now(),
        };

        const initialState = {
          activeDepositTransactions: {
            [txId]: depositInfo,
          },
          depositStatus: 'idle' as DepositStatus,
          currentDepositTxHash: null,
        };

        withController(
          ({ controller, messenger }) => {
            // Create transaction event
            const txEvent = {
              transactionMeta: {
                id: txId,
                hash: txHash,
                status: 'submitted',
                txParams: {
                  from: '0x123',
                  to: '0x456',
                  value: '0x0',
                },
              },
            };

            // Act - Publish transaction submitted event
            messenger.publish(
              'TransactionController:transactionSubmitted',
              // @ts-ignore
              txEvent,
            );

            // Assert - Verify state updated correctly
            expect(controller.state.depositStatus).toBe('depositing');
            expect(controller.state.currentDepositTxHash).toBe(txHash);
            expect(controller.state.activeDepositTransactions[txId]).toEqual(
              depositInfo,
            );
          },
          { state: initialState },
        );
      });

      it('should not update state when transaction is not tracked', () => {
        // Arrange - Set up initial state without tracked transaction
        const txId = 'untracked-tx-id';
        const initialState = {
          depositStatus: 'idle' as DepositStatus,
          currentDepositTxHash: null,
          activeDepositTransactions: {},
        };

        withController(
          ({ controller, messenger }) => {
            // Create transaction event for untracked transaction
            const txEvent = {
              transactionMeta: {
                id: txId,
                hash: '0xabcdef123456',
                status: 'submitted',
                txParams: {
                  from: '0x123',
                  to: '0x456',
                  value: '0x0',
                },
              },
            };

            // Act - Publish transaction submitted event
            messenger.publish(
              'TransactionController:transactionSubmitted',
              // @ts-ignore
              txEvent,
            );

            // Assert - Verify state unchanged
            expect(controller.state.depositStatus).toBe('idle');
            expect(controller.state.currentDepositTxHash).toBe(null);
            expect(controller.state.activeDepositTransactions).toEqual({});
          },
          { state: initialState },
        );
      });

      it('should handle transaction without hash', () => {
        // Arrange - Set up initial state with tracked transaction
        const txId = 'test-tx-id';
        const depositInfo = {
          amount: '1000',
          token: 'USDC',
          timestamp: Date.now(),
        };

        const initialState = {
          activeDepositTransactions: {
            [txId]: depositInfo,
          },
          depositStatus: 'idle' as DepositStatus,
          currentDepositTxHash: null,
        };

        withController(
          ({ controller, messenger }) => {
            // Create transaction event without hash
            const txEvent = {
              transactionMeta: {
                id: txId,
                // No hash property
                status: 'submitted',
                txParams: {
                  from: '0x123',
                  to: '0x456',
                  value: '0x0',
                },
              },
            };

            // Act - Publish transaction submitted event
            messenger.publish(
              'TransactionController:transactionSubmitted',
              // @ts-ignore
              txEvent,
            );

            // Assert - Verify state updated correctly with null hash
            expect(controller.state.depositStatus).toBe('depositing');
            expect(controller.state.currentDepositTxHash).toBe(null);
          },
          { state: initialState },
        );
      });
    });

    describe('handleTransactionConfirmed', () => {
      it('should update deposit status to success and remove from tracking when transaction is confirmed', () => {
        withController(({ controller, messenger }) => {
          // Arrange - Set up initial state with tracked transaction
          const txId = 'test-tx-id';
          const txHash = '0xabcdef123456';
          const depositInfo = {
            amount: '1000',
            token: 'USDC',
            timestamp: Date.now(),
          };

          // @ts-ignore
          controller.update((state) => {
            state.activeDepositTransactions[txId] = depositInfo;
            state.depositStatus = 'depositing';
            state.currentDepositTxHash = null;
          });

          // Create transaction confirmed event
          const txMeta = {
            id: txId,
            hash: txHash,
            status: 'confirmed',
            txParams: {
              from: '0x123',
              to: '0x456',
              value: '0x0',
            },
          };

          // Act - Publish transaction confirmed event
          messenger.publish(
            'TransactionController:transactionConfirmed',
            // @ts-ignore
            txMeta,
          );

          // Assert - Verify state updated correctly
          expect(controller.state.depositStatus).toBe('success');
          expect(controller.state.currentDepositTxHash).toBe(txHash);
          expect(
            controller.state.activeDepositTransactions[txId],
          ).toBeUndefined();
        });
      });

      it('should not update state when transaction is not tracked', () => {
        withController(({ controller, messenger }) => {
          // Arrange - Set up initial state without tracked transaction
          const txId = 'untracked-tx-id';
          const initialState = {
            depositStatus: 'idle' as DepositStatus,
            currentDepositTxHash: null,
            activeDepositTransactions: {},
          };

          // @ts-ignore
          controller.update((state) => {
            state.depositStatus = initialState.depositStatus;
            state.currentDepositTxHash = initialState.currentDepositTxHash;
            state.activeDepositTransactions =
              initialState.activeDepositTransactions;
          });

          // Create transaction confirmed event for untracked transaction
          const txMeta = {
            id: txId,
            hash: '0xabcdef123456',
            status: 'confirmed',
            txParams: {
              from: '0x123',
              to: '0x456',
              value: '0x0',
            },
          };

          // Act - Publish transaction confirmed event
          messenger.publish(
            'TransactionController:transactionConfirmed',
            // @ts-ignore
            txMeta,
          );

          // Assert - Verify state unchanged
          expect(controller.state.depositStatus).toBe('idle');
          expect(controller.state.currentDepositTxHash).toBe(null);
          expect(controller.state.activeDepositTransactions).toEqual({});
        });
      });

      it('should handle transaction without hash', () => {
        withController(({ controller, messenger }) => {
          // Arrange - Set up initial state with tracked transaction
          const txId = 'test-tx-id';
          const depositInfo = {
            amount: '1000',
            token: 'USDC',
            timestamp: Date.now(),
          };
          // @ts-ignore
          controller.update((state) => {
            state.activeDepositTransactions[txId] = depositInfo;
            state.depositStatus = 'depositing';
            state.currentDepositTxHash = null;
          });

          // Create transaction confirmed event without hash
          const txMeta = {
            id: txId,
            // No hash property
            status: 'confirmed',
            txParams: {
              from: '0x123',
              to: '0x456',
              value: '0x0',
            },
          };

          // Act - Publish transaction confirmed event
          messenger.publish(
            'TransactionController:transactionConfirmed',
            // @ts-ignore
            txMeta,
          );

          // Assert - Verify state updated correctly with null hash
          expect(controller.state.depositStatus).toBe('success');
          expect(controller.state.currentDepositTxHash).toBe(null);
          expect(
            controller.state.activeDepositTransactions[txId],
          ).toBeUndefined();
        });
      });

      it('should handle multiple tracked transactions and only update the correct one', () => {
        withController(({ controller, messenger }) => {
          // Arrange - Set up initial state with multiple tracked transactions
          const txId1 = 'test-tx-id-1';
          const txId2 = 'test-tx-id-2';
          const txHash1 = '0xabcdef123456';
          const depositInfo1 = {
            amount: '1000',
            token: 'USDC',
            timestamp: Date.now(),
          };
          const depositInfo2 = {
            amount: '2000',
            token: 'ETH',
            timestamp: Date.now(),
          };

          // @ts-ignore
          controller.update((state) => {
            state.activeDepositTransactions[txId1] = depositInfo1;
            state.activeDepositTransactions[txId2] = depositInfo2;
            state.depositStatus = 'depositing';
            state.currentDepositTxHash = null;
          });

          // Create transaction confirmed event for first transaction
          const txMeta = {
            id: txId1,
            hash: txHash1,
            status: 'confirmed',
            txParams: {
              from: '0x123',
              to: '0x456',
              value: '0x0',
            },
          };

          // Act - Publish transaction confirmed event for first transaction
          messenger.publish(
            'TransactionController:transactionConfirmed',
            // @ts-ignore
            txMeta,
          );

          // Assert - Verify only first transaction removed, second still tracked
          expect(controller.state.depositStatus).toBe('success');
          expect(controller.state.currentDepositTxHash).toBe(txHash1);
          expect(
            controller.state.activeDepositTransactions[txId1],
          ).toBeUndefined();
          expect(controller.state.activeDepositTransactions[txId2]).toEqual(
            depositInfo2,
          );
        });
      });
    });

    describe('handleTransactionFailed', () => {
      it('should update deposit status to error and remove from tracking when transaction fails', () => {
        withController(({ controller, messenger }) => {
          // Arrange - Set up initial state with tracked transaction
          const txId = 'test-tx-id';
          const txHash = '0xabcdef123456';
          const errorMessage = 'Transaction failed due to insufficient gas';
          const depositInfo = {
            amount: '1000',
            token: 'USDC',
            timestamp: Date.now(),
          };

          // @ts-ignore
          controller.update((state) => {
            state.activeDepositTransactions[txId] = depositInfo;
            state.depositStatus = 'depositing';
            state.currentDepositTxHash = null;
            state.depositError = null;
          });

          // Create transaction failed event
          const txEvent = {
            transactionMeta: {
              id: txId,
              hash: txHash,
              status: 'failed',
              error: {
                message: errorMessage,
                code: 'INSUFFICIENT_GAS',
              },
              txParams: {
                from: '0x123',
                to: '0x456',
                value: '0x0',
              },
            },
          };

          // Act - Publish transaction failed event
          // @ts-ignore
          messenger.publish('TransactionController:transactionFailed', txEvent);

          // Assert - Verify state updated correctly
          expect(controller.state.depositStatus).toBe('error');
          expect(controller.state.depositError).toBe(errorMessage);
          expect(controller.state.currentDepositTxHash).toBe(txHash);
          expect(
            controller.state.activeDepositTransactions[txId],
          ).toBeUndefined();
        });
      });

      it('should not update state when transaction is not tracked', () => {
        withController(({ controller, messenger }) => {
          // Arrange - Set up initial state without tracked transaction
          const txId = 'untracked-tx-id';
          const initialState = {
            depositStatus: 'idle' as DepositStatus,
            currentDepositTxHash: null,
            depositError: null,
            activeDepositTransactions: {},
          };

          // @ts-ignore
          controller.update((state) => {
            state.depositStatus = initialState.depositStatus;
            state.currentDepositTxHash = initialState.currentDepositTxHash;
            state.depositError = initialState.depositError;
            state.activeDepositTransactions =
              initialState.activeDepositTransactions;
          });

          // Create transaction failed event for untracked transaction
          const txEvent = {
            transactionMeta: {
              id: txId,
              hash: '0xabcdef123456',
              status: 'failed',
              error: {
                message: 'Transaction failed',
                code: 'FAILED',
              },
              txParams: {
                from: '0x123',
                to: '0x456',
                value: '0x0',
              },
            },
          };

          // Act - Publish transaction failed event
          // @ts-ignore
          messenger.publish('TransactionController:transactionFailed', txEvent);

          // Assert - Verify state unchanged
          expect(controller.state.depositStatus).toBe('idle');
          expect(controller.state.currentDepositTxHash).toBe(null);
          expect(controller.state.depositError).toBe(null);
          expect(controller.state.activeDepositTransactions).toEqual({});
        });
      });

      it('should handle transaction without error message', () => {
        withController(({ controller, messenger }) => {
          // Arrange - Set up initial state with tracked transaction
          const txId = 'test-tx-id';
          const txHash = '0xabcdef123456';
          const depositInfo = {
            amount: '1000',
            token: 'USDC',
            timestamp: Date.now(),
          };
          // @ts-ignore
          controller.update((state) => {
            state.activeDepositTransactions[txId] = depositInfo;
            state.depositStatus = 'depositing';
            state.currentDepositTxHash = null;
            state.depositError = null;
          });

          // Create transaction failed event without error message
          const txEvent = {
            transactionMeta: {
              id: txId,
              hash: txHash,
              status: 'failed',
              // No error property
              txParams: {
                from: '0x123',
                to: '0x456',
                value: '0x0',
              },
            },
          };

          // Act - Publish transaction failed event
          // @ts-ignore
          messenger.publish('TransactionController:transactionFailed', txEvent);

          // Assert - Verify state updated with default error message
          expect(controller.state.depositStatus).toBe('error');
          expect(controller.state.depositError).toBe('Transaction failed');
          expect(controller.state.currentDepositTxHash).toBe(txHash);
          expect(
            controller.state.activeDepositTransactions[txId],
          ).toBeUndefined();
        });
      });

      it('should handle transaction without hash', () => {
        withController(({ controller, messenger }) => {
          // Arrange - Set up initial state with tracked transaction
          const txId = 'test-tx-id';
          const errorMessage = 'Transaction failed due to network error';
          const depositInfo = {
            amount: '1000',
            token: 'USDC',
            timestamp: Date.now(),
          };

          // @ts-ignore
          controller.update((state) => {
            state.activeDepositTransactions[txId] = depositInfo;
            state.depositStatus = 'depositing';
            state.currentDepositTxHash = null;
            state.depositError = null;
          });

          // Create transaction failed event without hash
          const txEvent = {
            transactionMeta: {
              id: txId,
              // No hash property
              status: 'failed',
              error: {
                message: errorMessage,
                code: 'NETWORK_ERROR',
              },
              txParams: {
                from: '0x123',
                to: '0x456',
                value: '0x0',
              },
            },
          };

          // Act - Publish transaction failed event
          // @ts-ignore
          messenger.publish('TransactionController:transactionFailed', txEvent);

          // Assert - Verify state updated correctly with null hash
          expect(controller.state.depositStatus).toBe('error');
          expect(controller.state.depositError).toBe(errorMessage);
          expect(controller.state.currentDepositTxHash).toBe(null);
          expect(
            controller.state.activeDepositTransactions[txId],
          ).toBeUndefined();
        });
      });

      it('should handle multiple tracked transactions and only update the correct one', () => {
        withController(({ controller, messenger }) => {
          // Arrange - Set up initial state with multiple tracked transactions
          const txId1 = 'test-tx-id-1';
          const txId2 = 'test-tx-id-2';
          const txHash1 = '0xabcdef123456';
          const errorMessage = 'Transaction failed';
          const depositInfo1 = {
            amount: '1000',
            token: 'USDC',
            timestamp: Date.now(),
          };
          const depositInfo2 = {
            amount: '2000',
            token: 'ETH',
            timestamp: Date.now(),
          };

          // @ts-ignore
          controller.update((state) => {
            state.activeDepositTransactions[txId1] = depositInfo1;
            state.activeDepositTransactions[txId2] = depositInfo2;
            state.depositStatus = 'depositing';
            state.currentDepositTxHash = null;
            state.depositError = null;
          });

          // Create transaction failed event for first transaction
          const txEvent = {
            transactionMeta: {
              id: txId1,
              hash: txHash1,
              status: 'failed',
              error: {
                message: errorMessage,
                code: 'FAILED',
              },
              txParams: {
                from: '0x123',
                to: '0x456',
                value: '0x0',
              },
            },
          };

          // Act - Publish transaction failed event for first transaction
          // @ts-ignore
          messenger.publish('TransactionController:transactionFailed', txEvent);

          // Assert - Verify only first transaction removed, second still tracked
          expect(controller.state.depositStatus).toBe('error');
          expect(controller.state.depositError).toBe(errorMessage);
          expect(controller.state.currentDepositTxHash).toBe(txHash1);
          expect(
            controller.state.activeDepositTransactions[txId1],
          ).toBeUndefined();
          expect(controller.state.activeDepositTransactions[txId2]).toEqual(
            depositInfo2,
          );
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle rapid transaction state changes', () => {
        withController(({ controller, messenger }) => {
          // Arrange - Set up initial state with tracked transaction
          const txId = 'test-tx-id';
          const txHash = '0xabcdef123456';
          const depositInfo = {
            amount: '1000',
            token: 'USDC',
            timestamp: Date.now(),
          };

          // @ts-ignore
          (controller as any).update((state) => {
            state.activeDepositTransactions[txId] = depositInfo;
            state.depositStatus = 'idle';
            state.currentDepositTxHash = null;
          });

          // Act - Simulate rapid state changes
          const submittedEvent = {
            transactionMeta: {
              id: txId,
              hash: txHash,
              status: 'submitted',
              txParams: { from: '0x123', to: '0x456', value: '0x0' },
            },
          };

          const confirmedEvent = {
            id: txId,
            hash: txHash,
            status: 'confirmed',
            txParams: { from: '0x123', to: '0x456', value: '0x0' },
          };

          messenger.publish(
            'TransactionController:transactionSubmitted',
            // @ts-ignore
            submittedEvent,
          );
          messenger.publish(
            'TransactionController:transactionConfirmed',
            // @ts-ignore
            confirmedEvent,
          );

          // Assert - Verify final state is correct
          expect(controller.state.depositStatus).toBe('success');
          expect(controller.state.currentDepositTxHash).toBe(txHash);
          expect(
            controller.state.activeDepositTransactions[txId],
          ).toBeUndefined();
        });
      });

      it('should handle empty activeDepositTransactions', () => {
        withController(({ controller, messenger }) => {
          // Arrange - Set up initial state with empty activeDepositTransactions
          // @ts-ignore
          controller.update((state) => {
            state.activeDepositTransactions = {};
            state.depositStatus = 'idle';
            state.currentDepositTxHash = null;
          });

          // Act - Publish transaction events for non-existent transactions
          const submittedEvent = {
            transactionMeta: {
              id: 'non-existent-tx',
              hash: '0xabcdef123456',
              status: 'submitted',
              txParams: { from: '0x123', to: '0x456', value: '0x0' },
            },
          };

          const confirmedEvent = {
            id: 'non-existent-tx',
            hash: '0xabcdef123456',
            status: 'confirmed',
            txParams: { from: '0x123', to: '0x456', value: '0x0' },
          };

          const failedEvent = {
            transactionMeta: {
              id: 'non-existent-tx',
              hash: '0xabcdef123456',
              status: 'failed',
              error: { message: 'Failed' },
              txParams: { from: '0x123', to: '0x456', value: '0x0' },
            },
          };

          messenger.publish(
            'TransactionController:transactionSubmitted',
            // @ts-ignore
            submittedEvent,
          );
          messenger.publish(
            'TransactionController:transactionConfirmed',
            // @ts-ignore
            confirmedEvent,
          );
          messenger.publish(
            'TransactionController:transactionFailed',
            // @ts-ignore
            failedEvent,
          );

          // Assert - Verify state unchanged
          expect(controller.state.depositStatus).toBe('idle');
          expect(controller.state.currentDepositTxHash).toBe(null);
          expect(controller.state.activeDepositTransactions).toEqual({});
        });
      });
    });

    describe('updatePositionTPSL', () => {
      it('should update position TP/SL successfully', async () => {
        // Arrange
        mockHyperLiquidProvider.updatePositionTPSL.mockResolvedValue({
          success: true,
          orderId: 'tp:123,sl:456',
        });

        const params = {
          coin: 'ETH',
          takeProfitPrice: '3500',
          stopLossPrice: '2500',
        };

        await withController(async ({ controller }) => {
          // Act
          const result = await controller.updatePositionTPSL(params);

          // Assert
          expect(result).toEqual({
            success: true,
            orderId: 'tp:123,sl:456',
          });
          expect(
            mockHyperLiquidProvider.updatePositionTPSL,
          ).toHaveBeenCalledWith(params);
        });
      });

      it('should handle TP/SL update errors', async () => {
        // Arrange
        mockHyperLiquidProvider.updatePositionTPSL.mockResolvedValue({
          success: false,
          error: 'No position found',
        });

        const params = {
          coin: 'BTC',
          takeProfitPrice: '70000',
        };

        await withController(async ({ controller }) => {
          // Act
          const result = await controller.updatePositionTPSL(params);

          // Assert
          expect(result).toEqual({
            success: false,
            error: 'No position found',
          });
        });
      });

      it('should throw error when provider is not initialized', async () => {
        // Arrange
        const params = {
          coin: 'ETH',
          stopLossPrice: '2000',
        };

        await withController(async ({ controller }) => {
          // Force controller to be uninitialized
          // @ts-ignore - Accessing private property for testing
          controller.isInitialized = false;

          // Act & Assert
          await expect(controller.updatePositionTPSL(params)).rejects.toThrow();
        });
      });
    });

    describe('calculateFees', () => {
      it('should calculate fees successfully', async () => {
        const mockFeeResult = {
          feeRate: 0.00045,
          feeAmount: 45,
        };

        const params = {
          orderType: 'market' as const,
          isMaker: false,
          amount: '100000',
        };

        await withController(async ({ controller }) => {
          mockHyperLiquidProvider.calculateFees.mockResolvedValue(
            mockFeeResult,
          );
          mockHyperLiquidProvider.initialize.mockResolvedValue({
            success: true,
          });

          await controller.initializeProviders();
          const result = await controller.calculateFees(params);

          expect(result).toEqual(mockFeeResult);
          expect(mockHyperLiquidProvider.calculateFees).toHaveBeenCalledWith(
            params,
          );
        });
      });

      it('should delegate to active provider', async () => {
        const mockFeeResult = {
          feeRate: 0.00015,
          feeAmount: 15,
        };

        const params = {
          orderType: 'limit' as const,
          isMaker: true,
          amount: '100000',
        };

        await withController(async ({ controller }) => {
          mockHyperLiquidProvider.calculateFees.mockResolvedValue(
            mockFeeResult,
          );
          mockHyperLiquidProvider.initialize.mockResolvedValue({
            success: true,
          });

          await controller.initializeProviders();
          const result = await controller.calculateFees(params);

          expect(mockHyperLiquidProvider.calculateFees).toHaveBeenCalledWith(
            params,
          );
          expect(result).toEqual(mockFeeResult);
        });
      });

      it('should handle provider errors', async () => {
        const params = {
          orderType: 'market' as const,
          isMaker: false,
          amount: '100000',
        };

        await withController(async ({ controller }) => {
          mockHyperLiquidProvider.calculateFees.mockRejectedValue(
            new Error('Network error'),
          );
          mockHyperLiquidProvider.initialize.mockResolvedValue({
            success: true,
          });

          await controller.initializeProviders();

          await expect(controller.calculateFees(params)).rejects.toThrow(
            'Network error',
          );
        });
      });

      it('should throw error when provider is not initialized', async () => {
        const params = {
          orderType: 'market' as const,
          isMaker: false,
          amount: '100000',
        };

        await withController(async ({ controller }) => {
          // Force controller to be uninitialized
          // @ts-ignore - Accessing private property for testing
          controller.isInitialized = false;

          await expect(controller.calculateFees(params)).rejects.toThrow(
            'CLIENT_NOT_INITIALIZED',
          );
        });
      });

      it('should return Promise<FeeCalculationResult>', async () => {
        const params = {
          orderType: 'market' as const,
          isMaker: false,
          amount: '100000',
        };

        await withController(async ({ controller }) => {
          mockHyperLiquidProvider.calculateFees.mockResolvedValue({
            feeRate: 0.00045,
            feeAmount: 45,
          });
          mockHyperLiquidProvider.initialize.mockResolvedValue({
            success: true,
          });

          await controller.initializeProviders();
          const resultPromise = controller.calculateFees(params);

          expect(resultPromise).toBeInstanceOf(Promise);
          const result = await resultPromise;
          expect(result).toHaveProperty('feeRate');
          expect(result).toHaveProperty('feeAmount');
        });
      });
    });
  });

  describe('refreshEligibility', () => {
    let mockSuccessfulFetch: jest.MockedFunction<typeof successfulFetch>;

    beforeEach(() => {
      // Get fresh reference to the mocked function
      mockSuccessfulFetch = jest.mocked(successfulFetch);
      mockSuccessfulFetch.mockClear();
    });

    it('should set isEligible to true for eligible region (France)', async () => {
      // Mock API response for France
      const mockResponse = {
        text: jest.fn().mockResolvedValue('FR'),
      };
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      withController(async ({ controller }) => {
        await controller.refreshEligibility();

        expect(controller.state.isEligible).toBe(true);
        expect(mockSuccessfulFetch).toHaveBeenCalled();
      });
    });

    it('should set isEligible to false for blocked region (United States)', async () => {
      // Mock API response for United States
      const mockResponse = {
        text: jest.fn().mockResolvedValue('US'),
      };
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      withController(async ({ controller }) => {
        await controller.refreshEligibility();

        expect(controller.state.isEligible).toBe(false);
        expect(mockSuccessfulFetch).toHaveBeenCalled();
      });
    });

    it('should set isEligible to false for blocked region (Ontario, Canada)', async () => {
      // Mock API response for Ontario, Canada
      const mockResponse = {
        text: jest.fn().mockResolvedValue('CA-ON'),
      };
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      withController(async ({ controller }) => {
        await controller.refreshEligibility();

        expect(controller.state.isEligible).toBe(false);
        expect(mockSuccessfulFetch).toHaveBeenCalled();
      });
    });

    it('should set isEligible to false when API call fails (UNKNOWN fallback)', async () => {
      // Mock API failure
      mockSuccessfulFetch.mockRejectedValue(new Error('Network error'));

      withController(async ({ controller }) => {
        await controller.refreshEligibility();

        expect(controller.state.isEligible).toBe(false);
        expect(mockSuccessfulFetch).toHaveBeenCalled();
      });
    });

    it('should handle custom blocked regions list', async () => {
      // Mock API response for a region that would normally be allowed
      const mockResponse = {
        text: jest.fn().mockResolvedValue('DE'), // Germany
      };
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      withController(async ({ controller }) => {
        // Test with custom blocked regions that includes DE
        await controller.refreshEligibility(['DE', 'FR']);

        expect(controller.state.isEligible).toBe(false);
        expect(mockSuccessfulFetch).toHaveBeenCalled();
      });
    });

    it('should handle region prefix matching correctly', async () => {
      // Mock API response for US state (should be blocked because it starts with 'US')
      const mockResponse = {
        text: jest.fn().mockResolvedValue('US-CA'), // US-California
      };
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      withController(async ({ controller }) => {
        await controller.refreshEligibility();

        expect(controller.state.isEligible).toBe(false);
        expect(mockSuccessfulFetch).toHaveBeenCalled();
      });
    });
  });

  describe('validateOrder', () => {
    it('should delegate to active provider', async () => {
      const mockParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market' as const,
      };

      const mockResult = { isValid: true };
      mockHyperLiquidProvider.validateOrder.mockResolvedValue(mockResult);

      await withController(async ({ controller }) => {
        const result = await controller.validateOrder(mockParams);

        expect(mockHyperLiquidProvider.validateOrder).toHaveBeenCalledWith(
          mockParams,
        );
        expect(result).toBe(mockResult);
      });
    });

    it('should throw error if no active provider', async () => {
      await withController(async ({ controller }) => {
        // Mock getActiveProvider to throw error for non-existent provider
        jest
          .spyOn(controller as any, 'getActiveProvider')
          .mockImplementation(() => {
            throw new Error('PROVIDER_NOT_AVAILABLE');
          });

        await expect(controller.validateOrder({} as any)).rejects.toThrow(
          'PROVIDER_NOT_AVAILABLE',
        );
      });
    });
  });

  describe('validateClosePosition', () => {
    it('should delegate to active provider', async () => {
      const mockParams = {
        coin: 'BTC',
        orderType: 'market' as const,
      };

      const mockResult = { isValid: true };
      mockHyperLiquidProvider.validateClosePosition.mockResolvedValue(
        mockResult,
      );

      await withController(async ({ controller }) => {
        const result = await controller.validateClosePosition(mockParams);

        expect(
          mockHyperLiquidProvider.validateClosePosition,
        ).toHaveBeenCalledWith(mockParams);
        expect(result).toBe(mockResult);
      });
    });

    it('should throw error if no active provider', async () => {
      await withController(async ({ controller }) => {
        // Mock getActiveProvider to throw error for non-existent provider
        jest
          .spyOn(controller as any, 'getActiveProvider')
          .mockImplementation(() => {
            throw new Error('PROVIDER_NOT_AVAILABLE');
          });

        await expect(
          controller.validateClosePosition({} as any),
        ).rejects.toThrow('PROVIDER_NOT_AVAILABLE');
      });
    });
  });

  describe('validateWithdrawal', () => {
    it('should delegate to active provider', async () => {
      const mockParams = {
        amount: '100',
        destination: '0x123' as Hex,
        assetId: 'eip155:42161/erc20:0x123/default' as CaipAssetId,
      };

      const mockResult = { isValid: true };
      mockHyperLiquidProvider.validateWithdrawal.mockResolvedValue(mockResult);

      await withController(async ({ controller }) => {
        const result = await controller.validateWithdrawal(mockParams);

        expect(mockHyperLiquidProvider.validateWithdrawal).toHaveBeenCalledWith(
          mockParams,
        );
        expect(result).toBe(mockResult);
      });
    });

    it('should throw error if no active provider', async () => {
      await withController(async ({ controller }) => {
        // Mock getActiveProvider to throw error for non-existent provider
        jest
          .spyOn(controller as any, 'getActiveProvider')
          .mockImplementation(() => {
            throw new Error('PROVIDER_NOT_AVAILABLE');
          });

        await expect(controller.validateWithdrawal({} as any)).rejects.toThrow(
          'PROVIDER_NOT_AVAILABLE',
        );
      });
    });
  });

  describe('getBlockExplorerUrl', () => {
    it('should delegate to active provider', async () => {
      withController(async ({ controller }) => {
        await controller.initializeProviders();

        const mockUrl = 'https://app.hyperliquid.xyz/explorer/address/0x123';
        mockHyperLiquidProvider.getBlockExplorerUrl.mockReturnValue(mockUrl);

        const result = controller.getBlockExplorerUrl('0x123');

        expect(result).toBe(mockUrl);
        expect(
          mockHyperLiquidProvider.getBlockExplorerUrl,
        ).toHaveBeenCalledWith('0x123');
      });
    });

    it('should get base URL when no address provided', async () => {
      withController(async ({ controller }) => {
        await controller.initializeProviders();

        const mockBaseUrl = 'https://app.hyperliquid.xyz/explorer';
        mockHyperLiquidProvider.getBlockExplorerUrl.mockReturnValue(
          mockBaseUrl,
        );

        const result = controller.getBlockExplorerUrl();

        expect(result).toBe(mockBaseUrl);
        expect(
          mockHyperLiquidProvider.getBlockExplorerUrl,
        ).toHaveBeenCalledWith(undefined);
      });
    });

    it('should handle testnet URLs', async () => {
      withController(async ({ controller }) => {
        await controller.initializeProviders();

        const mockTestnetUrl =
          'https://app.hyperliquid-testnet.xyz/explorer/address/0x456';
        mockHyperLiquidProvider.getBlockExplorerUrl.mockReturnValue(
          mockTestnetUrl,
        );

        const result = controller.getBlockExplorerUrl('0x456');

        expect(result).toBe(mockTestnetUrl);
        expect(
          mockHyperLiquidProvider.getBlockExplorerUrl,
        ).toHaveBeenCalledWith('0x456');
      });
    });
  });

  describe('getOrderFills', () => {
    it('should retrieve order fills correctly', async () => {
      const mockOrderFills = [
        {
          coin: 'BTC',
          size: '0.1',
          price: '50000',
          quoteAmount: '5000',
          timestamp: 1700000000000,
          isBuy: true,
          fee: '2.5',
          orderId: 'order-123',
          orderType: 'market' as const,
          symbol: 'BTC',
          side: 'buy' as const,
          pnl: '0',
          direction: 'buy' as const,
          feeToken: 'BTC',
        },
        {
          coin: 'ETH',
          size: '1.5',
          price: '3000',
          quoteAmount: '4500',
          timestamp: 1700000001000,
          isBuy: false,
          fee: '2.25',
          orderId: 'order-456',
          orderType: 'limit' as const,
          symbol: 'ETH',
          side: 'sell' as const,
          pnl: '0',
          direction: 'sell' as const,
          feeToken: 'ETH',
        },
      ];

      const params = { limit: 10, user: '0x123' as Hex };

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.getOrderFills.mockResolvedValue(mockOrderFills);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        const result = await controller.getOrderFills(params);

        expect(result).toEqual(mockOrderFills);
        expect(mockHyperLiquidProvider.getOrderFills).toHaveBeenCalledWith(
          params,
        );
      });
    });

    it('should handle errors when getting order fills', async () => {
      const errorMessage = 'Failed to fetch order fills';

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.getOrderFills.mockRejectedValue(
          new Error(errorMessage),
        );
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();

        try {
          await controller.getOrderFills();
          // Should not reach here
          fail('Expected getOrderFills to throw an error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe(errorMessage);
        }
      });
    });
  });

  describe('getOrders', () => {
    it('should retrieve orders correctly', async () => {
      const mockOrders = [
        {
          id: 'order-123',
          coin: 'BTC',
          size: '0.1',
          price: '50000',
          limitPrice: '50000',
          timestamp: 1700000000000,
          isBuy: true,
          type: 'limit' as const,
          status: 'open' as const,
          filled: '0',
          symbol: 'BTC',
          side: 'buy' as const,
          orderType: 'limit' as const,
          orderId: 'order-123',
          pnl: '0',
          direction: 'buy' as const,
          originalSize: '0.1',
          filledSize: '0',
          remainingSize: '0.1',
          lastUpdated: 1700000000000,
        },
        {
          id: 'order-456',
          coin: 'ETH',
          size: '1.5',
          price: '3000',
          timestamp: 1700000001000,
          isBuy: false,
          type: 'market' as const,
          status: 'filled' as const,
          filled: '1.5',
          symbol: 'ETH',
          side: 'sell' as const,
          orderType: 'market' as const,
          orderId: 'order-456',
          pnl: '0',
          direction: 'sell' as const,
          originalSize: '1.5',
          filledSize: '1.5',
          remainingSize: '0',
          lastUpdated: 1700000001000,
        },
      ];

      const params = { limit: 10, status: 'all' };

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.getOrders.mockResolvedValue(mockOrders);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        const result = await controller.getOrders(params);

        expect(result).toEqual(mockOrders);
        expect(mockHyperLiquidProvider.getOrders).toHaveBeenCalledWith(params);
      });
    });

    it('should handle errors when getting orders', async () => {
      const errorMessage = 'Failed to fetch orders';

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.getOrders.mockRejectedValue(
          new Error(errorMessage),
        );
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();

        try {
          await controller.getOrders();
          // Should not reach here
          fail('Expected getOrders to throw an error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe(errorMessage);
        }
      });
    });
  });

  describe('getFunding', () => {
    it('should retrieve funding data correctly', async () => {
      const mockFunding = [
        {
          coin: 'BTC',
          amount: '10.5',
          timestamp: 1700000000000,
          rate: '0.01',
          positionSize: '1.0',
          symbol: 'BTC',
          amountUsd: '10.5',
        },
        {
          coin: 'ETH',
          amount: '-5.2',
          timestamp: 1700000001000,
          rate: '-0.005',
          positionSize: '10.0',
          symbol: 'ETH',
          amountUsd: '10.0',
        },
      ];

      const params = { limit: 20 };

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.getFunding.mockResolvedValue(mockFunding);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        const result = await controller.getFunding(params);

        expect(result).toEqual(mockFunding);
        expect(mockHyperLiquidProvider.getFunding).toHaveBeenCalledWith(params);
      });
    });

    it('should handle errors when getting funding data', async () => {
      const errorMessage = 'Failed to fetch funding data';

      withController(async ({ controller }) => {
        mockHyperLiquidProvider.getFunding.mockRejectedValue(
          new Error(errorMessage),
        );
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();

        try {
          await controller.getFunding();
          // Should not reach here
          fail('Expected getFunding to throw an error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe(errorMessage);
        }
      });
    });
  });

  describe('Network-specific isFirstTimeUser state and markTutorialCompleted', () => {
    it('should default to true for both networks for first-time users', async () => {
      await withController(async ({ controller }) => {
        // Assert
        expect(controller.state.isFirstTimeUser).toEqual({
          testnet: true,
          mainnet: true,
        });
      });
    });

    it('should set testnet isFirstTimeUser to false when markTutorialCompleted is called on testnet', async () => {
      await withController(
        async ({ controller }) => {
          // Arrange - start on testnet
          controller.state.isTestnet = true;
          expect(controller.state.isFirstTimeUser.testnet).toBe(true);
          expect(controller.state.isFirstTimeUser.mainnet).toBe(true);

          // Act
          controller.markTutorialCompleted();

          // Assert - only testnet should be affected
          expect(controller.state.isFirstTimeUser.testnet).toBe(false);
          expect(controller.state.isFirstTimeUser.mainnet).toBe(true);
        },
        { state: { isTestnet: true } },
      );
    });

    it('should set mainnet isFirstTimeUser to false when markTutorialCompleted is called on mainnet', async () => {
      await withController(
        async ({ controller }) => {
          // Arrange - start on mainnet
          controller.state.isTestnet = false;
          expect(controller.state.isFirstTimeUser.testnet).toBe(true);
          expect(controller.state.isFirstTimeUser.mainnet).toBe(true);

          // Act
          controller.markTutorialCompleted();

          // Assert - only mainnet should be affected
          expect(controller.state.isFirstTimeUser.testnet).toBe(true);
          expect(controller.state.isFirstTimeUser.mainnet).toBe(false);
        },
        { state: { isTestnet: false } },
      );
    });

    it('should correctly identify first-time status per network', async () => {
      await withController(async ({ controller }) => {
        // Arrange - initial state both networks are first-time
        await controller.toggleTestnet(); // Switch to testnet
        expect(controller.isFirstTimeUserOnCurrentNetwork()).toBe(true);

        await controller.toggleTestnet(); // Switch to mainnet
        expect(controller.isFirstTimeUserOnCurrentNetwork()).toBe(true);

        // Act - complete tutorial on testnet only
        await controller.toggleTestnet(); // Switch to testnet
        controller.markTutorialCompleted();

        // Assert - testnet is no longer first-time, mainnet still is
        expect(controller.isFirstTimeUserOnCurrentNetwork()).toBe(false);

        await controller.toggleTestnet(); // Switch to mainnet
        expect(controller.isFirstTimeUserOnCurrentNetwork()).toBe(true);
      });
    });

    it('should handle network switching correctly for first-time status', async () => {
      await withController(async ({ controller }) => {
        // Arrange - complete tutorial on both networks
        await controller.toggleTestnet(); // Switch to testnet
        controller.markTutorialCompleted();

        await controller.toggleTestnet(); // Switch to mainnet
        controller.markTutorialCompleted();

        // Assert - both networks should be marked as not first-time
        await controller.toggleTestnet(); // Switch to testnet
        expect(controller.isFirstTimeUserOnCurrentNetwork()).toBe(false);

        await controller.toggleTestnet(); // Switch to mainnet
        expect(controller.isFirstTimeUserOnCurrentNetwork()).toBe(false);

        // Final state check
        expect(controller.state.isFirstTimeUser).toEqual({
          testnet: false,
          mainnet: false,
        });
      });
    });

    it('should persist network-specific isFirstTimeUser state', async () => {
      // First controller instance - complete tutorial on testnet only
      await withController(
        async ({ controller }) => {
          controller.state.isTestnet = true;
          controller.markTutorialCompleted();
          expect(controller.state.isFirstTimeUser.testnet).toBe(false);
          expect(controller.state.isFirstTimeUser.mainnet).toBe(true);
        },
        { state: { isTestnet: true } },
      );

      // Second controller instance should have persisted state
      await withController(
        async ({ controller }) => {
          // Assert - state should be persisted
          expect(controller.state.isFirstTimeUser).toEqual({
            testnet: false,
            mainnet: true,
          });
        },
        {
          // Use same state to simulate persistence
          state: {
            isFirstTimeUser: {
              testnet: false,
              mainnet: true,
            },
          },
        },
      );
    });
  });
});
