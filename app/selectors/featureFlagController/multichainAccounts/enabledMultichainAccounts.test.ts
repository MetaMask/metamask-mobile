import {
  assertMultichainAccountsFeatureFlagType,
  selectMultichainAccountsState1Enabled,
  selectMultichainAccountsState2Enabled,
  isMultichainAccountsFeatureEnabled,
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

  describe('isMultichainAccountsFeatureEnabled', () => {
    it('returns false when the feature flag is undefined', () => {
      const result = isMultichainAccountsFeatureEnabled(undefined, '1');
      expect(result).toBe(false);
    });

    it('returns false when the feature is not enabled', () => {
      const result = isMultichainAccountsFeatureEnabled(disabledStateMock, '1');
      expect(result).toBe(false);
    });

    it('returns false when the feature version does not match', () => {
      const result = isMultichainAccountsFeatureEnabled(
        { enabled: true, featureVersion: '2', minimumVersion: '1.0.0' },
        '1',
      );
      expect(result).toBe(false);
    });

    it('returns false when the minimum version is met', () => {
      const result = isMultichainAccountsFeatureEnabled(
        { enabled: true, featureVersion: '1', minimumVersion: '6.0.0' },
        '1',
      );
      expect(result).toBe(true);
    });

    it('returns false when the minimum version is not met', () => {
      const result = isMultichainAccountsFeatureEnabled(
        { enabled: true, featureVersion: '1', minimumVersion: '16.0.0' },
        '1',
      );
      expect(result).toBe(false);
    });
  });

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
