import {
  assertMultichainAccountsFeatureFlagType,
  isMultichainAccountsRemoteFeatureEnabled,
  STATE_1_FLAG,
  STATE_2_FLAG,
  MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
  MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
} from './remote-feature-flag';

describe('Multichain Accounts Feature Flag', () => {
  describe('assertMultichainAccountsFeatureFlagType', () => {
    it('returns true for valid feature flag type', () => {
      const validFlag = {
        enabled: true,
        featureVersion: '1',
        minimumVersion: '1.0.0',
      };
      expect(assertMultichainAccountsFeatureFlagType(validFlag)).toBe(true);
    });

    it('returns false for invalid feature flag type', () => {
      const invalidFlag = {
        enabled: 'yes',
        featureVersion: 1,
        minimumVersion: null,
      };
      expect(assertMultichainAccountsFeatureFlagType(invalidFlag)).toBe(false);
    });

    it('returns false for undefined feature flag', () => {
      expect(assertMultichainAccountsFeatureFlagType(undefined)).toBe(false);
    });
  });

  describe('isMultichainAccountsRemoteFeatureEnabled', () => {
    it('always returns true regardless of flags or versions', () => {
      expect(
        isMultichainAccountsRemoteFeatureEnabled({}, [
          {
            version: MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
            featureKey: STATE_1_FLAG,
          },
        ]),
      ).toBe(true);

      expect(
        isMultichainAccountsRemoteFeatureEnabled(
          {
            [STATE_2_FLAG]: {
              enabled: false,
              featureVersion: null,
              minimumVersion: null,
            },
          },
          [
            {
              version: MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
              featureKey: STATE_2_FLAG,
            },
          ],
        ),
      ).toBe(true);
    });
  });
});
