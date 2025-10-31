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

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('8.0.0'),
}));

import { getVersion } from 'react-native-device-info';
const mockGetVersion = getVersion as jest.MockedFunction<typeof getVersion>;

// Helper to create mock messenger
const createMockMessenger = (mockCall: jest.Mock, mockSubscribe?: jest.Mock) =>
  ({
    call: mockCall,
    publish: jest.fn(),
    subscribe: mockSubscribe || jest.fn(),
    registerActionHandler: jest.fn(),
    registerEventHandler: jest.fn(),
    registerInitialEventPayload: jest.fn(),
    getRestricted: jest.fn().mockReturnValue({
      call: mockCall,
      publish: jest.fn(),
      subscribe: mockSubscribe || jest.fn(),
      registerActionHandler: jest.fn(),
      registerEventHandler: jest.fn(),
      registerInitialEventPayload: jest.fn(),
    }),
  }) as any;

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
    it('should initialize with default state', () => {
      expect(controller.state).toEqual(getDefaultPerpsControllerState());
      expect(controller.state.activeProvider).toBe('hyperliquid');
      expect(controller.state.positions).toEqual([]);
      expect(controller.state.accountState).toBeNull();
      expect(controller.state.connectionStatus).toBe('disconnected');
      expect(controller.state.isEligible).toBe(false);
    });

    it('should read current RemoteFeatureFlagController state during construction', () => {
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
          clientVersion: '8.0.0',
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
          clientVersion: '8.0.0',
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
          clientVersion: '8.0.0',
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
          clientVersion: '8.0.0',
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

  describe('hip3EnabledFlag feature flag handling', () => {
    beforeEach(() => {
      mockGetVersion.mockReturnValue('8.0.0');
    });

    describe('fallback case - no remote flag', () => {
      it('uses fallback when remote flag is undefined', () => {
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return {
              remoteFeatureFlags: {},
            };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEquityEnabled: true,
            clientVersion: '8.0.0',
          },
        });

        expect((testController as any).hip3EnabledFlag.enabled).toBe(true);
        expect((testController as any).hip3EnabledFlag.source).toBe('fallback');
      });

      it('uses fallback disabled when no clientConfig provided', () => {
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return {
              remoteFeatureFlags: {},
            };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall),
          state: getDefaultPerpsControllerState(),
        });

        expect((testController as any).hip3EnabledFlag.enabled).toBe(false);
        expect((testController as any).hip3EnabledFlag.source).toBe('fallback');
      });
    });

    describe('remote flag undefined case', () => {
      it('keeps fallback when remoteFeatureFlags object exists but perpsEquityEnabled is missing', () => {
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return {
              remoteFeatureFlags: {
                someOtherFlag: true,
              },
            };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEquityEnabled: true,
            clientVersion: '8.0.0',
          },
        });

        expect((testController as any).hip3EnabledFlag.enabled).toBe(true);
        expect((testController as any).hip3EnabledFlag.source).toBe('fallback');
      });
    });

    describe('remote flag defined but disabled', () => {
      it('disables HIP-3 when remote flag enabled is false', () => {
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return {
              remoteFeatureFlags: {
                perpsEquityEnabled: {
                  enabled: false,
                  minimumVersion: '7.0.0',
                },
              },
            };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEquityEnabled: true,
            clientVersion: '8.0.0',
          },
        });

        expect((testController as any).hip3EnabledFlag.enabled).toBe(false);
        expect((testController as any).hip3EnabledFlag.source).toBe('remote');
      });
    });

    describe('remote flag enabled but minimum version check fails', () => {
      it('disables HIP-3 when client version below minimum requirement', () => {
        mockGetVersion.mockReturnValue('6.0.0');

        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return {
              remoteFeatureFlags: {
                perpsEquityEnabled: {
                  enabled: true,
                  minimumVersion: '7.0.0',
                },
              },
            };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEquityEnabled: false,
            clientVersion: '6.0.0',
          },
        });

        expect((testController as any).hip3EnabledFlag.enabled).toBe(false);
        expect((testController as any).hip3EnabledFlag.source).toBe('remote');
      });

      it('enables HIP-3 when client version equals minimum requirement', () => {
        mockGetVersion.mockReturnValue('7.0.0');

        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return {
              remoteFeatureFlags: {
                perpsEquityEnabled: {
                  enabled: true,
                  minimumVersion: '7.0.0',
                },
              },
            };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEquityEnabled: false,
            clientVersion: '8.0.0',
          },
        });

        expect((testController as any).hip3EnabledFlag.enabled).toBe(true);
        expect((testController as any).hip3EnabledFlag.source).toBe('remote');
      });

      it('enables HIP-3 when client version exceeds minimum requirement', () => {
        mockGetVersion.mockReturnValue('8.0.0');

        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return {
              remoteFeatureFlags: {
                perpsEquityEnabled: {
                  enabled: true,
                  minimumVersion: '7.0.0',
                },
              },
            };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEquityEnabled: false,
            clientVersion: '8.0.0',
          },
        });

        expect((testController as any).hip3EnabledFlag.enabled).toBe(true);
        expect((testController as any).hip3EnabledFlag.source).toBe('remote');
      });
    });
  });

  describe('enabledHIP3Dexs feature flag handling', () => {
    describe('fallback case - no remote flag', () => {
      it('uses fallback DEX list when remote flag is undefined', () => {
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return {
              remoteFeatureFlags: {},
            };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEnabledDexs: ['dex1', 'dex2'],
            clientVersion: '8.0.0',
          },
        });

        expect((testController as any).enabledHIP3Dexs.dexs).toEqual([
          'dex1',
          'dex2',
        ]);
        expect((testController as any).enabledHIP3Dexs.source).toBe('fallback');
      });

      it('uses empty array when no clientConfig provided', () => {
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return {
              remoteFeatureFlags: {},
            };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall),
          state: getDefaultPerpsControllerState(),
        });

        expect((testController as any).enabledHIP3Dexs.dexs).toEqual([]);
        expect((testController as any).enabledHIP3Dexs.source).toBe('fallback');
      });
    });

    describe('remote flag undefined case', () => {
      it('keeps fallback when perpsEnabledDexs is missing', () => {
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return {
              remoteFeatureFlags: {
                someOtherFlag: true,
              },
            };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEnabledDexs: ['fallback-dex'],
            clientVersion: '8.0.0',
          },
        });

        expect((testController as any).enabledHIP3Dexs.dexs).toEqual([
          'fallback-dex',
        ]);
        expect((testController as any).enabledHIP3Dexs.source).toBe('fallback');
      });

      it('keeps fallback when perpsEnabledDexs is not an array', () => {
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return {
              remoteFeatureFlags: {
                perpsEnabledDexs: 'not-an-array',
              },
            };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEnabledDexs: ['fallback-dex'],
            clientVersion: '8.0.0',
          },
        });

        expect((testController as any).enabledHIP3Dexs.dexs).toEqual([
          'fallback-dex',
        ]);
        expect((testController as any).enabledHIP3Dexs.source).toBe('fallback');
      });
    });

    describe('remote flag defined', () => {
      it('uses remote DEX list when provided', () => {
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return {
              remoteFeatureFlags: {
                perpsEnabledDexs: ['remote-dex1', 'remote-dex2'],
              },
            };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEnabledDexs: ['fallback-dex'],
            clientVersion: '8.0.0',
          },
        });

        expect((testController as any).enabledHIP3Dexs.dexs).toEqual([
          'remote-dex1',
          'remote-dex2',
        ]);
        expect((testController as any).enabledHIP3Dexs.source).toBe('remote');
      });

      it('uses empty remote array when provided', () => {
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return {
              remoteFeatureFlags: {
                perpsEnabledDexs: [],
              },
            };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEnabledDexs: ['fallback-dex'],
            clientVersion: '8.0.0',
          },
        });

        expect((testController as any).enabledHIP3Dexs.dexs).toEqual([]);
        expect((testController as any).enabledHIP3Dexs.source).toBe('remote');
      });
    });
  });

  describe('messagingSystem subscription updates', () => {
    beforeEach(() => {
      mockGetVersion.mockReturnValue('8.0.0');
    });

    describe('hip3EnabledFlag updates via subscription', () => {
      it('updates to enabled when subscription fires with valid remote flag', () => {
        const mockSubscribe = jest.fn();
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return { remoteFeatureFlags: {} };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall, mockSubscribe),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEquityEnabled: false,
            clientVersion: '8.0.0',
          },
        });

        expect((testController as any).hip3EnabledFlag.enabled).toBe(false);
        expect((testController as any).hip3EnabledFlag.source).toBe('fallback');

        const subscribeCallback = mockSubscribe.mock.calls.find(
          (call) => call[0] === 'RemoteFeatureFlagController:stateChange',
        )?.[1];

        if (!subscribeCallback) {
          throw new Error('Subscription callback not found');
        }

        subscribeCallback({
          remoteFeatureFlags: {
            perpsEquityEnabled: {
              enabled: true,
              minimumVersion: '7.0.0',
            },
          },
        });

        expect((testController as any).hip3EnabledFlag.enabled).toBe(true);
        expect((testController as any).hip3EnabledFlag.source).toBe('remote');
      });

      it('updates to disabled when subscription fires with disabled remote flag', () => {
        const mockSubscribe = jest.fn();
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return { remoteFeatureFlags: {} };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall, mockSubscribe),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEquityEnabled: true,
            clientVersion: '8.0.0',
          },
        });

        expect((testController as any).hip3EnabledFlag.enabled).toBe(true);

        const subscribeCallback = mockSubscribe.mock.calls.find(
          (call) => call[0] === 'RemoteFeatureFlagController:stateChange',
        )?.[1];

        subscribeCallback({
          remoteFeatureFlags: {
            perpsEquityEnabled: {
              enabled: false,
              minimumVersion: '7.0.0',
            },
          },
        });

        expect((testController as any).hip3EnabledFlag.enabled).toBe(false);
        expect((testController as any).hip3EnabledFlag.source).toBe('remote');
      });

      it('disables when subscription fires with version requirement not met', () => {
        mockGetVersion.mockReturnValue('6.0.0');

        const mockSubscribe = jest.fn();
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return { remoteFeatureFlags: {} };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall, mockSubscribe),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEquityEnabled: false,
            clientVersion: '6.0.0',
          },
        });

        expect((testController as any).hip3EnabledFlag.enabled).toBe(false);
        expect((testController as any).hip3EnabledFlag.source).toBe('fallback');

        const subscribeCallback = mockSubscribe.mock.calls.find(
          (call) => call[0] === 'RemoteFeatureFlagController:stateChange',
        )?.[1];

        subscribeCallback({
          remoteFeatureFlags: {
            perpsEquityEnabled: {
              enabled: true,
              minimumVersion: '7.0.0',
            },
          },
        });

        expect((testController as any).hip3EnabledFlag.enabled).toBe(false);
        expect((testController as any).hip3EnabledFlag.source).toBe('remote');
      });
    });

    describe('enabledHIP3Dexs updates via subscription', () => {
      it('updates DEX list when subscription fires with new array', () => {
        const mockSubscribe = jest.fn();
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return { remoteFeatureFlags: {} };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall, mockSubscribe),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEnabledDexs: ['fallback-dex'],
            clientVersion: '8.0.0',
          },
        });

        expect((testController as any).enabledHIP3Dexs.dexs).toEqual([
          'fallback-dex',
        ]);

        const subscribeCallback = mockSubscribe.mock.calls.find(
          (call) => call[0] === 'RemoteFeatureFlagController:stateChange',
        )?.[1];

        subscribeCallback({
          remoteFeatureFlags: {
            perpsEnabledDexs: ['remote-dex1', 'remote-dex2'],
          },
        });

        expect((testController as any).enabledHIP3Dexs.dexs).toEqual([
          'remote-dex1',
          'remote-dex2',
        ]);
        expect((testController as any).enabledHIP3Dexs.source).toBe('remote');
      });

      it('does not update when subscription fires with invalid DEX list', () => {
        const mockSubscribe = jest.fn();
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return { remoteFeatureFlags: {} };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall, mockSubscribe),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEnabledDexs: ['fallback-dex'],
            clientVersion: '8.0.0',
          },
        });

        const subscribeCallback = mockSubscribe.mock.calls.find(
          (call) => call[0] === 'RemoteFeatureFlagController:stateChange',
        )?.[1];

        subscribeCallback({
          remoteFeatureFlags: {
            perpsEnabledDexs: 'not-an-array',
          },
        });

        expect((testController as any).enabledHIP3Dexs.dexs).toEqual([
          'fallback-dex',
        ]);
        expect((testController as any).enabledHIP3Dexs.source).toBe('fallback');
      });
    });

    describe('combined flag updates', () => {
      it('updates both hip3EnabledFlag and enabledHIP3Dexs when subscription fires', () => {
        const mockSubscribe = jest.fn();
        const mockCall = jest.fn().mockImplementation((action: string) => {
          if (action === 'RemoteFeatureFlagController:getState') {
            return { remoteFeatureFlags: {} };
          }
          return undefined;
        });

        const testController = new PerpsController({
          messenger: createMockMessenger(mockCall, mockSubscribe),
          state: getDefaultPerpsControllerState(),
          clientConfig: {
            fallbackEquityEnabled: false,
            fallbackEnabledDexs: ['fallback-dex'],
            clientVersion: '8.0.0',
          },
        });

        const subscribeCallback = mockSubscribe.mock.calls.find(
          (call) => call[0] === 'RemoteFeatureFlagController:stateChange',
        )?.[1];

        subscribeCallback({
          remoteFeatureFlags: {
            perpsEquityEnabled: {
              enabled: true,
              minimumVersion: '7.0.0',
            },
            perpsEnabledDexs: ['remote-dex1', 'remote-dex2'],
          },
        });

        expect((testController as any).hip3EnabledFlag.enabled).toBe(true);
        expect((testController as any).hip3EnabledFlag.source).toBe('remote');
        expect((testController as any).enabledHIP3Dexs.dexs).toEqual([
          'remote-dex1',
          'remote-dex2',
        ]);
        expect((testController as any).enabledHIP3Dexs.source).toBe('remote');
      });
    });
  });

  describe('getActiveProvider', () => {
    it('throws error when not initialized', () => {
      // Arrange
      (controller as any).isInitialized = false;
      (controller as any).isReinitializing = false;

      // Act & Assert
      expect(() => controller.getActiveProvider()).toThrow(
        'CLIENT_NOT_INITIALIZED',
      );
    });

    it('returns provider when initialized', () => {
      // Arrange
      (controller as any).isInitialized = true;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);

      // Act
      const provider = controller.getActiveProvider();

      // Assert
      expect(provider).toBe(mockProvider);
    });
  });

  describe('initializeProviders', () => {
    it('completes initialization without throwing', async () => {
      // Arrange
      jest.useFakeTimers();
      mockProvider.disconnect.mockResolvedValue({ success: true });

      // Act
      const initPromise = (controller as any).initializeProviders();
      jest.runAllTimers();
      await initPromise;

      // Assert - Provider created
      expect((controller as any).providers.has('hyperliquid')).toBe(true);

      jest.useRealTimers();
    });

    it('handles re-initialization without throwing', async () => {
      // Arrange
      jest.useFakeTimers();
      mockProvider.disconnect.mockResolvedValue({ success: true });

      // Act - First initialization
      const initPromise1 = (controller as any).initializeProviders();
      jest.runAllTimers();
      await initPromise1;

      // Act - Second initialization completes without throwing
      const initPromise2 = (controller as any).initializeProviders();
      jest.runAllTimers();
      await expect(initPromise2).resolves.not.toThrow();

      jest.useRealTimers();
    });
  });

  describe('getPositions', () => {
    it('gets positions successfully', async () => {
      // Arrange
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
      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getPositions.mockResolvedValue(mockPositions);

      // Act
      const result = await controller.getPositions();

      // Assert
      expect(result).toEqual(mockPositions);
      expect(mockProvider.getPositions).toHaveBeenCalled();
    });

    it('should handle getPositions error', async () => {
      const errorMessage = 'Network error';

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

        (controller as any).isInitialized = true;
        (controller as any).isInitializing = false;
        (controller as any).isReinitializing = false;
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

        (controller as any).isInitialized = true;
        (controller as any).isInitializing = false;
        (controller as any).isReinitializing = false;
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

        (controller as any).isInitialized = true;
        (controller as any).isInitializing = false;
        (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.cancelOrder.mockResolvedValue(mockCancelResult);

      const result = await controller.cancelOrder(cancelParams);

      expect(result).toEqual(mockCancelResult);
      expect(mockProvider.cancelOrder).toHaveBeenCalledWith(cancelParams);
    });
  });

  describe('cancelOrders', () => {
    beforeEach(() => {
      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

        (controller as any).isInitialized = true;
        (controller as any).isInitializing = false;
        (controller as any).isReinitializing = false;
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

        (controller as any).isInitialized = true;
        (controller as any).isInitializing = false;
        (controller as any).isReinitializing = false;
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

        (controller as any).isInitialized = true;
        (controller as any).isInitializing = false;
        (controller as any).isReinitializing = false;
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
      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getMaxLeverage.mockResolvedValue(mockMaxLeverage);

      const result = await controller.getMaxLeverage(asset);

      expect(result).toBe(mockMaxLeverage);
      expect(mockProvider.getMaxLeverage).toHaveBeenCalledWith(asset);
    });
  });

  describe('getWithdrawalRoutes', () => {
    it('gets withdrawal routes successfully', () => {
      // Arrange
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
      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getWithdrawalRoutes.mockReturnValue(mockRoutes);

      // Act
      const result = controller.getWithdrawalRoutes();

      // Assert
      expect(result).toEqual(mockRoutes);
      expect(mockProvider.getWithdrawalRoutes).toHaveBeenCalled();
    });
  });

  describe('getBlockExplorerUrl', () => {
    it('should get block explorer URL successfully', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const mockUrl =
        'https://app.hyperliquid.xyz/explorer/address/0x1234567890123456789012345678901234567890';

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getPositions.mockRejectedValue(new Error(errorMessage));

      await expect(controller.getPositions()).rejects.toThrow(errorMessage);
      expect(mockProvider.getPositions).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const errorMessage = 'Network timeout';

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getPositions.mockResolvedValue(mockPositions);

      const result = await controller.getPositions();

      expect(result).toEqual(mockPositions);
      expect(mockProvider.getPositions).toHaveBeenCalled();
      // Note: getPositions doesn't update controller state, it just returns data
    });

    it('should handle errors without updating state', async () => {
      const errorMessage = 'Failed to fetch positions';

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getPositions.mockRejectedValue(new Error(errorMessage));

      await expect(controller.getPositions()).rejects.toThrow(errorMessage);
      expect(mockProvider.getPositions).toHaveBeenCalled();
    });
  });

  describe('connection management', () => {
    it('handles disconnection', async () => {
      // Arrange
      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.disconnect.mockResolvedValue({ success: true });

      // Act
      await controller.disconnect();

      // Assert
      expect(mockProvider.disconnect).toHaveBeenCalled();
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.editOrder.mockRejectedValue(new Error(errorMessage));

      await expect(controller.editOrder(editParams)).rejects.toThrow(
        errorMessage,
      );
      expect(mockProvider.editOrder).toHaveBeenCalledWith(editParams);
    });
  });

  describe('subscription management', () => {
    it('subscribes to order fills and returns unsubscribe function', () => {
      // Arrange
      const mockUnsubscribe = jest.fn();
      const params = {
        callback: jest.fn(),
      };
      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.subscribeToOrderFills.mockReturnValue(mockUnsubscribe);

      // Act
      const unsubscribe = controller.subscribeToOrderFills(params);
      unsubscribe();

      // Assert
      expect(mockProvider.subscribeToOrderFills).toHaveBeenCalledWith(params);
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('sets live data configuration', () => {
      // Arrange
      const config = {
        priceThrottleMs: 1000,
        positionThrottleMs: 2000,
      };
      (controller as any).isInitialized = true;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.setLiveDataConfig.mockReturnValue(undefined);

      // Act
      controller.setLiveDataConfig(config);

      // Assert
      expect(mockProvider.setLiveDataConfig).toHaveBeenCalledWith(config);
    });

    it('calls unsubscribe when subscription cleanup is invoked', () => {
      // Arrange
      const mockUnsubscribe = jest.fn();
      const params = {
        symbols: ['BTC', 'ETH'],
        callback: jest.fn(),
      };
      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.subscribeToPrices.mockReturnValue(mockUnsubscribe);

      // Act
      const unsubscribe = controller.subscribeToPrices(params);
      unsubscribe();

      // Assert
      expect(mockProvider.subscribeToPrices).toHaveBeenCalledWith(params);
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('deposit operations', () => {
    it('clears deposit result from state', () => {
      // Arrange - Set a deposit result
      controller.update((state: any) => {
        state.lastDepositResult = { success: true, txHash: '0xabc' };
      });

      // Act
      controller.clearDepositResult();

      // Assert
      expect(controller.state.lastDepositResult).toBeNull();
    });
  });

  describe('withdrawal operations', () => {
    it('clears withdraw result from state', () => {
      // Arrange - Set a withdraw result
      controller.update((state: any) => {
        state.lastWithdrawResult = { success: true, txHash: '0xdef' };
      });

      // Act
      controller.clearWithdrawResult();

      // Assert
      expect(controller.state.lastWithdrawResult).toBeNull();
    });
  });

  describe('network management', () => {
    it('should get current network', () => {
      const network = controller.getCurrentNetwork();

      expect(['mainnet', 'testnet']).toContain(network);
      expect(typeof network).toBe('string');
    });

    it('gets withdrawal routes', () => {
      // Arrange
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
      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.getWithdrawalRoutes.mockReturnValue(mockRoutes);

      // Act
      const result = controller.getWithdrawalRoutes();

      // Assert
      expect(result).toEqual(mockRoutes);
      expect(mockProvider.getWithdrawalRoutes).toHaveBeenCalled();
    });
  });

  describe('user management', () => {
    it('returns first time user status for current network', () => {
      // Arrange - Default state has isFirstTimeUser as true
      const currentNetwork = controller.state.isTestnet ? 'testnet' : 'mainnet';

      // Act
      const isFirstTime = controller.isFirstTimeUserOnCurrentNetwork();

      // Assert
      expect(isFirstTime).toBe(
        controller.state.isFirstTimeUser[currentNetwork],
      );
    });

    it('marks tutorial as completed for current network', () => {
      // Arrange
      const currentNetwork = controller.state.isTestnet ? 'testnet' : 'mainnet';
      controller.update((state: any) => {
        state.isFirstTimeUser[currentNetwork] = true;
      });

      // Act
      controller.markTutorialCompleted();

      // Assert
      expect(controller.state.isFirstTimeUser[currentNetwork]).toBe(false);
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
    it('subscribes to orders and returns unsubscribe function', () => {
      // Arrange
      const mockUnsubscribe = jest.fn();
      const params = {
        callback: jest.fn(),
      };
      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.subscribeToOrders.mockReturnValue(mockUnsubscribe);

      // Act
      const unsubscribe = controller.subscribeToOrders(params);
      unsubscribe();

      // Assert
      expect(mockProvider.subscribeToOrders).toHaveBeenCalledWith(params);
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('subscribes to account updates and returns unsubscribe function', () => {
      // Arrange
      const mockUnsubscribe = jest.fn();
      const params = {
        callback: jest.fn(),
      };
      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
      (controller as any).providers = new Map([['hyperliquid', mockProvider]]);
      mockProvider.subscribeToAccount.mockReturnValue(mockUnsubscribe);

      // Act
      const unsubscribe = controller.subscribeToAccount(params);
      unsubscribe();

      // Assert
      expect(mockProvider.subscribeToAccount).toHaveBeenCalledWith(params);
      expect(mockUnsubscribe).toHaveBeenCalled();
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

        (controller as any).isInitialized = true;
        (controller as any).isInitializing = false;
        (controller as any).isReinitializing = false;
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

        (controller as any).isInitialized = true;
        (controller as any).isInitializing = false;
        (controller as any).isReinitializing = false;
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

        (controller as any).isInitialized = true;
        (controller as any).isInitializing = false;
        (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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

      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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
      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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
      (controller as any).isInitialized = true;
      (controller as any).isInitializing = false;
      (controller as any).isReinitializing = false;
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
