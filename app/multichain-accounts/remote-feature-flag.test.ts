import {
  assertMultichainAccountsFeatureFlagType,
  isMultichainAccountsState1Enabled,
  isMultichainAccountsState2Enabled,
} from './remote-feature-flag';
import Engine from '../core/Engine';

jest.mock('../../package.json', () => ({
  version: '15.0.0',
}));

describe('Multichain Accounts Feature Flag', () => {
  let remoteFeatureFlagsMock: unknown;

  beforeEach(() => {
    remoteFeatureFlagsMock = {};
    Engine.context = {
      RemoteFeatureFlagController: {
        state: {
          remoteFeatureFlags: remoteFeatureFlagsMock,
        },
      },
    };
  });

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

  describe('isMultichainAccountsState1Enabled', () => {
    it('returns true when the feature flag is missing', () => {
      const result = isMultichainAccountsState1Enabled();
      expect(result).toBe(true);
    });

    it('returns true when the feature is enabled and minimum version is met', () => {
      remoteFeatureFlagsMock.enableMultichainAccounts = {
        enabled: true,
        featureVersion: '1',
        minimumVersion: '10.0.0',
      };
      const result = isMultichainAccountsState1Enabled();
      expect(result).toBe(true);
    });

    it('returns false when the feature is enabled but version does not match', () => {
      remoteFeatureFlagsMock.enableMultichainAccounts = {
        enabled: true,
        featureVersion: '2',
        minimumVersion: '10.0.0',
      };
      const result = isMultichainAccountsState1Enabled();
      expect(result).toBe(false);
    });

    it('returns false when the minimum version is not met', () => {
      remoteFeatureFlagsMock.enableMultichainAccounts = {
        enabled: true,
        featureVersion: '1',
        minimumVersion: '16.0.0',
      };
      const result = isMultichainAccountsState1Enabled();
      expect(result).toBe(false);
    });
  });

  describe('isMultichainAccountsState2Enabled', () => {
    it('returns true when the feature flag is missing', () => {
      const result = isMultichainAccountsState2Enabled();
      expect(result).toBe(true);
    });

    it('returns true when the feature is enabled and minimum version is met', () => {
      remoteFeatureFlagsMock.enableMultichainAccountsState2 = {
        enabled: true,
        featureVersion: '2',
        minimumVersion: '10.0.0',
      };
      const result = isMultichainAccountsState2Enabled();
      expect(result).toBe(true);
    });

    it('returns false when the feature is enabled but version does not match', () => {
      remoteFeatureFlagsMock.enableMultichainAccountsState2 = {
        enabled: true,
        featureVersion: '1',
        minimumVersion: '10.0.0',
      };
      const result = isMultichainAccountsState2Enabled();
      expect(result).toBe(false);
    });

    it('returns false when the minimum version is not met', () => {
      remoteFeatureFlagsMock.enableMultichainAccountsState2 = {
        enabled: true,
        featureVersion: '2',
        minimumVersion: '16.0.0',
      };
      const result = isMultichainAccountsState2Enabled();
      expect(result).toBe(false);
    });
  });
});
