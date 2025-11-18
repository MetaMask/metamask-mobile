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
import {
  createMockHyperLiquidProvider,
  createMockOrder,
  createMockPosition,
} from '../__mocks__/providerMocks';
import { MetaMetrics } from '../../../../core/Analytics';
import Logger from '../../../../util/Logger';

// Mock the HyperLiquidProvider
jest.mock('./providers/HyperLiquidProvider');

// Mock wait utility to speed up retry tests
jest.mock('../utils/wait', () => ({
  wait: jest.fn().mockResolvedValue(undefined),
}));

// Mock stream manager
const mockStreamManager = {
  positions: { pause: jest.fn(), resume: jest.fn() },
  account: { pause: jest.fn(), resume: jest.fn() },
  orders: { pause: jest.fn(), resume: jest.fn() },
  prices: { pause: jest.fn(), resume: jest.fn() },
  orderFills: { pause: jest.fn(), resume: jest.fn() },
};

jest.mock('../providers/PerpsStreamManager', () => ({
  getStreamManagerInstance: jest.fn(() => mockStreamManager),
}));

// Mock Logger
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

// Create a shared mock for MetaMetrics instance
const mockTrackEvent = jest.fn();
const mockMetaMetricsInstance = {
  trackEvent: mockTrackEvent,
};

// Mock MetaMetrics
jest.mock('../../../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn(() => mockMetaMetricsInstance),
  },
  MetaMetricsEvents: {
    PERPS_TRADE_TRANSACTION: 'PERPS_TRADE_TRANSACTION',
    PERPS_ORDER_CANCEL_TRANSACTION: 'PERPS_ORDER_CANCEL_TRANSACTION',
    PERPS_RISK_MANAGEMENT: 'PERPS_RISK_MANAGEMENT',
  },
}));

// Mock MetricsEventBuilder
jest.mock('../../../../core/Analytics/MetricsEventBuilder', () => ({
  MetricsEventBuilder: {
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      addSensitiveProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    })),
  },
}));

const mockRewardsController = {
  getPerpsDiscountForAccount: jest.fn(),
};

const mockNetworkController = {
  getNetworkClientById: jest.fn().mockReturnValue({
    configuration: { chainId: '0x1' },
  }),
};

jest.mock('../../../../core/Engine', () => ({
  Engine: {
    context: {
      RewardsController: mockRewardsController,
      NetworkController: mockNetworkController,
      TransactionController: {},
    },
  },
}));

jest.mock('../../../../util/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: jest.fn().mockReturnValue({
    address: '0x1234567890123456789012345678901234567890',
  }),
}));

jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
  formatAccountToCaipAccountId: jest
    .fn()
    .mockReturnValue('eip155:1:0x1234567890123456789012345678901234567890'),
}));

// Mock EligibilityService to prevent actual geo-location fetching in tests
jest.mock('./services/EligibilityService', () => ({
  EligibilityService: {
    checkEligibility: jest.fn().mockResolvedValue(true),
    fetchGeoLocation: jest.fn().mockResolvedValue('UNKNOWN'),
    clearCache: jest.fn(),
  },
}));

