import {
  selectMultichainAccountsState1Enabled,
  selectMultichainAccountsState2Enabled,
  isMultichainAccountsFeatureEnabled,
} from './enabledMultichainAccounts';

describe('Multichain Accounts Feature Flag', () => {
  describe('isMultichainAccountsFeatureEnabled', () => {
    it('returns false when the feature flag is not undefined', () => {
      const result = isMultichainAccountsFeatureEnabled(undefined, '1');
      expect(result).toBe(false);
    });

    it('returns false when the feature is not enabled', () => {
      const result = isMultichainAccountsFeatureEnabled(
        { enabled: false, featureVersion: null, minimumVersion: null },
        '1'
      );
      expect(result).toBe(false);
    });

    it('returns false when the feature version does not match', () => {
      const result = isMultichainAccountsFeatureEnabled(
        { enabled: true, featureVersion: '2', minimumVersion: '1.0.0' },
        '1'
      );
      expect(result).toBe(false);
    });
  });

  describe('selectMultichainAccountsState1Enabled', () => {
    it('returns false when the feature is not enabled', () => {
      const result = selectMultichainAccountsState1Enabled.resultFunc({
        enabledMultichainAccounts: {
          enabled: false,
          featureVersion: null,
          minimumVersion: null,
        },
      });
      expect(result).toBe(false);
    });
  });

  describe('selectMultichainAccountsState2Enabled', () => {
    it('returns false when the feature is not enabled', () => {
      const result = selectMultichainAccountsState2Enabled.resultFunc({
        enabledMultichainAccounts: {
          enabled: false,
          featureVersion: null,
          minimumVersion: null,
        },
      });
      expect(result).toBe(false);
    });
  });
});
