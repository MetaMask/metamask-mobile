import {
  assertMultichainAccountsFeatureFlagType,
  isMultichainAccountsRemoteFeatureEnabled,
  isMultichainAccountsState2Enabled,
  STATE_1_FLAG,
  STATE_2_FLAG,
  MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
  MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
} from './remote-feature-flag';

jest.mock('../../package.json', () => ({
  version: '15.0.0',
}));

const mockRemoteFeatureFlags = jest.fn();
jest.mock('../core/Engine', () => ({
  context: {
    RemoteFeatureFlagController: {
      state: {
        get remoteFeatureFlags() {
          return mockRemoteFeatureFlags();
        },
      },
    },
  },
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

const mockState1FeatureVersionsToCheck = [
  {
    version: MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
    featureKey: STATE_1_FLAG,
  },
];

const mockState2FeatureVersionsToCheck = [
  {
    version: MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
    featureKey: STATE_2_FLAG,
  },
];

describe('Multichain Accounts Feature Flag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoteFeatureFlags.mockReturnValue({});
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

    it('returns true for valid feature flag with null featureVersion', () => {
      const validFlag = {
        enabled: false,
        featureVersion: null,
        minimumVersion: null,
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

    it('returns false for null feature flag', () => {
      expect(assertMultichainAccountsFeatureFlagType(null)).toBe(false);
    });

    it('returns false when enabled is missing', () => {
      const invalidFlag = {
        featureVersion: '1',
        minimumVersion: '1.0.0',
      };

      expect(assertMultichainAccountsFeatureFlagType(invalidFlag)).toBe(false);
    });
  });

  describe('isMultichainAccountsRemoteFeatureEnabled - State 2', () => {
    it('returns true when the feature flag is undefined', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          // @ts-expect-error Testing undefined flag
          [STATE_2_FLAG]: undefined,
        },
        mockState2FeatureVersionsToCheck,
      );

      expect(result).toBe(true);
    });

    it('returns true when the feature flag meets all conditions', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          [STATE_2_FLAG]: state2Mock,
        },
        mockState2FeatureVersionsToCheck,
      );

      expect(result).toBe(true);
    });

    it('returns false when the feature is not enabled', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          [STATE_2_FLAG]: disabledStateMock,
        },
        mockState2FeatureVersionsToCheck,
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
        mockState2FeatureVersionsToCheck,
      );

      expect(result).toBe(false);
    });
  });

  describe('isMultichainAccountsRemoteFeatureEnabled - Local override', () => {
    it('returns true when the override is enabled', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          [STATE_2_FLAG]: disabledStateMock,
        },
        mockState2FeatureVersionsToCheck,
        'true',
      );

      expect(result).toBe(true);
    });

    it('returns false when the override is disabled', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          [STATE_2_FLAG]: disabledStateMock,
        },
        mockState2FeatureVersionsToCheck,
        'false',
      );

      expect(result).toBe(false);
    });

    it('returns false when the override is undefined and flag is disabled', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          [STATE_2_FLAG]: disabledStateMock,
        },
        mockState2FeatureVersionsToCheck,
        undefined,
      );

      expect(result).toBe(false);
    });

    it('ignores override for state 1 feature versions', () => {
      const result = isMultichainAccountsRemoteFeatureEnabled(
        {
          [STATE_1_FLAG]: disabledStateMock,
        },
        mockState1FeatureVersionsToCheck,
        'true',
      );

      // Override only applies to state 2, so it uses the flag value
      expect(result).toBe(false);
    });
  });

  describe('isMultichainAccountsState2Enabled', () => {
    it('returns true when state 2 feature flag is enabled', () => {
      mockRemoteFeatureFlags.mockReturnValue({
        [STATE_2_FLAG]: state2Mock,
      });

      const result = isMultichainAccountsState2Enabled();

      expect(result).toBe(true);
    });

    it('returns false when state 2 feature flag is disabled', () => {
      mockRemoteFeatureFlags.mockReturnValue({
        [STATE_2_FLAG]: disabledStateMock,
      });

      const result = isMultichainAccountsState2Enabled();

      expect(result).toBe(false);
    });

    it('returns true when remote feature flags are empty', () => {
      mockRemoteFeatureFlags.mockReturnValue({});

      const result = isMultichainAccountsState2Enabled();

      expect(result).toBe(true);
    });
  });
});