describe('PerpsController', () => {
  let controller: PerpsController;
  let mockProvider: jest.Mocked<HyperLiquidProvider>;

  // Helper to mark controller as initialized for tests
  const markControllerAsInitialized = () => {
    (controller as any).isInitialized = true;
    (controller as any).update((state: any) => {
      state.initializationState = 'initialized';
    });
  };

  beforeEach(() => {
    // Create a fresh mock provider for each test
    mockProvider = createMockHyperLiquidProvider();

    // Mock the HyperLiquidProvider constructor to return our mock
    (
      HyperLiquidProvider as jest.MockedClass<typeof HyperLiquidProvider>
    ).mockImplementation(() => mockProvider);

    // Create mock messenger call function that handles RemoteFeatureFlagController:getState
    const mockCall = jest.fn().mockImplementation((action: string) => {
      if (action === 'RemoteFeatureFlagController:getState') {
        return {
          remoteFeatureFlags: {
            perpsPerpTradingGeoBlockedCountriesV2: {
              blockedRegions: [],
            },
          },
        };
      }
      return undefined;
    });

    // Create a new controller instance
    controller = new PerpsController({
      messenger: {
        call: mockCall,
        publish: jest.fn(),
        subscribe: jest.fn(),
        registerActionHandler: jest.fn(),
        registerEventHandler: jest.fn(),
        registerInitialEventPayload: jest.fn(),
      } as unknown as any,
      state: getDefaultPerpsControllerState(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes with default state', () => {
      // Constructor no longer auto-starts initialization (moved to Engine.ts)
      expect(controller.state.activeProvider).toBe('hyperliquid');
      expect(controller.state.positions).toEqual([]);
      expect(controller.state.accountState).toBeNull();
      expect(controller.state.connectionStatus).toBe('disconnected');
      expect(controller.state.initializationState).toBe('uninitialized'); // Waits for explicit initialization
      expect(controller.state.initializationError).toBeNull();
      expect(controller.state.initializationAttempts).toBe(0); // Not started yet
      // isEligible is initially false, but refreshEligibility is called during construction
      // which updates it to true (defaulting to eligible when geo-location is unknown)
      expect(controller.state.isEligible).toBe(true);
      expect(controller.state.isTestnet).toBe(false); // Default to mainnet
    });

    it('reads current RemoteFeatureFlagController state during construction', () => {
      // Given: A mock messenger that tracks calls
      const mockCall = jest.fn().mockImplementation((action: string) => {
        if (action === 'RemoteFeatureFlagController:getState') {
          return {
            remoteFeatureFlags: {
              perpsPerpTradingGeoBlockedCountriesV2: {
                blockedRegions: ['US', 'CA'],
              },
            },
          };
        }
        return undefined;
      });

      // When: Controller is constructed
      const testController = new PerpsController({
        messenger: {
          call: mockCall,
          publish: jest.fn(),
          subscribe: jest.fn(),
          registerActionHandler: jest.fn(),
          registerEventHandler: jest.fn(),
          registerInitialEventPayload: jest.fn(),
        } as unknown as any,
        state: getDefaultPerpsControllerState(),
      });

      // Then: Should have called to get RemoteFeatureFlagController state
      expect(testController).toBeDefined();
      expect(mockCall).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:getState',
      );
    });

    it('should apply remote blocked regions when available during construction', () => {
      // Given: Remote feature flags with blocked regions
      const mockCall = jest.fn().mockImplementation((action: string) => {
        if (action === 'RemoteFeatureFlagController:getState') {
          return {
            remoteFeatureFlags: {
              perpsPerpTradingGeoBlockedCountriesV2: {
                blockedRegions: ['US-NY', 'CA-ON'],
              },
            },
          };
        }
        return undefined;
      });

      // When: Controller is constructed
      const testController = new PerpsController({
        messenger: {
          call: mockCall,
          publish: jest.fn(),
          subscribe: jest.fn(),
          registerActionHandler: jest.fn(),
          registerEventHandler: jest.fn(),
          registerInitialEventPayload: jest.fn(),
        } as unknown as any,
        state: getDefaultPerpsControllerState(),
        clientConfig: {
          fallbackBlockedRegions: ['FALLBACK-REGION'],
        },
      });

      // Then: Should have used remote regions (not fallback)
      // Verify by checking the internal blockedRegionList
      expect((testController as any).blockedRegionList.source).toBe('remote');
      expect((testController as any).blockedRegionList.list).toEqual([
        'US-NY',
        'CA-ON',
      ]);
    });

    it('should use fallback regions when remote flags are not available', () => {
      // Given: Remote feature flags without blocked regions
      const mockCall = jest.fn().mockImplementation((action: string) => {
        if (action === 'RemoteFeatureFlagController:getState') {
          return {
            remoteFeatureFlags: {},
          };
        }
        return undefined;
      });

      // When: Controller is constructed with fallback regions
      const testController = new PerpsController({
        messenger: {
          call: mockCall,
          publish: jest.fn(),
          subscribe: jest.fn(),
          registerActionHandler: jest.fn(),
          registerEventHandler: jest.fn(),
          registerInitialEventPayload: jest.fn(),
        } as unknown as any,
        state: getDefaultPerpsControllerState(),
        clientConfig: {
          fallbackBlockedRegions: ['FALLBACK-US', 'FALLBACK-CA'],
        },
      });

      // Then: Should have used fallback regions
      expect((testController as any).blockedRegionList.source).toBe('fallback');
      expect((testController as any).blockedRegionList.list).toEqual([
        'FALLBACK-US',
        'FALLBACK-CA',
      ]);
    });

    it('should never downgrade from remote to fallback regions', () => {
      // Given: Remote feature flags with blocked regions
      const mockCall = jest.fn().mockImplementation((action: string) => {
        if (action === 'RemoteFeatureFlagController:getState') {
          return {
            remoteFeatureFlags: {
              perpsPerpTradingGeoBlockedCountriesV2: {
                blockedRegions: ['REMOTE-US'],
              },
            },
          };
        }
        return undefined;
      });

      // When: Controller is constructed with both remote and fallback
      const testController = new PerpsController({
        messenger: {
          call: mockCall,
          publish: jest.fn(),
          subscribe: jest.fn(),
          registerActionHandler: jest.fn(),
          registerEventHandler: jest.fn(),
          registerInitialEventPayload: jest.fn(),
        } as unknown as any,
        state: getDefaultPerpsControllerState(),
        clientConfig: {
          fallbackBlockedRegions: ['FALLBACK-US'],
        },
      });

      // Then: Should use remote (set after fallback)
      expect((testController as any).blockedRegionList.source).toBe('remote');
      expect((testController as any).blockedRegionList.list).toEqual([
        'REMOTE-US',
      ]);

      // When: Attempt to set fallback again (simulating what setBlockedRegionList does)
      (testController as any).setBlockedRegionList(
        ['NEW-FALLBACK'],
        'fallback',
      );

      // Then: Should still use remote (no downgrade)
      expect((testController as any).blockedRegionList.source).toBe('remote');
      expect((testController as any).blockedRegionList.list).toEqual([
        'REMOTE-US',
      ]);
    });

    it('continues initialization when RemoteFeatureFlagController state call throws error', () => {
      // Arrange: Mock messenger that throws error for RemoteFeatureFlagController:getState
      const mockCall = jest.fn().mockImplementation((action: string) => {
        if (action === 'RemoteFeatureFlagController:getState') {
          throw new Error('RemoteFeatureFlagController not ready');
        }
        return undefined;
      });
      const mockLoggerError = jest.spyOn(Logger, 'error');

      // Act: Construct controller with fallback regions
      const testController = new PerpsController({
        messenger: {
          call: mockCall,
          publish: jest.fn(),
          subscribe: jest.fn(),
          registerActionHandler: jest.fn(),
          registerEventHandler: jest.fn(),
          registerInitialEventPayload: jest.fn(),
        } as unknown as any,
        state: getDefaultPerpsControllerState(),
        clientConfig: {
          fallbackBlockedRegions: ['FALLBACK-US', 'FALLBACK-CA'],
        },
      });

      // Assert: Controller initializes successfully and uses fallback
      expect(testController).toBeDefined();
      expect((testController as any).blockedRegionList.source).toBe('fallback');
      expect((testController as any).blockedRegionList.list).toEqual([
        'FALLBACK-US',
        'FALLBACK-CA',
      ]);
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'perps',
          }),
          context: expect.objectContaining({
            name: 'PerpsController',
            data: expect.objectContaining({
              method: 'constructor',
              operation: 'readRemoteFeatureFlags',
            }),
          }),
        }),
      );

      mockLoggerError.mockRestore();
    });
  });

  describe('refreshHip3ConfigOnFeatureFlagChange', () => {
    describe('allowlist parsing', () => {
      it('parses comma-separated allowlist string from LaunchDarkly', () => {
        // Arrange
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3AllowlistMarkets: 'BTC-USD,ETH-USD,SOL-USD',
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect((controller as any).hip3AllowlistMarkets).toEqual([
          'BTC-USD',
          'ETH-USD',
          'SOL-USD',
        ]);
      });

      it('parses allowlist array format', () => {
        // Arrange
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3AllowlistMarkets: ['BTC-USD', 'ETH-USD'],
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect((controller as any).hip3AllowlistMarkets).toEqual([
          'BTC-USD',
          'ETH-USD',
        ]);
      });

      it('trims whitespace from allowlist array items', () => {
        // Arrange
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3AllowlistMarkets: ['  BTC-USD  ', ' ETH-USD'],
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect((controller as any).hip3AllowlistMarkets).toEqual([
          'BTC-USD',
          'ETH-USD',
        ]);
      });

      it('falls back to local config when allowlist format is invalid (non-string array)', () => {
        // Arrange
        const initialAllowlist = ['LOCAL-BTC'];
        (controller as any).hip3AllowlistMarkets = initialAllowlist;
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3AllowlistMarkets: [123, null, 'BTC-USD'],
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect((controller as any).hip3AllowlistMarkets).toEqual(
          initialAllowlist,
        );
      });

      it('falls back to local config when allowlist format is invalid (empty string array)', () => {
        // Arrange
        const initialAllowlist = ['LOCAL-ETH'];
        (controller as any).hip3AllowlistMarkets = initialAllowlist;
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3AllowlistMarkets: ['BTC-USD', '', 'ETH-USD'],
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect((controller as any).hip3AllowlistMarkets).toEqual(
          initialAllowlist,
        );
      });

      it('falls back to local config when allowlist is empty string after parsing', () => {
        // Arrange
        const initialAllowlist = ['LOCAL-SOL'];
        (controller as any).hip3AllowlistMarkets = initialAllowlist;
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3AllowlistMarkets: '',
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect((controller as any).hip3AllowlistMarkets).toEqual(
          initialAllowlist,
        );
      });
    });

    describe('blocklist parsing', () => {
      it('parses comma-separated blocklist string from LaunchDarkly', () => {
        // Arrange
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3BlocklistMarkets: 'SCAM-USD,FAKE-USD',
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect((controller as any).hip3BlocklistMarkets).toEqual([
          'SCAM-USD',
          'FAKE-USD',
        ]);
      });

      it('parses blocklist array format', () => {
        // Arrange
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3BlocklistMarkets: ['SCAM-USD', 'FAKE-USD'],
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect((controller as any).hip3BlocklistMarkets).toEqual([
          'SCAM-USD',
          'FAKE-USD',
        ]);
      });

      it('trims whitespace from blocklist array items', () => {
        // Arrange
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3BlocklistMarkets: ['  SCAM-USD  ', ' FAKE-USD'],
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect((controller as any).hip3BlocklistMarkets).toEqual([
          'SCAM-USD',
          'FAKE-USD',
        ]);
      });

      it('falls back to local config when blocklist format is invalid (non-string array)', () => {
        // Arrange
        const initialBlocklist = ['LOCAL-SCAM'];
        (controller as any).hip3BlocklistMarkets = initialBlocklist;
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3BlocklistMarkets: [456, null, 'SCAM-USD'],
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect((controller as any).hip3BlocklistMarkets).toEqual(
          initialBlocklist,
        );
      });

      it('falls back to local config when blocklist format is invalid (empty string array)', () => {
        // Arrange
        const initialBlocklist = ['LOCAL-FAKE'];
        (controller as any).hip3BlocklistMarkets = initialBlocklist;
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3BlocklistMarkets: ['SCAM-USD', '', 'FAKE-USD'],
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect((controller as any).hip3BlocklistMarkets).toEqual(
          initialBlocklist,
        );
      });

      it('falls back to local config when blocklist is empty string after parsing', () => {
        // Arrange
        const initialBlocklist = ['LOCAL-BAD'];
        (controller as any).hip3BlocklistMarkets = initialBlocklist;
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3BlocklistMarkets: '',
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect((controller as any).hip3BlocklistMarkets).toEqual(
          initialBlocklist,
        );
      });
    });

    describe('config change detection', () => {
      it('increments hip3ConfigVersion when allowlist changes', () => {
        // Arrange
        const initialVersion = controller.state.hip3ConfigVersion;
        (controller as any).hip3AllowlistMarkets = ['BTC-USD'];
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3AllowlistMarkets: 'ETH-USD,SOL-USD',
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect(controller.state.hip3ConfigVersion).toBe(initialVersion + 1);
        expect((controller as any).hip3AllowlistMarkets).toEqual([
          'ETH-USD',
          'SOL-USD',
        ]);
      });

      it('increments hip3ConfigVersion when blocklist changes', () => {
        // Arrange
        const initialVersion = controller.state.hip3ConfigVersion;
        (controller as any).hip3BlocklistMarkets = ['OLD-SCAM'];
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3BlocklistMarkets: 'NEW-SCAM,NEW-FAKE',
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect(controller.state.hip3ConfigVersion).toBe(initialVersion + 1);
        expect((controller as any).hip3BlocklistMarkets).toEqual([
          'NEW-SCAM',
          'NEW-FAKE',
        ]);
      });

      it('does not increment version when config stays the same', () => {
        // Arrange
        const initialVersion = controller.state.hip3ConfigVersion;
        (controller as any).hip3AllowlistMarkets = ['BTC-USD', 'ETH-USD'];
        const remoteFlags = {
          remoteFeatureFlags: {
            perpsHip3AllowlistMarkets: 'ETH-USD,BTC-USD', // Same, just different order
          },
        };

        // Act
        (controller as any).refreshHip3ConfigOnFeatureFlagChange(remoteFlags);

        // Assert
        expect(controller.state.hip3ConfigVersion).toBe(initialVersion);
      });
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
      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);

      const provider = controller.getActiveProvider();
      expect(provider).toBe(mockProvider);
    });
  });

  describe('init', () => {
    it('should initialize providers successfully', async () => {
      await controller.init();

      expect((controller as any).isInitialized).toBe(true);
      expect((controller as any).providers.has('hyperliquid')).toBe(true);
    });

    it('should handle initialization when already initialized', async () => {
      // First initialization
      await controller.init();
      expect((controller as any).isInitialized).toBe(true);

      // Second initialization should not throw
      await controller.init();
      expect((controller as any).isInitialized).toBe(true);
    });

    it('allows retry after all initialization attempts fail', async () => {
      // Set up mock to throw errors BEFORE creating controller
      const networkError = new Error('Network error');
      (
        HyperLiquidProvider as jest.MockedClass<typeof HyperLiquidProvider>
      ).mockImplementation(() => {
        throw networkError;
      });

      // Create new controller with failing provider mock
      const mockCall = jest.fn().mockImplementation((action: string) => {
        if (action === 'RemoteFeatureFlagController:getState') {
          return {
            remoteFeatureFlags: {
              perpsPerpTradingGeoBlockedCountriesV2: {
                blockedRegions: [],
              },
            },
          };
        }
        return undefined;
      });

      const testController = new PerpsController({
        messenger: {
          call: mockCall,
          publish: jest.fn(),
          subscribe: jest.fn(),
          registerActionHandler: jest.fn(),
          registerEventHandler: jest.fn(),
          registerInitialEventPayload: jest.fn(),
        } as unknown as any,
        state: getDefaultPerpsControllerState(),
      });

      // Explicitly start initialization (no longer auto-starts in constructor)
      testController.init().catch(() => {
        // Expected to fail - error is stored in state
      });

      // Wait for initialization to complete (retries happen instantly due to mocked wait())
      // Small delay allows async promise chain to resolve
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify failure state
      expect(testController.state.initializationState).toBe('failed');
      expect(testController.state.initializationError).toBe('Network error');
      expect((testController as any).isInitialized).toBe(false);

      // Network recovers - provider succeeds on next attempt
      (
        HyperLiquidProvider as jest.MockedClass<typeof HyperLiquidProvider>
      ).mockImplementation(() => mockProvider);

      // User retries initialization (e.g., via network switch)
      await testController.init();

      // Verify initialization succeeds (not cached failure)
      expect(testController.state.initializationState).toBe('initialized');
      expect(testController.state.initializationError).toBeNull();
      expect((testController as any).isInitialized).toBe(true);
    }); // Fast execution with mocked wait()
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

      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getPositions.mockResolvedValue(mockPositions);

      const result = await controller.getPositions();

      expect(result).toEqual(mockPositions);
      expect(mockProvider.getPositions).toHaveBeenCalled();
    });

    it('should handle getPositions error', async () => {
      const errorMessage = 'Network error';

      markControllerAsInitialized();
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
        marginUsed: '500',
        unrealizedPnl: '100',
        returnOnEquity: '20.0',
        totalBalance: '1600',
      };

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.placeOrder.mockRejectedValue(new Error(errorMessage));

      await expect(controller.placeOrder(orderParams)).rejects.toThrow(
        errorMessage,
      );
      expect(mockProvider.placeOrder).toHaveBeenCalledWith(orderParams);
    });

    describe('fee discounts', () => {
      it('should apply fee discount when placing order with rewards', async () => {
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

        markControllerAsInitialized();
        (controller as any).providers = new Map([
          ['hyperliquid', mockProvider],
        ]);
        mockProvider.placeOrder.mockResolvedValue(mockOrderResult);
        mockProvider.setUserFeeDiscount = jest.fn();

        jest
          .spyOn(controller as any, 'calculateUserFeeDiscount')
          .mockResolvedValue(6500);

        const result = await controller.placeOrder(orderParams);

        expect(result).toEqual(mockOrderResult);
        expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(6500);
        expect(mockProvider.placeOrder).toHaveBeenCalledWith(orderParams);
        expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(
          undefined,
        );
      });

      it('should clear fee discount context even when place order fails', async () => {
        const orderParams = {
          coin: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market' as const,
        };

        const mockError = new Error('Order placement failed');

        markControllerAsInitialized();
        (controller as any).providers = new Map([
          ['hyperliquid', mockProvider],
        ]);
        mockProvider.placeOrder.mockRejectedValue(mockError);
        mockProvider.setUserFeeDiscount = jest.fn();

        jest
          .spyOn(controller as any, 'calculateUserFeeDiscount')
          .mockResolvedValue(6500);

        await expect(controller.placeOrder(orderParams)).rejects.toThrow(
          'Order placement failed',
        );

        expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(6500);
        expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(
          undefined,
        );
      });

      it('should place order without discount when user has no rewards', async () => {
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

        markControllerAsInitialized();
        (controller as any).providers = new Map([
          ['hyperliquid', mockProvider],
        ]);
        mockProvider.placeOrder.mockResolvedValue(mockOrderResult);
        mockProvider.setUserFeeDiscount = jest.fn();

        jest
          .spyOn(controller as any, 'calculateUserFeeDiscount')
          .mockResolvedValue(undefined);

        const result = await controller.placeOrder(orderParams);

        expect(result).toEqual(mockOrderResult);
        expect(mockProvider.setUserFeeDiscount).not.toHaveBeenCalledWith(6500);
        expect(mockProvider.placeOrder).toHaveBeenCalledWith(orderParams);
      });
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.cancelOrder.mockResolvedValue(mockCancelResult);

      const result = await controller.cancelOrder(cancelParams);

      expect(result).toEqual(mockCancelResult);
      expect(mockProvider.cancelOrder).toHaveBeenCalledWith(cancelParams);
    });
  });

  describe('cancelOrders', () => {
    beforeEach(() => {
      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      (controller as any).isCancelingOrders = false;
      jest.clearAllMocks();
    });

    it('cancels all orders when cancelAll is true', async () => {
      const mockOrders = [
        createMockOrder({ orderId: 'order-1', symbol: 'BTC' }),
        createMockOrder({ orderId: 'order-2', symbol: 'ETH' }),
      ];
      mockProvider.getOpenOrders.mockResolvedValue(mockOrders);
      mockProvider.cancelOrder.mockResolvedValue({ success: true });

      const result = await controller.cancelOrders({ cancelAll: true });

      expect(mockProvider.getOpenOrders).toHaveBeenCalled();
      expect(mockProvider.cancelOrder).toHaveBeenCalledTimes(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.success).toBe(true);
    });

    it('excludes TP/SL orders when cancelAll is true', async () => {
      const mockOrders = [
        createMockOrder({
          orderId: 'order-1',
          symbol: 'BTC',
          detailedOrderType: 'Limit',
        }),
        createMockOrder({
          orderId: 'order-2',
          symbol: 'ETH',
          detailedOrderType: 'Take Profit Limit',
        }),
        createMockOrder({
          orderId: 'order-3',
          symbol: 'SOL',
          detailedOrderType: 'Stop Market',
        }),
        createMockOrder({
          orderId: 'order-4',
          symbol: 'BTC',
          detailedOrderType: 'Limit',
        }),
      ];
      mockProvider.getOpenOrders.mockResolvedValue(mockOrders);
      mockProvider.cancelOrder.mockResolvedValue({ success: true });

      const result = await controller.cancelOrders({ cancelAll: true });

      expect(mockProvider.cancelOrder).toHaveBeenCalledTimes(2);
      expect(mockProvider.cancelOrder).toHaveBeenCalledWith({
        coin: 'BTC',
        orderId: 'order-1',
      });
      expect(mockProvider.cancelOrder).toHaveBeenCalledWith({
        coin: 'BTC',
        orderId: 'order-4',
      });
      expect(mockProvider.cancelOrder).not.toHaveBeenCalledWith({
        coin: 'ETH',
        orderId: 'order-2',
      });
      expect(mockProvider.cancelOrder).not.toHaveBeenCalledWith({
        coin: 'SOL',
        orderId: 'order-3',
      });
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it('cancels all regular orders and excludes all TP/SL types', async () => {
      const mockOrders = [
        createMockOrder({
          orderId: 'order-1',
          symbol: 'BTC',
          detailedOrderType: 'Limit',
        }),
        createMockOrder({
          orderId: 'order-2',
          symbol: 'ETH',
          detailedOrderType: 'Take Profit Limit',
        }),
        createMockOrder({
          orderId: 'order-3',
          symbol: 'SOL',
          detailedOrderType: 'Take Profit Market',
        }),
        createMockOrder({
          orderId: 'order-4',
          symbol: 'AVAX',
          detailedOrderType: 'Stop Limit',
        }),
        createMockOrder({
          orderId: 'order-5',
          symbol: 'MATIC',
          detailedOrderType: 'Stop Market',
        }),
        createMockOrder({
          orderId: 'order-6',
          symbol: 'DOT',
          detailedOrderType: 'Market',
        }),
      ];
      mockProvider.getOpenOrders.mockResolvedValue(mockOrders);
      mockProvider.cancelOrder.mockResolvedValue({ success: true });

      const result = await controller.cancelOrders({ cancelAll: true });

      expect(mockProvider.cancelOrder).toHaveBeenCalledTimes(2);
      expect(mockProvider.cancelOrder).toHaveBeenCalledWith({
        coin: 'BTC',
        orderId: 'order-1',
      });
      expect(mockProvider.cancelOrder).toHaveBeenCalledWith({
        coin: 'DOT',
        orderId: 'order-6',
      });
      expect(result.successCount).toBe(2);
    });

    it('allows canceling TP/SL orders when specified by orderId', async () => {
      const mockOrders = [
        createMockOrder({
          orderId: 'order-1',
          symbol: 'BTC',
          detailedOrderType: 'Limit',
        }),
        createMockOrder({
          orderId: 'order-2',
          symbol: 'ETH',
          detailedOrderType: 'Take Profit Limit',
        }),
        createMockOrder({
          orderId: 'order-3',
          symbol: 'SOL',
          detailedOrderType: 'Stop Market',
        }),
      ];
      mockProvider.getOpenOrders.mockResolvedValue(mockOrders);
      mockProvider.cancelOrder.mockResolvedValue({ success: true });

      const result = await controller.cancelOrders({
        orderIds: ['order-2', 'order-3'],
      });

      expect(mockProvider.cancelOrder).toHaveBeenCalledTimes(2);
      expect(mockProvider.cancelOrder).toHaveBeenCalledWith({
        coin: 'ETH',
        orderId: 'order-2',
      });
      expect(mockProvider.cancelOrder).toHaveBeenCalledWith({
        coin: 'SOL',
        orderId: 'order-3',
      });
      expect(result.successCount).toBe(2);
    });

    it('cancels specific order IDs when provided', async () => {
      const mockOrders = [
        createMockOrder({ orderId: 'order-1', symbol: 'BTC' }),
        createMockOrder({ orderId: 'order-2', symbol: 'ETH' }),
        createMockOrder({ orderId: 'order-3', symbol: 'SOL' }),
      ];
      mockProvider.getOpenOrders.mockResolvedValue(mockOrders);
      mockProvider.cancelOrder.mockResolvedValue({ success: true });

      const result = await controller.cancelOrders({
        orderIds: ['order-1', 'order-3'],
      });

      expect(mockProvider.cancelOrder).toHaveBeenCalledTimes(2);
      expect(mockProvider.cancelOrder).toHaveBeenCalledWith({
        coin: 'BTC',
        orderId: 'order-1',
      });
      expect(mockProvider.cancelOrder).toHaveBeenCalledWith({
        coin: 'SOL',
        orderId: 'order-3',
      });
      expect(result.successCount).toBe(2);
    });

    it('cancels orders for specific coins when provided', async () => {
      const mockOrders = [
        createMockOrder({ orderId: 'order-1', symbol: 'BTC' }),
        createMockOrder({ orderId: 'order-2', symbol: 'ETH' }),
        createMockOrder({ orderId: 'order-3', symbol: 'BTC' }),
      ];
      mockProvider.getOpenOrders.mockResolvedValue(mockOrders);
      mockProvider.cancelOrder.mockResolvedValue({ success: true });

      const result = await controller.cancelOrders({ coins: ['BTC'] });

      expect(mockProvider.cancelOrder).toHaveBeenCalledTimes(2);
      expect(result.successCount).toBe(2);
    });

    it('returns empty results when no orders match filters', async () => {
      const mockOrders = [
        createMockOrder({ orderId: 'order-1', symbol: 'BTC' }),
      ];
      mockProvider.getOpenOrders.mockResolvedValue(mockOrders);

      const result = await controller.cancelOrders({ coins: ['ETH'] });

      expect(mockProvider.cancelOrder).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        successCount: 0,
        failureCount: 0,
        results: [],
      });
    });

    it('handles partial failures gracefully', async () => {
      const mockOrders = [
        createMockOrder({ orderId: 'order-1', symbol: 'BTC' }),
        createMockOrder({ orderId: 'order-2', symbol: 'ETH' }),
      ];
      mockProvider.getOpenOrders.mockResolvedValue(mockOrders);
      mockProvider.cancelOrder
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Network error' });

      const result = await controller.cancelOrders({ cancelAll: true });

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.success).toBe(true);
    });

    it('pauses and resumes streams during batch cancellation', async () => {
      const mockOrders = [
        createMockOrder({ orderId: 'order-1', symbol: 'BTC' }),
      ];
      mockProvider.getOpenOrders.mockResolvedValue(mockOrders);
      mockProvider.cancelOrder.mockResolvedValue({ success: true });

      await controller.cancelOrders({ cancelAll: true });

      expect(mockStreamManager.orders.pause).toHaveBeenCalled();
      expect(mockStreamManager.orders.resume).toHaveBeenCalled();
    });

    it('resumes streams even when operation throws error', async () => {
      mockProvider.getOpenOrders.mockRejectedValue(new Error('Network error'));

      await expect(
        controller.cancelOrders({ cancelAll: true }),
      ).rejects.toThrow('Network error');

      expect(mockStreamManager.orders.pause).toHaveBeenCalled();
      expect(mockStreamManager.orders.resume).toHaveBeenCalled();
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

      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.closePosition.mockResolvedValue(mockCloseResult);

      const result = await controller.closePosition(closeParams);

      expect(result).toEqual(mockCloseResult);
      expect(mockProvider.closePosition).toHaveBeenCalledWith(closeParams);
    });

    describe('fee discounts', () => {
      it('should apply fee discount when closing position with rewards', async () => {
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

        markControllerAsInitialized();
        (controller as any).providers = new Map([
          ['hyperliquid', mockProvider],
        ]);
        mockProvider.closePosition.mockResolvedValue(mockCloseResult);
        mockProvider.setUserFeeDiscount = jest.fn();

        jest
          .spyOn(controller as any, 'calculateUserFeeDiscount')
          .mockResolvedValue(6500);

        const result = await controller.closePosition(closeParams);

        expect(result).toEqual(mockCloseResult);
        expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(6500);
        expect(mockProvider.closePosition).toHaveBeenCalledWith(closeParams);
        expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(
          undefined,
        );
      });

      it('should clear fee discount context even when close position fails', async () => {
        const closeParams = {
          coin: 'BTC',
          orderType: 'market' as const,
          size: '0.5',
        };

        const mockError = new Error('Close position failed');

        markControllerAsInitialized();
        (controller as any).providers = new Map([
          ['hyperliquid', mockProvider],
        ]);
        mockProvider.closePosition.mockRejectedValue(mockError);
        mockProvider.setUserFeeDiscount = jest.fn();

        jest
          .spyOn(controller as any, 'calculateUserFeeDiscount')
          .mockResolvedValue(6500);

        await expect(controller.closePosition(closeParams)).rejects.toThrow(
          'Close position failed',
        );

        expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(6500);
        expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(
          undefined,
        );
      });

      it('should close position without discount when user has no rewards', async () => {
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

        markControllerAsInitialized();
        (controller as any).providers = new Map([
          ['hyperliquid', mockProvider],
        ]);
        mockProvider.closePosition.mockResolvedValue(mockCloseResult);
        mockProvider.setUserFeeDiscount = jest.fn();

        jest
          .spyOn(controller as any, 'calculateUserFeeDiscount')
          .mockResolvedValue(undefined);

        const result = await controller.closePosition(closeParams);

        expect(result).toEqual(mockCloseResult);
        expect(mockProvider.setUserFeeDiscount).not.toHaveBeenCalledWith(6500);
        expect(mockProvider.closePosition).toHaveBeenCalledWith(closeParams);
      });
    });
  });

  describe('closePositions', () => {
    beforeEach(() => {
      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
    });

    it('closes all positions when closeAll is true', async () => {
      const mockPositions = [
        createMockPosition({ coin: 'BTC' }),
        createMockPosition({ coin: 'ETH' }),
      ];
      mockProvider.getPositions.mockResolvedValue(mockPositions);
      mockProvider.closePosition.mockResolvedValue({ success: true });

      const result = await controller.closePositions({ closeAll: true });

      expect(mockProvider.getPositions).toHaveBeenCalled();
      expect(mockProvider.closePosition).toHaveBeenCalledTimes(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.success).toBe(true);
    });

    it('closes specific coins when provided', async () => {
      const mockPositions = [
        createMockPosition({ coin: 'BTC' }),
        createMockPosition({ coin: 'ETH' }),
        createMockPosition({ coin: 'SOL' }),
      ];
      mockProvider.getPositions.mockResolvedValue(mockPositions);
      mockProvider.closePosition.mockResolvedValue({ success: true });

      const result = await controller.closePositions({ coins: ['BTC', 'SOL'] });

      expect(mockProvider.closePosition).toHaveBeenCalledTimes(2);
      expect(mockProvider.closePosition).toHaveBeenCalledWith({ coin: 'BTC' });
      expect(mockProvider.closePosition).toHaveBeenCalledWith({ coin: 'SOL' });
      expect(result.successCount).toBe(2);
    });

    it('returns empty results when no positions match', async () => {
      const mockPositions = [createMockPosition({ coin: 'BTC' })];
      mockProvider.getPositions.mockResolvedValue(mockPositions);

      const result = await controller.closePositions({ coins: ['ETH'] });

      expect(mockProvider.closePosition).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        successCount: 0,
        failureCount: 0,
        results: [],
      });
    });

    it('handles partial failures gracefully', async () => {
      const mockPositions = [
        createMockPosition({ coin: 'BTC' }),
        createMockPosition({ coin: 'ETH' }),
      ];
      mockProvider.getPositions.mockResolvedValue(mockPositions);
      mockProvider.closePosition
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({
          success: false,
          error: 'Insufficient margin',
        });

      const result = await controller.closePositions({ closeAll: true });

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.success).toBe(true);
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.calculateLiquidationPrice.mockResolvedValue(
        mockLiquidationPrice,
      );

      const result =
        await controller.calculateLiquidationPrice(liquidationParams);

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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getPositions.mockRejectedValue(new Error(errorMessage));

      await expect(controller.getPositions()).rejects.toThrow(errorMessage);
      expect(mockProvider.getPositions).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const errorMessage = 'Network timeout';

      markControllerAsInitialized();
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

      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getPositions.mockResolvedValue(mockPositions);

      const result = await controller.getPositions();

      expect(result).toEqual(mockPositions);
      expect(mockProvider.getPositions).toHaveBeenCalled();
      // Note: getPositions doesn't update controller state, it just returns data
    });

    it('should handle errors without updating state', async () => {
      const errorMessage = 'Failed to fetch positions';

      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getPositions.mockRejectedValue(new Error(errorMessage));

      await expect(controller.getPositions()).rejects.toThrow(errorMessage);
      expect(mockProvider.getPositions).toHaveBeenCalled();
    });
  });

  describe('connection management', () => {
    it('should handle disconnection', async () => {
      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

  describe('watchlist markets', () => {
    it('should return empty array by default', () => {
      const watchlist = controller.getWatchlistMarkets();
      expect(watchlist).toEqual([]);
    });

    it('should toggle watchlist market (add)', () => {
      controller.toggleWatchlistMarket('BTC');

      const watchlist = controller.getWatchlistMarkets();
      expect(watchlist).toContain('BTC');
      expect(controller.isWatchlistMarket('BTC')).toBe(true);
    });

    it('should toggle watchlist market (remove)', () => {
      controller.toggleWatchlistMarket('BTC');
      controller.toggleWatchlistMarket('BTC');

      const watchlist = controller.getWatchlistMarkets();
      expect(watchlist).not.toContain('BTC');
      expect(controller.isWatchlistMarket('BTC')).toBe(false);
    });

    it('should handle multiple watchlist markets', () => {
      controller.toggleWatchlistMarket('BTC');
      controller.toggleWatchlistMarket('ETH');
      controller.toggleWatchlistMarket('SOL');

      const watchlist = controller.getWatchlistMarkets();
      expect(watchlist).toHaveLength(3);
      expect(watchlist).toContain('BTC');
      expect(watchlist).toContain('ETH');
      expect(watchlist).toContain('SOL');
    });

    it('should persist watchlist per network', () => {
      // Add to watchlist on mainnet (default is testnet in dev, so set to false)
      (controller as any).update((state: any) => {
        state.isTestnet = false;
      });
      controller.toggleWatchlistMarket('BTC');

      const mainnetWatchlist = controller.getWatchlistMarkets();
      expect(mainnetWatchlist).toContain('BTC');

      // Switch to testnet
      (controller as any).update((state: any) => {
        state.isTestnet = true;
      });
      const testnetWatchlist = controller.getWatchlistMarkets();
      expect(testnetWatchlist).toEqual([]);

      // Add to watchlist on testnet
      controller.toggleWatchlistMarket('ETH');
      expect(controller.getWatchlistMarkets()).toContain('ETH');
      expect(controller.isWatchlistMarket('ETH')).toBe(true);

      // Switch back to mainnet
      (controller as any).update((state: any) => {
        state.isTestnet = false;
      });
      expect(controller.getWatchlistMarkets()).toContain('BTC');
      expect(controller.getWatchlistMarkets()).not.toContain('ETH');
    });
  });

  describe('additional subscriptions', () => {
    it('should subscribe to orders', () => {
      const mockUnsubscribe = jest.fn();
      const params = {
        callback: jest.fn(),
      };

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
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

      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.updatePositionTPSL.mockResolvedValue(mockUpdateResult);

      const result = await controller.updatePositionTPSL(updateParams);

      expect(result).toEqual(mockUpdateResult);
      expect(mockProvider.updatePositionTPSL).toHaveBeenCalledWith(
        updateParams,
      );
    });

    describe('TP/SL fee discounts', () => {
      it('should apply fee discount when updating TP/SL with rewards', async () => {
        const updateParams = {
          coin: 'BTC',
          takeProfitPrice: '55000',
          stopLossPrice: '45000',
        };

        const mockUpdateResult = {
          success: true,
          positionId: 'pos-123',
        };

        markControllerAsInitialized();
        (controller as any).providers = new Map([
          ['hyperliquid', mockProvider],
        ]);
        mockProvider.updatePositionTPSL.mockResolvedValue(mockUpdateResult);
        mockProvider.setUserFeeDiscount = jest.fn();

        jest
          .spyOn(controller as any, 'calculateUserFeeDiscount')
          .mockResolvedValue(6500);

        const result = await controller.updatePositionTPSL(updateParams);

        expect(result).toEqual(mockUpdateResult);
        expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(6500);
        expect(mockProvider.updatePositionTPSL).toHaveBeenCalledWith(
          updateParams,
        );
        expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(
          undefined,
        );
      });

      it('should clear fee discount context even when TP/SL update fails', async () => {
        const updateParams = {
          coin: 'BTC',
          takeProfitPrice: '55000',
          stopLossPrice: '45000',
        };

        const mockError = new Error('TP/SL update failed');

        markControllerAsInitialized();
        (controller as any).providers = new Map([
          ['hyperliquid', mockProvider],
        ]);
        mockProvider.updatePositionTPSL.mockRejectedValue(mockError);
        mockProvider.setUserFeeDiscount = jest.fn();

        jest
          .spyOn(controller as any, 'calculateUserFeeDiscount')
          .mockResolvedValue(6500);

        await expect(
          controller.updatePositionTPSL(updateParams),
        ).rejects.toThrow('TP/SL update failed');

        expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(6500);
        expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(
          undefined,
        );
      });

      it('should update TP/SL without discount when user has no rewards', async () => {
        const updateParams = {
          coin: 'BTC',
          takeProfitPrice: '55000',
          stopLossPrice: '45000',
        };

        const mockUpdateResult = {
          success: true,
          positionId: 'pos-123',
        };

        markControllerAsInitialized();
        (controller as any).providers = new Map([
          ['hyperliquid', mockProvider],
        ]);
        mockProvider.updatePositionTPSL.mockResolvedValue(mockUpdateResult);
        mockProvider.setUserFeeDiscount = jest.fn();

        jest
          .spyOn(controller as any, 'calculateUserFeeDiscount')
          .mockResolvedValue(undefined);

        const result = await controller.updatePositionTPSL(updateParams);

        expect(result).toEqual(mockUpdateResult);
        expect(mockProvider.setUserFeeDiscount).not.toHaveBeenCalledWith(6500);
        expect(mockProvider.updatePositionTPSL).toHaveBeenCalledWith(
          updateParams,
        );
      });
    });

    it('should calculate maintenance margin', async () => {
      const marginParams = {
        coin: 'BTC',
        size: '1.0',
        entryPrice: '50000',
        asset: 'BTC',
      };

      const mockMargin = 2500;

      markControllerAsInitialized();
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
        orderType: 'market' as const,
        isMaker: false,
        amount: '100000',
        coin: 'BTC',
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

      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.calculateFees.mockResolvedValue(mockFees);

      const result = await controller.calculateFees(feeParams);

      expect(result).toEqual(mockFees);
      expect(mockProvider.calculateFees).toHaveBeenCalledWith(feeParams);
    });
  });

  describe('reportOrderToDataLake', () => {
    beforeEach(() => {
      // Mock fetch globally
      global.fetch = jest.fn();
      // Initialize controller
      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should skip data lake reporting for testnet', async () => {
      // Arrange - create a new controller with testnet state
      const mockCallTestnet = jest.fn().mockImplementation((action: string) => {
        if (action === 'RemoteFeatureFlagController:getState') {
          return {
            remoteFeatureFlags: {
              perpsPerpTradingGeoBlockedCountriesV2: {
                blockedRegions: [],
              },
            },
          };
        }
        return undefined;
      });

      const testnetController = new PerpsController({
        messenger: {
          call: mockCallTestnet,
          publish: jest.fn(),
          subscribe: jest.fn(),
          registerActionHandler: jest.fn(),
          registerEventHandler: jest.fn(),
          registerInitialEventPayload: jest.fn(),
        } as unknown as any,
        state: { ...getDefaultPerpsControllerState(), isTestnet: true },
      });

      // Initialize providers for testnet controller
      (testnetController as any).isInitialized = true;
      (testnetController as any).update((state: any) => {
        state.initializationState = 'initialized';
      });
      (testnetController as any).providers = new Map([
        ['hyperliquid', mockProvider],
      ]);

      // Clear any fetch calls from controller initialization
      (global.fetch as jest.Mock).mockClear();

      const result = await (testnetController as any).reportOrderToDataLake({
        action: 'open',
        coin: 'BTC',
      });

      expect(result.success).toBe(true);
      expect(result.error).toBe('Skipped for testnet');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('placeOrder data lake error handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(controller, 'getActiveProvider').mockReturnValue(mockProvider);
    });

    it('handles data lake reporting errors gracefully', async () => {
      markControllerAsInitialized();
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);

      mockProvider.placeOrder.mockResolvedValue({
        success: true,
        orderId: 'order123',
      });

      // Mock fetch to reject for data lake reporting
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'));

      const orderParams = {
        coin: 'BTC',
        isBuy: true,
        orderType: 'market' as const,
        size: '1',
      };

      const result = await controller.placeOrder(orderParams);

      // Wait for async data lake reporting to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert: Order should still succeed even if data lake reporting fails
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order123');

      // Verify that Logger.error was called for the data lake failure
      // The new implementation uses LoggerErrorOptions format
      const errorCalls = (Logger.error as jest.Mock).mock.calls;

      const hasDataLakeError = errorCalls.some((call) => {
        const secondArg = call[1];
        return (
          typeof secondArg === 'object' &&
          secondArg.context?.name === 'PerpsController' &&
          secondArg.context?.data?.method === 'reportOrderToDataLake' &&
          secondArg.context?.data?.coin === 'BTC' &&
          secondArg.context?.data?.action === 'open'
        );
      });
      expect(hasDataLakeError).toBe(true);
    });
  });

  describe('editOrder failure tracking', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(controller, 'getActiveProvider').mockReturnValue(mockProvider);
    });

    it('tracks failed order edit via MetaMetrics', async () => {
      mockProvider.editOrder.mockResolvedValue({
        success: false,
        error: 'Order not found',
      });

      const editParams = {
        orderId: 'order123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          orderType: 'limit' as const,
          size: '1',
          price: '50000',
        },
      };

      await controller.editOrder(editParams);

      // Check that MetaMetrics was called (the mock might be called with empty object)
      expect(MetaMetrics.getInstance().trackEvent).toHaveBeenCalled();
    });
  });

  describe('getAvailableDexs', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(controller, 'getActiveProvider').mockReturnValue(mockProvider);
    });

    it('returns available HIP-3 DEXs from provider', async () => {
      const mockDexs = ['dex1', 'dex2', 'dex3'];
      mockProvider.getAvailableDexs = jest.fn().mockResolvedValue(mockDexs);

      const result = await controller.getAvailableDexs();

      expect(result).toEqual(mockDexs);
      expect(mockProvider.getAvailableDexs).toHaveBeenCalledWith(undefined);
    });

    it('passes filter parameters to provider', async () => {
      const mockDexs = ['dex1'];
      const filterParams = { validated: true };
      mockProvider.getAvailableDexs = jest.fn().mockResolvedValue(mockDexs);

      const result = await controller.getAvailableDexs(filterParams);

      expect(result).toEqual(mockDexs);
      expect(mockProvider.getAvailableDexs).toHaveBeenCalledWith(filterParams);
    });

    it('throws error when provider does not support HIP-3', async () => {
      // Cast to any to test undefined case
      (mockProvider.getAvailableDexs as any) = undefined;

      await expect(controller.getAvailableDexs()).rejects.toThrow(
        'Provider does not support HIP-3 DEXs',
      );
    });
  });
});
