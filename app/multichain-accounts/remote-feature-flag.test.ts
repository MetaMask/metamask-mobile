import {
  assertMultichainAccountsFeatureFlagType,
  isMultichainAccountsRemoteFeatureEnabled,
  STATE_1_FLAG,
  STATE_2_FLAG,
  MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
  MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
} from './remote-feature-flag';

jest.mock('../../package.json', () => ({
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
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('isMultichainAccountsRemoteFeatureEnabled - State 1', () => {
    it('returns false when the feature flag is not defined', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          // @ts-expect-error Testing undefined flag
          [STATE_1_FLAG]: undefined,
        },
        STATE_1_FLAG,
        MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
      );
      expect(result).toBe(false);
    });

    it('returns true when the feature flag is meets all conditions', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          [STATE_1_FLAG]: state1Mock,
        },
        STATE_1_FLAG,
        MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
      );
      expect(result).toBe(true);
    });

    it('returns false when the feature is not enabled', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          [STATE_1_FLAG]: disabledStateMock,
        },
        STATE_1_FLAG,
        MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
      );
      expect(result).toBe(false);
    });

    it('returns false when the feature version does not match', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          [STATE_1_FLAG]: {
            ...state1Mock,
            featureVersion: '2',
          },
        },
        STATE_1_FLAG,
        MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
      );
      expect(result).toBe(false);
    });
  });

  describe('isMultichainAccountsRemoteFeatureEnabled - State 2', () => {
    it('returns false when the feature flag is not defined', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          // @ts-expect-error Testing undefined flag
          [STATE_2_FLAG]: undefined,
        },
        STATE_2_FLAG,
        MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
      );
      expect(result).toBe(false);
    });

    it('returns true when the feature flag is meets all conditions', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          [STATE_2_FLAG]: state2Mock,
        },
        STATE_2_FLAG,
        MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
      );
      expect(result).toBe(true);
    });

    it('returns false when the feature is not enabled', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          [STATE_2_FLAG]: disabledStateMock,
        },
        STATE_2_FLAG,
        MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
      );
      expect(result).toBe(false);
    });

    it('returns false when the feature version does not match', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          [STATE_2_FLAG]: {
            ...state2Mock,
            featureVersion: '1',
          },
        },
        STATE_2_FLAG,
        MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
      );
      expect(result).toBe(false);
    });
  });
});
