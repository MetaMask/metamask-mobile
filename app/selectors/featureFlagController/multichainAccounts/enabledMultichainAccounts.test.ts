import {
  selectMultichainAccountsState1Enabled,
  selectMultichainAccountsState2Enabled,
} from './enabledMultichainAccounts';
import { StateWithPartialEngine } from '../types';
import { MultichainAccountsFeatureFlag } from '../../../multichain-accounts/remote-feature-flag';

jest.mock('../../../../package.json', () => ({
  version: '15.0.0',
}));

let mockIsRemoteFeatureFlagOverrideActivated = false;

jest.mock(
  '../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    get isRemoteFeatureFlagOverrideActivated() {
      return mockIsRemoteFeatureFlagOverrideActivated;
    },
  }),
);

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

const createMockState = (
  enableMultichainAccounts: MultichainAccountsFeatureFlag,
): StateWithPartialEngine => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          enableMultichainAccounts: {
            enabled: enableMultichainAccounts.enabled,
            featureVersion: enableMultichainAccounts.featureVersion,
            minimumVersion: enableMultichainAccounts.minimumVersion,
          },
        },
        cacheTimestamp: Date.now(),
      },
    },
  },
});

describe('Multichain Accounts Feature Flag', () => {
  beforeEach(() => {
    mockIsRemoteFeatureFlagOverrideActivated = false;
  });

  describe('selectMultichainAccountsState1Enabled', () => {
    it('returns false when the feature is not enabled', () => {
      const mockState = createMockState(disabledStateMock);
      const result = selectMultichainAccountsState1Enabled(mockState);
      expect(result).toBe(false);
    });

    it('returns true when the feature is enabled for state 1', () => {
      const mockState = createMockState(state1Mock);
      const result = selectMultichainAccountsState1Enabled(mockState);
      expect(result).toBe(true);
    });

    it('returns true when the feature is enabled for state 2', () => {
      const mockState = createMockState(state2Mock);
      const result = selectMultichainAccountsState1Enabled(mockState);
      expect(result).toBe(true);
    });

    it('returns false when remote feature flags are overridden', () => {
      mockIsRemoteFeatureFlagOverrideActivated = true;

      const mockState = createMockState(state1Mock);
      const result = selectMultichainAccountsState1Enabled(mockState);
      expect(result).toBe(false);
    });
  });

  describe('selectMultichainAccountsState2Enabled', () => {
    it('returns false when the feature is not enabled', () => {
      const mockState = createMockState(disabledStateMock);
      const result = selectMultichainAccountsState2Enabled(mockState);
      expect(result).toBe(false);
    });

    it('returns false when the feature is enabled for state 1', () => {
      const mockState = createMockState(state1Mock);
      const result = selectMultichainAccountsState2Enabled(mockState);
      expect(result).toBe(false);
    });

    it('returns true when the feature is enabled for state 2', () => {
      const mockState = createMockState(state2Mock);
      const result = selectMultichainAccountsState2Enabled(mockState);
      expect(result).toBe(true);
    });

    it('returns false when remote feature flags are overridden', () => {
      mockIsRemoteFeatureFlagOverrideActivated = true;

      const mockState = createMockState(state2Mock);
      const result = selectMultichainAccountsState2Enabled(mockState);
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false when RemoteFeatureFlagController state is missing', () => {
      const mockState: StateWithPartialEngine = {
        engine: {
          backgroundState: {},
        },
      };

      const result1 = selectMultichainAccountsState1Enabled(mockState);
      const result2 = selectMultichainAccountsState2Enabled(mockState);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it('returns false when remoteFeatureFlags is missing', () => {
      const mockState: StateWithPartialEngine = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: Date.now(),
            },
          },
        },
      };

      const result1 = selectMultichainAccountsState1Enabled(mockState);
      const result2 = selectMultichainAccountsState2Enabled(mockState);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it('returns false when enableMultichainAccounts is missing', () => {
      const mockState: StateWithPartialEngine = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: Date.now(),
            },
          },
        },
      };

      const result1 = selectMultichainAccountsState1Enabled(mockState);
      const result2 = selectMultichainAccountsState2Enabled(mockState);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it('returns false when app version does not meet minimum version requirement', () => {
      const highMinVersionMock: MultichainAccountsFeatureFlag = {
        enabled: true,
        featureVersion: '2',
        minimumVersion: '16.0.0', // Higher than mocked app version 15.0.0
      };

      const mockState = createMockState(highMinVersionMock);
      const result = selectMultichainAccountsState2Enabled(mockState);
      expect(result).toBe(false);
    });

    it('handles invalid feature flag structure', () => {
      const invalidMock = {
        enabled: 'not-a-boolean',
        featureVersion: 123,
        minimumVersion: null,
      } as unknown as MultichainAccountsFeatureFlag;

      const mockState = createMockState(invalidMock);
      const result1 = selectMultichainAccountsState1Enabled(mockState);
      const result2 = selectMultichainAccountsState2Enabled(mockState);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });
});
