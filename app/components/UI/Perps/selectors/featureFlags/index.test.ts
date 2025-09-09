import {
  selectPerpsEnabledFlag,
  selectPerpsServiceInterruptionBannerEnabledFlag,
  perpsRemoteFeatureFlag,
} from '.';
import mockedEngine from '../../../../../core/__mocks__/MockedEngine';
import {
  mockedState,
  mockedEmptyFlagsState,
} from '../../../../../selectors/featureFlagController/mocks';
import { PerpsLaunchDarklyFlag } from '../../types';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

jest.mock('../../../../../util/remoteFeatureFlag', () => ({
  hasMinimumRequiredVersion: jest.fn(),
}));

// Import the mocked function to control its behavior
import { hasMinimumRequiredVersion } from '../../../../../util/remoteFeatureFlag';
const mockHasMinimumRequiredVersion =
  hasMinimumRequiredVersion as jest.MockedFunction<
    typeof hasMinimumRequiredVersion
  >;

describe('Perps Feature Flag Selectors', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Default to version check passing
    mockHasMinimumRequiredVersion.mockReturnValue(true);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('selectPerpsEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      const result = selectPerpsEnabledFlag(mockedState);
      expect(result).toBe(true);
    });

    describe('hybrid flag behavior', () => {
      it('uses remote flag when valid and enabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_PERPS_ENABLED = 'false';

        const stateWithEnabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpTradingEnabled: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsEnabledFlag(stateWithEnabledRemoteFlag);
        expect(result).toBe(true);
      });

      it('uses remote flag when valid but disabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_PERPS_ENABLED = 'true';

        const stateWithDisabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpTradingEnabled: {
                    enabled: false,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsEnabledFlag(stateWithDisabledRemoteFlag);
        expect(result).toBe(false);
      });

      it('uses remote flag (false) when enabled but version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        process.env.MM_PERPS_ENABLED = 'true';

        const stateWithVersionCheckFailure = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpTradingEnabled: {
                    enabled: true,
                    minimumVersion: '99.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsEnabledFlag(stateWithVersionCheckFailure);
        expect(result).toBe(false);
      });

      it('falls back to local flag (true) when remote flag is invalid', () => {
        process.env.MM_PERPS_ENABLED = 'true';

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpTradingEnabled: {
                    enabled: 'invalid',
                    minimumVersion: 123,
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsEnabledFlag(stateWithInvalidRemoteFlag);
        expect(result).toBe(true);
      });

      it('falls back to local flag (false) when remote flag is invalid', () => {
        process.env.MM_PERPS_ENABLED = 'false';

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpTradingEnabled: null,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsEnabledFlag(stateWithInvalidRemoteFlag);
        expect(result).toBe(false);
      });

      it('falls back to local flag when remote feature flags are empty', () => {
        process.env.MM_PERPS_ENABLED = 'true';

        const result = selectPerpsEnabledFlag(mockedEmptyFlagsState);
        expect(result).toBe(true);
      });

      it('falls back to local flag when RemoteFeatureFlagController is undefined', () => {
        process.env.MM_PERPS_ENABLED = 'false';

        const stateWithUndefinedController = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: undefined,
            },
          },
        };

        const result = selectPerpsEnabledFlag(stateWithUndefinedController);
        expect(result).toBe(false);
      });
    });
  });

  describe('selectPerpsServiceInterruptionBannerEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      const result =
        selectPerpsServiceInterruptionBannerEnabledFlag(mockedState);
      expect(result).toBe(true);
    });

    describe('hybrid flag behavior', () => {
      it('uses remote flag when valid and enabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_PERPS_SERVICE_INTERRUPTION_BANNER_ENABLED = 'false';

        const stateWithEnabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpTradingServiceInterruptionBannerEnabled: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsServiceInterruptionBannerEnabledFlag(
          stateWithEnabledRemoteFlag,
        );
        expect(result).toBe(true);
      });

      it('uses remote flag when valid but disabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_PERPS_SERVICE_INTERRUPTION_BANNER_ENABLED = 'true';

        const stateWithDisabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpTradingServiceInterruptionBannerEnabled: {
                    enabled: false,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsServiceInterruptionBannerEnabledFlag(
          stateWithDisabledRemoteFlag,
        );
        expect(result).toBe(false);
      });

      it('uses remote flag (false) when enabled but version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        process.env.MM_PERPS_SERVICE_INTERRUPTION_BANNER_ENABLED = 'true';

        const stateWithVersionCheckFailure = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpTradingServiceInterruptionBannerEnabled: {
                    enabled: true,
                    minimumVersion: '99.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsServiceInterruptionBannerEnabledFlag(
          stateWithVersionCheckFailure,
        );
        expect(result).toBe(false);
      });

      it('falls back to local flag (true) when remote flag is invalid', () => {
        process.env.MM_PERPS_SERVICE_INTERRUPTION_BANNER_ENABLED = 'true';

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpTradingServiceInterruptionBannerEnabled: {
                    enabled: 'invalid',
                    minimumVersion: 123,
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsServiceInterruptionBannerEnabledFlag(
          stateWithInvalidRemoteFlag,
        );
        expect(result).toBe(true);
      });

      it('falls back to local flag (false) when remote flag is invalid', () => {
        process.env.MM_PERPS_SERVICE_INTERRUPTION_BANNER_ENABLED = 'false';

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpTradingServiceInterruptionBannerEnabled: null,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsServiceInterruptionBannerEnabledFlag(
          stateWithInvalidRemoteFlag,
        );
        expect(result).toBe(false);
      });

      it('falls back to local flag when remote feature flags are empty', () => {
        process.env.MM_PERPS_SERVICE_INTERRUPTION_BANNER_ENABLED = 'true';

        const result = selectPerpsServiceInterruptionBannerEnabledFlag(
          mockedEmptyFlagsState,
        );
        expect(result).toBe(true);
      });

      it('falls back to local flag when RemoteFeatureFlagController is undefined', () => {
        process.env.MM_PERPS_SERVICE_INTERRUPTION_BANNER_ENABLED = 'false';

        const stateWithUndefinedController = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: undefined,
            },
          },
        };

        const result = selectPerpsServiceInterruptionBannerEnabledFlag(
          stateWithUndefinedController,
        );
        expect(result).toBe(false);
      });
    });
  });

  describe('perpsRemoteFeatureFlag', () => {
    const validRemoteFlag: PerpsLaunchDarklyFlag = {
      enabled: true,
      minimumVersion: '1.0.0',
    };

    const disabledRemoteFlag: PerpsLaunchDarklyFlag = {
      enabled: false,
      minimumVersion: '1.0.0',
    };

    describe('valid remote flag scenarios', () => {
      it('returns true when flag is enabled and version check passes', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        const result = perpsRemoteFeatureFlag(validRemoteFlag);
        expect(result).toBe(true);
        expect(mockHasMinimumRequiredVersion).toHaveBeenCalledWith('1.0.0');
      });

      it('returns false when flag is enabled but version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        const result = perpsRemoteFeatureFlag(validRemoteFlag);
        expect(result).toBe(false);
        expect(mockHasMinimumRequiredVersion).toHaveBeenCalledWith('1.0.0');
      });

      it('returns false when flag is disabled but version check passes', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        const result = perpsRemoteFeatureFlag(disabledRemoteFlag);
        expect(result).toBe(false);
        // hasMinimumRequiredVersion should not be called due to short-circuit evaluation
        expect(mockHasMinimumRequiredVersion).not.toHaveBeenCalled();
      });

      it('returns false when flag is disabled and version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        const result = perpsRemoteFeatureFlag(disabledRemoteFlag);
        expect(result).toBe(false);
        // hasMinimumRequiredVersion should not be called due to short-circuit evaluation
        expect(mockHasMinimumRequiredVersion).not.toHaveBeenCalled();
      });
    });

    describe('invalid remote flag scenarios', () => {
      it('returns undefined when remote flag is null', () => {
        const result = perpsRemoteFeatureFlag(
          null as unknown as PerpsLaunchDarklyFlag,
        );
        expect(result).toBeUndefined();
      });

      it('returns undefined when remote flag is undefined', () => {
        const result = perpsRemoteFeatureFlag(
          undefined as unknown as PerpsLaunchDarklyFlag,
        );
        expect(result).toBeUndefined();
      });

      it('returns undefined when enabled property is missing', () => {
        const malformedFlag = {
          minimumVersion: '1.0.0',
        } as PerpsLaunchDarklyFlag;
        const result = perpsRemoteFeatureFlag(malformedFlag);
        expect(result).toBeUndefined();
      });

      it('returns undefined when minimumVersion property is missing', () => {
        const malformedFlag = {
          enabled: true,
        } as PerpsLaunchDarklyFlag;
        const result = perpsRemoteFeatureFlag(malformedFlag);
        expect(result).toBeUndefined();
      });

      it('returns undefined when enabled is not a boolean', () => {
        const wrongTypeFlag = {
          enabled: 'true',
          minimumVersion: '1.0.0',
        } as unknown as PerpsLaunchDarklyFlag;
        const result = perpsRemoteFeatureFlag(wrongTypeFlag);
        expect(result).toBeUndefined();
      });

      it('returns undefined when minimumVersion is not a string', () => {
        const wrongTypeFlag = {
          enabled: true,
          minimumVersion: 100,
        } as unknown as PerpsLaunchDarklyFlag;
        const result = perpsRemoteFeatureFlag(wrongTypeFlag);
        expect(result).toBeUndefined();
      });

      it('returns undefined when both properties have wrong types', () => {
        const wrongTypeFlag = {
          enabled: 'true',
          minimumVersion: 123,
        } as unknown as PerpsLaunchDarklyFlag;
        const result = perpsRemoteFeatureFlag(wrongTypeFlag);
        expect(result).toBeUndefined();
      });
    });
  });
});
