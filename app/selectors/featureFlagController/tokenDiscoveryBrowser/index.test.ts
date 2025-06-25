import { tokenDiscoveryBrowserEnabled, FEATURE_FLAG_NAME } from '.';
import { mockedEmptyFlagsState } from '../mocks';

describe('tokenDiscoveryBrowserEnabled selector', () => {
  it('returns true when feature flag is true', () => {
    const mockedStateWithFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FEATURE_FLAG_NAME]: true,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = tokenDiscoveryBrowserEnabled(mockedStateWithFlag);
    expect(result).toBe(true);
  });

  it('returns false when feature flag is false', () => {
    const mockedStateWithFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FEATURE_FLAG_NAME]: false,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = tokenDiscoveryBrowserEnabled(mockedStateWithFlag);
    expect(result).toBe(false);
  });

  it('returns default value (false) when feature flag is not present', () => {
    const result = tokenDiscoveryBrowserEnabled(mockedEmptyFlagsState);
    expect(result).toBe(false);
  });
});
