/**
 * PerpsController Tests
 * Clean, focused test suite for PerpsController
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  PerpsController,
  getDefaultPerpsControllerState,
  InitializationState,
  type PerpsControllerState,
  type PerpsControllerMessenger,
} from './PerpsController';
import { PERPS_ERROR_CODES } from './perpsErrorCodes';
import type { IPerpsProvider } from './types';
import { HyperLiquidProvider } from './providers/HyperLiquidProvider';
import { createMockHyperLiquidProvider } from '../__mocks__/providerMocks';
import Logger from '../../../../util/Logger';
import { FeatureFlagConfigurationService } from './services/FeatureFlagConfigurationService';
import { DepositService } from './services/DepositService';
import { MarketDataService } from './services/MarketDataService';
import { TradingService } from './services/TradingService';
import { AccountService } from './services/AccountService';
import { DataLakeService } from './services/DataLakeService';
import Engine from '../../../../core/Engine';

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

// Create persistent mock controllers INSIDE jest.mock factory
jest.mock('../../../../core/Engine', () => {
  const mockRewardsController = {
    getPerpsDiscountForAccount: jest.fn(),
  };

  const mockNetworkController = {
    getNetworkClientById: jest.fn().mockReturnValue({
      configuration: { chainId: '0x1' },
    }),
  };

  const mockEngineContext = {
    RewardsController: mockRewardsController,
    NetworkController: mockNetworkController,
    TransactionController: {},
  };

  // Return as default export to match the actual Engine import
  return {
    __esModule: true,
    default: {
      context: mockEngineContext,
    },
  };
});

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

// Mock DepositService
jest.mock('./services/DepositService', () => ({
  DepositService: {
    prepareTransaction: jest.fn(),
  },
}));

// Mock MarketDataService
jest.mock('./services/MarketDataService', () => ({
  MarketDataService: {
    getPositions: jest.fn(),
    getAccountState: jest.fn(),
    getMarkets: jest.fn(),
    getWithdrawalRoutes: jest.fn().mockReturnValue([]),
    validateClosePosition: jest.fn().mockResolvedValue({ isValid: true }),
    validateOrder: jest.fn(),
    calculateMaintenanceMargin: jest.fn().mockResolvedValue(0),
    calculateLiquidationPrice: jest.fn(),
    getMaxLeverage: jest.fn(),
    calculateFees: jest.fn().mockResolvedValue({ totalFee: 0 }),
    getAvailableDexs: jest.fn().mockResolvedValue([]),
    getBlockExplorerUrl: jest.fn(),
    getOrderFills: jest.fn(),
    getOrders: jest.fn(),
    getFunding: jest.fn(),
  },
}));

// Mock TradingService
jest.mock('./services/TradingService', () => ({
  TradingService: {
    placeOrder: jest.fn(),
    editOrder: jest.fn(),
    cancelOrder: jest.fn(),
    cancelOrders: jest.fn(),
    closePosition: jest.fn(),
    closePositions: jest.fn(),
    updatePositionTPSL: jest.fn(),
    updateMargin: jest.fn(),
    flipPosition: jest.fn(),
  },
}));

// Mock AccountService
jest.mock('./services/AccountService', () => ({
  AccountService: {
    withdraw: jest.fn(),
    validateWithdrawal: jest.fn(),
  },
}));

// Mock DataLakeService
jest.mock('./services/DataLakeService', () => ({
  DataLakeService: {
    reportOrder: jest.fn(),
  },
}));

// Mock FeatureFlagConfigurationService
jest.mock('./services/FeatureFlagConfigurationService', () => ({
  FeatureFlagConfigurationService: {
    refreshEligibility: jest.fn((options) => {
      // Simulate the service's behavior: extract blocked regions from remote flags
      const remoteFlags =
        options.remoteFeatureFlagControllerState.remoteFeatureFlags;
      const perpsGeoBlockedRegionsFeatureFlag =
        remoteFlags?.perpsPerpTradingGeoBlockedCountriesV2;
      const remoteBlockedRegions =
        perpsGeoBlockedRegionsFeatureFlag?.blockedRegions;

      if (
        Array.isArray(remoteBlockedRegions) &&
        options.context.setBlockedRegionList
      ) {
        const currentList = options.context.getBlockedRegionList?.();
        // Never downgrade from remote to fallback
        if (!currentList || currentList.source !== 'remote') {
          options.context.setBlockedRegionList(remoteBlockedRegions, 'remote');
        }
      }

      // Call refreshEligibility callback if available
      if (options.context.refreshEligibility) {
        options.context.refreshEligibility().catch(() => {
          // Ignore errors in mock
        });
      }

      // Also call refreshHip3Config if available
      if (remoteFlags) {
        const mockRefreshHip3Config = jest.requireMock(
          './services/FeatureFlagConfigurationService',
        ).FeatureFlagConfigurationService.refreshHip3Config;
        if (typeof mockRefreshHip3Config === 'function') {
          mockRefreshHip3Config(options);
        }
      }
    }),
    refreshHip3Config: jest.fn(),
    setBlockedRegions: jest.fn((options) => {
      // Simulate setBlockedRegions behavior
      const { list, source, context } = options;
      if (context.setBlockedRegionList && context.getBlockedRegionList) {
        const currentList = context.getBlockedRegionList();
        // Never downgrade from remote to fallback
        if (source === 'fallback' && currentList.source === 'remote') {
          return;
        }
        if (Array.isArray(list)) {
          context.setBlockedRegionList(list, source);
        }
      }

      // Call refreshEligibility callback if available
      if (context.refreshEligibility) {
        context.refreshEligibility().catch(() => {
          // Ignore errors in mock
        });
      }
    }),
  },
}));

/**
 * Testable version of PerpsController that exposes protected methods for testing.
 * This follows the pattern used in RewardsController.test.ts
 */
class TestablePerpsController extends PerpsController {
  /**
   * Test-only method to update state directly.
   * Exposed for scenarios where state needs to be manipulated
   * outside the normal public API (e.g., testing error conditions).
   */
  public testUpdate(callback: (state: PerpsControllerState) => void) {
    this.update(callback);
  }

  /**
   * Test-only method to mark controller as initialized.
   * Common test scenario that requires internal state changes.
   */
  public testMarkInitialized() {
    this.isInitialized = true;
    this.update((state) => {
      state.initializationState = InitializationState.INITIALIZED;
    });
  }

  /**
   * Test-only method to set the providers map with complete providers.
   * Used in most tests to inject mock providers.
   */
  public testSetProviders(providers: Map<string, IPerpsProvider>) {
    this.providers = providers;
  }

  /**
   * Test-only method to set the providers map with partial providers.
   * Used explicitly in tests that verify error handling with incomplete providers.
   * Type cast is intentional and necessary for testing graceful degradation.
   */
  public testSetPartialProviders(
    providers: Map<string, Partial<IPerpsProvider>>,
  ) {
    this.providers = providers as Map<string, IPerpsProvider>;
  }

  /**
   * Test-only method to get the providers map.
   * Used to verify provider state in tests.
   */
  public testGetProviders(): Map<string, IPerpsProvider> {
    return this.providers;
  }

  /**
   * Test-only method to set initialization state.
   * Allows tests to simulate both initialized and uninitialized states.
   */
  public testSetInitialized(value: boolean) {
    this.isInitialized = value;
  }

  /**
   * Test-only method to get initialization state.
   * Used to verify initialization status in tests.
   */
  public testGetInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Test-only method to get blocked region list.
   * Used to verify geo-blocking configuration in tests.
   */
  public testGetBlockedRegionList(): { source: string; list: string[] } {
    return this.blockedRegionList;
  }

  /**
   * Test-only method to set blocked region list.
   * Used to test priority logic (remote vs fallback).
   */
  public testSetBlockedRegionList(
    list: string[],
    source: 'remote' | 'fallback',
  ) {
    this.setBlockedRegionList(list, source);
  }

  /**
   * Test accessor for protected method refreshEligibilityOnFeatureFlagChange.
   * Wrapper is necessary because protected methods can't be called from test code.
   */
  public testRefreshEligibilityOnFeatureFlagChange(remoteFlags: any) {
    this.refreshEligibilityOnFeatureFlagChange(remoteFlags);
  }

