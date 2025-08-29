import {
  selectPerpsEnabledFlag,
  selectPerpsServiceInterruptionBannerEnabledFlag,
  selectPerpsGeoBlockedRegionsFlag,
} from '.';
import mockedEngine from '../../../../../core/__mocks__/MockedEngine';
import {
  mockedState,
  mockedEmptyFlagsState,
} from '../../../../../selectors/featureFlagController/mocks';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('Perps Feature Flag Selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectPerpsEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      const result = selectPerpsEnabledFlag(mockedState);
      expect(result).toBe(true);
    });
  });

  describe('selectPerpsServiceInterruptionBannerEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      const result =
        selectPerpsServiceInterruptionBannerEnabledFlag(mockedState);
      expect(result).toBe(true);
    });
  });

  describe('selectPerpsGeoBlockedRegionsFlag', () => {
    it('returns blocked regions array when available', () => {
      const stateWithBlockedRegions = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsPerpTradingGeoBlockedCountries: {
                  blockedRegions: ['US', 'CA-ON'],
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectPerpsGeoBlockedRegionsFlag(stateWithBlockedRegions);
      expect(result).toEqual(['US', 'CA-ON']);
    });

    it('returns undefined when blockedRegions is not present', () => {
      const stateWithoutBlockedRegions = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsPerpTradingGeoBlockedCountries: {},
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectPerpsGeoBlockedRegionsFlag(
        stateWithoutBlockedRegions,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when perpsPerpTradingGeoBlockedCountries is not present', () => {
      const result = selectPerpsGeoBlockedRegionsFlag(mockedEmptyFlagsState);
      expect(result).toBeUndefined();
    });

    it('returns undefined when remoteFeatureFlags is undefined', () => {
      const stateWithUndefinedFlags = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: undefined,
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as Parameters<typeof selectPerpsGeoBlockedRegionsFlag>[0];

      const result = selectPerpsGeoBlockedRegionsFlag(stateWithUndefinedFlags);
      expect(result).toBeUndefined();
    });

    it('returns empty array when blockedRegions is empty', () => {
      const stateWithEmptyBlockedRegions = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsPerpTradingGeoBlockedCountries: {
                  blockedRegions: [],
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectPerpsGeoBlockedRegionsFlag(
        stateWithEmptyBlockedRegions,
      );
      expect(result).toEqual([]);
    });
  });
});
