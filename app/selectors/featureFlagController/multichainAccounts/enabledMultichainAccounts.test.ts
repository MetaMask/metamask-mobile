import {
  selectMultichainAccountsState1Enabled,
  selectMultichainAccountsState2Enabled,
} from './enabledMultichainAccounts';

describe('Multichain Accounts Feature Flag', () => {
  describe('selectMultichainAccountsState1Enabled', () => {
    it('returns true regardless of input parameters', () => {
      const result = selectMultichainAccountsState1Enabled.resultFunc({});

      expect(result).toBe(true);
    });
  });

  describe('selectMultichainAccountsState2Enabled', () => {
    it('returns true regardless of input parameters', () => {
      const result = selectMultichainAccountsState2Enabled.resultFunc({});

      expect(result).toBe(true);
    });
  });
});
