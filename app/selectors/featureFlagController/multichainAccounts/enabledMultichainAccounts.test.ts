import {
  selectMultichainAccountsState1Enabled,
  selectMultichainAccountsState2Enabled,
} from './enabledMultichainAccounts';

jest.mock('../../../../package.json', () => ({
  version: '15.0.0',
}));

const disabledStateMock = {
  enabled: false,
  featureVersion: null,
  minimumVersion: null,
};

const state1Mock = {
  enabled: true,
  featureVersion: '1',
  minimumVersion: '13.0.0',
};

const state2Mock = {
  enabled: true,
  featureVersion: '2',
  minimumVersion: '14.0.0',
};

describe('Multichain Accounts Feature Flag', () => {
  describe('selectMultichainAccountsState1Enabled', () => {
    it('returns false when the feature is not enabled', () => {
      const result = selectMultichainAccountsState1Enabled.resultFunc({
        enableMultichainAccounts: disabledStateMock,
      });
      expect(result).toBe(false);
    });

    it('returns true when the feature is enabled for state 1', () => {
      const result = selectMultichainAccountsState1Enabled.resultFunc({
        enableMultichainAccounts: state1Mock,
      });
      expect(result).toBe(true);
    });

    it('returns true when the feature is enabled for state 2', () => {
      const result = selectMultichainAccountsState1Enabled.resultFunc({
        enableMultichainAccounts: state2Mock,
      });
      expect(result).toBe(true);
    });
  });

  describe('selectMultichainAccountsState2Enabled', () => {
    it('returns false when the feature is not enabled', () => {
      const result = selectMultichainAccountsState2Enabled.resultFunc({
        enableMultichainAccounts: disabledStateMock,
      });
      expect(result).toBe(false);
    });

    it('returns false when the feature is enabled for state 1', () => {
      const result = selectMultichainAccountsState2Enabled.resultFunc({
        enableMultichainAccounts: state1Mock,
      });
      expect(result).toBe(false);
    });

    it('returns true when the feature is enabled for state 2', () => {
      const result = selectMultichainAccountsState2Enabled.resultFunc({
        enableMultichainAccounts: state2Mock,
      });
      expect(result).toBe(true);
    });
  });
});
