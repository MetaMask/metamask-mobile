import {
  selectIsAssetsUnifyStateEnabled,
  isAssetsUnifyStateFeatureEnabled,
  AssetsUnifyStateFeatureFlag,
  ASSETS_UNIFY_STATE_FLAG,
  ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
} from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import { FeatureFlags } from '@metamask/remote-feature-flag-controller';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

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
  it('returns true when enabled with matching version', () => {
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
  it('returns true when assetsUnifyState flag is enabled with matching version', () => {
    const mockedState = mockStateWith({
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
    });

    expect(selectIsAssetsUnifyStateEnabled(mockedState)).toBe(true);
  });

  it('returns false when assetsUnifyState flag is disabled', () => {
    const mockedState = mockStateWith({
      enabled: false,
      featureVersion: null,
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
