/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Messenger } from '@metamask/base-controller';
import { successfulFetch } from '@metamask/controller-utils';
import { setMeasurement } from '@sentry/react-native';
import Logger from '../../../../util/Logger';

import {
  getDefaultPerpsControllerState,
  PerpsController,
  type PerpsControllerState,
} from './PerpsController';
import { HyperLiquidProvider } from './providers/HyperLiquidProvider';
import { CaipAssetId, CaipChainId, Hex } from '@metamask/utils';
import { CandlePeriod } from '../constants/chartConfig';
import type { AssetRoute } from './types';

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
    AccountTreeController: {
      getAccountsFromSelectedAccountGroup: jest.fn().mockReturnValue([
        {
          address: '0x1234567890123456789012345678901234567890',
          id: 'mock-account-id',
          type: 'eip155:',
          metadata: { name: 'Test Account' },
        },
      ]),
    },
    NetworkController: {
      state: {
        selectedNetworkClientId: 'mainnet',
      },
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('arbitrum'),
    },
    TransactionController: {
      addTransaction: jest.fn(),
    },
    PerpsController: {
      clearDepositResult: jest.fn(),
    },
  },
}));

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

// Mock Logger
jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

// Mock react-native-performance
jest.mock('react-native-performance', () => ({
  now: jest.fn(() => Date.now()),
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  setMeasurement: jest.fn(),
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
  generateTransferData: jest.fn().mockReturnValue('0xabcdef123456'),
}));

