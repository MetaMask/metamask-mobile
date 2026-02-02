import { selectPredictEnabledFlag, selectPredictHotTabFlag } from '.';
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
      it('returns true when remote flag is enabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
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

      it('returns false when remote flag is disabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
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

    describe('default fallback', () => {
      it('defaults to true when remote flag is invalid', () => {
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

        expect(result).toBe(true);
      });

      it('defaults to true when remote flag is null', () => {
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

        expect(result).toBe(true);
      });

      it('defaults to true when remote feature flags are empty', () => {
        const result = selectPredictEnabledFlag(mockedEmptyFlagsState);

        expect(result).toBe(true);
      });

      it('defaults to true when controller is undefined', () => {
        const stateWithUndefinedController = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: undefined,
            },
          },
        };

        const result = selectPredictEnabledFlag(stateWithUndefinedController);

        expect(result).toBe(true);
      });
    });
  });

  describe('selectPredictHotTabFlag', () => {
    it('returns hot tab flag when present in remote feature flags', () => {
      const stateWithHotTabFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                predictHotTab: {
                  enabled: true,
                  queryParams: '&tag_id=149&order=volume24hr',
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectPredictHotTabFlag(stateWithHotTabFlag);

      expect(result).toEqual({
        enabled: true,
        queryParams: '&tag_id=149&order=volume24hr',
      });
    });

    it('returns default flag when remote flag is missing', () => {
      const result = selectPredictHotTabFlag(mockedEmptyFlagsState);

      expect(result).toEqual({
        enabled: false,
        queryParams:
          'active=true&archived=false&closed=false&liquidity_min=10000&volume_min=10000&tag_id=1',
      });
    });

    it('returns default flag when remote flag is null', () => {
      const stateWithNullFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                predictHotTab: null,
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectPredictHotTabFlag(stateWithNullFlag);

      expect(result).toEqual({
        enabled: false,
        queryParams:
          'active=true&archived=false&closed=false&liquidity_min=10000&volume_min=10000&tag_id=1',
      });
    });

    it('returns default flag when controller is undefined', () => {
      const stateWithUndefinedController = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: undefined,
          },
        },
      };

      const result = selectPredictHotTabFlag(stateWithUndefinedController);

      expect(result).toEqual({
        enabled: false,
        queryParams:
          'active=true&archived=false&closed=false&liquidity_min=10000&volume_min=10000&tag_id=1',
      });
    });

    it('returns disabled flag from remote when flag is disabled', () => {
      const stateWithDisabledFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                predictHotTab: {
                  enabled: false,
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectPredictHotTabFlag(stateWithDisabledFlag);

      expect(result).toEqual({
        enabled: false,
      });
    });

    it('returns flag with empty queryParams when not provided', () => {
      const stateWithFlagNoQueryParams = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                predictHotTab: {
                  enabled: true,
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectPredictHotTabFlag(stateWithFlagNoQueryParams);

      expect(result).toEqual({
        enabled: true,
      });
      expect(result.queryParams).toBeUndefined();
    });

    it('returns default flag when enabled is string "false" instead of boolean', () => {
      const stateWithStringEnabled = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                predictHotTab: {
                  enabled: 'false',
                  queryParams: '&tag_id=149',
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectPredictHotTabFlag(stateWithStringEnabled);

      expect(result).toEqual({
        enabled: false,
        queryParams:
          'active=true&archived=false&closed=false&liquidity_min=10000&volume_min=10000&tag_id=1',
      });
    });

    it('returns default flag when enabled is string "true" instead of boolean', () => {
      const stateWithStringEnabled = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                predictHotTab: {
                  enabled: 'true',
                  queryParams: '&tag_id=149',
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectPredictHotTabFlag(stateWithStringEnabled);

      expect(result).toEqual({
        enabled: false,
        queryParams:
          'active=true&archived=false&closed=false&liquidity_min=10000&volume_min=10000&tag_id=1',
      });
    });

    it('returns default flag when queryParams is not a string', () => {
      const stateWithInvalidQueryParams = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                predictHotTab: {
                  enabled: true,
                  queryParams: 12345,
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectPredictHotTabFlag(stateWithInvalidQueryParams);

      expect(result).toEqual({
        enabled: false,
        queryParams:
          'active=true&archived=false&closed=false&liquidity_min=10000&volume_min=10000&tag_id=1',
      });
    });

    describe('minimumVersion gating', () => {
      it('returns flag when minimumVersion is met', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        const stateWithMinVersion = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  predictHotTab: {
                    enabled: true,
                    queryParams: '&tag_id=149',
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPredictHotTabFlag(stateWithMinVersion);

        expect(result).toEqual({
          enabled: true,
          queryParams: '&tag_id=149',
          minimumVersion: '1.0.0',
        });
      });

      it('returns default flag when minimumVersion is not met', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        const stateWithHighMinVersion = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  predictHotTab: {
                    enabled: true,
                    queryParams: '&tag_id=149',
                    minimumVersion: '99.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPredictHotTabFlag(stateWithHighMinVersion);

        expect(result).toEqual({
          enabled: false,
          queryParams:
            'active=true&archived=false&closed=false&liquidity_min=10000&volume_min=10000&tag_id=1',
        });
      });

      it('returns flag when minimumVersion is not provided', () => {
        const stateWithoutMinVersion = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  predictHotTab: {
                    enabled: true,
                    queryParams: '&tag_id=149',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPredictHotTabFlag(stateWithoutMinVersion);

        expect(result).toEqual({
          enabled: true,
          queryParams: '&tag_id=149',
        });
        expect(mockHasMinimumRequiredVersion).not.toHaveBeenCalled();
      });

      it('returns default flag when minimumVersion is not a string', () => {
        const stateWithInvalidMinVersion = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  predictHotTab: {
                    enabled: true,
                    queryParams: '&tag_id=149',
                    minimumVersion: 123,
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPredictHotTabFlag(stateWithInvalidMinVersion);

        expect(result).toEqual({
          enabled: false,
          queryParams:
            'active=true&archived=false&closed=false&liquidity_min=10000&volume_min=10000&tag_id=1',
        });
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
