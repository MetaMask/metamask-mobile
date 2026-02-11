import {
  selectIsAssetsUnifyStateEnabled,
  isAssetsUnifyStateFeatureEnabled,
  AssetsUnifyStateFeatureFlag,
  ASSETS_UNIFY_STATE_FLAG,
  ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
} from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import packageJson from '../../../../package.json';
import { FeatureFlags } from '@metamask/remote-feature-flag-controller';

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
  it('returns true when enabled with matching version and minimum version met', () => {
    const flag: AssetsUnifyStateFeatureFlag = {
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
      minimumVersion: '1.0.0',
    };

    expect(isAssetsUnifyStateFeatureEnabled(flag)).toBe(true);
  });

  it('returns false when disabled', () => {
    const flag: AssetsUnifyStateFeatureFlag = {
      enabled: false,
      featureVersion: null,
      minimumVersion: null,
    };

    expect(isAssetsUnifyStateFeatureEnabled(flag)).toBe(false);
  });

  it('returns false when featureVersion does not match', () => {
    const flag: AssetsUnifyStateFeatureFlag = {
      enabled: true,
      featureVersion: '99',
      minimumVersion: '1.0.0',
    };

    expect(isAssetsUnifyStateFeatureEnabled(flag)).toBe(false);
  });

  it('returns false when minimumVersion is null', () => {
    const flag: AssetsUnifyStateFeatureFlag = {
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
      minimumVersion: null,
    };

    expect(isAssetsUnifyStateFeatureEnabled(flag)).toBe(false);
  });

  it('returns false when app version is below minimum version', () => {
    const flag: AssetsUnifyStateFeatureFlag = {
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
      minimumVersion: '999.999.999',
    };

    expect(isAssetsUnifyStateFeatureEnabled(flag)).toBe(false);
  });

  it('returns false for undefined flagValue', () => {
    expect(isAssetsUnifyStateFeatureEnabled(undefined)).toBe(false);
  });
});

describe('selectIsAssetsUnifyStateEnabled', () => {
  it('returns true when assetsUnifyState flag is enabled and version meets minimum', () => {
    const mockedState = mockStateWith({
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
      minimumVersion: '1.0.0',
    });

    expect(selectIsAssetsUnifyStateEnabled(mockedState)).toBe(true);
  });

  it('returns false when assetsUnifyState flag is disabled', () => {
    const mockedState = mockStateWith({
      enabled: false,
      featureVersion: null,
      minimumVersion: null,
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

  it('returns false when app version is below minimum version', () => {
    const mockedState = mockStateWith({
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
      minimumVersion: '999.999.999',
    });

    expect(selectIsAssetsUnifyStateEnabled(mockedState)).toBe(false);
  });

  it('returns true when app version equals minimum version', () => {
    const currentVersion = packageJson.version;
    const mockedState = mockStateWith({
      enabled: true,
      featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
      minimumVersion: currentVersion,
    });

    expect(selectIsAssetsUnifyStateEnabled(mockedState)).toBe(true);
  });

  it('returns false when featureVersion does not match', () => {
    const mockedState = mockStateWith({
      enabled: true,
      featureVersion: '99',
      minimumVersion: '1.0.0',
    });

    expect(selectIsAssetsUnifyStateEnabled(mockedState)).toBe(false);
  });
});
