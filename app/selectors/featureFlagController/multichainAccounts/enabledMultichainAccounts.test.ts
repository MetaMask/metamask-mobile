import { selectMultichainAccountsState2Enabled } from './enabledMultichainAccounts';

jest.mock('../../../../package.json', () => ({
  version: '15.0.0',
}));

const disabledStateMock = {
  enabled: false,
  featureVersion: null,
  minimumVersion: null,
};

const state2Mock = {
  enabled: true,
  featureVersion: '2',
  minimumVersion: '14.0.0',
};

describe('Multichain Accounts Feature Flag', () => {
  describe('selectMultichainAccountsState2Enabled', () => {
    it('returns true when the flag is undefined', () => {
      const result = selectMultichainAccountsState2Enabled.resultFunc({
        // @ts-expect-error testing undefined case
        enableMultichainAccountsState2: undefined,
      });

      expect(result).toBe(true);
    });

    it('returns false when the feature is not enabled', () => {
      const result = selectMultichainAccountsState2Enabled.resultFunc({
        enableMultichainAccountsState2: disabledStateMock,
      });

      expect(result).toBe(false);
    });

    it('returns true when the feature is enabled for state 2', () => {
      const result = selectMultichainAccountsState2Enabled.resultFunc({
        enableMultichainAccountsState2: state2Mock,
      });

      expect(result).toBe(true);
    });
  });
});