  /**
   * Test accessor for protected method reportOrderToDataLake.
   * Wrapper is necessary because protected methods can't be called from test code.
   */
  public testReportOrderToDataLake(data: any): Promise<any> {
    return this.reportOrderToDataLake(data);
  }
}

/**
 * Factory function to create a properly typed mock messenger
 * Encapsulates the type assertion in one place
 * Note: Uses 'as unknown as' because PerpsControllerMessenger has private properties
 */
function createMockMessenger(
  overrides?: Partial<PerpsControllerMessenger>,
): PerpsControllerMessenger {
  const base = {
    call: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    registerActionHandler: jest.fn(),
    registerEventHandler: jest.fn(),
    registerInitialEventPayload: jest.fn(),
    unregisterActionHandler: jest.fn(),
    unregisterEventHandler: jest.fn(),
    clearEventSubscriptions: jest.fn(),
  };
  return { ...base, ...overrides } as unknown as PerpsControllerMessenger;
}

describe('PerpsController', () => {
  let controller: TestablePerpsController;
  let mockProvider: jest.Mocked<HyperLiquidProvider>;

  // Helper to mark controller as initialized for tests
  const markControllerAsInitialized = () => {
    controller.testMarkInitialized();
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Engine.context mocks to default state to prevent test interdependence
    (
      Engine.context.RewardsController.getPerpsDiscountForAccount as jest.Mock
    ).mockResolvedValue(null);
    (
      Engine.context.NetworkController.getNetworkClientById as jest.Mock
    ).mockReturnValue({ configuration: { chainId: '0x1' } });

    // Create a fresh mock provider for each test
    mockProvider = createMockHyperLiquidProvider();

    // Add default mock return values for all provider methods
    mockProvider.getPositions.mockResolvedValue([]);
    mockProvider.getAccountState.mockResolvedValue({
      availableBalance: '10000',
      totalBalance: '10000',
      marginUsed: '0',
      unrealizedPnl: '0',
      returnOnEquity: '0',
    });
    mockProvider.getMarkets.mockResolvedValue([]);
    mockProvider.getOpenOrders.mockResolvedValue([]);
    mockProvider.getFunding.mockResolvedValue([]);
    mockProvider.getOrderFills.mockResolvedValue([]);
    mockProvider.getOrders.mockResolvedValue([]);
    mockProvider.calculateLiquidationPrice.mockResolvedValue('0');
    mockProvider.getMaxLeverage.mockResolvedValue(50);
    mockProvider.calculateMaintenanceMargin.mockResolvedValue(0);
    mockProvider.calculateFees.mockResolvedValue({ feeAmount: 0 });
    mockProvider.getBlockExplorerUrl.mockReturnValue(
      'https://explorer.example.com',
    );
    mockProvider.getWithdrawalRoutes.mockReturnValue([]);

    (
      HyperLiquidProvider as jest.MockedClass<typeof HyperLiquidProvider>
    ).mockImplementation(() => mockProvider);

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

    controller = new TestablePerpsController({
      messenger: createMockMessenger({ call: mockCall }),
      state: getDefaultPerpsControllerState(),
    });
  });

  afterEach(() => {
    // Clear only provider mocks, not Engine.context mocks
    // This prevents breaking Engine.context.RewardsController/NetworkController references
    if (mockProvider) {
      Object.values(mockProvider).forEach((value) => {
        if (
          typeof value === 'object' &&
          value !== null &&
          'mockClear' in value
        ) {
          (value as jest.Mock).mockClear();
        }
      });
    }
    mockTrackEvent.mockClear();
    (Logger.error as jest.Mock).mockClear();
    (Logger.log as jest.Mock).mockClear();
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
      const testController = new TestablePerpsController({
        messenger: createMockMessenger({ call: mockCall }),
        state: getDefaultPerpsControllerState(),
      });

      // Then: Should have called to get RemoteFeatureFlagController state
      expect(testController).toBeDefined();
      expect(mockCall).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:getState',
      );
    });

    it('applies remote blocked regions when available during construction', () => {
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
      const testController = new TestablePerpsController({
        messenger: createMockMessenger({ call: mockCall }),
        state: getDefaultPerpsControllerState(),
        clientConfig: {
          fallbackBlockedRegions: ['FALLBACK-REGION'],
        },
      });

      // Then: Should have used remote regions (not fallback)
      // Verify by checking the internal blockedRegionList
      const blockedRegionList = testController.testGetBlockedRegionList();
      expect(blockedRegionList.source).toBe('remote');
      expect(blockedRegionList.list).toEqual(['US-NY', 'CA-ON']);
    });

    it('uses fallback regions when remote flags are not available', () => {
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
      const testController = new TestablePerpsController({
        messenger: createMockMessenger({ call: mockCall }),
        state: getDefaultPerpsControllerState(),
        clientConfig: {
          fallbackBlockedRegions: ['FALLBACK-US', 'FALLBACK-CA'],
        },
      });

      // Then: Should have used fallback regions
      const blockedRegionList = testController.testGetBlockedRegionList();
      expect(blockedRegionList.source).toBe('fallback');
      expect(blockedRegionList.list).toEqual(['FALLBACK-US', 'FALLBACK-CA']);
    });

    it('never downgrade from remote to fallback regions', () => {
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
      const testController = new TestablePerpsController({
        messenger: createMockMessenger({ call: mockCall }),
        state: getDefaultPerpsControllerState(),
        clientConfig: {
          fallbackBlockedRegions: ['FALLBACK-US'],
        },
      });

      // Then: Should use remote (set after fallback)
      let blockedRegionList = testController.testGetBlockedRegionList();
      expect(blockedRegionList.source).toBe('remote');
      expect(blockedRegionList.list).toEqual(['REMOTE-US']);

      // When: Attempt to set fallback again (simulating what setBlockedRegionList does)
      testController.testSetBlockedRegionList(['NEW-FALLBACK'], 'fallback');

      // Then: Should still use remote (no downgrade)
      blockedRegionList = testController.testGetBlockedRegionList();
      expect(blockedRegionList.source).toBe('remote');
      expect(blockedRegionList.list).toEqual(['REMOTE-US']);
    });

    it('continues initialization when RemoteFeatureFlagController state call throws error', () => {
      const mockCall = jest.fn().mockImplementation((action: string) => {
        if (action === 'RemoteFeatureFlagController:getState') {
          throw new Error('RemoteFeatureFlagController not ready');
        }
        return undefined;
      });
      const mockLoggerError = jest.spyOn(Logger, 'error');

      const testController = new TestablePerpsController({
        messenger: createMockMessenger({ call: mockCall }),
        state: getDefaultPerpsControllerState(),
        clientConfig: {
          fallbackBlockedRegions: ['FALLBACK-US', 'FALLBACK-CA'],
        },
      });

      expect(testController).toBeDefined();
      const blockedRegionList = testController.testGetBlockedRegionList();
      expect(blockedRegionList.source).toBe('fallback');
      expect(blockedRegionList.list).toEqual(['FALLBACK-US', 'FALLBACK-CA']);
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

  describe('HIP-3 Configuration Integration', () => {
    it('delegates HIP-3 config updates to FeatureFlagConfigurationService', () => {
      const remoteFlags = {
        remoteFeatureFlags: {
          perpsHip3AllowlistMarkets: 'BTC-USD,ETH-USD',
          perpsHip3BlocklistMarkets: 'SCAM-USD',
        },
      };

      controller.testRefreshEligibilityOnFeatureFlagChange(remoteFlags);

      expect(
        FeatureFlagConfigurationService.refreshEligibility,
      ).toHaveBeenCalledWith({
        remoteFeatureFlagControllerState: remoteFlags,
        context: expect.objectContaining({
          getHip3Config: expect.any(Function),
          setHip3Config: expect.any(Function),
          incrementHip3ConfigVersion: expect.any(Function),
        }),
      });
    });

    it('does not crash on malformed remote flags', () => {
      const malformedFlags = {
        remoteFeatureFlags: {
          perpsHip3AllowlistMarkets: 123,
        },
      };

      expect(() =>
        controller.testRefreshEligibilityOnFeatureFlagChange(malformedFlags),
      ).not.toThrow();
    });
  });

  describe('getActiveProvider', () => {
    it('throws error when not initialized', () => {
      controller.testSetInitialized(false);

      expect(() => controller.getActiveProvider()).toThrow(
        'CLIENT_NOT_INITIALIZED',
      );
    });

    it('returns provider when initialized', () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      const provider = controller.getActiveProvider();
      expect(provider).toBe(mockProvider);
    });
  });

  describe('init', () => {
    it('initializes providers successfully', async () => {
      await controller.init();

      expect(controller.testGetInitialized()).toBe(true);
      expect(controller.testGetProviders().has('hyperliquid')).toBe(true);
    });

    it('handles initialization when already initialized', async () => {
      // First initialization
      await controller.init();
      expect(controller.testGetInitialized()).toBe(true);

      // Second initialization should not throw
      await controller.init();
      expect(controller.testGetInitialized()).toBe(true);
    });

    it('allows retry after all initialization attempts fail', async () => {
      // Set up mock to throw errors BEFORE creating controller
      const networkError = new Error('Network error');
      (
        HyperLiquidProvider as jest.MockedClass<typeof HyperLiquidProvider>
      ).mockImplementation(() => {
        throw networkError;
      });

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

      const testController = new TestablePerpsController({
        messenger: createMockMessenger({ call: mockCall }),
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
      expect(testController.testGetInitialized()).toBe(false);

      // Network recovers - provider succeeds on next attempt
      (
        HyperLiquidProvider as jest.MockedClass<typeof HyperLiquidProvider>
      ).mockImplementation(() => mockProvider);

      // User retries initialization (e.g., via network switch)
      await testController.init();

      // Verify initialization succeeds (not cached failure)
      expect(testController.state.initializationState).toBe('initialized');
      expect(testController.state.initializationError).toBeNull();
      expect(testController.testGetInitialized()).toBe(true);
    }); // Fast execution with mocked wait()
  });

  describe('getPositions', () => {
    it('gets positions successfully', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getPositions')
        .mockResolvedValue(mockPositions);

      const result = await controller.getPositions();

      expect(result).toEqual(mockPositions);
      expect(MarketDataService.getPositions).toHaveBeenCalledWith({
        provider: mockProvider,
        params: undefined,
        context: expect.any(Object),
      });
    });

    it('handles getPositions error', async () => {
      const errorMessage = 'Network error';

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getPositions')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.getPositions()).rejects.toThrow(errorMessage);
      expect(MarketDataService.getPositions).toHaveBeenCalled();
    });
  });

  describe('getAccountState', () => {
    it('gets account state successfully', async () => {
      const mockAccountState = {
        availableBalance: '1000',
        marginUsed: '500',
        unrealizedPnl: '100',
        returnOnEquity: '20.0',
        totalBalance: '1600',
      };

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getAccountState')
        .mockResolvedValue(mockAccountState);

      const result = await controller.getAccountState();

      expect(result).toEqual(mockAccountState);
      expect(MarketDataService.getAccountState).toHaveBeenCalledWith({
        provider: mockProvider,
        params: undefined,
        context: expect.any(Object),
      });
    });
  });

  describe('placeOrder', () => {
    it('places order successfully', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(TradingService, 'placeOrder')
        .mockResolvedValue(mockOrderResult);

      const result = await controller.placeOrder(orderParams);

      expect(result).toEqual(mockOrderResult);
      expect(TradingService.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: mockProvider,
          params: orderParams,
          context: expect.any(Object),
        }),
      );
    });

    it('handles placeOrder error', async () => {
      const orderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market' as const,
      };

      const errorMessage = 'Order placement failed';

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(TradingService, 'placeOrder')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.placeOrder(orderParams)).rejects.toThrow(
        errorMessage,
      );
      expect(TradingService.placeOrder).toHaveBeenCalled();
    });
  });

  describe('getMarkets', () => {
    it('gets markets successfully', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getMarkets')
        .mockResolvedValue(mockMarkets);

      const result = await controller.getMarkets();

      expect(result).toEqual(mockMarkets);
      expect(MarketDataService.getMarkets).toHaveBeenCalledWith({
        provider: mockProvider,
        params: undefined,
        context: expect.any(Object),
      });
    });
  });

  describe('cancelOrder', () => {
    it('cancels order successfully', async () => {
      const cancelParams = {
        orderId: 'order-123',
        coin: 'BTC',
      };

      const mockCancelResult = {
        success: true,
        orderId: 'order-123',
      };

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(TradingService, 'cancelOrder')
        .mockResolvedValue(mockCancelResult);

      const result = await controller.cancelOrder(cancelParams);

      expect(result).toEqual(mockCancelResult);
      expect(TradingService.cancelOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: mockProvider,
          params: cancelParams,
          context: expect.any(Object),
        }),
      );
    });
  });

  describe('cancelOrders', () => {
    it('delegates to TradingService with withStreamPause callback', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      const mockImplementation = jest.fn(async (options: any) => {
        // Simulate TradingService calling the withStreamPause callback
        await options.withStreamPause(
          async () => ({
            success: true,
            successCount: 1,
            failureCount: 0,
            results: [{ coin: 'BTC', orderId: 'order-1', success: true }],
          }),
          ['orders'],
        );

        return {
          success: true,
          successCount: 1,
          failureCount: 0,
          results: [{ coin: 'BTC', orderId: 'order-1', success: true }],
        };
      });

      jest
        .spyOn(TradingService, 'cancelOrders')
        .mockImplementation(mockImplementation);

      await controller.cancelOrders({ cancelAll: true });

      expect(mockStreamManager.orders.pause).toHaveBeenCalled();
      expect(mockStreamManager.orders.resume).toHaveBeenCalled();
      expect(TradingService.cancelOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: mockProvider,
          params: { cancelAll: true },
          context: expect.any(Object),
          withStreamPause: expect.any(Function),
        }),
      );
    });

    it('resumes streams even when operation throws error', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      const mockImplementation = jest.fn(async (options: any) =>
        // Simulate TradingService calling the withStreamPause callback with an error
        options.withStreamPause(async () => {
          throw new Error('Network error');
        }, ['orders']),
      );

      jest
        .spyOn(TradingService, 'cancelOrders')
        .mockImplementation(mockImplementation);

      await expect(
        controller.cancelOrders({ cancelAll: true }),
      ).rejects.toThrow('Network error');

      expect(mockStreamManager.orders.pause).toHaveBeenCalled();
      expect(mockStreamManager.orders.resume).toHaveBeenCalled();
    });
  });

  describe('closePosition', () => {
    it('closes position successfully', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(TradingService, 'closePosition')
        .mockResolvedValue(mockCloseResult);

      const result = await controller.closePosition(closeParams);

      expect(result).toEqual(mockCloseResult);
      expect(TradingService.closePosition).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: mockProvider,
          params: closeParams,
          context: expect.any(Object),
        }),
      );
    });
  });

  describe('closePositions', () => {
    it('delegates to TradingService.closePositions', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      jest.spyOn(TradingService, 'closePositions').mockResolvedValue({
        success: true,
        successCount: 1,
        failureCount: 0,
        results: [{ coin: 'BTC', success: true }],
      });

      const result = await controller.closePositions({ closeAll: true });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(TradingService.closePositions).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: mockProvider,
          params: { closeAll: true },
          context: expect.any(Object),
        }),
      );
    });
  });

  describe('validateOrder', () => {
    it('validates order successfully', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'validateOrder')
        .mockResolvedValue(mockValidationResult);

      const result = await controller.validateOrder(orderParams);

      expect(result).toEqual(mockValidationResult);
      expect(MarketDataService.validateOrder).toHaveBeenCalledWith({
        provider: mockProvider,
        params: orderParams,
      });
    });
  });

  describe('getOrderFills', () => {
    it('gets order fills successfully', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getOrderFills')
        .mockResolvedValue(mockOrderFills);

      const result = await controller.getOrderFills();

      expect(result).toEqual(mockOrderFills);
      expect(MarketDataService.getOrderFills).toHaveBeenCalledWith({
        provider: mockProvider,
        params: undefined,
        context: expect.any(Object),
      });
    });
  });

  describe('getOrders', () => {
    it('gets orders successfully', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest.spyOn(MarketDataService, 'getOrders').mockResolvedValue(mockOrders);

      const result = await controller.getOrders();

      expect(result).toEqual(mockOrders);
      expect(MarketDataService.getOrders).toHaveBeenCalledWith({
        provider: mockProvider,
        params: undefined,
        context: expect.any(Object),
      });
    });
  });

  describe('subscribeToPrices', () => {
    it('subscribes to price updates', () => {
      const mockUnsubscribe = jest.fn();
      const params = {
        symbols: ['BTC', 'ETH'],
        callback: jest.fn(),
      };

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      mockProvider.subscribeToPrices.mockReturnValue(mockUnsubscribe);

      const unsubscribe = controller.subscribeToPrices(params);

      expect(unsubscribe).toBe(mockUnsubscribe);
      expect(mockProvider.subscribeToPrices).toHaveBeenCalledWith(params);
    });
  });

  describe('subscribeToPositions', () => {
    it('subscribes to position updates', () => {
      const mockUnsubscribe = jest.fn();
      const params = {
        callback: jest.fn(),
      };

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      mockProvider.subscribeToPositions.mockReturnValue(mockUnsubscribe);

      const unsubscribe = controller.subscribeToPositions(params);

      expect(unsubscribe).toBe(mockUnsubscribe);
      expect(mockProvider.subscribeToPositions).toHaveBeenCalledWith(params);
    });
  });

  describe('withdraw', () => {
    it('withdraws successfully', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(AccountService, 'withdraw')
        .mockResolvedValue(mockWithdrawResult);

      const result = await controller.withdraw(withdrawParams);

      expect(result).toEqual(mockWithdrawResult);
      expect(AccountService.withdraw).toHaveBeenCalledWith({
        provider: mockProvider,
        params: withdrawParams,
        context: expect.objectContaining({
          tracingContext: expect.any(Object),
          analytics: expect.any(Object),
          errorContext: expect.objectContaining({ method: 'withdraw' }),
          stateManager: expect.any(Object),
        }),
        refreshAccountState: expect.any(Function),
      });
    });
  });

  describe('calculateLiquidationPrice', () => {
    it('calculates liquidation price successfully', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'calculateLiquidationPrice')
        .mockResolvedValue(mockLiquidationPrice);

      const result =
        await controller.calculateLiquidationPrice(liquidationParams);

      expect(result).toBe(mockLiquidationPrice);
      expect(MarketDataService.calculateLiquidationPrice).toHaveBeenCalledWith({
        provider: mockProvider,
        params: liquidationParams,
      });
    });
  });

  describe('getMaxLeverage', () => {
    it('gets max leverage successfully', async () => {
      const asset = 'BTC';
      const mockMaxLeverage = 50;

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getMaxLeverage')
        .mockResolvedValue(mockMaxLeverage);

      const result = await controller.getMaxLeverage(asset);

      expect(result).toBe(mockMaxLeverage);
      expect(MarketDataService.getMaxLeverage).toHaveBeenCalledWith({
        provider: mockProvider,
        asset,
      });
    });
  });

  describe('getWithdrawalRoutes', () => {
    it('gets withdrawal routes successfully', () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getWithdrawalRoutes')
        .mockReturnValue(mockRoutes);

      const result = controller.getWithdrawalRoutes();

      expect(result).toEqual(mockRoutes);
      expect(MarketDataService.getWithdrawalRoutes).toHaveBeenCalledWith({
        provider: mockProvider,
      });
    });
  });

  describe('getBlockExplorerUrl', () => {
    it('gets block explorer URL successfully', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const mockUrl =
        'https://app.hyperliquid.xyz/explorer/address/0x1234567890123456789012345678901234567890';

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getBlockExplorerUrl')
        .mockReturnValue(mockUrl);

      const result = controller.getBlockExplorerUrl(address);

      expect(result).toBe(mockUrl);
      expect(MarketDataService.getBlockExplorerUrl).toHaveBeenCalledWith({
        provider: mockProvider,
        address,
      });
    });
  });

  describe('error handling', () => {
    it('handles provider errors gracefully', async () => {
      const errorMessage = 'Provider connection failed';

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getPositions')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.getPositions()).rejects.toThrow(errorMessage);
      expect(MarketDataService.getPositions).toHaveBeenCalled();
    });

    it('handles network errors', async () => {
      const errorMessage = 'Network timeout';

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getAccountState')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.getAccountState()).rejects.toThrow(errorMessage);
      expect(MarketDataService.getAccountState).toHaveBeenCalled();
    });
  });

  describe('state management', () => {
    it('returns positions without updating state', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getPositions')
        .mockResolvedValue(mockPositions);

      const result = await controller.getPositions();

      expect(result).toEqual(mockPositions);
      expect(MarketDataService.getPositions).toHaveBeenCalled();
    });

    it('handles errors without updating state', async () => {
      const errorMessage = 'Failed to fetch positions';

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getPositions')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.getPositions()).rejects.toThrow(errorMessage);
      expect(MarketDataService.getPositions).toHaveBeenCalled();
    });
  });

  describe('connection management', () => {
    it('handles disconnection', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      mockProvider.disconnect.mockResolvedValue({ success: true });

      await controller.disconnect();

      expect(mockProvider.disconnect).toHaveBeenCalled();
      expect(controller.state.connectionStatus).toBe('disconnected');
    });

    it('handles connection status from state', () => {
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
    it('gets funding information', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getFunding')
        .mockResolvedValue(mockFunding);

      const result = await controller.getFunding();

      expect(result).toEqual(mockFunding);
      expect(MarketDataService.getFunding).toHaveBeenCalledWith({
        provider: mockProvider,
        params: undefined,
        context: expect.any(Object),
      });
    });

    it('gets order fills with parameters', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getOrderFills')
        .mockResolvedValue(mockOrderFills);

      const result = await controller.getOrderFills(params);

      expect(result).toEqual(mockOrderFills);
      expect(MarketDataService.getOrderFills).toHaveBeenCalledWith({
        provider: mockProvider,
        params,
        context: expect.any(Object),
      });
    });
  });

  describe('order management', () => {
    it('edits order successfully', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest.spyOn(TradingService, 'editOrder').mockResolvedValue(mockEditResult);

      const result = await controller.editOrder(editParams);

      expect(result).toEqual(mockEditResult);
      expect(TradingService.editOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: mockProvider,
          params: editParams,
          context: expect.any(Object),
        }),
      );
    });

    it('handles edit order error', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(TradingService, 'editOrder')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.editOrder(editParams)).rejects.toThrow(
        errorMessage,
      );
      expect(TradingService.editOrder).toHaveBeenCalled();
    });
  });

  describe('subscription management', () => {
    it('subscribes to order fills', () => {
      const mockUnsubscribe = jest.fn();
      const params = {
        callback: jest.fn(),
      };

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      mockProvider.subscribeToOrderFills.mockReturnValue(mockUnsubscribe);

      const unsubscribe = controller.subscribeToOrderFills(params);

      expect(unsubscribe).toBe(mockUnsubscribe);
      expect(mockProvider.subscribeToOrderFills).toHaveBeenCalledWith(params);
    });

    it('sets live data configuration', () => {
      const config = {
        priceThrottleMs: 1000,
        positionThrottleMs: 2000,
      };

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      mockProvider.setLiveDataConfig.mockReturnValue(undefined);

      controller.setLiveDataConfig(config);

      expect(mockProvider.setLiveDataConfig).toHaveBeenCalledWith(config);
    });

    it('handles subscription cleanup', () => {
      const mockUnsubscribe = jest.fn();
      const params = {
        symbols: ['BTC', 'ETH'],
        callback: jest.fn(),
      };

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      mockProvider.subscribeToPrices.mockReturnValue(mockUnsubscribe);

      const unsubscribe = controller.subscribeToPrices(params);

      // Test that unsubscribe function works
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('deposit operations', () => {
    it('clears deposit result', () => {
      // Test that clearDepositResult method exists and can be called
      expect(() => controller.clearDepositResult()).not.toThrow();

      // Verify the method was called (it's a void method)
      expect(typeof controller.clearDepositResult).toBe('function');
    });
  });

  describe('withdrawal operations', () => {
    it('clears withdraw result', () => {
      // Test that clearWithdrawResult method exists and can be called
      expect(() => controller.clearWithdrawResult()).not.toThrow();

      // Verify the method was called (it's a void method)
      expect(typeof controller.clearWithdrawResult).toBe('function');
    });
  });

  describe('network management', () => {
    it('gets current network', () => {
      const network = controller.getCurrentNetwork();

      expect(['mainnet', 'testnet']).toContain(network);
      expect(typeof network).toBe('string');
    });

    it('gets withdrawal routes', () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'getWithdrawalRoutes')
        .mockReturnValue(mockRoutes);

      const result = controller.getWithdrawalRoutes();

      expect(result).toEqual(mockRoutes);
      expect(MarketDataService.getWithdrawalRoutes).toHaveBeenCalledWith({
        provider: mockProvider,
      });
    });
  });

  describe('user management', () => {
    it('checks if first time user on current network', () => {
      const isFirstTime = controller.isFirstTimeUserOnCurrentNetwork();

      expect(typeof isFirstTime).toBe('boolean');
    });

    it('marks tutorial as completed', () => {
      // Test that markTutorialCompleted method exists and can be called
      expect(() => controller.markTutorialCompleted()).not.toThrow();

      // Verify the method was called (it's a void method)
      expect(typeof controller.markTutorialCompleted).toBe('function');
    });
  });

  describe('watchlist markets', () => {
    it('returns empty array by default', () => {
      const watchlist = controller.getWatchlistMarkets();
      expect(watchlist).toEqual([]);
    });

    it('toggles watchlist market (add)', () => {
      controller.toggleWatchlistMarket('BTC');

      const watchlist = controller.getWatchlistMarkets();
      expect(watchlist).toContain('BTC');
      expect(controller.isWatchlistMarket('BTC')).toBe(true);
    });

    it('toggles watchlist market (remove)', () => {
      controller.toggleWatchlistMarket('BTC');
      controller.toggleWatchlistMarket('BTC');

      const watchlist = controller.getWatchlistMarkets();
      expect(watchlist).not.toContain('BTC');
      expect(controller.isWatchlistMarket('BTC')).toBe(false);
    });

    it('handles multiple watchlist markets', () => {
      controller.toggleWatchlistMarket('BTC');
      controller.toggleWatchlistMarket('ETH');
      controller.toggleWatchlistMarket('SOL');

      const watchlist = controller.getWatchlistMarkets();
      expect(watchlist).toHaveLength(3);
      expect(watchlist).toContain('BTC');
      expect(watchlist).toContain('ETH');
      expect(watchlist).toContain('SOL');
    });

    it('persist watchlist per network', () => {
      // Add to watchlist on mainnet (default is testnet in dev, so set to false)
      controller.testUpdate((state) => {
        state.isTestnet = false;
      });
      controller.toggleWatchlistMarket('BTC');

      const mainnetWatchlist = controller.getWatchlistMarkets();
      expect(mainnetWatchlist).toContain('BTC');

      // Switch to testnet
      controller.testUpdate((state) => {
        state.isTestnet = true;
      });
      const testnetWatchlist = controller.getWatchlistMarkets();
      expect(testnetWatchlist).toEqual([]);

      // Add to watchlist on testnet
      controller.toggleWatchlistMarket('ETH');
      expect(controller.getWatchlistMarkets()).toContain('ETH');
      expect(controller.isWatchlistMarket('ETH')).toBe(true);

      // Switch back to mainnet
      controller.testUpdate((state) => {
        state.isTestnet = false;
      });
      expect(controller.getWatchlistMarkets()).toContain('BTC');
      expect(controller.getWatchlistMarkets()).not.toContain('ETH');
    });
  });

  describe('additional subscriptions', () => {
    it('subscribes to orders', () => {
      const mockUnsubscribe = jest.fn();
      const params = {
        callback: jest.fn(),
      };

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      mockProvider.subscribeToOrders.mockReturnValue(mockUnsubscribe);

      const unsubscribe = controller.subscribeToOrders(params);

      expect(unsubscribe).toBe(mockUnsubscribe);
      expect(mockProvider.subscribeToOrders).toHaveBeenCalledWith(params);
    });

    it('subscribes to account updates', () => {
      const mockUnsubscribe = jest.fn();
      const params = {
        callback: jest.fn(),
      };

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      mockProvider.subscribeToAccount.mockReturnValue(mockUnsubscribe);

      const unsubscribe = controller.subscribeToAccount(params);

      expect(unsubscribe).toBe(mockUnsubscribe);
      expect(mockProvider.subscribeToAccount).toHaveBeenCalledWith(params);
    });
  });

  describe('validation methods', () => {
    it('validates close position', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'validateClosePosition')
        .mockResolvedValue(mockValidationResult);

      const result = await controller.validateClosePosition(closeParams);

      expect(result).toEqual(mockValidationResult);
      expect(MarketDataService.validateClosePosition).toHaveBeenCalledWith({
        provider: mockProvider,
        params: closeParams,
      });
    });

    it('validates withdrawal', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(AccountService, 'validateWithdrawal')
        .mockResolvedValue(mockValidationResult);

      const result = await controller.validateWithdrawal(withdrawParams);

      expect(result).toEqual(mockValidationResult);
      expect(AccountService.validateWithdrawal).toHaveBeenCalledWith({
        provider: mockProvider,
        params: withdrawParams,
      });
    });
  });

  describe('position management', () => {
    it('updates position TP/SL', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(TradingService, 'updatePositionTPSL')
        .mockResolvedValue(mockUpdateResult);

      const result = await controller.updatePositionTPSL(updateParams);

      expect(result).toEqual(mockUpdateResult);
      expect(TradingService.updatePositionTPSL).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: mockProvider,
          params: updateParams,
          context: expect.any(Object),
        }),
      );
    });

    it('calculates maintenance margin', async () => {
      const marginParams = {
        coin: 'BTC',
        size: '1.0',
        entryPrice: '50000',
        asset: 'BTC',
      };

      const mockMargin = 2500;

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'calculateMaintenanceMargin')
        .mockResolvedValue(mockMargin);

      const result = await controller.calculateMaintenanceMargin(marginParams);

      expect(result).toBe(mockMargin);
      expect(MarketDataService.calculateMaintenanceMargin).toHaveBeenCalledWith(
        {
          provider: mockProvider,
          params: marginParams,
        },
      );
    });

    it('updates margin successfully', async () => {
      const updateMarginParams = {
        coin: 'BTC',
        amount: '100',
      };

      const mockUpdateResult = {
        success: true,
      };

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(TradingService, 'updateMargin')
        .mockResolvedValue(mockUpdateResult);

      const result = await controller.updateMargin(updateMarginParams);

      expect(result).toEqual(mockUpdateResult);
      expect(TradingService.updateMargin).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: mockProvider,
          coin: updateMarginParams.coin,
          amount: '100',
          context: expect.any(Object),
        }),
      );
    });

    it('handles updateMargin error', async () => {
      const updateMarginParams = {
        coin: 'BTC',
        amount: '100',
      };

      const errorMessage = 'Insufficient balance';

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(TradingService, 'updateMargin')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.updateMargin(updateMarginParams)).rejects.toThrow(
        errorMessage,
      );
      expect(TradingService.updateMargin).toHaveBeenCalled();
    });

    it('flips position successfully', async () => {
      const mockPosition = {
        coin: 'BTC',
        size: '0.5',
        entryPrice: '50000',
        positionValue: '25000',
        unrealizedPnl: '1000',
        returnOnEquity: '0.04',
        leverage: { type: 'cross' as const, value: 10 },
        liquidationPrice: '45000',
        marginUsed: '2500',
        maxLeverage: 100,
        cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
        takeProfitCount: 0,
        stopLossCount: 0,
      };

      const flipPositionParams = {
        coin: 'BTC',
        position: mockPosition,
      };

      const mockFlipResult = {
        success: true,
        orderId: 'flip-123',
        filledSize: '1.0',
        averagePrice: '50000',
      };

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(TradingService, 'flipPosition')
        .mockResolvedValue(mockFlipResult);

      const result = await controller.flipPosition(flipPositionParams);

      expect(result).toEqual(mockFlipResult);
      expect(TradingService.flipPosition).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: mockProvider,
          position: mockPosition,
          context: expect.any(Object),
        }),
      );
    });

    it('handles flipPosition error', async () => {
      const mockPosition = {
        coin: 'BTC',
        size: '0.5',
        entryPrice: '50000',
        positionValue: '25000',
        unrealizedPnl: '1000',
        returnOnEquity: '0.04',
        leverage: { type: 'cross' as const, value: 10 },
        liquidationPrice: '45000',
        marginUsed: '2500',
        maxLeverage: 100,
        cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
        takeProfitCount: 0,
        stopLossCount: 0,
      };

      const flipPositionParams = {
        coin: 'BTC',
        position: mockPosition,
      };

      const errorMessage = 'Insufficient balance for flip fees';

      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(TradingService, 'flipPosition')
        .mockRejectedValue(new Error(errorMessage));

      await expect(controller.flipPosition(flipPositionParams)).rejects.toThrow(
        errorMessage,
      );
      expect(TradingService.flipPosition).toHaveBeenCalled();
    });
  });

  describe('fee calculations', () => {
    it('calculates fees', async () => {
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
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      jest
        .spyOn(MarketDataService, 'calculateFees')
        .mockResolvedValue(mockFees);

      const result = await controller.calculateFees(feeParams);

      expect(result).toEqual(mockFees);
      expect(MarketDataService.calculateFees).toHaveBeenCalledWith({
        provider: mockProvider,
        params: feeParams,
      });
    });
  });

  describe('reportOrderToDataLake', () => {
    beforeEach(() => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
    });

    it('delegates to DataLakeService.reportOrder', async () => {
      const mockReportResult = {
        success: true,
        error: undefined,
      };

      jest
        .spyOn(DataLakeService, 'reportOrder')
        .mockResolvedValue(mockReportResult);

      const orderParams = {
        action: 'open' as const,
        coin: 'BTC',
        sl_price: 45000,
        tp_price: 55000,
      };

      const result = await controller.testReportOrderToDataLake(orderParams);

      expect(result).toEqual(mockReportResult);
      expect(DataLakeService.reportOrder).toHaveBeenCalledWith({
        action: orderParams.action,
        coin: orderParams.coin,
        sl_price: orderParams.sl_price,
        tp_price: orderParams.tp_price,
        isTestnet: controller.state.isTestnet,
        context: expect.objectContaining({
          tracingContext: expect.any(Object),
          analytics: expect.any(Object),
          errorContext: expect.objectContaining({
            method: 'reportOrderToDataLake',
          }),
          stateManager: expect.any(Object),
        }),
        retryCount: undefined,
        _traceId: undefined,
      });
    });
  });

  describe('getAvailableDexs', () => {
    beforeEach(() => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
    });

    it('returns available HIP-3 DEXs from provider', async () => {
      const mockDexs = ['dex1', 'dex2', 'dex3'];
      jest
        .spyOn(MarketDataService, 'getAvailableDexs')
        .mockResolvedValue(mockDexs);

      const result = await controller.getAvailableDexs();

      expect(result).toEqual(mockDexs);
      expect(MarketDataService.getAvailableDexs).toHaveBeenCalledWith({
        provider: mockProvider,
        params: undefined,
      });
    });

    it('passes filter parameters to provider', async () => {
      const mockDexs = ['dex1'];
      const filterParams = { validated: true };
      jest
        .spyOn(MarketDataService, 'getAvailableDexs')
        .mockResolvedValue(mockDexs);

      const result = await controller.getAvailableDexs(filterParams);

      expect(result).toEqual(mockDexs);
      expect(MarketDataService.getAvailableDexs).toHaveBeenCalledWith({
        provider: mockProvider,
        params: filterParams,
      });
    });

    it('throws error when provider does not support HIP-3', async () => {
      jest
        .spyOn(MarketDataService, 'getAvailableDexs')
        .mockRejectedValue(new Error('Provider does not support HIP-3 DEXs'));

      await expect(controller.getAvailableDexs()).rejects.toThrow(
        'Provider does not support HIP-3 DEXs',
      );
    });
  });

  describe('depositWithConfirmation', () => {
    const mockTransaction = {
      from: '0x1234567890123456789012345678901234567890',
      to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      value: '0x0',
      data: '0x',
    };

    const mockDepositId = 'deposit-123';
    const mockAssetChainId = '0x1';
    const mockNetworkClientId = 'mainnet';
    const mockTransactionMeta = { id: 'tx-meta-123' };
    const mockTxHash = '0xhash123';

    beforeEach(() => {
      // Mock DepositService
      jest.spyOn(DepositService, 'prepareTransaction').mockResolvedValue({
        transaction: mockTransaction,
        assetChainId: mockAssetChainId,
        currentDepositId: mockDepositId,
      });

      // Mock NetworkController
      Engine.context.NetworkController.findNetworkClientIdByChainId = jest
        .fn()
        .mockReturnValue(mockNetworkClientId);

      // Mock TransactionController with promise-based result
      Engine.context.TransactionController.addTransaction = jest
        .fn()
        .mockResolvedValue({
          result: Promise.resolve(mockTxHash),
          transactionMeta: mockTransactionMeta,
        });
    });

    afterEach(() => {
      // Clean up mock properties added in beforeEach to prevent test pollution
      delete (Engine.context.NetworkController as any)
        .findNetworkClientIdByChainId;
      delete (Engine.context.TransactionController as any).addTransaction;
      jest.clearAllMocks();
    });

    it('returns promise result', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      const result = await controller.depositWithConfirmation('100');

      expect(result).toEqual({
        result: expect.any(Promise),
      });
    });

    it('delegates to DepositService.prepareTransaction', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      await controller.depositWithConfirmation('100');

      expect(DepositService.prepareTransaction).toHaveBeenCalledWith({
        provider: mockProvider,
      });
    });

    it('calls NetworkController.findNetworkClientIdByChainId with correct chainId', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      await controller.depositWithConfirmation('100');

      expect(
        Engine.context.NetworkController.findNetworkClientIdByChainId,
      ).toHaveBeenCalledWith(mockAssetChainId);
    });

    it('calls TransactionController.addTransaction with prepared transaction', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      await controller.depositWithConfirmation('100');

      expect(
        Engine.context.TransactionController.addTransaction,
      ).toHaveBeenCalledWith(mockTransaction, {
        networkClientId: mockNetworkClientId,
        origin: 'metamask',
        type: 'perpsDeposit',
        skipInitialGasEstimate: true,
      });
    });

    it('throws error when controller not initialized', async () => {
      controller.testSetInitialized(false);

      await expect(controller.depositWithConfirmation('100')).rejects.toThrow(
        'CLIENT_NOT_INITIALIZED',
      );
    });

    it('throws error when no active provider', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map());

      await expect(controller.depositWithConfirmation('100')).rejects.toThrow();
    });

    it('propagates DepositService errors', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      const mockError = new Error('Deposit service failed');
      jest
        .spyOn(DepositService, 'prepareTransaction')
        .mockRejectedValue(mockError);

      await expect(controller.depositWithConfirmation('100')).rejects.toThrow(
        'Deposit service failed',
      );
    });

    it('propagates NetworkController errors', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      const mockError = new Error('Network client not found');
      Engine.context.NetworkController.findNetworkClientIdByChainId = jest
        .fn()
        .mockImplementation(() => {
          throw mockError;
        });

      await expect(controller.depositWithConfirmation('100')).rejects.toThrow(
        'Network client not found',
      );
    });

    it('propagates TransactionController errors', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      const mockError = new Error('Transaction failed');
      Engine.context.TransactionController.addTransaction = jest
        .fn()
        .mockRejectedValue(mockError);

      await expect(controller.depositWithConfirmation('100')).rejects.toThrow(
        'Transaction failed',
      );
    });

    it('clears transaction ID when error occurs and not user cancellation', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      controller.testUpdate((state) => {
        state.lastDepositTransactionId = 'old-tx-id';
      });
      const mockError = new Error('Network error');
      Engine.context.TransactionController.addTransaction = jest
        .fn()
        .mockRejectedValue(mockError);

      await expect(controller.depositWithConfirmation('100')).rejects.toThrow(
        'Network error',
      );

      expect(controller.state.lastDepositTransactionId).toBeNull();
    });

    it('preserves state when user cancels transaction', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      controller.testUpdate((state) => {
        state.lastDepositTransactionId = 'old-tx-id';
      });
      const mockError = new Error('User denied transaction signature');
      Engine.context.TransactionController.addTransaction = jest
        .fn()
        .mockRejectedValue(mockError);

      await expect(controller.depositWithConfirmation('100')).rejects.toThrow(
        'User denied',
      );

      // When user cancels, transaction ID is not cleared
      expect(controller.state.lastDepositTransactionId).toBe('old-tx-id');
    });

    it('clears stale deposit results before transaction', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
      controller.testUpdate((state) => {
        state.lastDepositResult = {
          success: true,
          txHash: '0xold',
          amount: '50',
          asset: 'USDC',
          timestamp: Date.now() - 1000,
          error: '',
        };
      });

      const { result } = await controller.depositWithConfirmation('100');

      await result;

      // After promise resolves, lastDepositResult is set with new result
      expect(controller.state.lastDepositResult).toBeTruthy();
      expect(controller.state.lastDepositResult?.success).toBe(true);
    });

    it('updates state with transaction details', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      await controller.depositWithConfirmation('100');

      expect(controller.state.lastDepositTransactionId).toBe('tx-meta-123');
    });

    it('stores depositId from service immediately', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      await controller.depositWithConfirmation('100');

      expect(controller.state.depositRequests[0].id).toBe(mockDepositId);
    });

    it('delegates to DepositService with provider', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      await controller.depositWithConfirmation('100');

      expect(DepositService.prepareTransaction).toHaveBeenCalledWith({
        provider: mockProvider,
      });
    });

    it('adds deposit request to tracking initially as pending', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      await controller.depositWithConfirmation('100');

      expect(controller.state.depositRequests).toHaveLength(1);
      expect(controller.state.depositRequests[0].id).toBe(mockDepositId);
      expect(controller.state.depositRequests[0].amount).toBe('100');
      expect(controller.state.depositRequests[0].asset).toBe('USDC');
    });

    it('uses default amount when not provided', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      await controller.depositWithConfirmation();

      expect(controller.state.depositRequests[0].amount).toBe('0');
    });

    it('updates deposit request to completed when transaction succeeds', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      const { result } = await controller.depositWithConfirmation('100');

      await result;

      // After promise resolves, deposit request is marked as completed
      expect(controller.state.depositRequests[0].status).toBe('completed');
      expect(controller.state.depositRequests[0].success).toBe(true);
      expect(controller.state.depositRequests[0].txHash).toBe(mockTxHash);
    });

    it('handles concurrent deposit operations without data corruption', async () => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));

      const deposit1 = controller.depositWithConfirmation('100');
      const deposit2 = controller.depositWithConfirmation('200');

      await Promise.all([deposit1, deposit2]);

      expect(controller.state.depositRequests).toHaveLength(2);
      const amounts = controller.state.depositRequests.map((req) => req.amount);
      expect(amounts).toContain('100');
      expect(amounts).toContain('200');
    });
  });

  describe('updateWithdrawalStatus', () => {
    const mockWithdrawalId = 'withdrawal-123';
    const mockTxHash = '0xhash456';

    beforeEach(() => {
      markControllerAsInitialized();
      controller.testUpdate((state) => {
        state.withdrawalRequests = [
          {
            id: mockWithdrawalId,
            timestamp: Date.now(),
            amount: '50',
            asset: 'USDC',
            success: false,
            status: 'pending',
            source: 'hyperliquid',
          },
        ];
      });
    });

    it('updates withdrawal status to completed with txHash', () => {
      controller.updateWithdrawalStatus(
        mockWithdrawalId,
        'completed',
        mockTxHash,
      );

      const withdrawal = controller.state.withdrawalRequests[0];
      expect(withdrawal.status).toBe('completed');
      expect(withdrawal.txHash).toBe(mockTxHash);
      expect(withdrawal.success).toBe(true);
    });

    it('updates withdrawal status to failed', () => {
      controller.updateWithdrawalStatus(mockWithdrawalId, 'failed');

      const withdrawal = controller.state.withdrawalRequests[0];
      expect(withdrawal.status).toBe('failed');
      expect(withdrawal.success).toBe(false);
    });

    it('clears withdrawal progress when status completed', () => {
      controller.testUpdate((state) => {
        state.withdrawalProgress = {
          progress: 50,
          lastUpdated: Date.now() - 1000,
          activeWithdrawalId: mockWithdrawalId,
        };
      });

      controller.updateWithdrawalStatus(
        mockWithdrawalId,
        'completed',
        mockTxHash,
      );

      expect(controller.state.withdrawalProgress.progress).toBe(0);
      expect(controller.state.withdrawalProgress.activeWithdrawalId).toBeNull();
    });

    it('clears withdrawal progress when status failed', () => {
      controller.testUpdate((state) => {
        state.withdrawalProgress = {
          progress: 75,
          lastUpdated: Date.now() - 1000,
          activeWithdrawalId: mockWithdrawalId,
        };
      });

      controller.updateWithdrawalStatus(mockWithdrawalId, 'failed');

      expect(controller.state.withdrawalProgress.progress).toBe(0);
      expect(controller.state.withdrawalProgress.activeWithdrawalId).toBeNull();
    });

    it('finds withdrawal by ID', () => {
      controller.testUpdate((state) => {
        state.withdrawalRequests.push({
          id: 'withdrawal-456',
          timestamp: Date.now(),
          amount: '75',
          asset: 'USDC',
          success: false,
          status: 'pending',
          source: 'hyperliquid',
        });
      });

      controller.updateWithdrawalStatus(
        'withdrawal-456',
        'completed',
        mockTxHash,
      );

      expect(controller.state.withdrawalRequests[1].status).toBe('completed');
      expect(controller.state.withdrawalRequests[0].status).toBe('pending');
    });

    it('does nothing when withdrawal ID not found', () => {
      const initialRequests = [...controller.state.withdrawalRequests];

      controller.updateWithdrawalStatus(
        'non-existent-id',
        'completed',
        mockTxHash,
      );

      expect(controller.state.withdrawalRequests).toEqual(initialRequests);
    });

    it('updates state correctly for multiple withdrawals', () => {
      controller.testUpdate((state) => {
        state.withdrawalRequests.push({
          id: 'withdrawal-789',
          timestamp: Date.now(),
          amount: '100',
          asset: 'USDC',
          success: false,
          status: 'pending',
          source: 'hyperliquid',
        });
      });

      controller.updateWithdrawalStatus(
        mockWithdrawalId,
        'completed',
        mockTxHash,
      );

      expect(controller.state.withdrawalRequests[0].status).toBe('completed');
      expect(controller.state.withdrawalRequests[1].status).toBe('pending');
    });

    it('handles undefined txHash gracefully', () => {
      controller.updateWithdrawalStatus(mockWithdrawalId, 'completed');

      const withdrawal = controller.state.withdrawalRequests[0];
      expect(withdrawal.status).toBe('completed');
      expect(withdrawal.txHash).toBeUndefined();
      expect(withdrawal.success).toBe(true);
    });
  });

  describe('markFirstOrderCompleted', () => {
    beforeEach(() => {
      markControllerAsInitialized();
    });

    it('marks first order completed for mainnet', () => {
      controller.testUpdate((state) => {
        state.isTestnet = false;
      });

      controller.markFirstOrderCompleted();

      expect(controller.state.hasPlacedFirstOrder.mainnet).toBe(true);
    });

    it('marks first order completed for testnet', () => {
      controller.testUpdate((state) => {
        state.isTestnet = true;
      });

      controller.markFirstOrderCompleted();

      expect(controller.state.hasPlacedFirstOrder.testnet).toBe(true);
    });

    it('only updates status for current network', () => {
      controller.testUpdate((state) => {
        state.isTestnet = false;
        state.hasPlacedFirstOrder = {
          mainnet: false,
          testnet: false,
        };
      });

      controller.markFirstOrderCompleted();

      expect(controller.state.hasPlacedFirstOrder.mainnet).toBe(true);
      expect(controller.state.hasPlacedFirstOrder.testnet).toBe(false);
    });

    it('does not crash when called multiple times', () => {
      controller.testUpdate((state) => {
        state.isTestnet = false;
      });

      controller.markFirstOrderCompleted();
      expect(controller.state.hasPlacedFirstOrder.mainnet).toBe(true);

      controller.markFirstOrderCompleted();
      expect(controller.state.hasPlacedFirstOrder.mainnet).toBe(true);
    });

    it('logs completion without throwing', () => {
      controller.testUpdate((state) => {
        state.isTestnet = false;
      });

      expect(() => controller.markFirstOrderCompleted()).not.toThrow();
    });
  });

  describe('getWithdrawalRoutes error handling', () => {
    beforeEach(() => {
      markControllerAsInitialized();
      controller.testSetProviders(new Map([['hyperliquid', mockProvider]]));
    });

    it('logs error in getWithdrawalRoutes when provider throws', () => {
      const mockError = new Error('Provider error');
      jest
        .spyOn(MarketDataService, 'getWithdrawalRoutes')
        .mockImplementation(() => {
          throw mockError;
        });

      const result = controller.getWithdrawalRoutes();

      expect(result).toEqual([]);
      expect(Logger.error).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          context: expect.objectContaining({
            name: 'PerpsController',
            data: expect.objectContaining({
              method: 'getWithdrawalRoutes',
            }),
          }),
        }),
      );
    });

    it('returns empty array from getWithdrawalRoutes on error', () => {
      jest
        .spyOn(MarketDataService, 'getWithdrawalRoutes')
        .mockImplementation(() => {
          throw new Error('Service failure');
        });

      const result = controller.getWithdrawalRoutes();

      expect(result).toEqual([]);
    });

    it('handles edge case with null provider gracefully', () => {
      controller.testSetProviders(new Map());

      expect(() => controller.getWithdrawalRoutes()).not.toThrow();
      expect(controller.getWithdrawalRoutes()).toEqual([]);
    });
  });

  describe('toggleTestnet', () => {
    it('returns error when already reinitializing', async () => {
      await controller.init();
      (controller as any).isReinitializing = true;

      const result = await controller.toggleTestnet();

      expect(result.success).toBe(false);
      expect(result.error).toBe(PERPS_ERROR_CODES.CLIENT_REINITIALIZING);
      expect(result.isTestnet).toBe(false);
    });

    it('toggles to testnet network', async () => {
      await controller.init();
      const initialTestnetState = controller.state.isTestnet;

      const result = await controller.toggleTestnet();

      expect(result.success).toBe(true);
      expect(result.isTestnet).toBe(!initialTestnetState);
      expect(controller.state.isTestnet).toBe(!initialTestnetState);
    });
  });

  describe('market filter preferences', () => {
    it('saves and retrieves filter preference', () => {
      controller.saveMarketFilterPreferences('openInterest');

      const result = controller.getMarketFilterPreferences();

      expect(result).toBe('openInterest');
    });
  });

  describe('watchlist management', () => {
    it('adds and removes market from watchlist', async () => {
      await controller.init();

      controller.toggleWatchlistMarket('BTC');

      expect(controller.isWatchlistMarket('BTC')).toBe(true);
      expect(controller.getWatchlistMarkets()).toContain('BTC');

      controller.toggleWatchlistMarket('BTC');

      expect(controller.isWatchlistMarket('BTC')).toBe(false);
    });
  });

  describe('resetFirstTimeUserState', () => {
    it('resets tutorial and order state for both networks', () => {
      controller.markTutorialCompleted();
      controller.markFirstOrderCompleted();

      controller.resetFirstTimeUserState();

      expect(controller.state.isFirstTimeUser.testnet).toBe(true);
      expect(controller.state.isFirstTimeUser.mainnet).toBe(true);
      expect(controller.state.hasPlacedFirstOrder.testnet).toBe(false);
      expect(controller.state.hasPlacedFirstOrder.mainnet).toBe(false);
    });
  });

  describe('trade configuration', () => {
    it('returns undefined for unsaved configuration', () => {
      const result = controller.getTradeConfiguration('ETH');

      expect(result).toBeUndefined();
    });

    it('retrieves saved configuration', () => {
      controller.saveTradeConfiguration('BTC', 10);

      const result = controller.getTradeConfiguration('BTC');

      expect(result?.leverage).toBe(10);
    });
  });

  describe('pending trade configuration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('saves pending trade configuration', () => {
      const config = {
        amount: '100',
        leverage: 5,
        takeProfitPrice: '50000',
        stopLossPrice: '40000',
        limitPrice: '45000',
        orderType: 'limit' as const,
      };

      controller.savePendingTradeConfiguration('BTC', config);

      const result = controller.getPendingTradeConfiguration('BTC');
      expect(result).toEqual(config);
    });

    it('returns undefined for non-existent pending configuration', () => {
      const result = controller.getPendingTradeConfiguration('ETH');

      expect(result).toBeUndefined();
    });

    it('returns undefined for expired pending configuration (more than 5 minutes)', () => {
      const config = {
        amount: '100',
        leverage: 5,
      };

      controller.savePendingTradeConfiguration('BTC', config);

      // Fast-forward 6 minutes (more than 5 minutes)
      jest.advanceTimersByTime(6 * 60 * 1000);

      const result = controller.getPendingTradeConfiguration('BTC');

      expect(result).toBeUndefined();
    });

    it('returns configuration for valid pending configuration (less than 5 minutes)', () => {
      const config = {
        amount: '100',
        leverage: 5,
        takeProfitPrice: '50000',
        orderType: 'market' as const,
      };

      controller.savePendingTradeConfiguration('BTC', config);

      // Fast-forward 4 minutes (less than 5 minutes)
      jest.advanceTimersByTime(4 * 60 * 1000);

      const result = controller.getPendingTradeConfiguration('BTC');

      expect(result).toEqual(config);
    });

    it('clears expired pending configuration automatically', () => {
      const config = {
        amount: '100',
        leverage: 5,
      };

      controller.savePendingTradeConfiguration('BTC', config);

      // Fast-forward 6 minutes
      jest.advanceTimersByTime(6 * 60 * 1000);

      // First call should clear expired config
      controller.getPendingTradeConfiguration('BTC');

      // Second call should return undefined
      const result = controller.getPendingTradeConfiguration('BTC');
      expect(result).toBeUndefined();

      // Verify state was cleaned up
      const network = controller.state.isTestnet ? 'testnet' : 'mainnet';
      expect(
        controller.state.tradeConfigurations[network]?.BTC?.pendingConfig,
      ).toBeUndefined();
    });

    it('clears pending trade configuration explicitly', () => {
      const config = {
        amount: '100',
        leverage: 5,
      };

      controller.savePendingTradeConfiguration('BTC', config);
      expect(controller.getPendingTradeConfiguration('BTC')).toEqual(config);

      controller.clearPendingTradeConfiguration('BTC');

      const result = controller.getPendingTradeConfiguration('BTC');
      expect(result).toBeUndefined();
    });

    it('saves pending config per network (testnet vs mainnet)', () => {
      const configMainnet = {
        amount: '100',
        leverage: 5,
      };
      const configTestnet = {
        amount: '200',
        leverage: 10,
      };

      // Save on mainnet (default is mainnet)
      controller.savePendingTradeConfiguration('BTC', configMainnet);
      expect(controller.getPendingTradeConfiguration('BTC')).toEqual(
        configMainnet,
      );

      // Switch to testnet using update method
      controller.testUpdate((state) => {
        state.isTestnet = true;
      });
      controller.savePendingTradeConfiguration('BTC', configTestnet);
      expect(controller.getPendingTradeConfiguration('BTC')).toEqual(
        configTestnet,
      );

      // Switch back to mainnet
      controller.testUpdate((state) => {
        state.isTestnet = false;
      });
      expect(controller.getPendingTradeConfiguration('BTC')).toEqual(
        configMainnet,
      );
    });

    it('preserves existing leverage when saving pending config', () => {
      // First save leverage
      controller.saveTradeConfiguration('BTC', 10);

      // Then save pending config
      const pendingConfig = {
        amount: '100',
        leverage: 5,
      };
      controller.savePendingTradeConfiguration('BTC', pendingConfig);

      // Leverage should still be saved
      const savedConfig = controller.getTradeConfiguration('BTC');
      expect(savedConfig?.leverage).toBe(10);

      // Pending config should also be available
      const pending = controller.getPendingTradeConfiguration('BTC');
      expect(pending).toEqual(pendingConfig);
    });
  });
});
