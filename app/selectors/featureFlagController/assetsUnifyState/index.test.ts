import {
  selectIsAssetsUnifyStateEnabled,
  isAssetsUnifyStateFeatureEnabled,
  getIsDeprecatedController,
  selectIsControllerDeprecated,
  AssetsUnifyStateFeatureFlag,
  ASSETS_UNIFY_STATE_FLAG,
  ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
} from '.';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import { FeatureFlags } from '@metamask/remote-feature-flag-controller';

// Helper function to create mock state with assetsUnifyState flag
function mockStateWith(assetsUnifyState: AssetsUnifyStateFeatureFlag) {
  return {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          cacheTimestamp: 0,
          remoteFeatureFlags: {
            [ASSETS_UNIFY_STATE_FLAG]: assetsUnifyState,
          } as unknown as FeatureFlags,
        },
      },
    },
  };
}

describe('isAssetsUnifyStateFeatureEnabled', () => {
  it('returns true when enabled', () => {
    const flag: AssetsUnifyStateFeatureFlag = {
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
    };

    expect(isAssetsUnifyStateFeatureEnabled(flag)).toBe(true);
  });

  it('returns false when disabled', () => {
    const flag: AssetsUnifyStateFeatureFlag = {
      enabled: false,
      featureVersion: null,
    };

    expect(isAssetsUnifyStateFeatureEnabled(flag)).toBe(false);
  });

  it('returns false when featureVersion does not match', () => {
    const flag: AssetsUnifyStateFeatureFlag = {
      enabled: true,
      featureVersion: '99',
    };

    expect(isAssetsUnifyStateFeatureEnabled(flag)).toBe(false);
  });

  it('returns false for undefined flagValue', () => {
    expect(isAssetsUnifyStateFeatureEnabled(undefined)).toBe(false);
  });
});

describe('selectIsAssetsUnifyStateEnabled', () => {
  it('returns true when assetsUnifyState flag is enabled', () => {
    const mockedState = mockStateWith({
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
    });

    expect(selectIsAssetsUnifyStateEnabled(mockedState)).toBe(true);
  });

  it('returns false when assetsUnifyState flag is disabled', () => {
    const mockedState = mockStateWith({
      enabled: false,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
    });

    expect(selectIsAssetsUnifyStateEnabled(mockedState)).toBe(false);
  });

  it('returns false when assetsUnifyState flag is undefined', () => {
    expect(selectIsAssetsUnifyStateEnabled(mockedUndefinedFlagsState)).toBe(
      false,
    );
  });

  it('returns false when assetsUnifyState flag is empty', () => {
    expect(selectIsAssetsUnifyStateEnabled(mockedEmptyFlagsState)).toBe(false);
  });

  it('returns false when featureVersion does not match', () => {
    const mockedState = mockStateWith({
      enabled: true,
      featureVersion: '99',
    });

    expect(selectIsAssetsUnifyStateEnabled(mockedState)).toBe(false);
  });
});

describe('getIsDeprecatedController', () => {
  it('returns true when the controller is listed in deprecatedControllers', () => {
    const flag: AssetsUnifyStateFeatureFlag = {
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
      deprecatedControllers: ['AccountTrackerController'],
    };

    expect(getIsDeprecatedController(flag, 'AccountTrackerController')).toBe(
      true,
    );
  });

  it('returns false when the controller is not listed in deprecatedControllers', () => {
    const flag: AssetsUnifyStateFeatureFlag = {
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
      deprecatedControllers: ['SomeOtherController'],
    };

    expect(getIsDeprecatedController(flag, 'AccountTrackerController')).toBe(
      false,
    );
  });

  it('returns false when deprecatedControllers is empty', () => {
    const flag: AssetsUnifyStateFeatureFlag = {
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
      deprecatedControllers: [],
    };

    expect(getIsDeprecatedController(flag, 'AccountTrackerController')).toBe(
      false,
    );
  });

  it('returns false when deprecatedControllers is absent', () => {
    const flag: AssetsUnifyStateFeatureFlag = {
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
    };

    expect(getIsDeprecatedController(flag, 'AccountTrackerController')).toBe(
      false,
    );
  });

  it('returns false when flagValue is undefined', () => {
    expect(
      getIsDeprecatedController(undefined, 'AccountTrackerController'),
    ).toBe(false);
  });

  it('returns false when flagValue is null', () => {
    expect(getIsDeprecatedController(null, 'AccountTrackerController')).toBe(
      false,
    );
  });
});

describe('selectIsControllerDeprecated', () => {
  it('returns true when the controller is listed in deprecatedControllers', () => {
    const mockedState = mockStateWith({
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
      deprecatedControllers: ['AccountTrackerController'],
    });

    expect(
      selectIsControllerDeprecated('AccountTrackerController')(mockedState),
    ).toBe(true);
  });

  it('returns false when deprecatedControllers is empty', () => {
    const mockedState = mockStateWith({
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
      deprecatedControllers: [],
    });

    expect(
      selectIsControllerDeprecated('AccountTrackerController')(mockedState),
    ).toBe(false);
  });

  it('returns false when deprecatedControllers is absent', () => {
    const mockedState = mockStateWith({
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
    });

    expect(
      selectIsControllerDeprecated('AccountTrackerController')(mockedState),
    ).toBe(false);
  });

  it('returns false when the flag is missing from state', () => {
    expect(
      selectIsControllerDeprecated('AccountTrackerController')(
        mockedUndefinedFlagsState,
      ),
    ).toBe(false);
  });
});
