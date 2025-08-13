import { FeatureFlags } from '@metamask/remote-feature-flag-controller';
import {
  selectPredictEnabledFlag,
  FEATURE_FLAG_NAME,
  OVERRIDE_PREDICT_ENABLED_VALUE,
} from './';

describe('selectPredictEnabledFlag', () => {
  const createMockState = (remoteFlags: FeatureFlags = {}) => ({
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: remoteFlags,
          cacheTimestamp: 0,
        },
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    { flag: true, expected: true },
    { flag: false, expected: false },
  ])('returns $expected when predictEnabled is $flag', ({ flag, expected }) => {
    // Arrange
    const mockState = createMockState({ [FEATURE_FLAG_NAME]: flag });

    // Act
    const result = selectPredictEnabledFlag(mockState);

    // Assert
    expect(result).toBe(expected);
  });

  it('returns Override value when predictEnabled is not present', () => {
    // Arrange
    const mockState = createMockState({});

    // Act
    const result = selectPredictEnabledFlag(mockState);

    // Assert
    expect(result).toBe(OVERRIDE_PREDICT_ENABLED_VALUE);
  });
});