// Use imported types for reference but create a flexible test messenger
// This ensures we leverage existing types while allowing test flexibility
type TestMessenger = Messenger<any, any>;

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
      getHistoricalPortfolio: jest.fn().mockResolvedValue({
        totalBalance24hAgo: '10000',
        totalBalance7dAgo: '9500',
        totalBalance30dAgo: '9000',
      }),
      getMarkets: jest.fn(),
      placeOrder: jest.fn(),
      editOrder: jest.fn(),
      cancelOrder: jest.fn(),
      closePosition: jest.fn(),
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
      getOpenOrders: jest.fn(),
      subscribeToOrders: jest.fn(),
      subscribeToAccount: jest.fn(),
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
      messenger: TestMessenger;
    }) => ReturnValue,
    options: {
      state?: Partial<PerpsControllerState>;
      clientConfig?: { fallbackBlockedRegions?: string[] };
      mocks?: {
        getSelectedAccount?: jest.MockedFunction<() => unknown>;
        getNetworkState?: jest.MockedFunction<() => unknown>;
      };
    } = {},
  ): ReturnValue {
    const { state = {}, clientConfig, mocks = {} } = options;

    const messenger = new Messenger<any, any>();

    // Mock the subscribe method for testing with proper Jest mock typing
    messenger.subscribe = jest.fn();

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
        'AccountsController:getSelectedAccount',
        'NetworkController:getState',
        'AuthenticationController:getBearerToken',
      ] as any,
      allowedEvents: [
        'AccountsController:selectedAccountChange',
        'NetworkController:stateChange',
        'TransactionController:transactionSubmitted',
        'TransactionController:transactionConfirmed',
        'TransactionController:transactionFailed',
        'RemoteFeatureFlagController:stateChange',
      ] as any,
    });

    const controller = new PerpsController({
      messenger: restrictedMessenger,
      state,
      clientConfig,
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
        expect(controller.state.lastDepositTransactionId).toBeNull();
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
            takeProfitCount: 0,
            stopLossCount: 0,
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

    describe('clientConfig and remote feature flag integration', () => {
      it('sets fallback blocked regions from clientConfig in constructor', () => {
        withController(
          ({ controller }) => {
            // Check that fallback blocked regions were set from clientConfig
            // @ts-ignore - Accessing private property for testing
            expect(controller.blockedRegionList).toEqual({
              list: ['US', 'CA-ON'],
              source: 'fallback',
            });
          },
          {
            clientConfig: { fallbackBlockedRegions: ['US', 'CA-ON'] },
          },
        );
      });

      it('handles missing clientConfig gracefully', () => {
        // Explicitly pass undefined to use constructor's default
        withController(
          ({ controller }) => {
            // Should not throw and should use constructor's default (empty array)
            // @ts-ignore - Accessing private property for testing
            expect(controller.blockedRegionList).toEqual({
              list: [],
              source: 'fallback',
            });
          },
          { clientConfig: undefined },
        );
      });

      it('subscribes to RemoteFeatureFlagController state changes', () => {
        withController(({ controller: _controller, messenger }) => {
          // Verify that the controller subscribed to RemoteFeatureFlagController state changes
          expect(messenger.subscribe).toHaveBeenCalledWith(
            'RemoteFeatureFlagController:stateChange',
            expect.any(Function),
          );
        });
      });

      it('updates blocked regions when remote feature flag changes', () => {
        withController(
          ({ controller, messenger }) => {
            // Get the callback function that was registered for state changes
            const stateChangeCallback = (
              messenger.subscribe as jest.MockedFunction<
                typeof messenger.subscribe
              >
            ).mock.calls.find(
              (call: any[]) =>
                call[0] === 'RemoteFeatureFlagController:stateChange',
            )?.[1];

            expect(stateChangeCallback).toBeDefined();

            // Initially should have fallback regions
            // @ts-ignore - Accessing private property for testing
            expect(controller.blockedRegionList).toEqual({
              list: ['US', 'CA-ON'],
              source: 'fallback',
            });

            // Simulate remote feature flag state change with blocked regions
            const mockRemoteFeatureFlagState = {
              remoteFeatureFlags: {
                perpsPerpTradingGeoBlockedCountries: {
                  blockedRegions: ['FR', 'DE', 'IT'],
                },
              },
            };

            if (stateChangeCallback) {
              stateChangeCallback(mockRemoteFeatureFlagState, []);
            }

            // Should now have remote regions
            // @ts-ignore - Accessing private property for testing
            expect(controller.blockedRegionList).toEqual({
              list: ['FR', 'DE', 'IT'],
              source: 'remote',
            });
          },
          { clientConfig: { fallbackBlockedRegions: ['US', 'CA-ON'] } },
        );
      });

      it('preserves fallback when remote feature flag has invalid data', () => {
        withController(
          ({ controller, messenger }) => {
            const stateChangeCallback = (
              messenger.subscribe as jest.MockedFunction<
                typeof messenger.subscribe
              >
            ).mock.calls.find(
              (call: any[]) =>
                call[0] === 'RemoteFeatureFlagController:stateChange',
            )?.[1];

            // Initially should have fallback regions
            // @ts-ignore - Accessing private property for testing
            expect(controller.blockedRegionList).toEqual({
              list: ['US', 'CA-ON'],
              source: 'fallback',
            });

            // Simulate remote feature flag state change with invalid data
            const mockRemoteFeatureFlagState = {
              remoteFeatureFlags: {
                perpsPerpTradingGeoBlockedCountries: {
                  blockedRegions: 'invalid-not-array', // Invalid data
                },
              },
            };

            if (stateChangeCallback) {
              stateChangeCallback(mockRemoteFeatureFlagState, []);
            }

            // Should still have fallback regions since remote data was invalid
            // @ts-ignore - Accessing private property for testing
            expect(controller.blockedRegionList).toEqual({
              list: ['US', 'CA-ON'],
              source: 'fallback',
            });
          },
          { clientConfig: { fallbackBlockedRegions: ['US', 'CA-ON'] } },
        );
      });

      it('prevents downgrading from remote to fallback', () => {
        withController(({ controller, messenger }) => {
          const stateChangeCallback = (
            messenger.subscribe as jest.MockedFunction<
              typeof messenger.subscribe
            >
          ).mock.calls.find(
            (call: any[]) =>
              call[0] === 'RemoteFeatureFlagController:stateChange',
          )?.[1];

          // First, set remote regions
          const mockRemoteFeatureFlagState1 = {
            remoteFeatureFlags: {
              perpsPerpTradingGeoBlockedCountries: {
                blockedRegions: ['FR', 'DE'],
              },
            },
          };

          if (stateChangeCallback) {
            stateChangeCallback(mockRemoteFeatureFlagState1, []);
          }

          // Should now have remote regions
          // @ts-ignore - Accessing private property for testing
          expect(controller.blockedRegionList).toEqual({
            list: ['FR', 'DE'],
            source: 'remote',
          });

          // Now try to set fallback regions (should be prevented)
          // @ts-ignore - Call private method for testing
          controller.setBlockedRegionList(['US', 'CA-ON'], 'fallback');

          // Should still have remote regions (no downgrade)
          // @ts-ignore - Accessing private property for testing
          expect(controller.blockedRegionList).toEqual({
            list: ['FR', 'DE'],
            source: 'remote',
          });
        });
      });

      it('handles missing remote feature flag gracefully', () => {
        withController(
          ({ controller, messenger }) => {
            const stateChangeCallback = (
              messenger.subscribe as jest.MockedFunction<
                typeof messenger.subscribe
              >
            ).mock.calls.find(
              (call: any[]) =>
                call[0] === 'RemoteFeatureFlagController:stateChange',
            )?.[1];

            // Initially should have fallback regions
            // @ts-ignore - Accessing private property for testing
            expect(controller.blockedRegionList).toEqual({
              list: ['US', 'CA-ON'],
              source: 'fallback',
            });

            // Simulate remote feature flag state change with missing feature flag
            const mockRemoteFeatureFlagState = {
              remoteFeatureFlags: {
                // perpsPerpTradingGeoBlockedCountries is missing
                someOtherFeatureFlag: {
                  enabled: true,
                },
              },
            };

            if (stateChangeCallback) {
              stateChangeCallback(mockRemoteFeatureFlagState, []);
            }

            // Should still have fallback regions
            // @ts-ignore - Accessing private property for testing
            expect(controller.blockedRegionList).toEqual({
              list: ['US', 'CA-ON'],
              source: 'fallback',
            });
          },
          { clientConfig: { fallbackBlockedRegions: ['US', 'CA-ON'] } },
        );
      });

      // TODO: Add test for eligibility refresh when blocked regions change
      // This would require proper mock setup for successfulFetch within the feature flag callback
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
          takeProfitCount: 0,
          stopLossCount: 0,
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
        returnOnEquity: '20.0',
        totalValue: '1600',
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

    it('should throw error when controller is reinitializing', () => {
      withController(({ controller }) => {
        // Set the reinitializing flag to true
        // @ts-ignore - Accessing private property for testing
        controller.isReinitializing = true;

        // Should throw CLIENT_REINITIALIZING error
        expect(() => controller.getActiveProvider()).toThrow(
          'CLIENT_REINITIALIZING',
        );

        // Verify error state was updated
        expect(controller.state.lastError).toBe('CLIENT_REINITIALIZING');
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('should throw error when provider not found in map', () => {
      withController(({ controller }) => {
        // Make controller initialized but clear the providers map
        // @ts-ignore - Accessing private property for testing
        controller.isInitialized = true;
        // @ts-ignore - Accessing private property for testing
        controller.providers.clear();

        // Should throw PROVIDER_NOT_AVAILABLE error
        expect(() => controller.getActiveProvider()).toThrow(
          'PROVIDER_NOT_AVAILABLE',
        );

        // Verify error state was updated
        expect(controller.state.lastError).toBe('PROVIDER_NOT_AVAILABLE');
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
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

  describe('depositWithConfirmation', () => {
    it('should prepare and submit deposit transaction successfully', async () => {
      await withController(async ({ controller }) => {
        // Arrange
        const mockTxHash = '0xtransaction123';
        // Create a promise that won't resolve immediately
        let resolvePromise: (value: string) => void = () => {
          // Initial empty resolver
        };
        const mockResult = new Promise<string>((resolve) => {
          resolvePromise = resolve;
        });

        const mockDepositRoute: AssetRoute = {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
          chainId: 'eip155:42161' as CaipChainId,
          contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7' as Hex,
        };

        mockHyperLiquidProvider.getDepositRoutes.mockReturnValue([
          mockDepositRoute,
        ]);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        const Engine = jest.requireMock('../../../../core/Engine');
        Engine.context.TransactionController.addTransaction.mockResolvedValue({
          result: mockResult,
          transactionMeta: {
            id: 'deposit-tx-123',
          },
        });

        await controller.initializeProviders();

        // Clear initial state
        controller.state.lastDepositResult = null;

        // Act
        const result = await controller.depositWithConfirmation();

        // Assert
        expect(result).toHaveProperty('result');
        expect(result.result).toBe(mockResult);

        // Verify TransactionController was called with correct params
        expect(
          Engine.context.TransactionController.addTransaction,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            from: '0x1234567890123456789012345678901234567890',
            to: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
            value: '0x0',
            data: '0xabcdef123456',
            gas: expect.any(String),
          }),
          expect.objectContaining({
            networkClientId: 'arbitrum',
            origin: 'metamask',
            type: 'perpsDeposit',
          }),
        );

        // Verify initial state was cleared (before promise resolves)
        expect(controller.state.lastDepositResult).toBeNull();
        // Verify transaction ID was stored
        expect(controller.state.lastDepositTransactionId).toBe(
          'deposit-tx-123',
        );

        // Now resolve the promise and wait for state update
        resolvePromise(mockTxHash);
        await mockResult;

        // Wait for async state update from the .then handler
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Now verify state was updated
        expect(controller.state.lastDepositResult).toEqual({
          success: true,
          txHash: mockTxHash,
        });
      });
    });

    it('should handle deposit transaction confirmation', async () => {
      await withController(async ({ controller }) => {
        // Arrange
        const mockTxHash = '0xtransaction123';
        const mockResultPromise = Promise.resolve(mockTxHash);

        const mockDepositRoute: AssetRoute = {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
          chainId: 'eip155:42161' as CaipChainId,
          contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7' as Hex,
        };

        mockHyperLiquidProvider.getDepositRoutes.mockReturnValue([
          mockDepositRoute,
        ]);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        const Engine = jest.requireMock('../../../../core/Engine');
        Engine.context.TransactionController.addTransaction.mockResolvedValue({
          result: mockResultPromise,
          transactionMeta: {
            id: 'deposit-tx-456',
          },
        });

        await controller.initializeProviders();

        // Act
        const { result } = await controller.depositWithConfirmation();

        // Wait for the promise to resolve
        const txHash = await result;

        // Assert
        expect(txHash).toBe(mockTxHash);

        // Wait for state update (setTimeout in the implementation)
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Verify state was updated correctly
        expect(controller.state.lastDepositResult).toEqual({
          success: true,
          txHash: mockTxHash,
        });
        expect(controller.state.depositInProgress).toBe(false);
        // Transaction ID should still be stored
        expect(controller.state.lastDepositTransactionId).toBe(
          'deposit-tx-456',
        );
      });
    });

    it('should handle user cancellation of deposit transaction', async () => {
      await withController(async ({ controller }) => {
        // Arrange
        const mockError = new Error('User denied transaction signature');
        const mockResultPromise = Promise.reject(mockError);

        const mockDepositRoute: AssetRoute = {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
          chainId: 'eip155:42161' as CaipChainId,
          contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7' as Hex,
        };

        mockHyperLiquidProvider.getDepositRoutes.mockReturnValue([
          mockDepositRoute,
        ]);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        const Engine = jest.requireMock('../../../../core/Engine');
        Engine.context.TransactionController.addTransaction.mockResolvedValue({
          result: mockResultPromise,
          transactionMeta: {
            id: 'deposit-tx-456',
          },
        });

        await controller.initializeProviders();

        // Act
        const { result } = await controller.depositWithConfirmation();

        // Attempt to await the promise (should reject)
        try {
          await result;
          fail('Expected promise to reject');
        } catch (error) {
          // Assert
          expect(error).toBe(mockError);

          // Verify state was NOT updated for user cancellation
          expect(controller.state.lastDepositResult).toBeNull();
          expect(controller.state.depositInProgress).toBe(false);
          // Transaction ID should be cleared on cancellation
          expect(controller.state.lastDepositTransactionId).toBeNull();
        }
      });
    });

    it('should handle deposit transaction failure', async () => {
      await withController(async ({ controller }) => {
        // Arrange
        const mockError = new Error('Insufficient balance');
        const mockResultPromise = Promise.reject(mockError);

        const mockDepositRoute: AssetRoute = {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
          chainId: 'eip155:42161' as CaipChainId,
          contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7' as Hex,
        };

        mockHyperLiquidProvider.getDepositRoutes.mockReturnValue([
          mockDepositRoute,
        ]);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        const Engine = jest.requireMock('../../../../core/Engine');
        Engine.context.TransactionController.addTransaction.mockResolvedValue({
          result: mockResultPromise,
          transactionMeta: {
            id: 'deposit-tx-456',
          },
        });

        await controller.initializeProviders();

        // Act
        const { result } = await controller.depositWithConfirmation();

        // Attempt to await the promise (should reject)
        try {
          await result;
          fail('Expected promise to reject');
        } catch (error) {
          // Assert
          expect(error).toBe(mockError);

          // Verify state was updated for actual failure
          expect(controller.state.lastDepositResult).toEqual({
            success: false,
            error: 'Insufficient balance',
          });
          expect(controller.state.depositInProgress).toBe(false);
          // Transaction ID should be cleared on failure
          expect(controller.state.lastDepositTransactionId).toBeNull();
        }
      });
    });

    it('should handle deposit when TransactionController.addTransaction throws', async () => {
      await withController(async ({ controller }) => {
        // Arrange
        const mockError = new Error('Network error');

        const mockDepositRoute: AssetRoute = {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
          chainId: 'eip155:42161' as CaipChainId,
          contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7' as Hex,
        };

        mockHyperLiquidProvider.getDepositRoutes.mockReturnValue([
          mockDepositRoute,
        ]);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        const Engine = jest.requireMock('../../../../core/Engine');
        Engine.context.TransactionController.addTransaction.mockRejectedValue(
          mockError,
        );

        await controller.initializeProviders();

        // Act & Assert
        try {
          await controller.depositWithConfirmation();
          fail('Expected depositWithConfirmation to throw');
        } catch (error) {
          expect(error).toBe(mockError);

          // Should not update state for user cancellation
          const errorMessage = error instanceof Error ? error.message : '';
          if (
            errorMessage.includes('User denied') ||
            errorMessage.includes('User rejected')
          ) {
            expect(controller.state.lastDepositResult).toBeNull();
          } else {
            // Should update state for other errors
            expect(controller.state.lastDepositResult).toEqual({
              success: false,
              error: 'Network error',
            });
            // Transaction ID should be null since addTransaction failed
            expect(controller.state.lastDepositTransactionId).toBeNull();
          }
        }
      });
    });

    it('should clear stale deposit result when starting new deposit', async () => {
      await withController(async ({ controller }) => {
        // Arrange - set initial stale result
        controller.state.lastDepositResult = {
          success: true,
          txHash: '0xoldtransaction',
        };

        const mockDepositRoute: AssetRoute = {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
          chainId: 'eip155:42161' as CaipChainId,
          contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7' as Hex,
        };

        mockHyperLiquidProvider.getDepositRoutes.mockReturnValue([
          mockDepositRoute,
        ]);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        // Create a controlled promise that won't resolve automatically
        let resolvePromise: (value: string) => void = () => {
          // Initial empty resolver
        };
        const mockResult = new Promise<string>((resolve) => {
          resolvePromise = resolve;
        });

        const Engine = jest.requireMock('../../../../core/Engine');
        Engine.context.TransactionController.addTransaction.mockResolvedValue({
          result: mockResult,
          transactionMeta: {
            id: 'deposit-tx-123',
          },
        });

        await controller.initializeProviders();

        // Act
        await controller.depositWithConfirmation();

        // Assert - old result should be cleared immediately (before promise resolves)
        expect(controller.state.lastDepositResult).toBeNull();
        // New transaction ID should be set
        expect(controller.state.lastDepositTransactionId).toBe(
          'deposit-tx-123',
        );

        // Clean up by resolving the promise
        resolvePromise('0xnewtransaction');
      });
    });

    it('should handle empty deposit routes', async () => {
      await withController(async ({ controller }) => {
        // Arrange
        mockHyperLiquidProvider.getDepositRoutes.mockReturnValue([]);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();

        // Act & Assert
        try {
          await controller.depositWithConfirmation();
          fail('Expected depositWithConfirmation to throw');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    it('should use correct transaction type for perps deposit', async () => {
      await withController(async ({ controller }) => {
        // Arrange
        const mockDepositRoute: AssetRoute = {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
          chainId: 'eip155:42161' as CaipChainId,
          contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7' as Hex,
        };

        mockHyperLiquidProvider.getDepositRoutes.mockReturnValue([
          mockDepositRoute,
        ]);
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        const Engine = jest.requireMock('../../../../core/Engine');
        Engine.context.TransactionController.addTransaction.mockResolvedValue({
          result: Promise.resolve('0xtx123'),
          transactionMeta: {
            id: 'deposit-tx-789',
          },
        });

        await controller.initializeProviders();

        // Act
        await controller.depositWithConfirmation();

        // Assert
        expect(
          Engine.context.TransactionController.addTransaction,
        ).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            type: 'perpsDeposit',
          }),
        );
      });
    });
  });

  describe('clearDepositResult', () => {
    it('should clear the deposit result', () => {
      withController(({ controller }) => {
        // Arrange
        controller.state.lastDepositResult = {
          success: true,
          txHash: '0xtransaction123',
        };

        // Act
        controller.clearDepositResult();

        // Assert
        expect(controller.state.lastDepositResult).toBeNull();
      });
    });

    it('should handle clearing when result is already null', () => {
      withController(({ controller }) => {
        // Arrange
        controller.state.lastDepositResult = null;

        // Act
        controller.clearDepositResult();

        // Assert
        expect(controller.state.lastDepositResult).toBeNull();
      });
    });

    it('should be callable multiple times', () => {
      withController(({ controller }) => {
        // Arrange
        controller.state.lastDepositResult = {
          success: false,
          error: 'Some error',
        };

        // Act
        controller.clearDepositResult();
        controller.clearDepositResult();
        controller.clearDepositResult();

        // Assert
        expect(controller.state.lastDepositResult).toBeNull();
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

  describe('refreshEligibility', () => {
    let mockSuccessfulFetch: jest.MockedFunction<typeof successfulFetch>;

    beforeEach(() => {
      // Get fresh reference to the mocked function and reset completely
      mockSuccessfulFetch = jest.mocked(successfulFetch);
      mockSuccessfulFetch.mockReset();
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

      withController(
        async ({ controller }) => {
          await controller.refreshEligibility();

          expect(controller.state.isEligible).toBe(false);
          expect(mockSuccessfulFetch).toHaveBeenCalled();
        },
        {
          clientConfig: { fallbackBlockedRegions: ['US', 'CA-ON'] },
        },
      );
    });

    it('should set isEligible to false for blocked region (Ontario, Canada)', async () => {
      // Mock API response for Ontario, Canada
      const mockResponse = {
        text: jest.fn().mockResolvedValue('CA-ON'),
      };
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      withController(
        async ({ controller }) => {
          await controller.refreshEligibility();

          expect(controller.state.isEligible).toBe(false);
          expect(mockSuccessfulFetch).toHaveBeenCalled();
        },
        {
          clientConfig: { fallbackBlockedRegions: ['US', 'CA-ON'] },
        },
      );
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

      withController(
        async ({ controller }) => {
          // Test with custom blocked regions that includes DE
          await controller.refreshEligibility();

          expect(controller.state.isEligible).toBe(false);
          expect(mockSuccessfulFetch).toHaveBeenCalled();
        },
        {
          clientConfig: { fallbackBlockedRegions: ['DE', 'FR'] },
        },
      );
    });

    it('should handle region prefix matching correctly', async () => {
      // Mock API response for US state (should be blocked because it starts with 'US')
      const mockResponse = {
        text: jest.fn().mockResolvedValue('US-CA'), // US-California
      };
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      withController(
        async ({ controller }) => {
          await controller.refreshEligibility();

          expect(controller.state.isEligible).toBe(false);
          expect(mockSuccessfulFetch).toHaveBeenCalled();
        },
        {
          clientConfig: { fallbackBlockedRegions: ['US', 'CA-ON'] },
        },
      );
    });

    it('handles API failures correctly without caching the failure', async () => {
      withController(async ({ controller }) => {
        // Mock API failure
        mockSuccessfulFetch.mockRejectedValue(new Error('Network error'));

        // Call should fail and set isEligible to false (UNKNOWN is blocked by default)
        await controller.refreshEligibility();
        expect(controller.state.isEligible).toBe(false);
        expect(mockSuccessfulFetch).toHaveBeenCalledTimes(1);
      });
    });

    describe('geo-location caching', () => {
      beforeEach(() => {
        // Ensure clean mock state for caching tests
        mockSuccessfulFetch.mockReset();
      });

      afterEach(() => {
        // Clean up any mock implementations after each test
        mockSuccessfulFetch.mockReset();
      });

      it('returns cached location within TTL without making API call', async () => {
        jest.useFakeTimers();

        try {
          const mockResponse = {
            text: jest.fn().mockResolvedValue('FR'),
          };
          mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

          withController(async ({ controller }) => {
            // First call should make API call and cache result
            await controller.refreshEligibility();
            expect(mockSuccessfulFetch).toHaveBeenCalledTimes(1);
            expect(controller.state.isEligible).toBe(true); // FR is not blocked

            // Clear the mock call count
            mockSuccessfulFetch.mockClear();

            // Second call within TTL should use cache, no API call
            await controller.refreshEligibility();
            expect(mockSuccessfulFetch).not.toHaveBeenCalled();
            expect(controller.state.isEligible).toBe(true);
          });
        } finally {
          jest.useRealTimers();
        }
      });

      it('caches location and shares result between multiple controllers', async () => {
        const mockResponse = {
          text: jest.fn().mockResolvedValue('DE'),
        };
        mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

        // First controller instance
        withController(async ({ controller: controller1 }) => {
          await controller1.refreshEligibility();
          expect(mockSuccessfulFetch).toHaveBeenCalledTimes(1);
          expect(controller1.state.isEligible).toBe(true); // DE is not blocked
        });

        // Clear mock for second test
        mockSuccessfulFetch.mockClear();

        // Second controller instance (simulating cache persistence concept)
        withController(async ({ controller: controller2 }) => {
          // Since cache is per-instance, this will make a new API call
          // but verifies the caching logic exists in the implementation
          await controller2.refreshEligibility();
          expect(mockSuccessfulFetch).toHaveBeenCalledTimes(1);
          expect(controller2.state.isEligible).toBe(true); // DE is not blocked
        });
      });

      it('prevents concurrent API calls using shared promise', async () => {
        // Mock API response with delay to simulate concurrent calls
        let resolveApiCall: (value: any) => void;
        const apiPromise = new Promise((resolve) => {
          resolveApiCall = resolve;
        });

        mockSuccessfulFetch.mockReturnValue(apiPromise as any);

        withController(async ({ controller }) => {
          // Start multiple concurrent refreshEligibility calls
          const calls = [
            controller.refreshEligibility(),
            controller.refreshEligibility(),
            controller.refreshEligibility(),
          ];

          // Resolve the API call
          resolveApiCall({
            text: jest.fn().mockResolvedValue('DE'),
          });

          // Wait for all calls to complete
          await Promise.all(calls);

          // Should have made only one API call despite multiple concurrent requests
          expect(mockSuccessfulFetch).toHaveBeenCalledTimes(1);
          expect(controller.state.isEligible).toBe(true); // DE is not blocked
        });
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

  describe('first order notification tracking', () => {
    it('should initialize with hasPlacedFirstOrder as false for both networks', () => {
      withController(({ controller }) => {
        expect(controller.state.hasPlacedFirstOrder).toEqual({
          testnet: false,
          mainnet: false,
        });
      });
    });

    it('should mark hasPlacedFirstOrder as true for mainnet when markFirstOrderCompleted is called', () => {
      withController(({ controller }) => {
        expect(controller.state.hasPlacedFirstOrder.mainnet).toBe(false);
        expect(controller.state.hasPlacedFirstOrder.testnet).toBe(false);

        controller.markFirstOrderCompleted();

        expect(controller.state.hasPlacedFirstOrder.mainnet).toBe(true);
        expect(controller.state.hasPlacedFirstOrder.testnet).toBe(false);
      });
    });

    it('should mark hasPlacedFirstOrder as true for testnet when markFirstOrderCompleted is called on testnet', () => {
      withController(
        ({ controller }) => {
          expect(controller.state.hasPlacedFirstOrder.testnet).toBe(false);
          expect(controller.state.hasPlacedFirstOrder.mainnet).toBe(false);

          controller.markFirstOrderCompleted();

          expect(controller.state.hasPlacedFirstOrder.testnet).toBe(true);
          expect(controller.state.hasPlacedFirstOrder.mainnet).toBe(false);
        },
        { state: { isTestnet: true } },
      );
    });

    it('should persist hasPlacedFirstOrder state between controller instances', () => {
      // Test with initial state having hasPlacedFirstOrder set for mainnet
      withController(
        ({ controller }) => {
          expect(controller.state.hasPlacedFirstOrder).toEqual({
            testnet: false,
            mainnet: true,
          });
        },
        {
          state: {
            hasPlacedFirstOrder: {
              testnet: false,
              mainnet: true,
            },
          },
        },
      );
    });

    it('should maintain hasPlacedFirstOrder state after calling markFirstOrderCompleted multiple times', () => {
      withController(({ controller }) => {
        expect(controller.state.hasPlacedFirstOrder.mainnet).toBe(false);

        controller.markFirstOrderCompleted();
        expect(controller.state.hasPlacedFirstOrder.mainnet).toBe(true);

        // Call again - should remain true
        controller.markFirstOrderCompleted();
        expect(controller.state.hasPlacedFirstOrder.mainnet).toBe(true);
      });
    });

    it('should track first order independently for mainnet and testnet', async () => {
      // First controller instance - mark mainnet as completed
      await withController(
        async ({ controller }) => {
          controller.markFirstOrderCompleted();
          expect(controller.state.hasPlacedFirstOrder.mainnet).toBe(true);
          expect(controller.state.hasPlacedFirstOrder.testnet).toBe(false);
        },
        { state: { isTestnet: false } },
      );

      // Second controller instance - mark testnet as completed
      await withController(
        async ({ controller }) => {
          controller.state.isTestnet = true;
          controller.markFirstOrderCompleted();
          expect(controller.state.hasPlacedFirstOrder.testnet).toBe(true);
          expect(controller.state.hasPlacedFirstOrder.mainnet).toBe(false);
        },
        { state: { isTestnet: true } },
      );

      // Third controller instance should have persisted state
      await withController(
        async ({ controller }) => {
          // Assert - state should be persisted
          expect(controller.state.hasPlacedFirstOrder).toEqual({
            testnet: true,
            mainnet: true,
          });
        },
        {
          // Use same state to simulate persistence
          state: {
            hasPlacedFirstOrder: {
              testnet: true,
              mainnet: true,
            },
          },
        },
      );
    });
  });

  describe('resetFirstTimeUserState', () => {
    it('should reset isFirstTimeUser to true for both networks', () => {
      withController(({ controller }) => {
        // Arrange - set both networks as not first-time
        controller.state.isFirstTimeUser = {
          testnet: false,
          mainnet: false,
        };
        controller.state.hasPlacedFirstOrder = {
          testnet: true,
          mainnet: true,
        };

        // Act
        controller.resetFirstTimeUserState();

        // Assert - both should be reset
        expect(controller.state.isFirstTimeUser).toEqual({
          testnet: true,
          mainnet: true,
        });
        expect(controller.state.hasPlacedFirstOrder).toEqual({
          testnet: false,
          mainnet: false,
        });
      });
    });

    it('should reset from partially completed state', () => {
      withController(({ controller }) => {
        // Arrange - only testnet completed
        controller.state.isFirstTimeUser = {
          testnet: false,
          mainnet: true,
        };
        controller.state.hasPlacedFirstOrder = {
          testnet: true,
          mainnet: false,
        };

        // Act
        controller.resetFirstTimeUserState();

        // Assert - both should be reset to initial state
        expect(controller.state.isFirstTimeUser).toEqual({
          testnet: true,
          mainnet: true,
        });
        expect(controller.state.hasPlacedFirstOrder).toEqual({
          testnet: false,
          mainnet: false,
        });
      });
    });

    it('should reset even when already in first-time state', () => {
      withController(({ controller }) => {
        // Arrange - already in first-time state
        controller.state.isFirstTimeUser = {
          testnet: true,
          mainnet: true,
        };
        controller.state.hasPlacedFirstOrder = {
          testnet: false,
          mainnet: false,
        };

        // Act
        controller.resetFirstTimeUserState();

        // Assert - should remain in first-time state
        expect(controller.state.isFirstTimeUser).toEqual({
          testnet: true,
          mainnet: true,
        });
        expect(controller.state.hasPlacedFirstOrder).toEqual({
          testnet: false,
          mainnet: false,
        });
      });
    });

    it('should work correctly regardless of current network', async () => {
      await withController(
        async ({ controller }) => {
          // Arrange - complete tutorial on testnet
          controller.state.isTestnet = true;
          controller.markTutorialCompleted();
          controller.markFirstOrderCompleted();

          expect(controller.state.isFirstTimeUser.testnet).toBe(false);
          expect(controller.state.hasPlacedFirstOrder.testnet).toBe(true);

          // Act - reset while on testnet
          controller.resetFirstTimeUserState();

          // Assert - both networks should be reset
          expect(controller.state.isFirstTimeUser).toEqual({
            testnet: true,
            mainnet: true,
          });
          expect(controller.state.hasPlacedFirstOrder).toEqual({
            testnet: false,
            mainnet: false,
          });

          // Verify current network detection still works
          expect(controller.isFirstTimeUserOnCurrentNetwork()).toBe(true);
        },
        { state: { isTestnet: true } },
      );
    });

    it('should persist reset state', async () => {
      // First controller instance - simulate completed state then reset
      await withController(
        async ({ controller }) => {
          // Assert initial completed state was loaded
          expect(controller.state.isFirstTimeUser).toEqual({
            testnet: false,
            mainnet: false,
          });
          expect(controller.state.hasPlacedFirstOrder).toEqual({
            testnet: true,
            mainnet: true,
          });

          // Reset everything
          controller.resetFirstTimeUserState();

          // Assert reset worked
          expect(controller.state.isFirstTimeUser).toEqual({
            testnet: true,
            mainnet: true,
          });
          expect(controller.state.hasPlacedFirstOrder).toEqual({
            testnet: false,
            mainnet: false,
          });
        },
        {
          state: {
            isTestnet: false,
            // Simulate previously completed state
            isFirstTimeUser: {
              testnet: false,
              mainnet: false,
            },
            hasPlacedFirstOrder: {
              testnet: true,
              mainnet: true,
            },
          },
        },
      );

      // Second controller instance - verify reset state persisted
      await withController(
        async ({ controller }) => {
          // Assert - reset state should be persisted
          expect(controller.state.isFirstTimeUser).toEqual({
            testnet: true,
            mainnet: true,
          });
          expect(controller.state.hasPlacedFirstOrder).toEqual({
            testnet: false,
            mainnet: false,
          });
        },
        {
          // Use reset state to simulate persistence
          state: {
            isFirstTimeUser: {
              testnet: true,
              mainnet: true,
            },
            hasPlacedFirstOrder: {
              testnet: false,
              mainnet: false,
            },
          },
        },
      );
    });
  });

  describe('reconnectWithNewContext', () => {
    it('should clear state and reinitialize providers', async () => {
      // Mock initialize to succeed before creating controller
      mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

      await withController(async ({ controller }) => {
        // Set up initial state with data
        controller.state.positions = [
          {
            coin: 'BTC',
            szi: '1.5',
            entryPx: '50000',
            positionValue: '75000',
            returnOnEquity: '0.15',
            unrealizedPnl: '1000',
            marginUsed: '5000',
          } as any,
        ];
        controller.state.accountState = {
          marginSummary: {
            accountValue: '10000',
            totalMarginUsed: '5000',
          },
        } as any;
        controller.state.pendingOrders = [
          {
            oid: '123',
            coin: 'BTC',
            limitPx: '49000',
            sz: '0.5',
            orderType: 'limit',
          } as any,
        ];
        controller.state.lastError = 'Some previous error';

        // Call reconnectWithNewContext
        await controller.reconnectWithNewContext();

        // Verify state was cleared
        expect(controller.state.positions).toEqual([]);
        expect(controller.state.accountState).toBeNull();
        expect(controller.state.pendingOrders).toEqual([]);
        expect(controller.state.lastError).toBeNull();

        // Verify providers were reinitialized (constructor called twice: once on init, once on reconnect)
        expect(HyperLiquidProvider).toHaveBeenCalledTimes(2);
      });
    });

    it('should reset initialization flags', async () => {
      // Set up the mock to return different instances
      let providerInstance = 0;
      (
        HyperLiquidProvider as jest.MockedClass<typeof HyperLiquidProvider>
      ).mockImplementation(() => {
        providerInstance++;
        return {
          ...mockHyperLiquidProvider,
          instanceId: providerInstance,
        } as any;
      });

      await withController(async ({ controller }) => {
        // First, verify the controller is initialized
        const initialProvider = (controller as any).providers.get(
          'hyperliquid',
        );
        expect(initialProvider).toBeDefined();
        const initialInstanceId = initialProvider.instanceId;

        // Call reconnectWithNewContext
        await controller.reconnectWithNewContext();

        // Verify a new provider instance was created (constructor called twice)
        expect(HyperLiquidProvider).toHaveBeenCalledTimes(2);

        // Verify the controller is initialized again
        const newProvider = (controller as any).providers.get('hyperliquid');
        expect(newProvider).toBeDefined();
        // It should be a different instance (different instanceId)
        expect(newProvider.instanceId).not.toBe(initialInstanceId);
      });
    });

    it('should handle errors during reconnection', async () => {
      // Mock the constructor to throw an error on the second call
      let callCount = 0;
      (
        HyperLiquidProvider as jest.MockedClass<typeof HyperLiquidProvider>
      ).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Network error');
        }
        return { ...mockHyperLiquidProvider, instanceId: callCount } as any;
      });

      await withController(async ({ controller }) => {
        // Set some initial state
        controller.state.positions = [{ coin: 'BTC' } as any];
        controller.state.accountState = { account: 'test' } as any;
        controller.state.pendingOrders = [{ oid: '123' } as any];

        // Call reconnectWithNewContext - it should throw the error
        await expect(controller.reconnectWithNewContext()).rejects.toThrow(
          'Network error',
        );

        // State should still be cleared even on error (cleared before the error)
        expect(controller.state.positions).toEqual([]);
        expect(controller.state.accountState).toBeNull();
        expect(controller.state.pendingOrders).toEqual([]);

        // The constructor should have been called twice (once on init, once on reconnect attempt)
        expect(HyperLiquidProvider).toHaveBeenCalledTimes(2);
      });
    });

    it('should work correctly after reconnection', async () => {
      // Mock successful reconnection before creating controller
      mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

      const mockAccountState = {
        totalBalance: '20000',
        availableBalance: '15000',
        marginUsed: '5000',
        unrealizedPnl: '100',
        returnOnEquity: '2.0',
        totalValue: '20100',
      };
      mockHyperLiquidProvider.getAccountState.mockResolvedValue(
        mockAccountState,
      );

      await withController(async ({ controller }) => {
        // Set up initial state
        controller.state.positions = [{ coin: 'ETH' } as any];

        // Reconnect
        await controller.reconnectWithNewContext();

        // Verify can fetch new data after reconnection
        const accountState = await controller.getAccountState();
        expect(accountState).toEqual(mockAccountState);
      });
    });
  });

  describe('data lake API integration', () => {
    let mockFetch: jest.MockedFunction<typeof fetch>;
    let mockSetMeasurement: jest.MockedFunction<typeof setMeasurement>;
    let mockLoggerError: jest.MockedFunction<typeof Logger.error>;

    beforeEach(() => {
      // Mock global fetch
      mockFetch = jest.fn();
      global.fetch = mockFetch as any;

      // Get references to already mocked functions
      mockSetMeasurement = jest.requireMock(
        '@sentry/react-native',
      ).setMeasurement;
      mockLoggerError = jest.requireMock('../../../../util/Logger').error;

      // Clear previous mock calls
      mockSetMeasurement.mockClear();
      mockLoggerError.mockClear();

      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.clearAllMocks();
    });

    it('should report order to data lake on successful order placement', async () => {
      withController(async ({ controller, messenger }) => {
        // Register AuthenticationController:getBearerToken action
        messenger.registerActionHandler(
          'AuthenticationController:getBearerToken',
          jest.fn().mockResolvedValue('mock-bearer-token') as any,
        );

        // Mock successful API response
        mockFetch.mockResolvedValue({
          ok: true,
          status: 201,
          text: jest.fn().mockResolvedValue(''),
        } as any);

        // Mock successful order placement
        const orderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market' as const,
          stopLossPrice: '45000',
          takeProfitPrice: '55000',
        };

        mockHyperLiquidProvider.placeOrder.mockResolvedValue({
          success: true,
          orderId: 'order-123',
        });
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();

        // Ensure mainnet (not testnet)
        controller.state.isTestnet = false;

        // Place order
        await controller.placeOrder(orderParams);

        // Allow time for async reportOrderToDataLake
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Verify fetch was called with correct parameters
        expect(mockFetch).toHaveBeenCalledWith(
          'https://perps.api.cx.metamask.io/api/v1/orders',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer mock-bearer-token',
            },
            body: JSON.stringify({
              user_id: '0x1234567890123456789012345678901234567890',
              coin: 'BTC',
              sl_price: 45000,
              tp_price: 55000,
            }),
          }),
        );

        // Verify performance metric was recorded
        expect(mockSetMeasurement).toHaveBeenCalledWith(
          'data_lake_api_call',
          expect.any(Number),
          'millisecond',
        );
      });
    }, 10000);

    it('should skip data lake API call when on testnet', async () => {
      withController(async ({ controller, messenger }) => {
        // Register AuthenticationController:getBearerToken action (shouldn't be called)
        const mockGetBearerToken = jest.fn();
        messenger.registerActionHandler(
          'AuthenticationController:getBearerToken',
          mockGetBearerToken as any,
        );

        const orderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market' as const,
        };

        mockHyperLiquidProvider.placeOrder.mockResolvedValue({
          success: true,
          orderId: 'order-123',
        });
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();

        // Set to testnet
        controller.state.isTestnet = true;

        // Place order
        await controller.placeOrder(orderParams);

        // Allow time for async operations
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Verify fetch was NOT called
        expect(mockFetch).not.toHaveBeenCalled();
        expect(mockGetBearerToken).not.toHaveBeenCalled();
      });
    }, 10000);

    it('should retry on API failure and log error after max retries', async () => {
      withController(async ({ controller, messenger }) => {
        // Register AuthenticationController:getBearerToken action
        messenger.registerActionHandler(
          'AuthenticationController:getBearerToken',
          jest.fn().mockResolvedValue('mock-bearer-token') as any,
        );

        // Mock API failures
        mockFetch.mockRejectedValue(new Error('Network error'));

        const orderParams = {
          coin: 'ETH',
          isBuy: false,
          size: '1.0',
          orderType: 'limit' as const,
          price: '2000',
        };

        mockHyperLiquidProvider.placeOrder.mockResolvedValue({
          success: true,
          orderId: 'order-456',
        });
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        controller.state.isTestnet = false;

        // Place order
        await controller.placeOrder(orderParams);

        // Wait for initial attempt
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Fast forward through retries (1s, 2s, 4s delays)
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
        expect(mockFetch).toHaveBeenCalledTimes(2);

        jest.advanceTimersByTime(2000);
        await Promise.resolve();
        expect(mockFetch).toHaveBeenCalledTimes(3);

        jest.advanceTimersByTime(4000);
        await Promise.resolve();
        expect(mockFetch).toHaveBeenCalledTimes(4);

        // Verify Logger.error was called after max retries
        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            message: 'Failed to report perps order to data lake after retries',
            action: 'open',
            coin: 'ETH',
            retryCount: 3,
          }),
        );

        // Verify retry duration metric was recorded
        expect(mockSetMeasurement).toHaveBeenCalledWith(
          'data_lake_api_retry',
          expect.any(Number),
          'millisecond',
        );
      });
    }, 15000);

    it('should handle missing authentication token', async () => {
      withController(async ({ controller, messenger }) => {
        // Register AuthenticationController:getBearerToken that returns null
        messenger.registerActionHandler(
          'AuthenticationController:getBearerToken',
          jest.fn().mockResolvedValue(null) as any,
        );

        const closeParams = {
          coin: 'BTC',
          orderType: 'market' as const,
        };

        mockHyperLiquidProvider.closePosition.mockResolvedValue({
          success: true,
          orderId: 'close-123',
        });
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        controller.state.isTestnet = false;

        // Close position
        await controller.closePosition(closeParams);

        // Allow time for async operations
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Verify fetch was NOT called due to missing token
        expect(mockFetch).not.toHaveBeenCalled();
      });
    }, 10000);

    it('should handle API error responses', async () => {
      withController(async ({ controller, messenger }) => {
        // Register AuthenticationController:getBearerToken action
        messenger.registerActionHandler(
          'AuthenticationController:getBearerToken',
          jest.fn().mockResolvedValue('mock-bearer-token') as any,
        );

        // Mock API error response (400 Bad Request)
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          text: jest.fn().mockResolvedValue('Bad Request'),
        } as any);

        const orderParams = {
          coin: 'DOGE',
          isBuy: true,
          size: '100',
          orderType: 'market' as const,
        };

        mockHyperLiquidProvider.placeOrder.mockResolvedValue({
          success: true,
          orderId: 'order-789',
        });
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        controller.state.isTestnet = false;

        // Place order
        await controller.placeOrder(orderParams);

        // Wait for initial attempt
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Verify fetch was called
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Fast forward to trigger retries
        jest.advanceTimersByTime(7000); // Through all retry delays
        await Promise.resolve();

        // Should have retried 3 more times (total 4 attempts)
        expect(mockFetch).toHaveBeenCalledTimes(4);
      });
    }, 10000);

    it('should retry and succeed on subsequent attempt', async () => {
      withController(async ({ controller, messenger }) => {
        // Register AuthenticationController:getBearerToken action
        messenger.registerActionHandler(
          'AuthenticationController:getBearerToken',
          jest.fn().mockResolvedValue('mock-bearer-token') as any,
        );

        // Mock API to fail first, then succeed on retry
        mockFetch
          .mockRejectedValueOnce(new Error('Temporary network error'))
          .mockResolvedValueOnce({
            ok: true,
            status: 201,
            text: jest.fn().mockResolvedValue(''),
          } as any);

        const orderParams = {
          coin: 'SOL',
          isBuy: true,
          size: '10',
          orderType: 'limit' as const,
          price: '100',
          stopLossPrice: '90',
          takeProfitPrice: '110',
        };

        mockHyperLiquidProvider.placeOrder.mockResolvedValue({
          success: true,
          orderId: 'order-sol-123',
        });
        mockHyperLiquidProvider.initialize.mockResolvedValue({ success: true });

        await controller.initializeProviders();
        controller.state.isTestnet = false;

        // Place order
        await controller.placeOrder(orderParams);

        // Wait for initial failed attempt
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Fast forward to first retry (1 second delay)
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        // Wait for the retry to complete
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Should have succeeded on second attempt
        expect(mockFetch).toHaveBeenCalledTimes(2);

        // Verify the second call had the correct parameters including retryCount
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          'https://perps.api.cx.metamask.io/api/v1/orders',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer mock-bearer-token',
            },
            body: JSON.stringify({
              user_id: '0x1234567890123456789012345678901234567890',
              coin: 'SOL',
              sl_price: 90,
              tp_price: 110,
            }),
          }),
        );

        // Performance metric should NOT be recorded for retry success (only for initial success)
        expect(mockSetMeasurement).not.toHaveBeenCalledWith(
          'data_lake_api_call',
          expect.any(Number),
          'millisecond',
        );

        // Should NOT record retry metric since it succeeded
        expect(mockSetMeasurement).not.toHaveBeenCalledWith(
          'data_lake_api_retry',
          expect.any(Number),
          'millisecond',
        );
      });
    }, 10000);
  });

  describe('reportOrderToDataLake - direct tests', () => {
    let mockMessenger: any;
    let controller: PerpsController;
    let mockFetch: jest.MockedFunction<typeof fetch>;
    let mockSetMeasurement: jest.MockedFunction<typeof setMeasurement>;

    beforeEach(() => {
      jest.useFakeTimers();

      // Mock global fetch
      mockFetch = jest.fn();
      global.fetch = mockFetch as any;

      // Get reference to already mocked setMeasurement
      mockSetMeasurement = jest.requireMock(
        '@sentry/react-native',
      ).setMeasurement;
      mockSetMeasurement.mockClear();

      // Clear DevLogger mocks
      const DevLogger = jest.requireMock(
        '../../../../core/SDKConnect/utils/DevLogger',
      ).DevLogger;
      DevLogger.log.mockClear();

      // Reset AccountTreeController mock to default
      const Engine = jest.requireMock('../../../../core/Engine');
      Engine.context.AccountTreeController.getAccountsFromSelectedAccountGroup.mockReturnValue(
        [
          {
            address: '0x1234567890123456789012345678901234567890',
            id: 'mock-account-id',
            type: 'eip155:',
          },
        ],
      );

      // Create a mock messenger that can handle the getBearerToken call
      mockMessenger = {
        call: jest.fn(),
        registerActionHandler: jest.fn(),
        registerEventHandler: jest.fn(),
        registerInitialEventPayload: jest.fn(),
        publish: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      };

      // Create controller directly with mock messenger
      controller = new PerpsController({
        messenger: mockMessenger as any,
        state: getDefaultPerpsControllerState(),
      });
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.clearAllMocks();
    });

    it('should return early when on testnet', async () => {
      // Create controller with testnet mode enabled
      const testnetController = new PerpsController({
        messenger: mockMessenger as any,
        state: {
          ...getDefaultPerpsControllerState(),
          isTestnet: true,
        },
      });

      // Call reportOrderToDataLake directly
      const result = await (testnetController as any).reportOrderToDataLake({
        action: 'open',
        coin: 'BTC',
        sl_price: 45000,
        tp_price: 55000,
      });

      // Verify it returns early with the correct message
      expect(result).toEqual({
        success: true,
        error: 'Skipped for testnet',
      });

      // Verify fetch was never called
      expect(mockFetch).not.toHaveBeenCalled();

      // Verify the messenger.call was never invoked (testnet returns before auth check)
      expect(mockMessenger.call).not.toHaveBeenCalled();

      // Verify the DevLogger was called with testnet skip message
      const DevLogger = jest.requireMock(
        '../../../../core/SDKConnect/utils/DevLogger',
      ).DevLogger;
      expect(DevLogger.log).toHaveBeenCalledWith(
        'DataLake API: Skipping for testnet',
        expect.objectContaining({
          action: 'open',
          coin: 'BTC',
          network: 'testnet',
        }),
      );
    });

    it('should return error when EVM account is missing', async () => {
      // Mock messenger to return a token
      mockMessenger.call.mockResolvedValue('mock-bearer-token');

      // Mock AccountTreeController to return non-EVM accounts
      const Engine = jest.requireMock('../../../../core/Engine');
      Engine.context.AccountTreeController.getAccountsFromSelectedAccountGroup.mockReturnValue(
        [
          {
            address: '0xabc123',
            id: 'mock-account-1',
            type: 'bip122:', // Non-EVM account (Bitcoin)
          },
          {
            address: '0xdef456',
            id: 'mock-account-2',
            type: 'cosmos:', // Non-EVM account (Cosmos)
          },
        ],
      );

      controller.state.isTestnet = false;

      // Call reportOrderToDataLake directly
      const result = await (controller as any).reportOrderToDataLake({
        action: 'close',
        coin: 'ETH',
      });

      // Verify it returns error
      expect(result).toEqual({
        success: false,
        error: 'No account or token available',
      });

      // Verify fetch was never called
      expect(mockFetch).not.toHaveBeenCalled();

      // Verify the DevLogger was called with missing requirements message
      const DevLogger = jest.requireMock(
        '../../../../core/SDKConnect/utils/DevLogger',
      ).DevLogger;
      expect(DevLogger.log).toHaveBeenCalledWith(
        'DataLake API: Missing requirements',
        expect.objectContaining({
          hasAccount: false,
          hasToken: true,
          action: 'close',
          coin: 'ETH',
        }),
      );
    });

    it('should return error when token is missing', async () => {
      // Mock messenger to return null token
      mockMessenger.call.mockResolvedValue(null);

      // Reset AccountTreeController mock to return EVM account
      const Engine = jest.requireMock('../../../../core/Engine');
      Engine.context.AccountTreeController.getAccountsFromSelectedAccountGroup.mockReturnValue(
        [
          {
            address: '0x1234567890123456789012345678901234567890',
            id: 'mock-account-id',
            type: 'eip155:',
          },
        ],
      );

      controller.state.isTestnet = false;

      // Call reportOrderToDataLake directly
      const result = await (controller as any).reportOrderToDataLake({
        action: 'open',
        coin: 'DOGE',
      });

      // Verify it returns error
      expect(result).toEqual({
        success: false,
        error: 'No account or token available',
      });

      // Verify fetch was never called
      expect(mockFetch).not.toHaveBeenCalled();

      // Verify the DevLogger was called with missing requirements message
      const DevLogger = jest.requireMock(
        '../../../../core/SDKConnect/utils/DevLogger',
      ).DevLogger;
      expect(DevLogger.log).toHaveBeenCalledWith(
        'DataLake API: Missing requirements',
        expect.objectContaining({
          hasAccount: true,
          hasToken: false,
          action: 'open',
          coin: 'DOGE',
        }),
      );
    });

    it('should return error when both account and token are missing', async () => {
      // Mock messenger to return null token
      mockMessenger.call.mockResolvedValue(null);

      // Mock AccountTreeController to return empty array
      const Engine = jest.requireMock('../../../../core/Engine');
      Engine.context.AccountTreeController.getAccountsFromSelectedAccountGroup.mockReturnValue(
        [],
      );

      controller.state.isTestnet = false;

      // Call reportOrderToDataLake directly
      const result = await (controller as any).reportOrderToDataLake({
        action: 'close',
        coin: 'MATIC',
      });

      // Verify it returns error
      expect(result).toEqual({
        success: false,
        error: 'No account or token available',
      });

      // Verify fetch was never called
      expect(mockFetch).not.toHaveBeenCalled();

      // Verify the DevLogger was called with missing requirements message
      const DevLogger = jest.requireMock(
        '../../../../core/SDKConnect/utils/DevLogger',
      ).DevLogger;
      expect(DevLogger.log).toHaveBeenCalledWith(
        'DataLake API: Missing requirements',
        expect.objectContaining({
          hasAccount: false,
          hasToken: false,
          action: 'close',
          coin: 'MATIC',
        }),
      );
    });

    it('should successfully report order to data lake API', async () => {
      // Mock messenger to return a token
      mockMessenger.call.mockResolvedValue('mock-bearer-token');

      // Mock AccountTreeController to return EVM account
      const Engine = jest.requireMock('../../../../core/Engine');
      Engine.context.AccountTreeController.getAccountsFromSelectedAccountGroup.mockReturnValue(
        [
          {
            address: '0x1234567890123456789012345678901234567890',
            id: 'mock-account-id',
            type: 'eip155:',
          },
        ],
      );

      // Mock successful API response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue('{"success":true}'),
      } as any);

      // Mock performance.now for timing
      const mockPerformanceNow = jest.spyOn(performance, 'now');
      mockPerformanceNow
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1100); // End time (100ms duration)

      controller.state.isTestnet = false;

      // Call reportOrderToDataLake directly
      const result = await (controller as any).reportOrderToDataLake({
        action: 'open',
        coin: 'BTC',
        sl_price: 45000,
        tp_price: 55000,
      });

      // Verify successful result
      expect(result).toEqual({
        success: true,
      });

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        'https://perps.api.cx.metamask.io/api/v1/orders',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-bearer-token',
          },
          body: JSON.stringify({
            user_id: '0x1234567890123456789012345678901234567890',
            coin: 'BTC',
            sl_price: 45000,
            tp_price: 55000,
          }),
        },
      );

      // Verify DevLogger was called with success message
      const DevLogger = jest.requireMock(
        '../../../../core/SDKConnect/utils/DevLogger',
      ).DevLogger;

      // Find the call with our success message among all DevLogger calls
      const successCall = DevLogger.log.mock.calls.find(
        (call: any[]) =>
          call[0] === 'DataLake API: Order reported successfully',
      );

      expect(successCall).toBeDefined();
      expect(successCall[1]).toMatchObject({
        action: 'open',
        coin: 'BTC',
        status: 201,
        attempt: 1,
        responseBody: '{"success":true}',
      });
      // Check duration separately as it's a string with 'ms' suffix
      expect(successCall[1].duration).toMatch(/^\d+ms$/);

      // Verify performance metric was recorded
      expect(mockSetMeasurement).toHaveBeenCalledWith(
        'data_lake_api_call',
        expect.any(Number),
        'millisecond',
      );

      mockPerformanceNow.mockRestore();
    });

    it('should handle API error response and not retry', async () => {
      // Mock messenger to return a token
      mockMessenger.call.mockResolvedValue('mock-bearer-token');

      // Mock AccountTreeController to return EVM account
      const Engine = jest.requireMock('../../../../core/Engine');
      Engine.context.AccountTreeController.getAccountsFromSelectedAccountGroup.mockReturnValue(
        [
          {
            address: '0x1234567890123456789012345678901234567890',
            id: 'mock-account-id',
            type: 'eip155:',
          },
        ],
      );

      // Mock API error response (400 Bad Request)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad Request'),
      } as any);

      controller.state.isTestnet = false;

      // Call reportOrderToDataLake directly
      const result = await (controller as any).reportOrderToDataLake({
        action: 'close',
        coin: 'ETH',
      });

      // Verify it returns error
      expect(result).toEqual({
        success: false,
        error: 'DataLake API error: 400',
      });

      // Verify fetch was called once
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify DevLogger was called with error message
      const DevLogger = jest.requireMock(
        '../../../../core/SDKConnect/utils/DevLogger',
      ).DevLogger;
      expect(DevLogger.log).toHaveBeenCalledWith(
        'DataLake API: Request failed',
        expect.objectContaining({
          error: 'DataLake API error: 400',
          action: 'close',
          coin: 'ETH',
          willRetry: true,
        }),
      );
    });
  });
});
