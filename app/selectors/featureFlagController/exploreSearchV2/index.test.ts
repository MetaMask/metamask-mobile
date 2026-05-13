import { selectExploreSearchV2EnabledFlag } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

const mockedStateWithExploreSearchV2Enabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          exploreSearchV2Enabled: true,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithExploreSearchV2Disabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          exploreSearchV2Enabled: false,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithoutExploreSearchV2Flag = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          someOtherFlag: true,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

describe('Explore Search V2 feature flag selector', () => {
  it('returns true when exploreSearchV2Enabled feature flag is enabled', () => {
    const result = selectExploreSearchV2EnabledFlag(
      mockedStateWithExploreSearchV2Enabled,
    );

    expect(result).toBe(true);
  });

  it('returns false when exploreSearchV2Enabled feature flag is explicitly disabled', () => {
    const result = selectExploreSearchV2EnabledFlag(
      mockedStateWithExploreSearchV2Disabled,
    );

    expect(result).toBe(false);
  });

  it('returns default false when exploreSearchV2Enabled feature flag property is missing', () => {
    const result = selectExploreSearchV2EnabledFlag(
      mockedStateWithoutExploreSearchV2Flag,
    );

    expect(result).toBe(false);
  });

  it('returns default false when feature flag state is empty', () => {
    const result = selectExploreSearchV2EnabledFlag(mockedEmptyFlagsState);

    expect(result).toBe(false);
  });

  it('returns default false when RemoteFeatureFlagController state is undefined', () => {
    const result = selectExploreSearchV2EnabledFlag(mockedUndefinedFlagsState);

    expect(result).toBe(false);
  });

  it('handles null values correctly', () => {
    const stateWithNullFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              exploreSearchV2Enabled: null,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectExploreSearchV2EnabledFlag(stateWithNullFlag);

    expect(result).toBeNull();
  });
});
