import {
  selectPooledStakingEnabledFlag,
  selectPooledStakingServiceInterruptionBannerEnabledFlag,
  selectStablecoinLendingEnabledFlag,
  selectStablecoinLendingServiceInterruptionBannerEnabledFlag,
  selectMusdConversionPaymentTokensAllowlist,
} from '.';
import { CONVERTIBLE_STABLECOINS_BY_CHAIN } from '../../constants/musd';
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
// eslint-disable-next-line import/no-namespace
import * as musdUtils from '../../utils/musd';
import { Hex } from '@metamask/utils';

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

      expect(result['0x1']).toEqual([
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC on Mainnet
        '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT on Mainnet
      ]);
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

      expect(result['0x1']).toEqual([
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
        '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
      ]);

      delete process.env.MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST;
    });

    it('falls back to CONVERTIBLE_STABLECOINS_BY_CHAIN when both unavailable', () => {
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

      expect(result).toEqual(CONVERTIBLE_STABLECOINS_BY_CHAIN);
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
      // Falls back to CONVERTIBLE_STABLECOINS_BY_CHAIN
      expect(result).toEqual(CONVERTIBLE_STABLECOINS_BY_CHAIN);

      delete process.env.MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST;
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
      // Falls back to CONVERTIBLE_STABLECOINS_BY_CHAIN
      expect(result).toEqual(CONVERTIBLE_STABLECOINS_BY_CHAIN);
    });

    it('falls back to CONVERTIBLE_STABLECOINS_BY_CHAIN when remote flag is not formatted correctly a object keyed by chain IDs with array of token symbols as values', () => {
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

      // Falls back to CONVERTIBLE_STABLECOINS_BY_CHAIN since array is invalid
      expect(result).toEqual(CONVERTIBLE_STABLECOINS_BY_CHAIN);
    });

    it('converts symbol allowlist to address mapping', () => {
      const remoteAllowlist = {
        '0x1': ['USDC', 'USDT', 'DAI'],
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

      expect(result['0x1']).toEqual([
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
        '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
        '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
      ]);
    });

    describe('validation of converted allowlists', () => {
      let ConvertSymbolAllowlistToAddressesSpy: jest.MockedFunction<
        typeof musdUtils.convertSymbolAllowlistToAddresses
      >;

      beforeEach(() => {
        ConvertSymbolAllowlistToAddressesSpy = jest.spyOn(
          musdUtils,
          'convertSymbolAllowlistToAddresses',
        ) as jest.MockedFunction<
          typeof musdUtils.convertSymbolAllowlistToAddresses
        >;
      });

      afterEach(() => {
        ConvertSymbolAllowlistToAddressesSpy.mockRestore();
        delete process.env.MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST;
      });

      it('uses remote allowlist over local when remote is valid', () => {
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
        ConvertSymbolAllowlistToAddressesSpy.mockReturnValueOnce({
          // First call: LOCAL conversion (DAI)
          '0x1': ['0x6b175474e89094c44da98b954eedeac495271d0f' as Hex],
        }).mockReturnValueOnce({
          // Second call: REMOTE conversion (USDC, USDT) - takes priority
          '0x1': [
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Hex,
            '0xdac17f958d2ee523a2206206994597c13d831ec7' as Hex,
          ],
        });

        const result =
          selectMusdConversionPaymentTokensAllowlist(stateWithBoth);

        expect(result['0x1']).toEqual([
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          '0xdac17f958d2ee523a2206206994597c13d831ec7',
        ]);
      });

      it('uses local allowlist when remote is invalid', () => {
        const localAllowlist = { '0x1': ['DAI'] };
        process.env.MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST =
          JSON.stringify(localAllowlist);
        const remoteAllowlist = { '0x1': ['USDC'] };
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
        ConvertSymbolAllowlistToAddressesSpy.mockReturnValueOnce({
          // First call: LOCAL conversion (DAI) - valid
          '0x1': ['0x6b175474e89094c44da98b954eedeac495271d0f' as Hex],
        }).mockReturnValueOnce({
          // Second call: REMOTE conversion (USDC) - invalid
          '0x1': ['invalid-address' as Hex],
        } as Record<Hex, Hex[]>);

        const result =
          selectMusdConversionPaymentTokensAllowlist(stateWithBoth);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Remote earnMusdConvertibleTokensAllowlist produced invalid structure',
        );
        expect(result['0x1']).toEqual([
          '0x6b175474e89094c44da98b954eedeac495271d0f',
        ]);
      });

      it('uses fallback allowlist when both remote and local are invalid', () => {
        const localAllowlist = { '0x1': ['USDC'] };
        process.env.MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST =
          JSON.stringify(localAllowlist);
        const remoteAllowlist = { '0x1': ['USDT'] };
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
        ConvertSymbolAllowlistToAddressesSpy.mockReturnValue({
          // Invalid for both
          '0x1': ['invalid-local' as Hex],
        } as Record<Hex, Hex[]>);
        const result =
          selectMusdConversionPaymentTokensAllowlist(stateWithBoth);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Local MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST produced invalid structure',
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Remote earnMusdConvertibleTokensAllowlist produced invalid structure',
        );
        expect(result).toEqual(CONVERTIBLE_STABLECOINS_BY_CHAIN);
      });
    });
  });
});
