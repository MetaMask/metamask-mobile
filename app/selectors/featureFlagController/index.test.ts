import {
  selectRemoteFeatureFlags,
  selectRemoteFeatureFlagControllerState,
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
});
