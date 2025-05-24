import { selectMultichainAccountsState1Enabled, selectMultichainAccountsState2Enabled } from './enabledMultichainAccounts';

describe('Multichain Accounts Feature Flag', () => {
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
