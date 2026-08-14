import {
  selectRemoteFeatureFlags,
  selectRemoteFeatureFlagControllerState,
  selectFeatureFlagThresholdGroups,
} from '.';
import {
  mockedEmptyFlagsState,
  mockedState,
  mockedUndefinedFlagsState,
} from './mocks';

jest.mock('../../core/Engine', () => ({
  init: jest.fn(),
}));

describe('featureFlagController selector', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns feature flag remote values', () => {
    const result = selectRemoteFeatureFlagControllerState(mockedState);
    expect(result?.remoteFeatureFlags).toBeDefined();
  });

  it('returns feature flag empty state', () => {
    const result = selectRemoteFeatureFlagControllerState(
      mockedEmptyFlagsState,
    );
    expect(result?.remoteFeatureFlags).toBeDefined();
  });

  it('returns feature flag undefined state', () => {
    const result = selectRemoteFeatureFlagControllerState(
      mockedUndefinedFlagsState,
    );
    expect(result).toBeUndefined();
  });

  describe('selectRemoteFeatureFlags', () => {
    const stateWithFlagsAndBasicFunctionality = {
      ...mockedState,
      settings: {
        basicFunctionalityEnabled: true,
      },
    };

    const stateWithFlagsAndBasicFunctionalityDisabled = {
      ...mockedState,
      settings: {
        basicFunctionalityEnabled: false,
      },
    };

    it('returns merged flags when basic functionality is enabled', () => {
      const result = selectRemoteFeatureFlags(
        stateWithFlagsAndBasicFunctionality,
      );

      expect(result).toEqual(
        mockedState.engine.backgroundState.RemoteFeatureFlagController
          ?.remoteFeatureFlags ?? {},
      );
    });

    it('returns empty flags when basic functionality is disabled', () => {
      const result = selectRemoteFeatureFlags(
        stateWithFlagsAndBasicFunctionalityDisabled,
      );

      expect(result).toEqual({});
    });
  });

  describe('selectFeatureFlagThresholdGroups', () => {
    const thresholdGroups = { someAbTest: 'treatment' };

    const stateWithThresholdGroups = (basicFunctionalityEnabled: boolean) => ({
      ...mockedState,
      engine: {
        ...mockedState.engine,
        backgroundState: {
          ...mockedState.engine.backgroundState,
          RemoteFeatureFlagController: {
            ...mockedState.engine.backgroundState.RemoteFeatureFlagController,
            featureFlagThresholdGroups: thresholdGroups,
          },
        },
      },
      settings: {
        basicFunctionalityEnabled,
      },
    });

    it('returns threshold groups when basic functionality is enabled', () => {
      const result = selectFeatureFlagThresholdGroups(
        stateWithThresholdGroups(true),
      );

      expect(result).toEqual(thresholdGroups);
    });

    it('returns empty groups when basic functionality is disabled', () => {
      const result = selectFeatureFlagThresholdGroups(
        stateWithThresholdGroups(false),
      );

      expect(result).toEqual({});
    });

    it('returns empty groups when the field is absent', () => {
      const result = selectFeatureFlagThresholdGroups({
        ...mockedState,
        settings: { basicFunctionalityEnabled: true },
      });

      expect(result).toEqual({});
    });
  });
});
