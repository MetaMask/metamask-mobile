import { selectMultichainAccountsState2Enabled } from './enabledMultichainAccounts';

describe('Multichain Accounts Feature Flag', () => {
  describe('selectMultichainAccountsState2Enabled', () => {
    it('always returns true — the feature is permanently enabled', () => {
      expect(selectMultichainAccountsState2Enabled.resultFunc({})).toBe(true);
    });
  });
});
