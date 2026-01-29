import {
  selectPerpsEnabledFlag,
  selectPerpsServiceInterruptionBannerEnabledFlag,
  selectPerpsGtmOnboardingModalEnabledFlag,
  selectPerpsOrderBookEnabledFlag,
  selectPerpsButtonColorTestVariant,
  selectHip3ConfigVersion,
  selectPerpsFeedbackEnabledFlag,
  selectPerpsRewardsReferralCodeEnabledFlag,
} from '.';
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

describe('Perps Feature Flag Selectors', () => {
  const originalEnv = process.env;
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);
  });

  afterEach(() => {
    process.env = originalEnv;
    mockHasMinimumRequiredVersion?.mockRestore();
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

  describe('selectPerpsGtmOnboardingModalEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      const stateWithEnabledFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsPerpGtmOnboardingModalEnabled: {
                  enabled: true,
                  minimumVersion: '1.0.0',
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result =
        selectPerpsGtmOnboardingModalEnabledFlag(stateWithEnabledFlag);
      expect(result).toBe(true);
    });

    describe('hybrid flag behavior', () => {
      it('uses remote flag when valid and enabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_PERPS_GTM_MODAL_ENABLED = 'false';

        const stateWithEnabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpGtmOnboardingModalEnabled: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsGtmOnboardingModalEnabledFlag(
          stateWithEnabledRemoteFlag,
        );
        expect(result).toBe(true);
      });

      it('uses remote flag when valid but disabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_PERPS_GTM_MODAL_ENABLED = 'true';

        const stateWithDisabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpGtmOnboardingModalEnabled: {
                    enabled: false,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsGtmOnboardingModalEnabledFlag(
          stateWithDisabledRemoteFlag,
        );
        expect(result).toBe(false);
      });

      it('uses remote flag (false) when enabled but version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        process.env.MM_PERPS_GTM_MODAL_ENABLED = 'true';

        const stateWithVersionCheckFailure = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpGtmOnboardingModalEnabled: {
                    enabled: true,
                    minimumVersion: '99.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsGtmOnboardingModalEnabledFlag(
          stateWithVersionCheckFailure,
        );
        expect(result).toBe(false);
      });

      it('falls back to local flag (true) when remote flag is invalid', () => {
        process.env.MM_PERPS_GTM_MODAL_ENABLED = 'true';

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpGtmOnboardingModalEnabled: {
                    enabled: 'invalid',
                    minimumVersion: 123,
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsGtmOnboardingModalEnabledFlag(
          stateWithInvalidRemoteFlag,
        );
        expect(result).toBe(true);
      });

      it('falls back to local flag (false) when remote flag is invalid', () => {
        process.env.MM_PERPS_GTM_MODAL_ENABLED = 'false';

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpGtmOnboardingModalEnabled: null,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsGtmOnboardingModalEnabledFlag(
          stateWithInvalidRemoteFlag,
        );
        expect(result).toBe(false);
      });

      it('falls back to local flag when remote feature flags are empty', () => {
        process.env.MM_PERPS_GTM_MODAL_ENABLED = 'true';

        const result = selectPerpsGtmOnboardingModalEnabledFlag(
          mockedEmptyFlagsState,
        );
        expect(result).toBe(true);
      });

      it('falls back to local flag when RemoteFeatureFlagController is undefined', () => {
        process.env.MM_PERPS_GTM_MODAL_ENABLED = 'false';

        const stateWithUndefinedController = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: undefined,
            },
          },
        };

        const result = selectPerpsGtmOnboardingModalEnabledFlag(
          stateWithUndefinedController,
        );
        expect(result).toBe(false);
      });
    });
  });

  describe('selectPerpsOrderBookEnabledFlag', () => {
    // Helper to create fresh state objects to avoid reselect caching issues
    const createEmptyFlagsState = () => ({
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {},
            cacheTimestamp: 0,
          },
        },
      },
    });

    describe('default behavior (disabled by default)', () => {
      it('returns false when remote flag is not set and local env var is not set', () => {
        delete process.env.MM_PERPS_ORDER_BOOK_ENABLED;
        const result = selectPerpsOrderBookEnabledFlag(createEmptyFlagsState());
        expect(result).toBe(false);
      });

      it('returns true when local env var is explicitly true', () => {
        process.env.MM_PERPS_ORDER_BOOK_ENABLED = 'true';
        const result = selectPerpsOrderBookEnabledFlag(createEmptyFlagsState());
        expect(result).toBe(true);
      });

      it('returns false when local env var is explicitly false', () => {
        process.env.MM_PERPS_ORDER_BOOK_ENABLED = 'false';
        const result = selectPerpsOrderBookEnabledFlag(createEmptyFlagsState());
        expect(result).toBe(false);
      });
    });

    describe('hybrid flag behavior', () => {
      it('uses remote flag when valid and enabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_PERPS_ORDER_BOOK_ENABLED = 'false';

        const stateWithEnabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsOrderBookEnabled: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsOrderBookEnabledFlag(
          stateWithEnabledRemoteFlag,
        );
        expect(result).toBe(true);
      });

      it('uses remote flag when valid but disabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_PERPS_ORDER_BOOK_ENABLED = 'true';

        const stateWithDisabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsOrderBookEnabled: {
                    enabled: false,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsOrderBookEnabledFlag(
          stateWithDisabledRemoteFlag,
        );
        expect(result).toBe(false);
      });

      it('uses remote flag (false) when enabled but version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        process.env.MM_PERPS_ORDER_BOOK_ENABLED = 'true';

        const stateWithVersionCheckFailure = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsOrderBookEnabled: {
                    enabled: true,
                    minimumVersion: '99.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsOrderBookEnabledFlag(
          stateWithVersionCheckFailure,
        );
        expect(result).toBe(false);
      });

      it('falls back to local flag (false by default) when remote flag is invalid', () => {
        delete process.env.MM_PERPS_ORDER_BOOK_ENABLED;

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsOrderBookEnabled: {
                    enabled: 'invalid',
                    minimumVersion: 123,
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsOrderBookEnabledFlag(
          stateWithInvalidRemoteFlag,
        );
        expect(result).toBe(false);
      });

      it('falls back to local flag (false) when remote flag is null and env is false', () => {
        process.env.MM_PERPS_ORDER_BOOK_ENABLED = 'false';

        const stateWithNullRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsOrderBookEnabled: null,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsOrderBookEnabledFlag(stateWithNullRemoteFlag);
        expect(result).toBe(false);
      });

      it('falls back to local flag when RemoteFeatureFlagController is undefined', () => {
        delete process.env.MM_PERPS_ORDER_BOOK_ENABLED;

        const stateWithUndefinedController = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: undefined,
            },
          },
        };

        const result = selectPerpsOrderBookEnabledFlag(
          stateWithUndefinedController,
        );
        expect(result).toBe(false);
      });
    });
  });

  describe('selectPerpsFeedbackEnabledFlag', () => {
    // Helper to create fresh state objects to avoid reselect caching issues
    const createEmptyFlagsState = () => ({
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {},
            cacheTimestamp: 0,
          },
        },
      },
    });

    describe('default behavior (disabled by default)', () => {
      it('returns false when remote flag is not set and local env var is not set', () => {
        delete process.env.MM_PERPS_FEEDBACK_ENABLED;
        const result = selectPerpsFeedbackEnabledFlag(createEmptyFlagsState());
        expect(result).toBe(false);
      });

      it('returns true when local env var is explicitly true', () => {
        process.env.MM_PERPS_FEEDBACK_ENABLED = 'true';
        const result = selectPerpsFeedbackEnabledFlag(createEmptyFlagsState());
        expect(result).toBe(true);
      });

      it('returns false when local env var is explicitly false', () => {
        process.env.MM_PERPS_FEEDBACK_ENABLED = 'false';
        const result = selectPerpsFeedbackEnabledFlag(createEmptyFlagsState());
        expect(result).toBe(false);
      });
    });

    describe('hybrid flag behavior', () => {
      it('uses remote flag when valid and enabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_PERPS_FEEDBACK_ENABLED = 'false';

        const stateWithEnabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsFeedbackEnabled: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsFeedbackEnabledFlag(
          stateWithEnabledRemoteFlag,
        );
        expect(result).toBe(true);
      });

      it('uses remote flag when valid but disabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_PERPS_FEEDBACK_ENABLED = 'true';

        const stateWithDisabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsFeedbackEnabled: {
                    enabled: false,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsFeedbackEnabledFlag(
          stateWithDisabledRemoteFlag,
        );
        expect(result).toBe(false);
      });

      it('uses remote flag (false) when enabled but version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        process.env.MM_PERPS_FEEDBACK_ENABLED = 'true';

        const stateWithVersionCheckFailure = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsFeedbackEnabled: {
                    enabled: true,
                    minimumVersion: '99.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsFeedbackEnabledFlag(
          stateWithVersionCheckFailure,
        );
        expect(result).toBe(false);
      });

      it('falls back to local flag (false by default) when remote flag is invalid', () => {
        delete process.env.MM_PERPS_FEEDBACK_ENABLED;

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsFeedbackEnabled: {
                    enabled: 'invalid',
                    minimumVersion: 123,
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsFeedbackEnabledFlag(
          stateWithInvalidRemoteFlag,
        );
        expect(result).toBe(false);
      });

      it('falls back to local flag (false) when remote flag is null and env is false', () => {
        process.env.MM_PERPS_FEEDBACK_ENABLED = 'false';

        const stateWithNullRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsFeedbackEnabled: null,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsFeedbackEnabledFlag(stateWithNullRemoteFlag);
        expect(result).toBe(false);
      });

      it('falls back to local flag when RemoteFeatureFlagController is undefined', () => {
        delete process.env.MM_PERPS_FEEDBACK_ENABLED;

        const stateWithUndefinedController = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: undefined,
            },
          },
        };

        const result = selectPerpsFeedbackEnabledFlag(
          stateWithUndefinedController,
        );
        expect(result).toBe(false);
      });
    });
  });

  describe('selectPerpsRewardsReferralCodeEnabledFlag', () => {
    const createStateWithFlag = (flagValue: unknown) => ({
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              rewardsReferralCodeEnabled: flagValue,
            },
            cacheTimestamp: 0,
          },
        },
      },
    });

    describe('default behavior', () => {
      it('returns false when flag is undefined', () => {
        const stateWithUndefinedFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {},
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsRewardsReferralCodeEnabledFlag(
          stateWithUndefinedFlag,
        );
        expect(result).toBe(false);
      });

      it('returns false when flag is null', () => {
        const result = selectPerpsRewardsReferralCodeEnabledFlag(
          createStateWithFlag(null),
        );
        expect(result).toBe(false);
      });
    });

    describe('boolean flag support', () => {
      it('returns true when flag is boolean true', () => {
        const result = selectPerpsRewardsReferralCodeEnabledFlag(
          createStateWithFlag(true),
        );
        expect(result).toBe(true);
      });

      it('returns false when flag is boolean false', () => {
        const result = selectPerpsRewardsReferralCodeEnabledFlag(
          createStateWithFlag(false),
        );
        expect(result).toBe(false);
      });
    });

    describe('version-gated JSON flag support', () => {
      it('returns true when valid and enabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);

        const result = selectPerpsRewardsReferralCodeEnabledFlag(
          createStateWithFlag({
            enabled: true,
            minimumVersion: '1.0.0',
          }),
        );
        expect(result).toBe(true);
      });

      it('returns false when valid but disabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);

        const result = selectPerpsRewardsReferralCodeEnabledFlag(
          createStateWithFlag({
            enabled: false,
            minimumVersion: '1.0.0',
          }),
        );
        expect(result).toBe(false);
      });

      it('returns false when enabled but version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);

        const result = selectPerpsRewardsReferralCodeEnabledFlag(
          createStateWithFlag({
            enabled: true,
            minimumVersion: '99.0.0',
          }),
        );
        expect(result).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('returns false when flag is invalid type (string)', () => {
        const result = selectPerpsRewardsReferralCodeEnabledFlag(
          createStateWithFlag('invalid'),
        );
        expect(result).toBe(false);
      });

      it('returns false when flag is invalid type (number)', () => {
        const result = selectPerpsRewardsReferralCodeEnabledFlag(
          createStateWithFlag(123),
        );
        expect(result).toBe(false);
      });

      it('returns false when RemoteFeatureFlagController is undefined', () => {
        const stateWithUndefinedController = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: undefined,
            },
          },
        };

        const result = selectPerpsRewardsReferralCodeEnabledFlag(
          stateWithUndefinedController,
        );
        expect(result).toBe(false);
      });
    });
  });

  describe('selectPerpsButtonColorTestVariant', () => {
    it('returns null when remote flag is undefined', () => {
      const stateWithUndefinedFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectPerpsButtonColorTestVariant(stateWithUndefinedFlag);
      expect(result).toBeNull();
    });

    it('returns null when remote flag is null', () => {
      const stateWithNullFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsAbtestButtonColor: null,
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectPerpsButtonColorTestVariant(stateWithNullFlag);
      expect(result).toBeNull();
    });

    describe('direct string variant scenarios', () => {
      it('returns variant string when remote flag is control', () => {
        const stateWithControlVariant = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsAbtestButtonColor: 'control',
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsButtonColorTestVariant(
          stateWithControlVariant,
        );
        expect(result).toBe('control');
      });

      it('returns variant string when remote flag is monochrome', () => {
        const stateWithMonochromeVariant = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsAbtestButtonColor: 'monochrome',
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsButtonColorTestVariant(
          stateWithMonochromeVariant,
        );
        expect(result).toBe('monochrome');
      });
    });

    describe('version-gated flag scenarios', () => {
      it('returns variant from version-gated object when valid', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);

        const stateWithVersionGatedVariant = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsAbtestButtonColor: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                    variant: 'control',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsButtonColorTestVariant(
          stateWithVersionGatedVariant,
        );
        expect(result).toBe('control');
      });

      it('returns null when version-gated object has no variant', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);

        const stateWithNoVariant = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsAbtestButtonColor: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsButtonColorTestVariant(stateWithNoVariant);
        expect(result).toBeNull();
      });

      it('returns null when version-gated flag disabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);

        const stateWithDisabledFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsAbtestButtonColor: {
                    enabled: false,
                    minimumVersion: '1.0.0',
                    variant: 'control',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsButtonColorTestVariant(stateWithDisabledFlag);
        expect(result).toBeNull();
      });

      it('returns null when version-gated but version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);

        const stateWithVersionCheckFailure = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsAbtestButtonColor: {
                    enabled: true,
                    minimumVersion: '99.0.0',
                    variant: 'control',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsButtonColorTestVariant(
          stateWithVersionCheckFailure,
        );
        expect(result).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('returns null when remote flag is invalid type (number)', () => {
        const stateWithNumberFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsAbtestButtonColor: 123,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsButtonColorTestVariant(stateWithNumberFlag);
        expect(result).toBeNull();
      });

      it('returns null when remote flag is invalid type (boolean)', () => {
        const stateWithBooleanFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsAbtestButtonColor: true,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPerpsButtonColorTestVariant(stateWithBooleanFlag);
        expect(result).toBeNull();
      });

      it('returns null when RemoteFeatureFlagController is undefined', () => {
        const stateWithUndefinedController = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: undefined,
            },
          },
        };

        const result = selectPerpsButtonColorTestVariant(
          stateWithUndefinedController,
        );
        expect(result).toBeNull();
      });
    });
  });

  describe('perpsRemoteFeatureFlag', () => {
    const validRemoteFlag: VersionGatedFeatureFlag = {
      enabled: true,
      minimumVersion: '1.0.0',
    };

    const disabledRemoteFlag: VersionGatedFeatureFlag = {
      enabled: false,
      minimumVersion: '1.0.0',
    };

    describe('valid remote flag scenarios', () => {
      it('returns true when flag is enabled and version check passes', () => {
        // With device version 1.0.0 and minimum version 1.0.0, version check should pass
        const result = validatedVersionGatedFeatureFlag(validRemoteFlag);
        expect(result).toBe(true);
      });

      it('returns false when flag is enabled but version check fails', () => {
        // Create a flag with a higher minimum version to simulate version check failure
        const flagWithHigherVersion: VersionGatedFeatureFlag = {
          enabled: true,
          minimumVersion: '99.0.0',
        };
        const result = validatedVersionGatedFeatureFlag(flagWithHigherVersion);
        expect(result).toBe(false);
      });

      it('returns false when flag is disabled but version check passes', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        const result = validatedVersionGatedFeatureFlag(disabledRemoteFlag);
        expect(result).toBe(false);
        // hasMinimumRequiredVersion should not be called due to short-circuit evaluation
        expect(mockHasMinimumRequiredVersion).not.toHaveBeenCalled();
      });

      it('returns false when flag is disabled and version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        const result = validatedVersionGatedFeatureFlag(disabledRemoteFlag);
        expect(result).toBe(false);
        // hasMinimumRequiredVersion should not be called due to short-circuit evaluation
        expect(mockHasMinimumRequiredVersion).not.toHaveBeenCalled();
      });
    });

    describe('invalid remote flag scenarios', () => {
      it('returns undefined when remote flag is null', () => {
        const result = validatedVersionGatedFeatureFlag(
          null as unknown as VersionGatedFeatureFlag,
        );
        expect(result).toBeUndefined();
      });

      it('returns undefined when remote flag is undefined', () => {
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

      it('returns undefined when enabled is not a boolean', () => {
        const wrongTypeFlag = {
          enabled: 'true',
          minimumVersion: '1.0.0',
        } as unknown as VersionGatedFeatureFlag;
        const result = validatedVersionGatedFeatureFlag(wrongTypeFlag);
        expect(result).toBeUndefined();
      });

      it('returns undefined when minimumVersion is not a string', () => {
        const wrongTypeFlag = {
          enabled: true,
          minimumVersion: 100,
        } as unknown as VersionGatedFeatureFlag;
        const result = validatedVersionGatedFeatureFlag(wrongTypeFlag);
        expect(result).toBeUndefined();
      });

      it('returns undefined when both properties have wrong types', () => {
        const wrongTypeFlag = {
          enabled: 'true',
          minimumVersion: 123,
        } as unknown as VersionGatedFeatureFlag;
        const result = validatedVersionGatedFeatureFlag(wrongTypeFlag);
        expect(result).toBeUndefined();
      });
    });
  });

  describe('selectHip3ConfigVersion', () => {
    it('returns 0 when version is not set', () => {
      const stateWithoutVersion = {
        engine: {
          backgroundState: {
            PerpsController: {},
          },
        },
      } as unknown as Parameters<typeof selectHip3ConfigVersion>[0];
      const result = selectHip3ConfigVersion(stateWithoutVersion);
      expect(result).toBe(0);
    });

    it('returns the version number when set', () => {
      const stateWithVersion = {
        engine: {
          backgroundState: {
            PerpsController: {
              hip3ConfigVersion: 5,
            },
          },
        },
      } as unknown as Parameters<typeof selectHip3ConfigVersion>[0];
      const result = selectHip3ConfigVersion(stateWithVersion);
      expect(result).toBe(5);
    });

    it('handles null version gracefully', () => {
      const stateWithNullVersion = {
        engine: {
          backgroundState: {
            PerpsController: {
              hip3ConfigVersion: null,
            },
          },
        },
      } as unknown as Parameters<typeof selectHip3ConfigVersion>[0];
      const result = selectHip3ConfigVersion(stateWithNullVersion);
      expect(result).toBe(0);
    });
  });
});
