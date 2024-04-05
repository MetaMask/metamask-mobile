import { setReloadAccounts } from '.';

describe('accounts, reloadAccounts', () => {
  describe('setReloadAccounts', () => {
    it('should create an action to set reloadAccounts to true', () => {
      expect(setReloadAccounts(true)).toEqual({
        type: 'SET_RELOAD_ACCOUNTS',
        reloadAccounts: true,
      });
    });

    it('should create an action to set reloadAccounts to false', () => {
      expect(setReloadAccounts(false)).toEqual({
        type: 'SET_RELOAD_ACCOUNTS',
        reloadAccounts: false,
      });
    });
  });
});
