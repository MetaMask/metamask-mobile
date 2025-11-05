import {
  selectPerpsEnabledFlag,
  selectPerpsServiceInterruptionBannerEnabledFlag,
  selectPerpsEquityEnabledFlag,
  selectPerpsAllowlistMarkets,
  selectPerpsBlocklistMarkets,
  selectHip3ConfigVersion,
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

  describe('selectPerpsEquityEnabledFlag', () => {
    it('returns false by default when local flag is not set', () => {
      process.env.MM_PERPS_HIP3_ENABLED = undefined;
      const stateWithEmptyFlags = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsEquityEnabledFlag(stateWithEmptyFlags);
      expect(result).toBe(false);
    });

    it('returns true when local flag is true and remote flag not present', () => {
      process.env.MM_PERPS_HIP3_ENABLED = 'true';
      const stateWithEmptyFlags = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsEquityEnabledFlag(stateWithEmptyFlags);
      expect(result).toBe(true);
    });

    it('returns true when remote flag is valid and enabled', () => {
      process.env.MM_PERPS_HIP3_ENABLED = 'false';
      const stateWithRemoteFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsEquityEnabled: {
                  enabled: true,
                  minimumVersion: '1.0.0',
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsEquityEnabledFlag(stateWithRemoteFlag);
      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      process.env.MM_PERPS_HIP3_ENABLED = 'true';
      const stateWithRemoteFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsEquityEnabled: {
                  enabled: false,
                  minimumVersion: '1.0.0',
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsEquityEnabledFlag(stateWithRemoteFlag);
      expect(result).toBe(false);
    });

    it('falls back to local flag when remote flag is invalid', () => {
      process.env.MM_PERPS_HIP3_ENABLED = 'true';
      const stateWithInvalidFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsEquityEnabled: {
                  enabled: 'invalid',
                  minimumVersion: 123,
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsEquityEnabledFlag(stateWithInvalidFlag);
      expect(result).toBe(true);
    });
  });

  describe('selectPerpsAllowlistMarkets', () => {
    it('returns empty array when local env variable is not set', () => {
      delete process.env.MM_PERPS_HIP3_ALLOWLIST_MARKETS;
      const result = selectPerpsAllowlistMarkets(mockedEmptyFlagsState);
      expect(result).toEqual([]);
    });

    it('parses local env variable as comma-separated list', () => {
      process.env.MM_PERPS_HIP3_ALLOWLIST_MARKETS = 'BTC,ETH,xyz:TSLA';
      const freshState = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsAllowlistMarkets(freshState);
      expect(result).toEqual(['BTC', 'ETH', 'xyz:TSLA']);
    });

    it('returns empty array when local env variable is empty string', () => {
      process.env.MM_PERPS_HIP3_ALLOWLIST_MARKETS = '';
      const result = selectPerpsAllowlistMarkets(mockedEmptyFlagsState);
      expect(result).toEqual([]);
    });

    it('trims whitespace from comma-separated values', () => {
      process.env.MM_PERPS_HIP3_ALLOWLIST_MARKETS =
        '  BTC  ,  ETH  ,  xyz:TSLA  ';
      const freshState = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsAllowlistMarkets(freshState);
      expect(result).toEqual(['BTC', 'ETH', 'xyz:TSLA']);
    });

    it('returns remote flag when valid comma-separated string', () => {
      process.env.MM_PERPS_HIP3_ALLOWLIST_MARKETS = 'BTC';
      const stateWithRemoteFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsAllowlistMarkets: 'ETH,SOL,xyz:AAPL',
              },
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsAllowlistMarkets(stateWithRemoteFlag);
      expect(result).toEqual(['ETH', 'SOL', 'xyz:AAPL']);
    });

    it('returns empty array when remote flag is empty string', () => {
      process.env.MM_PERPS_HIP3_ALLOWLIST_MARKETS = 'BTC';
      const stateWithEmptyRemoteFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsAllowlistMarkets: '',
              },
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsAllowlistMarkets(stateWithEmptyRemoteFlag);
      expect(result).toEqual([]); // Remote empty string returns [] (discovery mode)
    });

    it('falls back to local flag when remote flag is invalid type', () => {
      process.env.MM_PERPS_HIP3_ALLOWLIST_MARKETS = 'BTC,ETH';
      const stateWithInvalidRemoteFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsAllowlistMarkets: 123, // Invalid type
              },
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsAllowlistMarkets(stateWithInvalidRemoteFlag);
      expect(result).toEqual(['BTC', 'ETH']);
    });

    it('handles wildcard patterns correctly', () => {
      process.env.MM_PERPS_HIP3_ALLOWLIST_MARKETS = 'xyz:*,abc:TSLA';
      const freshState = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsAllowlistMarkets(freshState);
      expect(result).toEqual(['xyz:*', 'abc:TSLA']);
    });
  });

  describe('selectPerpsBlocklistMarkets', () => {
    it('returns empty array when local env variable is not set', () => {
      delete process.env.MM_PERPS_HIP3_BLOCKLIST_MARKETS;
      const result = selectPerpsBlocklistMarkets(mockedEmptyFlagsState);
      expect(result).toEqual([]);
    });

    it('parses local env variable as comma-separated list', () => {
      process.env.MM_PERPS_HIP3_BLOCKLIST_MARKETS = 'xyz:TSLA,BTC';
      const freshState = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsBlocklistMarkets(freshState);
      expect(result).toEqual(['xyz:TSLA', 'BTC']);
    });

    it('returns empty array when local env variable is empty string', () => {
      process.env.MM_PERPS_HIP3_BLOCKLIST_MARKETS = '';
      const result = selectPerpsBlocklistMarkets(mockedEmptyFlagsState);
      expect(result).toEqual([]);
    });

    it('trims whitespace from comma-separated values', () => {
      process.env.MM_PERPS_HIP3_BLOCKLIST_MARKETS = '  BTC  ,  ETH  ';
      const freshState = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsBlocklistMarkets(freshState);
      expect(result).toEqual(['BTC', 'ETH']);
    });

    it('returns remote flag when valid comma-separated string', () => {
      process.env.MM_PERPS_HIP3_BLOCKLIST_MARKETS = 'BTC';
      const stateWithRemoteFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsBlocklistMarkets: 'xyz:TSLA,xyz:AAPL',
              },
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsBlocklistMarkets(stateWithRemoteFlag);
      expect(result).toEqual(['xyz:TSLA', 'xyz:AAPL']);
    });

    it('returns empty array when remote flag is empty string', () => {
      process.env.MM_PERPS_HIP3_BLOCKLIST_MARKETS = 'BTC';
      const stateWithEmptyRemoteFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsBlocklistMarkets: '',
              },
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsBlocklistMarkets(stateWithEmptyRemoteFlag);
      expect(result).toEqual([]); // Remote empty string returns [] (no blocking)
    });

    it('falls back to local flag when remote flag is invalid type', () => {
      process.env.MM_PERPS_HIP3_BLOCKLIST_MARKETS = 'xyz:*';
      const stateWithInvalidRemoteFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsBlocklistMarkets: { invalid: 'object' }, // Invalid type
              },
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsBlocklistMarkets(stateWithInvalidRemoteFlag);
      expect(result).toEqual(['xyz:*']);
    });

    it('handles wildcard patterns correctly', () => {
      process.env.MM_PERPS_HIP3_BLOCKLIST_MARKETS = 'xyz:*';
      const freshState = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: 0,
            },
          },
        },
      };
      const result = selectPerpsBlocklistMarkets(freshState);
      expect(result).toEqual(['xyz:*']);
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
