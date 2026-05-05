import { selectExplorePageV2EnabledFlag } from '.';
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

const mockedStateWithExplorePageV2Enabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          explorePageV2Enabled: true,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithExplorePageV2Disabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          explorePageV2Enabled: false,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithoutExplorePageV2Flag = {
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

describe('Explore Page V2 feature flag selector', () => {
  it('returns true when explorePageV2Enabled feature flag is enabled', () => {
    const result = selectExplorePageV2EnabledFlag(
      mockedStateWithExplorePageV2Enabled,
    );

    expect(result).toBe(true);
  });

  it('returns false when explorePageV2Enabled feature flag is explicitly disabled', () => {
    const result = selectExplorePageV2EnabledFlag(
      mockedStateWithExplorePageV2Disabled,
    );

    expect(result).toBe(false);
  });

  it('returns default false when explorePageV2Enabled feature flag property is missing', () => {
    const result = selectExplorePageV2EnabledFlag(
      mockedStateWithoutExplorePageV2Flag,
    );

    expect(result).toBe(false);
  });

  it('returns default false when feature flag state is empty', () => {
    const result = selectExplorePageV2EnabledFlag(mockedEmptyFlagsState);

    expect(result).toBe(false);
  });

  it('returns default false when RemoteFeatureFlagController state is undefined', () => {
    const result = selectExplorePageV2EnabledFlag(mockedUndefinedFlagsState);

    expect(result).toBe(false);
  });

  it('handles null values correctly', () => {
    const stateWithNullFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              explorePageV2Enabled: null,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectExplorePageV2EnabledFlag(stateWithNullFlag);

    expect(result).toBeNull();
  });
});
