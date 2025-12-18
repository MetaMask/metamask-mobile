import {
  selectPooledStakingEnabledFlag,
  selectPooledStakingServiceInterruptionBannerEnabledFlag,
  selectStablecoinLendingEnabledFlag,
  selectStablecoinLendingServiceInterruptionBannerEnabledFlag,
  selectMusdConversionPaymentTokensAllowlist,
  selectMusdConversionPaymentTokensBlocklist,
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

  describe('selectMusdConversionPaymentTokensAllowlist', () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
      delete process.env.MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST;
    });

    it('returns parsed remote allowlist when available', () => {
      const remoteAllowlist = {
        '0x1': ['USDC', 'USDT'],
        '0xe708': ['USDC'],
      };

      const stateWithRemoteAllowlist = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                earnMusdConvertibleTokensAllowlist: remoteAllowlist,
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectMusdConversionPaymentTokensAllowlist(
        stateWithRemoteAllowlist,
      );

      expect(result).toEqual(remoteAllowlist);
    });

    it('falls back to local env variable when remote unavailable', () => {
      const localAllowlist = {
        '0x1': ['USDC', 'DAI'],
      };
      process.env.MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST =
        JSON.stringify(localAllowlist);

      const stateWithoutRemote = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result =
        selectMusdConversionPaymentTokensAllowlist(stateWithoutRemote);

      expect(result).toEqual(localAllowlist);
    });

    it('returns empty object when both remote and local are unavailable', () => {
      delete process.env.MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST;

      const stateWithoutRemote = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result =
        selectMusdConversionPaymentTokensAllowlist(stateWithoutRemote);

      expect(result).toEqual({});
    });

    it('handles JSON parsing errors for local env gracefully', () => {
      process.env.MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST = 'invalid json';

      const stateWithoutRemote = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result =
        selectMusdConversionPaymentTokensAllowlist(stateWithoutRemote);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to parse MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST',
        ),
        expect.anything(),
      );
      expect(result).toEqual({});
    });

    it('handles JSON parsing errors for remote flag gracefully', () => {
      const stateWithInvalidRemote = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                earnMusdConvertibleTokensAllowlist:
                  'invalid json string that cannot be parsed',
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectMusdConversionPaymentTokensAllowlist(
        stateWithInvalidRemote,
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to parse remote earnMusdConvertibleTokensAllowlist',
        ),
        expect.anything(),
      );
      expect(result).toEqual({});
    });

    it('returns empty object when remote flag is not formatted correctly as object keyed by chain IDs with array of token symbols as values', () => {
      const stateWithArrayRemote = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                earnMusdConvertibleTokensAllowlist: ['0x1', 'USDC'],
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result =
        selectMusdConversionPaymentTokensAllowlist(stateWithArrayRemote);

      expect(result).toEqual({});
    });

    it('returns allowlist with wildcards', () => {
      const remoteAllowlist = {
        '*': ['USDC'],
        '0x1': ['*'],
        '0xa4b1': ['USDT', 'DAI'],
      };

      const stateWithRemoteAllowlist = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                earnMusdConvertibleTokensAllowlist: remoteAllowlist,
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectMusdConversionPaymentTokensAllowlist(
        stateWithRemoteAllowlist,
      );

      expect(result).toEqual(remoteAllowlist);
    });

    it('uses remote allowlist over local when both are available', () => {
      const localAllowlist = { '0x1': ['DAI'] };
      process.env.MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST =
        JSON.stringify(localAllowlist);
      const remoteAllowlist = { '0x1': ['USDC', 'USDT'] };
      const stateWithBoth = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                earnMusdConvertibleTokensAllowlist: remoteAllowlist,
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectMusdConversionPaymentTokensAllowlist(stateWithBoth);

      expect(result).toEqual(remoteAllowlist);
    });

    it('uses local allowlist when remote is invalid structure', () => {
      const localAllowlist = { '0x1': ['DAI'] };
      process.env.MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST =
        JSON.stringify(localAllowlist);
      const stateWithInvalidRemote = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                earnMusdConvertibleTokensAllowlist: { '0x1': 'not-an-array' },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const result = selectMusdConversionPaymentTokensAllowlist(
        stateWithInvalidRemote,
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('produced invalid structure'),
      );
      expect(result).toEqual(localAllowlist);
    });
  });

  describe('selectMusdConversionPaymentTokensBlocklist', () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
      delete process.env.MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST;
    });

    describe('remote flag precedence', () => {
      it('returns parsed remote blocklist when valid', () => {
        const remoteBlocklist = {
          '*': ['USDC'],
          '0x1': ['USDT'],
        };

        const stateWithRemoteBlocklist = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnMusdConvertibleTokensBlocklist: remoteBlocklist,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionPaymentTokensBlocklist(
          stateWithRemoteBlocklist,
        );

        expect(result).toEqual({
          '*': ['USDC'],
          '0x1': ['USDT'],
        });
      });

      it('returns remote blocklist over local when both are valid', () => {
        const localBlocklist = { '0x1': ['DAI'] };
        process.env.MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST =
          JSON.stringify(localBlocklist);

        const remoteBlocklist = { '*': ['USDC'], '0x1': ['*'] };

        const stateWithBoth = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnMusdConvertibleTokensBlocklist: remoteBlocklist,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result =
          selectMusdConversionPaymentTokensBlocklist(stateWithBoth);

        expect(result).toEqual(remoteBlocklist);
      });

      it('parses remote blocklist from JSON string', () => {
        const remoteBlocklistString = '{"*":["USDC"],"0x1":["*"]}';

        const stateWithStringRemote = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnMusdConvertibleTokensBlocklist: remoteBlocklistString,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionPaymentTokensBlocklist(
          stateWithStringRemote,
        );

        expect(result).toEqual({
          '*': ['USDC'],
          '0x1': ['*'],
        });
      });
    });

    describe('local env fallback', () => {
      it('returns local blocklist when remote is unavailable', () => {
        const localBlocklist = { '0xa4b1': ['USDT', 'DAI'] };
        process.env.MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST =
          JSON.stringify(localBlocklist);

        const stateWithoutRemote = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {},
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result =
          selectMusdConversionPaymentTokensBlocklist(stateWithoutRemote);

        expect(result).toEqual({ '0xa4b1': ['USDT', 'DAI'] });
      });

      it('returns local blocklist when remote is invalid', () => {
        const localBlocklist = { '0x1': ['USDC'] };
        process.env.MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST =
          JSON.stringify(localBlocklist);

        const stateWithInvalidRemote = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnMusdConvertibleTokensBlocklist: { '0x1': 'not-an-array' },
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionPaymentTokensBlocklist(
          stateWithInvalidRemote,
        );

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'Remote earnMusdConvertibleTokensBlocklist produced invalid structure',
          ),
        );
        expect(result).toEqual({ '0x1': ['USDC'] });
      });
    });

    describe('default empty blocklist', () => {
      it('returns empty object when both remote and local are unavailable', () => {
        delete process.env.MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST;

        const stateWithoutBlocklist = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {},
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionPaymentTokensBlocklist(
          stateWithoutBlocklist,
        );

        expect(result).toEqual({});
      });

      it('returns empty object when both remote and local are invalid', () => {
        process.env.MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST = 'invalid json';

        const stateWithInvalidRemote = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnMusdConvertibleTokensBlocklist: 'also invalid json {{',
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionPaymentTokensBlocklist(
          stateWithInvalidRemote,
        );

        expect(consoleWarnSpy).toHaveBeenCalled();
        expect(result).toEqual({});
      });
    });

    describe('wildcard format validation', () => {
      it('accepts blocklist with global wildcard key', () => {
        const blocklist = { '*': ['USDC', 'USDT'] };

        const state = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnMusdConvertibleTokensBlocklist: blocklist,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionPaymentTokensBlocklist(state);

        expect(result).toEqual(blocklist);
      });

      it('accepts blocklist with chain wildcard symbol', () => {
        const blocklist = { '0x1': ['*'] };

        const state = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnMusdConvertibleTokensBlocklist: blocklist,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionPaymentTokensBlocklist(state);

        expect(result).toEqual(blocklist);
      });

      it('accepts combined wildcard blocklist', () => {
        const blocklist = {
          '*': ['USDC'],
          '0x1': ['*'],
          '0xa4b1': ['USDT', 'DAI'],
        };

        const state = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnMusdConvertibleTokensBlocklist: blocklist,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionPaymentTokensBlocklist(state);

        expect(result).toEqual(blocklist);
      });
    });

    describe('error handling', () => {
      it('handles JSON parsing errors for local env gracefully', () => {
        process.env.MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST = 'not valid json';

        const stateWithoutRemote = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {},
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result =
          selectMusdConversionPaymentTokensBlocklist(stateWithoutRemote);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'Failed to parse MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST',
          ),
          expect.anything(),
        );
        expect(result).toEqual({});
      });

      it('handles JSON parsing errors for remote flag gracefully', () => {
        const stateWithInvalidRemote = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnMusdConvertibleTokensBlocklist: '{ invalid json }',
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionPaymentTokensBlocklist(
          stateWithInvalidRemote,
        );

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'Failed to parse remote earnMusdConvertibleTokensBlocklist',
          ),
          expect.anything(),
        );
        expect(result).toEqual({});
      });

      it('rejects blocklist when values are not arrays', () => {
        const invalidBlocklist = { '0x1': 'USDC' };

        const state = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnMusdConvertibleTokensBlocklist: invalidBlocklist,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionPaymentTokensBlocklist(state);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('produced invalid structure'),
        );
        expect(result).toEqual({});
      });

      it('rejects blocklist when array contains non-strings', () => {
        const invalidBlocklist = { '0x1': [123, 456] };

        const state = {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  earnMusdConvertibleTokensBlocklist: invalidBlocklist,
                },
                cacheTimestamp: 0,
              },
            },
          },
        };

        const result = selectMusdConversionPaymentTokensBlocklist(state);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('produced invalid structure'),
        );
        expect(result).toEqual({});
      });
    });
  });
});
