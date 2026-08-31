import {
  selectPooledStakingEnabledFlag,
  selectPooledStakingServiceInterruptionBannerEnabledFlag,
  selectStablecoinLendingEnabledFlag,
  selectStablecoinLendingServiceInterruptionBannerEnabledFlag,
  selectMusdConversionBlockedCountries,
  selectMusdTokenRegistrationChainIds,
  MUSD_TOKEN_REGISTRATION_CHAIN_IDS_FALLBACK,
  selectMusdBalanceChainIds,
  MUSD_BALANCE_CHAIN_IDS_FALLBACK,
  selectExploreEarnSectionEnabledFlag,
} from '.';
import mockedEngine from '../../../../../core/__mocks__/MockedEngine';
import type { Json } from '@metamask/utils';
import {
  mockedState,
  mockedEmptyFlagsState,
} from '../../../../../selectors/featureFlagController/mocks';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock(
  '../../../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

jest.mock('../../../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('Earn Feature Flag Selectors', () => {
  const originalEnv = process.env;
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  const createStateWithRemoteFlags = (
    remoteFeatureFlags: Record<string, Json>,
  ) => ({
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags,
          cacheTimestamp: 0,
        },
      },
    },
  });

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

  describe('selectPooledStakingEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      const result = selectPooledStakingEnabledFlag(mockedState);
      expect(result).toBe(true);
    });

    describe('hybrid flag behavior', () => {
      it('uses remote flag when valid and enabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_POOLED_STAKING_ENABLED = 'false';

        const stateWithEnabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnPooledStakingEnabled: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPooledStakingEnabledFlag(
          stateWithEnabledRemoteFlag,
        );
        expect(result).toBe(true);
      });

      it('uses remote flag when valid but disabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_POOLED_STAKING_ENABLED = 'true';

        const stateWithDisabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnPooledStakingEnabled: {
                    enabled: false,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPooledStakingEnabledFlag(
          stateWithDisabledRemoteFlag,
        );
        expect(result).toBe(false);
      });

      it('uses remote flag (false) when enabled but version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        process.env.MM_POOLED_STAKING_ENABLED = 'true';

        const stateWithVersionCheckFailure = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnPooledStakingEnabled: {
                    enabled: true,
                    minimumVersion: '99.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPooledStakingEnabledFlag(
          stateWithVersionCheckFailure,
        );
        expect(result).toBe(false);
      });

      it('falls back to local flag (true) when remote flag is invalid', () => {
        process.env.MM_POOLED_STAKING_ENABLED = 'true';

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnPooledStakingEnabled: {
                    enabled: 'invalid',
                    minimumVersion: 123,
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPooledStakingEnabledFlag(
          stateWithInvalidRemoteFlag,
        );
        expect(result).toBe(true);
      });

      it('falls back to local flag (false) when remote flag is invalid', () => {
        process.env.MM_POOLED_STAKING_ENABLED = 'false';

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnPooledStakingEnabled: null,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPooledStakingEnabledFlag(
          stateWithInvalidRemoteFlag,
        );
        expect(result).toBe(false);
      });

      it('falls back to local flag when remote feature flags are empty', () => {
        process.env.MM_POOLED_STAKING_ENABLED = 'true';

        const result = selectPooledStakingEnabledFlag(mockedEmptyFlagsState);
        expect(result).toBe(true);
      });

      it('falls back to local flag when RemoteFeatureFlagController is undefined', () => {
        process.env.MM_POOLED_STAKING_ENABLED = 'false';

        const stateWithUndefinedController = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: undefined,
            },
          },
        };

        const result = selectPooledStakingEnabledFlag(
          stateWithUndefinedController,
        );
        expect(result).toBe(false);
      });
    });
  });

  describe('selectPooledStakingServiceInterruptionBannerEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      const result =
        selectPooledStakingServiceInterruptionBannerEnabledFlag(mockedState);
      expect(result).toBe(true);
    });

    describe('hybrid flag behavior', () => {
      it('uses remote flag when valid and enabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED =
          'false';

        const stateWithEnabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnPooledStakingServiceInterruptionBannerEnabled: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPooledStakingServiceInterruptionBannerEnabledFlag(
          stateWithEnabledRemoteFlag,
        );
        expect(result).toBe(true);
      });

      it('uses remote flag when valid but disabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED =
          'true';

        const stateWithDisabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnPooledStakingServiceInterruptionBannerEnabled: {
                    enabled: false,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPooledStakingServiceInterruptionBannerEnabledFlag(
          stateWithDisabledRemoteFlag,
        );
        expect(result).toBe(false);
      });

      it('uses remote flag (false) when enabled but version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED =
          'true';

        const stateWithVersionCheckFailure = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnPooledStakingServiceInterruptionBannerEnabled: {
                    enabled: true,
                    minimumVersion: '99.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPooledStakingServiceInterruptionBannerEnabledFlag(
          stateWithVersionCheckFailure,
        );
        expect(result).toBe(false);
      });

      it('falls back to local flag (true) when remote flag is invalid', () => {
        process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED =
          'true';

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnPooledStakingServiceInterruptionBannerEnabled: {
                    enabled: 'invalid',
                    minimumVersion: 123,
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPooledStakingServiceInterruptionBannerEnabledFlag(
          stateWithInvalidRemoteFlag,
        );
        expect(result).toBe(true);
      });

      it('falls back to local flag (false) when remote flag is invalid', () => {
        process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED =
          'false';

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnPooledStakingServiceInterruptionBannerEnabled: null,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectPooledStakingServiceInterruptionBannerEnabledFlag(
          stateWithInvalidRemoteFlag,
        );
        expect(result).toBe(false);
      });

      it('falls back to local flag when remote feature flags are empty', () => {
        process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED =
          'true';

        const result = selectPooledStakingServiceInterruptionBannerEnabledFlag(
          mockedEmptyFlagsState,
        );
        expect(result).toBe(true);
      });

      it('falls back to local flag when RemoteFeatureFlagController is undefined', () => {
        process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED =
          'false';

        const stateWithUndefinedController = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: undefined,
            },
          },
        };

        const result = selectPooledStakingServiceInterruptionBannerEnabledFlag(
          stateWithUndefinedController,
        );
        expect(result).toBe(false);
      });
    });
  });

  describe('selectStablecoinLendingEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      const result = selectStablecoinLendingEnabledFlag(mockedState);
      expect(result).toBe(true);
    });

    describe('hybrid flag behavior', () => {
      it('uses remote flag when valid and enabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_STABLECOIN_LENDING_UI_ENABLED = 'false';

        const stateWithEnabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnStablecoinLendingEnabled: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectStablecoinLendingEnabledFlag(
          stateWithEnabledRemoteFlag,
        );
        expect(result).toBe(true);
      });

      it('uses remote flag when valid but disabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_STABLECOIN_LENDING_UI_ENABLED = 'true';

        const stateWithDisabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnStablecoinLendingEnabled: {
                    enabled: false,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectStablecoinLendingEnabledFlag(
          stateWithDisabledRemoteFlag,
        );
        expect(result).toBe(false);
      });

      it('uses remote flag (false) when enabled but version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        process.env.MM_STABLECOIN_LENDING_UI_ENABLED = 'true';

        const stateWithVersionCheckFailure = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnStablecoinLendingEnabled: {
                    enabled: true,
                    minimumVersion: '99.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectStablecoinLendingEnabledFlag(
          stateWithVersionCheckFailure,
        );
        expect(result).toBe(false);
      });

      it('falls back to local flag (true) when remote flag is invalid', () => {
        process.env.MM_STABLECOIN_LENDING_UI_ENABLED = 'true';

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnStablecoinLendingEnabled: {
                    enabled: 'invalid',
                    minimumVersion: 123,
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectStablecoinLendingEnabledFlag(
          stateWithInvalidRemoteFlag,
        );
        expect(result).toBe(true);
      });

      it('falls back to local flag (false) when remote flag is invalid', () => {
        process.env.MM_STABLECOIN_LENDING_UI_ENABLED = 'false';

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnStablecoinLendingEnabled: null,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectStablecoinLendingEnabledFlag(
          stateWithInvalidRemoteFlag,
        );
        expect(result).toBe(false);
      });

      it('falls back to local flag when remote feature flags are empty', () => {
        process.env.MM_STABLECOIN_LENDING_UI_ENABLED = 'true';

        const result = selectStablecoinLendingEnabledFlag(
          mockedEmptyFlagsState,
        );
        expect(result).toBe(true);
      });

      it('falls back to local flag when RemoteFeatureFlagController is undefined', () => {
        process.env.MM_STABLECOIN_LENDING_UI_ENABLED = 'false';

        const stateWithUndefinedController = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: undefined,
            },
          },
        };

        const result = selectStablecoinLendingEnabledFlag(
          stateWithUndefinedController,
        );
        expect(result).toBe(false);
      });
    });
  });

  describe('selectStablecoinLendingServiceInterruptionBannerEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      const result =
        selectStablecoinLendingServiceInterruptionBannerEnabledFlag(
          mockedState,
        );
      expect(result).toBe(true);
    });

    describe('hybrid flag behavior', () => {
      it('uses remote flag when valid and enabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED =
          'false';

        const stateWithEnabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnStablecoinLendingServiceInterruptionBannerEnabled: {
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
          selectStablecoinLendingServiceInterruptionBannerEnabledFlag(
            stateWithEnabledRemoteFlag,
          );
        expect(result).toBe(true);
      });

      it('uses remote flag when valid but disabled', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED = 'true';

        const stateWithDisabledRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnStablecoinLendingServiceInterruptionBannerEnabled: {
                    enabled: false,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result =
          selectStablecoinLendingServiceInterruptionBannerEnabledFlag(
            stateWithDisabledRemoteFlag,
          );
        expect(result).toBe(false);
      });

      it('uses remote flag (false) when enabled but version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED = 'true';

        const stateWithVersionCheckFailure = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnStablecoinLendingServiceInterruptionBannerEnabled: {
                    enabled: true,
                    minimumVersion: '99.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result =
          selectStablecoinLendingServiceInterruptionBannerEnabledFlag(
            stateWithVersionCheckFailure,
          );
        expect(result).toBe(false);
      });

      it('falls back to local flag (true) when remote flag is invalid', () => {
        process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED = 'true';

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnStablecoinLendingServiceInterruptionBannerEnabled: {
                    enabled: 'invalid',
                    minimumVersion: 123,
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result =
          selectStablecoinLendingServiceInterruptionBannerEnabledFlag(
            stateWithInvalidRemoteFlag,
          );
        expect(result).toBe(true);
      });

      it('falls back to local flag (false) when remote flag is invalid', () => {
        process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED =
          'false';

        const stateWithInvalidRemoteFlag = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnStablecoinLendingServiceInterruptionBannerEnabled: null,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result =
          selectStablecoinLendingServiceInterruptionBannerEnabledFlag(
            stateWithInvalidRemoteFlag,
          );
        expect(result).toBe(false);
      });

      it('falls back to local flag when remote feature flags are empty', () => {
        process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED = 'true';

        const result =
          selectStablecoinLendingServiceInterruptionBannerEnabledFlag(
            mockedEmptyFlagsState,
          );
        expect(result).toBe(true);
      });

      it('falls back to local flag when RemoteFeatureFlagController is undefined', () => {
        process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED =
          'false';

        const stateWithUndefinedController = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: undefined,
            },
          },
        };

        const result =
          selectStablecoinLendingServiceInterruptionBannerEnabledFlag(
            stateWithUndefinedController,
          );
        expect(result).toBe(false);
      });
    });
  });

  describe('earnRemoteFeatureFlag', () => {
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

  describe('selectMusdConversionBlockedCountries', () => {
    it('returns blocked countries array when remote flag is valid', () => {
      const blockedRegions = ['GB', 'US'];

      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                earnMusdConversionGeoBlockedCountries: { blockedRegions },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectMusdConversionBlockedCountries(state);

      expect(result).toEqual(['GB', 'US']);
    });

    it('returns default blocked countries when remote flag is undefined', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectMusdConversionBlockedCountries(state);

      expect(result).toEqual(['GB']);
    });

    it('returns default blocked countries when blockedRegions is not an array', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                earnMusdConversionGeoBlockedCountries: {
                  blockedRegions: 'GB',
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectMusdConversionBlockedCountries(state);

      expect(result).toEqual(['GB']);
    });

    it('returns default blocked countries when flag is null', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                earnMusdConversionGeoBlockedCountries: null,
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectMusdConversionBlockedCountries(state);

      expect(result).toEqual(['GB']);
    });

    it('returns default blocked countries when flag has wrong structure', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                earnMusdConversionGeoBlockedCountries: ['GB', 'US'],
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectMusdConversionBlockedCountries(state);

      expect(result).toEqual(['GB']);
    });

    it('returns default blocked countries when RemoteFeatureFlagController is undefined', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: undefined,
          },
        },
      };

      const result = selectMusdConversionBlockedCountries(state);

      expect(result).toEqual(['GB']);
    });

    describe('local env var fallback', () => {
      afterEach(() => {
        delete process.env.MM_MUSD_CONVERSION_GEO_BLOCKED_COUNTRIES;
      });

      it('falls back to local env var when remote flag is unavailable', () => {
        process.env.MM_MUSD_CONVERSION_GEO_BLOCKED_COUNTRIES = 'GB,US';

        const state = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {},
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionBlockedCountries(state);

        expect(result).toEqual(['GB', 'US']);
      });

      it('remote flag takes precedence over local env var', () => {
        process.env.MM_MUSD_CONVERSION_GEO_BLOCKED_COUNTRIES = 'FR,DE';

        const state = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnMusdConversionGeoBlockedCountries: {
                    blockedRegions: ['GB'],
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionBlockedCountries(state);

        expect(result).toEqual(['GB']);
      });

      it('parses comma-separated country codes from env var', () => {
        process.env.MM_MUSD_CONVERSION_GEO_BLOCKED_COUNTRIES = 'GB, US, FR';

        const state = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {},
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionBlockedCountries(state);

        expect(result).toEqual(['GB', 'US', 'FR']);
      });

      it('converts country codes to uppercase', () => {
        process.env.MM_MUSD_CONVERSION_GEO_BLOCKED_COUNTRIES = 'gb,us';

        const state = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {},
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionBlockedCountries(state);

        expect(result).toEqual(['GB', 'US']);
      });

      it('returns default blocked countries when env var is empty string', () => {
        process.env.MM_MUSD_CONVERSION_GEO_BLOCKED_COUNTRIES = '';

        const state = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {},
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionBlockedCountries(state);

        expect(result).toEqual(['GB']);
      });

      it('filters out empty entries from env var', () => {
        process.env.MM_MUSD_CONVERSION_GEO_BLOCKED_COUNTRIES = 'GB,,US,';

        const state = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {},
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionBlockedCountries(state);

        expect(result).toEqual(['GB', 'US']);
      });
    });
  });

  describe('selectMusdTokenRegistrationChainIds', () => {
    it('returns chain IDs from remote flag when the flag is a non-empty array', () => {
      const stateWithRemote = createStateWithRemoteFlags({
        earnMusdTokenRegistrationChainIds: { chainIds: ['0x1', '0xe708'] },
      });

      const result = selectMusdTokenRegistrationChainIds(stateWithRemote);

      expect(result).toEqual(['0x1', '0xe708']);
    });

    it('returns fallback chain IDs when remote flag is absent', () => {
      const stateWithoutRemote = createStateWithRemoteFlags({});

      const result = selectMusdTokenRegistrationChainIds(stateWithoutRemote);

      expect(result).toEqual(MUSD_TOKEN_REGISTRATION_CHAIN_IDS_FALLBACK);
    });

    it('returns an empty array when remote flag chainIds is an empty array, disabling registration', () => {
      const stateWithEmptyRemote = createStateWithRemoteFlags({
        earnMusdTokenRegistrationChainIds: { chainIds: [] },
      });

      const result = selectMusdTokenRegistrationChainIds(stateWithEmptyRemote);

      expect(result).toEqual([]);
    });

    it('returns fallback chain IDs when remote flag chainIds is not an array', () => {
      const stateWithInvalidRemote = createStateWithRemoteFlags({
        earnMusdTokenRegistrationChainIds: { chainIds: 'not-an-array' },
      });

      const result = selectMusdTokenRegistrationChainIds(
        stateWithInvalidRemote,
      );

      expect(result).toEqual(MUSD_TOKEN_REGISTRATION_CHAIN_IDS_FALLBACK);
    });

    it('returns fallback chain IDs when remote flag is present but has no chainIds property', () => {
      const stateWithMissingChainIds = createStateWithRemoteFlags({
        earnMusdTokenRegistrationChainIds: {},
      });

      const result = selectMusdTokenRegistrationChainIds(
        stateWithMissingChainIds,
      );

      expect(result).toEqual(MUSD_TOKEN_REGISTRATION_CHAIN_IDS_FALLBACK);
    });
  });

  describe('selectMusdBalanceChainIds', () => {
    it('returns chain IDs from remote flag when the flag is a non-empty array', () => {
      const stateWithRemote = createStateWithRemoteFlags({
        earnMusdBalanceChainIds: { chainIds: ['0x1', '0xe708'] },
      });

      const result = selectMusdBalanceChainIds(stateWithRemote);

      expect(result).toEqual(['0x1', '0xe708']);
    });

    it('returns fallback chain IDs when remote flag is absent', () => {
      const stateWithoutRemote = createStateWithRemoteFlags({});

      const result = selectMusdBalanceChainIds(stateWithoutRemote);

      expect(result).toEqual(MUSD_BALANCE_CHAIN_IDS_FALLBACK);
    });

    it('returns an empty array when remote flag chainIds is an empty array', () => {
      const stateWithEmptyRemote = createStateWithRemoteFlags({
        earnMusdBalanceChainIds: { chainIds: [] },
      });

      const result = selectMusdBalanceChainIds(stateWithEmptyRemote);

      expect(result).toEqual([]);
    });

    it('returns fallback chain IDs when remote flag chainIds is not an array', () => {
      const stateWithInvalidRemote = createStateWithRemoteFlags({
        earnMusdBalanceChainIds: { chainIds: 'not-an-array' },
      });

      const result = selectMusdBalanceChainIds(stateWithInvalidRemote);

      expect(result).toEqual(MUSD_BALANCE_CHAIN_IDS_FALLBACK);
    });

    it('returns fallback chain IDs when remote flag is present but has no chainIds property', () => {
      const stateWithMissingChainIds = createStateWithRemoteFlags({
        earnMusdBalanceChainIds: {},
      });

      const result = selectMusdBalanceChainIds(stateWithMissingChainIds);

      expect(result).toEqual(MUSD_BALANCE_CHAIN_IDS_FALLBACK);
    });
  });

  describe('selectExploreEarnSectionEnabledFlag', () => {
    it('returns true when remote flag is enabled and version check passes', () => {
      process.env.MM_EXPLORE_EARN_SECTION_ENABLED = 'false';

      const stateWithEnabledRemoteFlag = createStateWithRemoteFlags({
        earnExploreSectionEnabled: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      const result = selectExploreEarnSectionEnabledFlag(
        stateWithEnabledRemoteFlag,
      );

      expect(result).toBe(true);
    });

    it('returns false when remote flag is disabled', () => {
      process.env.MM_EXPLORE_EARN_SECTION_ENABLED = 'true';

      const stateWithDisabledRemoteFlag = createStateWithRemoteFlags({
        earnExploreSectionEnabled: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });

      const result = selectExploreEarnSectionEnabledFlag(
        stateWithDisabledRemoteFlag,
      );

      expect(result).toBe(false);
    });

    it('returns false when remote flag minimum version exceeds app version', () => {
      process.env.MM_EXPLORE_EARN_SECTION_ENABLED = 'true';
      mockHasMinimumRequiredVersion.mockReturnValue(false);

      const stateWithVersionMismatch = createStateWithRemoteFlags({
        earnExploreSectionEnabled: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });

      const result = selectExploreEarnSectionEnabledFlag(
        stateWithVersionMismatch,
      );

      expect(result).toBe(false);
    });

    it('falls back to local flag when remote flag is invalid', () => {
      process.env.MM_EXPLORE_EARN_SECTION_ENABLED = 'true';

      const stateWithInvalidRemoteFlag = createStateWithRemoteFlags({
        earnExploreSectionEnabled: null,
      });

      const result = selectExploreEarnSectionEnabledFlag(
        stateWithInvalidRemoteFlag,
      );

      expect(result).toBe(true);
    });

    it('falls back to false when remote flag is unavailable and local flag is disabled', () => {
      process.env.MM_EXPLORE_EARN_SECTION_ENABLED = 'false';

      const result = selectExploreEarnSectionEnabledFlag(mockedEmptyFlagsState);

      expect(result).toBe(false);
    });
  });
});
