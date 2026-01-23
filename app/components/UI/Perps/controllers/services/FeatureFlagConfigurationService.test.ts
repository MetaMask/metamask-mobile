import { FeatureFlagConfigurationService } from './FeatureFlagConfigurationService';
import {
  createMockServiceContext,
  createMockInfrastructure,
} from '../../__mocks__/serviceMocks';
import { validatedVersionGatedFeatureFlag } from '../../../../../util/remoteFeatureFlag';
import {
  parseCommaSeparatedString,
  stripQuotes,
} from '../../utils/stringParseUtils';
import type { ServiceContext } from './ServiceContext';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import type { IPerpsPlatformDependencies } from '../types';

jest.mock('../../../../../util/remoteFeatureFlag');
jest.mock('../../utils/stringParseUtils');

describe('FeatureFlagConfigurationService', () => {
  let mockContext: ServiceContext;
  let mockDeps: jest.Mocked<IPerpsPlatformDependencies>;
  let featureFlagConfigurationService: FeatureFlagConfigurationService;
  let mockRemoteFeatureFlagState: RemoteFeatureFlagControllerState;
  let mockCurrentHip3Config: {
    enabled: boolean;
    allowlistMarkets: string[];
    blocklistMarkets: string[];
    source: 'remote' | 'fallback';
  };
  let mockCurrentBlockedRegionList: {
    list: string[];
    source: 'remote' | 'fallback';
  };

  beforeEach(() => {
    mockDeps = createMockInfrastructure();
    featureFlagConfigurationService = new FeatureFlagConfigurationService(
      mockDeps,
    );

    mockCurrentHip3Config = {
      enabled: false,
      allowlistMarkets: [],
      blocklistMarkets: [],
      source: 'fallback',
    };

    mockCurrentBlockedRegionList = {
      list: [],
      source: 'fallback',
    };

    mockContext = createMockServiceContext({
      errorContext: {
        controller: 'FeatureFlagConfigurationService',
        method: 'test',
      },
      getHip3Config: jest.fn(() => mockCurrentHip3Config),
      setHip3Config: jest.fn((config) => {
        Object.assign(mockCurrentHip3Config, config);
      }),
      incrementHip3ConfigVersion: jest.fn(() => 1),
      getBlockedRegionList: jest.fn(() => mockCurrentBlockedRegionList),
      setBlockedRegionList: jest.fn((list, source) => {
        mockCurrentBlockedRegionList = { list, source };
      }),
      refreshEligibility: jest.fn().mockResolvedValue(undefined),
    });

    mockRemoteFeatureFlagState = {
      remoteFeatureFlags: {},
      cacheTimestamp: Date.now(),
    };

    (parseCommaSeparatedString as jest.Mock).mockImplementation((str: string) =>
      str
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    );

    // stripQuotes is called after parseCommaSeparatedString - mock it to pass through values
    (stripQuotes as jest.Mock).mockImplementation((s: string) => s);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('refreshHip3Config', () => {
    it('throws error when required callbacks are missing', () => {
      const contextWithoutCallbacks = createMockServiceContext({
        getHip3Config: undefined,
      });

      expect(() => {
        featureFlagConfigurationService.refreshHip3Config({
          remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
          context: contextWithoutCallbacks,
        });
      }).toThrow('Required HIP-3 callbacks not available in ServiceContext');
    });

    it('updates config when equity flag changes', () => {
      (validatedVersionGatedFeatureFlag as jest.Mock).mockReturnValue(true);
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsHip3Enabled: { enabled: true },
      };

      featureFlagConfigurationService.refreshHip3Config({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(mockContext.setHip3Config).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          source: 'remote',
        }),
      );
    });

    it('increments version when equity flag changes', () => {
      (validatedVersionGatedFeatureFlag as jest.Mock).mockReturnValue(true);
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsHip3Enabled: { enabled: true },
      };

      featureFlagConfigurationService.refreshHip3Config({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(mockContext.incrementHip3ConfigVersion).toHaveBeenCalledTimes(1);
    });

    it('parses allowlist markets from comma-separated string', () => {
      (validatedVersionGatedFeatureFlag as jest.Mock).mockReturnValue(
        undefined,
      );
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsHip3AllowlistMarkets: 'BTC,ETH,SOL',
      };

      featureFlagConfigurationService.refreshHip3Config({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(parseCommaSeparatedString).toHaveBeenCalledWith('BTC,ETH,SOL');
      expect(mockContext.setHip3Config).toHaveBeenCalledWith(
        expect.objectContaining({
          allowlistMarkets: ['BTC', 'ETH', 'SOL'],
        }),
      );
    });

    it('parses allowlist markets from array', () => {
      (validatedVersionGatedFeatureFlag as jest.Mock).mockReturnValue(
        undefined,
      );
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsHip3AllowlistMarkets: ['BTC', 'ETH', 'SOL'],
      };

      featureFlagConfigurationService.refreshHip3Config({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(mockContext.setHip3Config).toHaveBeenCalledWith(
        expect.objectContaining({
          allowlistMarkets: ['BTC', 'ETH', 'SOL'],
        }),
      );
    });

    it('trims and filters empty allowlist markets from array', () => {
      (validatedVersionGatedFeatureFlag as jest.Mock).mockReturnValue(
        undefined,
      );
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsHip3AllowlistMarkets: ['BTC ', ' ETH', '  ', 'SOL'],
      };

      featureFlagConfigurationService.refreshHip3Config({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(mockContext.setHip3Config).toHaveBeenCalledWith(
        expect.objectContaining({
          allowlistMarkets: ['BTC', 'ETH', 'SOL'],
        }),
      );
    });

    it('skips invalid allowlist markets format', () => {
      (validatedVersionGatedFeatureFlag as jest.Mock).mockReturnValue(
        undefined,
      );
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsHip3AllowlistMarkets: 123,
      };

      featureFlagConfigurationService.refreshHip3Config({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(mockContext.setHip3Config).not.toHaveBeenCalled();
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('validation FAILED'),
        expect.anything(),
      );
    });

    it('parses blocklist markets from comma-separated string', () => {
      (validatedVersionGatedFeatureFlag as jest.Mock).mockReturnValue(
        undefined,
      );
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsHip3BlocklistMarkets: 'MEME,DOGE',
      };

      featureFlagConfigurationService.refreshHip3Config({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(parseCommaSeparatedString).toHaveBeenCalledWith('MEME,DOGE');
      expect(mockContext.setHip3Config).toHaveBeenCalledWith(
        expect.objectContaining({
          blocklistMarkets: ['MEME', 'DOGE'],
        }),
      );
    });

    it('parses blocklist markets from array', () => {
      (validatedVersionGatedFeatureFlag as jest.Mock).mockReturnValue(
        undefined,
      );
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsHip3BlocklistMarkets: ['MEME', 'DOGE'],
      };

      featureFlagConfigurationService.refreshHip3Config({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(mockContext.setHip3Config).toHaveBeenCalledWith(
        expect.objectContaining({
          blocklistMarkets: ['MEME', 'DOGE'],
        }),
      );
    });

    it('detects no change when config is identical', () => {
      mockCurrentHip3Config.enabled = true;
      mockCurrentHip3Config.allowlistMarkets = ['BTC', 'ETH'];
      mockCurrentHip3Config.blocklistMarkets = ['MEME'];

      (validatedVersionGatedFeatureFlag as jest.Mock).mockReturnValue(true);
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsHip3Enabled: { enabled: true },
        perpsHip3AllowlistMarkets: ['BTC', 'ETH'],
        perpsHip3BlocklistMarkets: ['MEME'],
      };

      featureFlagConfigurationService.refreshHip3Config({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(mockContext.setHip3Config).not.toHaveBeenCalled();
      expect(mockContext.incrementHip3ConfigVersion).not.toHaveBeenCalled();
    });

    it('detects change even when markets are in different order', () => {
      mockCurrentHip3Config.allowlistMarkets = ['BTC', 'ETH'];
      (validatedVersionGatedFeatureFlag as jest.Mock).mockReturnValue(
        undefined,
      );
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsHip3AllowlistMarkets: ['ETH', 'SOL'],
      };

      featureFlagConfigurationService.refreshHip3Config({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(mockContext.setHip3Config).toHaveBeenCalled();
    });

    it('logs config change details', () => {
      (validatedVersionGatedFeatureFlag as jest.Mock).mockReturnValue(true);
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsHip3Enabled: { enabled: true },
      };

      featureFlagConfigurationService.refreshHip3Config({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('HIP-3 config changed'),
        expect.objectContaining({
          equityChanged: true,
          oldEquity: false,
          newEquity: true,
        }),
      );
    });

    it('logs version increment', () => {
      (validatedVersionGatedFeatureFlag as jest.Mock).mockReturnValue(true);
      (mockContext.incrementHip3ConfigVersion as jest.Mock).mockReturnValue(42);
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsHip3Enabled: { enabled: true },
      };

      featureFlagConfigurationService.refreshHip3Config({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Incremented hip3ConfigVersion'),
        expect.objectContaining({ newVersion: 42 }),
      );
    });

    it('handles empty string for allowlist markets', () => {
      (validatedVersionGatedFeatureFlag as jest.Mock).mockReturnValue(
        undefined,
      );
      (parseCommaSeparatedString as jest.Mock).mockReturnValue([]);
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsHip3AllowlistMarkets: '',
      };

      featureFlagConfigurationService.refreshHip3Config({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('allowlistMarkets string was empty'),
        expect.anything(),
      );
    });

    it('handles empty string for blocklist markets', () => {
      (validatedVersionGatedFeatureFlag as jest.Mock).mockReturnValue(
        undefined,
      );
      (parseCommaSeparatedString as jest.Mock).mockReturnValue([]);
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsHip3BlocklistMarkets: '',
      };

      featureFlagConfigurationService.refreshHip3Config({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('blocklistMarkets string was empty'),
        expect.anything(),
      );
    });
  });

  describe('refreshEligibility', () => {
    it('extracts blocked regions from remote feature flag', () => {
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsPerpTradingGeoBlockedCountriesV2: {
          blockedRegions: ['US', 'CA', 'UK'],
        },
      };

      featureFlagConfigurationService.refreshEligibility({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(mockContext.setBlockedRegionList).toHaveBeenCalledWith(
        ['US', 'CA', 'UK'],
        'remote',
      );
    });

    it('calls refreshHip3Config', () => {
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsPerpTradingGeoBlockedCountriesV2: {
          blockedRegions: ['US'],
        },
      };

      const refreshHip3ConfigSpy = jest.spyOn(
        featureFlagConfigurationService,
        'refreshHip3Config',
      );

      featureFlagConfigurationService.refreshEligibility({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(refreshHip3ConfigSpy).toHaveBeenCalledWith({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      refreshHip3ConfigSpy.mockRestore();
    });

    it('skips setting blocked regions when not an array', () => {
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsPerpTradingGeoBlockedCountriesV2: {
          blockedRegions: 'invalid',
        },
      };

      featureFlagConfigurationService.refreshEligibility({
        remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
        context: mockContext,
      });

      expect(mockContext.setBlockedRegionList).not.toHaveBeenCalled();
    });

    it('handles missing blocked regions gracefully', () => {
      mockRemoteFeatureFlagState.remoteFeatureFlags = {
        perpsPerpTradingGeoBlockedCountriesV2: {},
      };

      expect(() => {
        featureFlagConfigurationService.refreshEligibility({
          remoteFeatureFlagControllerState: mockRemoteFeatureFlagState,
          context: mockContext,
        });
      }).not.toThrow();
    });
  });

  describe('setBlockedRegions', () => {
    it('throws error when required callbacks are missing', () => {
      const contextWithoutCallbacks = createMockServiceContext({
        getBlockedRegionList: undefined,
      });

      expect(() => {
        featureFlagConfigurationService.setBlockedRegions({
          list: ['US'],
          source: 'remote',
          context: contextWithoutCallbacks,
        });
      }).toThrow(
        'Required blocked region callbacks not available in ServiceContext',
      );
    });

    it('sets blocked region list', () => {
      featureFlagConfigurationService.setBlockedRegions({
        list: ['US', 'CA', 'UK'],
        source: 'remote',
        context: mockContext,
      });

      expect(mockContext.setBlockedRegionList).toHaveBeenCalledWith(
        ['US', 'CA', 'UK'],
        'remote',
      );
    });

    it('triggers eligibility refresh after setting list', () => {
      featureFlagConfigurationService.setBlockedRegions({
        list: ['US'],
        source: 'remote',
        context: mockContext,
      });

      expect(mockContext.refreshEligibility).toHaveBeenCalledTimes(1);
    });

    it('implements sticky remote pattern - does not downgrade from remote to fallback', () => {
      mockCurrentBlockedRegionList.source = 'remote';

      featureFlagConfigurationService.setBlockedRegions({
        list: ['US'],
        source: 'fallback',
        context: mockContext,
      });

      expect(mockContext.setBlockedRegionList).not.toHaveBeenCalled();
      expect(mockContext.refreshEligibility).not.toHaveBeenCalled();
    });

    it('allows upgrade from fallback to remote', () => {
      mockCurrentBlockedRegionList.source = 'fallback';

      featureFlagConfigurationService.setBlockedRegions({
        list: ['US', 'CA'],
        source: 'remote',
        context: mockContext,
      });

      expect(mockContext.setBlockedRegionList).toHaveBeenCalledWith(
        ['US', 'CA'],
        'remote',
      );
    });

    it('handles eligibility refresh error gracefully', () => {
      (mockContext.refreshEligibility as jest.Mock).mockRejectedValue(
        new Error('Refresh failed'),
      );

      expect(() => {
        featureFlagConfigurationService.setBlockedRegions({
          list: ['US'],
          source: 'remote',
          context: mockContext,
        });
      }).not.toThrow();
    });

    it('logs error when eligibility refresh fails', async () => {
      (mockContext.refreshEligibility as jest.Mock).mockRejectedValue(
        new Error('Refresh failed'),
      );

      featureFlagConfigurationService.setBlockedRegions({
        list: ['US'],
        source: 'remote',
        context: mockContext,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockDeps.logger.error).toHaveBeenCalled();
    });

    it('handles empty blocked region list', () => {
      featureFlagConfigurationService.setBlockedRegions({
        list: [],
        source: 'remote',
        context: mockContext,
      });

      expect(mockContext.setBlockedRegionList).toHaveBeenCalledWith(
        [],
        'remote',
      );
    });
  });
});
