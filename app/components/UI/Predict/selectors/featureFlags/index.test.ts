import { selectPredictEnabledFlag } from '.';
import mockedEngine from '../../../../../core/__mocks__/MockedEngine';
import {
  mockedState,
  mockedEmptyFlagsState,
} from '../../../../../selectors/featureFlagController/mocks';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
// eslint-disable-next-line import/no-namespace
import * as remoteFeatureFlagModule from '../../../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

jest.mock(
  '../../../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

describe('Predict Feature Flag Selectors', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MM_PREDICT_ENABLED;
    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);
  });

  afterEach(() => {
    delete process.env.MM_PREDICT_ENABLED;
    mockHasMinimumRequiredVersion?.mockRestore();
  });

  describe('selectPredictEnabledFlag', () => {
    it('returns true for enabled version-gated flag with valid version', () => {
      const result = selectPredictEnabledFlag(mockedState);

      expect(result).toBe(true);
    });

    describe('remote flag precedence', () => {
      it('returns true when remote flag enabled overrides local flag false', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_PREDICT_ENABLED = 'false';
        const stateWithEnabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  predictTradingEnabled: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPredictEnabledFlag(stateWithEnabledRemoteFlag);

        expect(result).toBe(true);
      });

      it('returns false when remote flag disabled overrides local flag true', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_PREDICT_ENABLED = 'true';
        const stateWithDisabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  predictTradingEnabled: {
                    enabled: false,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPredictEnabledFlag(stateWithDisabledRemoteFlag);

        expect(result).toBe(false);
      });

      it('returns false when app version below minimum required version', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        process.env.MM_PREDICT_ENABLED = 'true';
        const stateWithVersionCheckFailure = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  predictTradingEnabled: {
                    enabled: true,
                    minimumVersion: '99.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPredictEnabledFlag(stateWithVersionCheckFailure);

        expect(result).toBe(false);
      });
    });

    describe('local flag fallback', () => {
      it('falls back to local flag when remote flag is invalid', () => {
        // Note: Cannot reliably test MM_PREDICT_ENABLED=true in Jest due to process.env limitations
        // This tests the default case where the env var is not set (returns false)
        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  predictTradingEnabled: {
                    enabled: 'invalid',
                    minimumVersion: 123,
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPredictEnabledFlag(stateWithInvalidRemoteFlag);
        expect(result).toBe(false);
      });

      it('returns false from local flag when remote flag is null', () => {
        process.env.MM_PREDICT_ENABLED = 'false';
        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  predictTradingEnabled: null,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPredictEnabledFlag(stateWithInvalidRemoteFlag);

        expect(result).toBe(false);
      });

      it('falls back to local flag when remote feature flags are empty', () => {
        // Note: Cannot reliably test MM_PREDICT_ENABLED=true in Jest due to process.env limitations
        // This tests the default case where the env var is not set (returns false)
        const result = selectPredictEnabledFlag(mockedEmptyFlagsState);
        expect(result).toBe(false);
      });

      it('returns false from local flag when controller is undefined', () => {
        process.env.MM_PREDICT_ENABLED = 'false';
        const stateWithUndefinedController = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: undefined,
            },
          },
        };

        const result = selectPredictEnabledFlag(stateWithUndefinedController);

        expect(result).toBe(false);
      });
    });
  });

  describe('predictTradingEnabled remote feature flag validation', () => {
    const validRemoteFlag: VersionGatedFeatureFlag = {
      enabled: true,
      minimumVersion: '1.0.0',
    };

    const disabledRemoteFlag: VersionGatedFeatureFlag = {
      enabled: false,
      minimumVersion: '1.0.0',
    };

    describe('valid flag scenarios', () => {
      it('returns true when flag enabled and version check passes', () => {
        const result = validatedVersionGatedFeatureFlag(validRemoteFlag);

        expect(result).toBe(true);
      });

      it('returns false when flag enabled but version check fails', () => {
        const flagWithHigherVersion: VersionGatedFeatureFlag = {
          enabled: true,
          minimumVersion: '99.0.0',
        };

        const result = validatedVersionGatedFeatureFlag(flagWithHigherVersion);

        expect(result).toBe(false);
      });

      it('returns false when flag disabled but version check passes', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);

        const result = validatedVersionGatedFeatureFlag(disabledRemoteFlag);

        expect(result).toBe(false);
        expect(mockHasMinimumRequiredVersion).not.toHaveBeenCalled();
      });

      it('returns false when flag disabled and version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);

        const result = validatedVersionGatedFeatureFlag(disabledRemoteFlag);

        expect(result).toBe(false);
        expect(mockHasMinimumRequiredVersion).not.toHaveBeenCalled();
      });
    });

    describe('invalid flag scenarios', () => {
      it('returns undefined when flag is null', () => {
        const result = validatedVersionGatedFeatureFlag(
          null as unknown as VersionGatedFeatureFlag,
        );

        expect(result).toBeUndefined();
      });

      it('returns undefined when flag is undefined', () => {
        const result = validatedVersionGatedFeatureFlag(
          undefined as unknown as VersionGatedFeatureFlag,
        );

        expect(result).toBeUndefined();
      });

      it('returns undefined when enabled property is missing', () => {
        const malformedFlag = {
          minimumVersion: '1.0.0',
        } as VersionGatedFeatureFlag;

        const result = validatedVersionGatedFeatureFlag(malformedFlag);

        expect(result).toBeUndefined();
      });

      it('returns undefined when minimumVersion property is missing', () => {
        const malformedFlag = {
          enabled: true,
        } as VersionGatedFeatureFlag;

        const result = validatedVersionGatedFeatureFlag(malformedFlag);

        expect(result).toBeUndefined();
      });

      it('returns undefined when enabled is string instead of boolean', () => {
        const wrongTypeFlag = {
          enabled: 'true',
          minimumVersion: '1.0.0',
        } as unknown as VersionGatedFeatureFlag;

        const result = validatedVersionGatedFeatureFlag(wrongTypeFlag);

        expect(result).toBeUndefined();
      });

      it('returns undefined when minimumVersion is number instead of string', () => {
        const wrongTypeFlag = {
          enabled: true,
          minimumVersion: 100,
        } as unknown as VersionGatedFeatureFlag;

        const result = validatedVersionGatedFeatureFlag(wrongTypeFlag);

        expect(result).toBeUndefined();
      });

      it('returns undefined when both properties have incorrect types', () => {
        const wrongTypeFlag = {
          enabled: 'true',
          minimumVersion: 123,
        } as unknown as VersionGatedFeatureFlag;

        const result = validatedVersionGatedFeatureFlag(wrongTypeFlag);

        expect(result).toBeUndefined();
      });
    });
  });
});
