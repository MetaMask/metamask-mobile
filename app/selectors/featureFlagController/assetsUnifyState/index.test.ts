import {
  selectIsAssetsUnifyStateEnabled,
  isAssetsUnifyStateFeatureEnabled,
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

  it('returns true when disabled while hardcoded on for development', () => {
    const flag: AssetsUnifyStateFeatureFlag = {
      enabled: false,
      featureVersion: null,
    };

    expect(isAssetsUnifyStateFeatureEnabled(flag)).toBe(true);
  });

  it('returns true when featureVersion does not match while hardcoded on for development', () => {
    const flag: AssetsUnifyStateFeatureFlag = {
      enabled: true,
      featureVersion: '99',
    };

    expect(isAssetsUnifyStateFeatureEnabled(flag)).toBe(true);
  });

  it('returns true for undefined flagValue while hardcoded on for development', () => {
    expect(isAssetsUnifyStateFeatureEnabled(undefined)).toBe(true);
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

  it('returns true when assetsUnifyState flag is disabled while hardcoded on for development', () => {
    const mockedState = mockStateWith({
      enabled: false,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
    });

    expect(selectIsAssetsUnifyStateEnabled(mockedState)).toBe(true);
  });

  it('returns true when assetsUnifyState flag is undefined while hardcoded on for development', () => {
    expect(selectIsAssetsUnifyStateEnabled(mockedUndefinedFlagsState)).toBe(
      true,
    );
  });

  it('returns true when assetsUnifyState flag is empty while hardcoded on for development', () => {
    expect(selectIsAssetsUnifyStateEnabled(mockedEmptyFlagsState)).toBe(true);
  });

  it('returns true when featureVersion does not match while hardcoded on for development', () => {
    const mockedState = mockStateWith({
      enabled: true,
      featureVersion: '99',
    });

    expect(selectIsAssetsUnifyStateEnabled(mockedState)).toBe(true);
  });
});
