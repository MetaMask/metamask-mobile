import {
  selectAssetsTrendingTokensEnabled,
  isAssetsTrendingTokensFeatureEnabled,
  AssetsTrendingTokensFeatureFlag,
} from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import packageJson from '../../../../package.json';
import { FeatureFlags } from '@metamask/remote-feature-flag-controller';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

jest.mock('../../../util/test/utils', () => ({
  isE2E: true,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllMocks();
});

// Type for progressive rollout format with value property
type ProgressiveRolloutFlag =
  | { value: AssetsTrendingTokensFeatureFlag | boolean }
  | AssetsTrendingTokensFeatureFlag
  | boolean;

// Helper function to create mock state with assetsTrendingTokensEnabled flag
function mockStateWith(trendingTokens: ProgressiveRolloutFlag) {
  return {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          cacheTimestamp: 0,
          remoteFeatureFlags: {
            trendingTokens,
          } as unknown as FeatureFlags,
        },
      },
    },
  };
}

describe('Assets Trending Tokens Feature Flag Selector', () => {
  describe('selectAssetsTrendingTokensEnabled', () => {
    it('returns true when flag is enabled and version meets minimum', () => {
      const mockedState = mockStateWith({
        enabled: true,
        minimumVersion: '1.0.0',
      });

      const result = selectAssetsTrendingTokensEnabled(mockedState);

      expect(result).toBe(true);
    });

    it('returns false when flag is disabled', () => {
      const mockedState = mockStateWith({
        enabled: false,
        minimumVersion: '1.0.0',
      });

      const result = selectAssetsTrendingTokensEnabled(mockedState);

      expect(result).toBe(false);
    });

    it('returns true when flag is simple boolean true', () => {
      const mockedState = mockStateWith(true);

      const result = selectAssetsTrendingTokensEnabled(mockedState);

      expect(result).toBe(true);
    });

    it('returns false when flag is simple boolean false', () => {
      const mockedState = mockStateWith(false);

      const result = selectAssetsTrendingTokensEnabled(mockedState);

      expect(result).toBe(false);
    });

    it('returns true when flag has value property with enabled flag', () => {
      const mockedState = mockStateWith({
        value: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      const result = selectAssetsTrendingTokensEnabled(mockedState);

      expect(result).toBe(true);
    });

    it('returns false when flag has value property with disabled flag', () => {
      const mockedState = mockStateWith({
        value: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });

      const result = selectAssetsTrendingTokensEnabled(mockedState);

      expect(result).toBe(false);
    });

    it('returns false when flag has value property but version is too low', () => {
      const mockedState = mockStateWith({
        value: {
          enabled: true,
          minimumVersion: '999.999.999',
        },
      });

      const result = selectAssetsTrendingTokensEnabled(mockedState);

      expect(result).toBe(false);
    });

    it('returns false when flag is undefined', () => {
      const result = selectAssetsTrendingTokensEnabled(
        mockedUndefinedFlagsState,
      );

      expect(result).toBe(false);
    });

    it('returns false when flag state is empty', () => {
      const result = selectAssetsTrendingTokensEnabled(mockedEmptyFlagsState);

      expect(result).toBe(false);
    });

    it('returns false when app version is below minimum version', () => {
      const mockedState = mockStateWith({
        enabled: true,
        minimumVersion: '999.999.999',
      });

      const result = selectAssetsTrendingTokensEnabled(mockedState);

      expect(result).toBe(false);
    });

    it('returns true when app version equals minimum version', () => {
      const currentVersion = packageJson.version;
      const mockedState = mockStateWith({
        enabled: true,
        minimumVersion: currentVersion,
      });

      const result = selectAssetsTrendingTokensEnabled(mockedState);

      expect(result).toBe(true);
    });

    it('returns false when flag structure is invalid', () => {
      // @ts-expect-error - Testing error case.
      const mockedState = mockStateWith({
        enabled: true,
        // Missing minimumVersion - should return false for safety
      });

      const result = selectAssetsTrendingTokensEnabled(mockedState);

      expect(result).toBe(false);
    });

    it('returns false when minimumVersion is not a string', () => {
      const mockedState = mockStateWith({
        enabled: true,
        // @ts-expect-error - Testing error case with invalid type
        minimumVersion: 123,
      });

      const result = selectAssetsTrendingTokensEnabled(mockedState);

      expect(result).toBe(false);
    });

    it('returns false when flag is null', () => {
      const stateWithNullFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                assetsTrendingTokensEnabled: null,
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectAssetsTrendingTokensEnabled(stateWithNullFlag);

      expect(result).toBe(false);
    });

    it('returns true when flag has value property with boolean true', () => {
      const mockedState = mockStateWith({
        value: true,
      });

      const result = selectAssetsTrendingTokensEnabled(mockedState);

      expect(result).toBe(true);
    });

    it('returns false when flag has value property with boolean false', () => {
      const mockedState = mockStateWith({
        value: false,
      });

      const result = selectAssetsTrendingTokensEnabled(mockedState);

      expect(result).toBe(false);
    });
  });

  describe('isAssetsTrendingTokensFeatureEnabled with override', () => {
    it('returns true when envOverride is "true" regardless of remote flag', () => {
      const result = isAssetsTrendingTokensFeatureEnabled(
        {
          enabled: false,
          minimumVersion: '999.999.999',
        },
        'true',
      );

      expect(result).toBe(true);
    });

    it('returns true when envOverride is "true" with no remote flag', () => {
      const result = isAssetsTrendingTokensFeatureEnabled(undefined, 'true');

      expect(result).toBe(true);
    });

    it('returns false when envOverride is "false"', () => {
      const result = isAssetsTrendingTokensFeatureEnabled(
        {
          enabled: true,
          minimumVersion: '1.0.0',
        },
        'false',
      );

      expect(result).toBe(false);
    });

    it('uses remote flag when envOverride is undefined', () => {
      const result = isAssetsTrendingTokensFeatureEnabled(
        {
          enabled: true,
          minimumVersion: '1.0.0',
        },
        undefined,
      );

      expect(result).toBe(true);
    });

    it.each(['', 'something-else', 'invalid'])(
      'uses remote flag when envOverride is non-boolean string: "%s"',
      (envOverride) => {
        const result = isAssetsTrendingTokensFeatureEnabled(
          {
            enabled: true,
            minimumVersion: '1.0.0',
          },
          envOverride,
        );

        expect(result).toBe(true);
      },
    );
  });

  describe('isAssetsTrendingTokensFeatureEnabled edge cases', () => {
    it('returns false when flagValue is undefined', () => {
      const result = isAssetsTrendingTokensFeatureEnabled(undefined);

      expect(result).toBe(false);
    });

    it('returns false when flagValue is null', () => {
      const result = isAssetsTrendingTokensFeatureEnabled(null);

      expect(result).toBe(false);
    });

    it('returns false when flagValue is an empty object', () => {
      const result = isAssetsTrendingTokensFeatureEnabled({});

      expect(result).toBe(false);
    });

    it('returns false when flagValue is a string', () => {
      const result = isAssetsTrendingTokensFeatureEnabled('true');

      expect(result).toBe(false);
    });

    it('returns false when flagValue is a number', () => {
      const result = isAssetsTrendingTokensFeatureEnabled(1);

      expect(result).toBe(false);
    });

    it('returns false when minimumVersion is empty string', () => {
      const result = isAssetsTrendingTokensFeatureEnabled({
        enabled: true,
        minimumVersion: '',
      });

      expect(result).toBe(false);
    });

    it('returns false when minimumVersion has invalid format', () => {
      const result = isAssetsTrendingTokensFeatureEnabled({
        enabled: true,
        minimumVersion: 'not-a-version',
      });

      expect(result).toBe(false);
    });
  });
});
