import { selectRewardsEnabledFlag, FEATURE_FLAG_NAME } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { EngineState } from '../../types';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import { StateWithPartialEngine } from '../types';

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

const mockedStateWithRewardsEnabled = {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const mockedStateWithRewardsDisabled = {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const mockedStateWithoutRewardsFlag = {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('Rewards Feature Flag Selector', () => {
  it('returns true when rewards feature flag is enabled', () => {
    // Arrange & Act
    const result = selectRewardsEnabledFlag(mockedStateWithRewardsEnabled);

    // Assert
    expect(result).toBe(true);
  });

  it('returns false when rewards feature flag is explicitly disabled', () => {
    // Arrange & Act
    const result = selectRewardsEnabledFlag(mockedStateWithRewardsDisabled);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when rewards feature flag property is missing', () => {
    // Arrange & Act
    const result = selectRewardsEnabledFlag(mockedStateWithoutRewardsFlag);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when feature flag state is empty', () => {
    // Arrange & Act
    const result = selectRewardsEnabledFlag(mockedEmptyFlagsState);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when RemoteFeatureFlagController state is undefined', () => {
    // Arrange & Act
    const result = selectRewardsEnabledFlag(mockedUndefinedFlagsState);

    // Assert
    expect(result).toBe(false);
  });

  it('handles non-boolean values by casting them to boolean', () => {
    // Arrange
    const stateWithNonBooleanFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FEATURE_FLAG_NAME]: 'true' as unknown,
            },
            cacheTimestamp: 0,
          },
        },
      },
    } as unknown as EngineState;

    // Act
    const result = selectRewardsEnabledFlag(
      stateWithNonBooleanFlag as unknown as StateWithPartialEngine,
    );

    // Assert
    expect(result).toBe('true');
  });
});
