import {
  assertMultichainAccountsFeatureFlagType,
  isMultichainAccountsRemoteFeatureEnabled,
} from './remote-feature-flag';

jest.mock('../../package.json', () => ({
  version: '15.0.0',
}));

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
    it('returns false when the feature flag is not available', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled({}, ['1']);
      expect(result).toBe(false);
    });

    it('returns false when the feature is not enabled', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          enableMultichainAccounts: {
            enabled: false,
            featureVersion: null,
            minimumVersion: null,
          },
        },
        ['1'],
      );
      expect(result).toBe(false);
    });

    it('returns false when the feature version does not match', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          enableMultichainAccounts: {
            enabled: true,
            featureVersion: '2',
            minimumVersion: '1.0.0',
          },
        },
        ['1'],
      );
      expect(result).toBe(false);
    });

    it('returns true when the minimum version is met', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          enableMultichainAccounts: {
            enabled: true,
            featureVersion: '1',
            minimumVersion: '6.0.0',
          },
        },
        ['1'],
      );
      expect(result).toBe(true);
    });

    it('returns false when the minimum version is not met', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          enableMultichainAccounts: {
            enabled: true,
            featureVersion: '1',
            minimumVersion: '16.0.0',
          },
        },
        ['1'],
      );
      expect(result).toBe(false);
    });
  });
});
