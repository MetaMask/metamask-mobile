import { selectAssetsAccountApiBalancesEnabled, FEATURE_FLAG_NAME } from '.';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';

describe('Assets Account API Balances Feature Flag Selector', () => {
  it('returns the feature flag value when assetsAccountApiBalances property exists', () => {
    // Arrange
    const mockValue = ['asset1', 'asset2'];
    const mockedStateWithFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FEATURE_FLAG_NAME]: mockValue,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    // Act
    const result = selectAssetsAccountApiBalancesEnabled(mockedStateWithFlag);

    // Assert
    expect(result).toEqual(mockValue);
  });

  it('returns empty array when assetsAccountApiBalances property is missing', () => {
    // Arrange
    const mockedStateWithoutFlag = {
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

    // Act
    const result = selectAssetsAccountApiBalancesEnabled(
      mockedStateWithoutFlag,
    );

    // Assert
    expect(result).toEqual([]);
  });

  it('returns empty array when feature flag state is empty', () => {
    // Arrange - Use existing mock from mocks.ts

    // Act
    const result = selectAssetsAccountApiBalancesEnabled(mockedEmptyFlagsState);

    // Assert
    expect(result).toEqual([]);
  });

  it('returns empty array when RemoteFeatureFlagController state is undefined', () => {
    // Arrange - Use existing mock from mocks.ts

    // Act
    const result = selectAssetsAccountApiBalancesEnabled(
      mockedUndefinedFlagsState,
    );

    // Assert
    expect(result).toEqual([]);
  });

  it('returns null when feature flag value is explicitly null', () => {
    // Arrange
    const stateWithNullFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FEATURE_FLAG_NAME]: null,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    // Act
    const result = selectAssetsAccountApiBalancesEnabled(stateWithNullFlag);

    // Assert
    expect(result).toBeNull();
  });

  it('returns false when feature flag value is explicitly false', () => {
    // Arrange
    const stateWithFalseFlag = {
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

    // Act
    const result = selectAssetsAccountApiBalancesEnabled(stateWithFalseFlag);

    // Assert
    expect(result).toBe(false);
  });

  it('returns empty array when feature flag value is explicitly empty array', () => {
    // Arrange
    const stateWithEmptyArrayFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FEATURE_FLAG_NAME]: [],
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    // Act
    const result = selectAssetsAccountApiBalancesEnabled(
      stateWithEmptyArrayFlag,
    );

    // Assert
    expect(result).toEqual([]);
  });

  it('returns true when feature flag value is explicitly true', () => {
    // Arrange
    const stateWithTrueFlag = {
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

    // Act
    const result = selectAssetsAccountApiBalancesEnabled(stateWithTrueFlag);

    // Assert
    expect(result).toBe(true);
  });

  it('returns string value when feature flag is a string', () => {
    // Arrange
    const stringValue = 'enabled';
    const stateWithStringFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FEATURE_FLAG_NAME]: stringValue,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    // Act
    const result = selectAssetsAccountApiBalancesEnabled(stateWithStringFlag);

    // Assert
    expect(result).toBe(stringValue);
  });

  it('handles complex object values correctly', () => {
    // Arrange
    const objectValue = { enabled: true, config: { timeout: 5000 } };
    const stateWithObjectFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FEATURE_FLAG_NAME]: objectValue,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    // Act
    const result = selectAssetsAccountApiBalancesEnabled(stateWithObjectFlag);

    // Assert
    expect(result).toEqual(objectValue);
  });
});
