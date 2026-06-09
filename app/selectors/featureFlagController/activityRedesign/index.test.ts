import { selectIsActivityRedesignEnabled } from '.';
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

const mockedStateWithActivityRedesignEnabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          tmcuActivityRedesignEnabled: true,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithActivityRedesignDisabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          tmcuActivityRedesignEnabled: false,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithoutActivityRedesignFlag = {
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

describe('Activity Redesign Feature Flag Selector', () => {
  it('returns true when tmcuActivityRedesignEnabled feature flag is enabled', () => {
    const result = selectIsActivityRedesignEnabled(
      mockedStateWithActivityRedesignEnabled,
    );

    expect(result).toBe(true);
  });

  it('returns false when tmcuActivityRedesignEnabled feature flag is explicitly disabled', () => {
    const result = selectIsActivityRedesignEnabled(
      mockedStateWithActivityRedesignDisabled,
    );

    expect(result).toBe(false);
  });

  it('returns undefined when tmcuActivityRedesignEnabled feature flag property is missing', () => {
    const result = selectIsActivityRedesignEnabled(
      mockedStateWithoutActivityRedesignFlag,
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined when feature flag state is empty', () => {
    const result = selectIsActivityRedesignEnabled(mockedEmptyFlagsState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when RemoteFeatureFlagController state is undefined', () => {
    const result = selectIsActivityRedesignEnabled(mockedUndefinedFlagsState);

    expect(result).toBeUndefined();
  });

  it('handles null values correctly', () => {
    const stateWithNullFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              tmcuActivityRedesignEnabled: null,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectIsActivityRedesignEnabled(stateWithNullFlag);

    expect(result).toBeNull();
  });
});
