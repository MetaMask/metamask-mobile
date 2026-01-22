import {
  CardFeatureFlag,
  CardSupportedCountries,
  SupportedChain,
  SupportedToken,
  selectCardFeatureFlag,
  selectCardSupportedCountries,
  selectDisplayCardButtonFeatureFlag,
  selectCardExperimentalSwitch,
} from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  validatedVersionGatedFeatureFlag: jest.fn(),
}));

jest.mock(
  '../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  jest.clearAllMocks();
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

const mockedSupportedToken: SupportedToken = {
  address: '0x1234567890123456789012345678901234567890',
  decimals: 18,
  enabled: true,
  name: 'Test Token',
  symbol: 'TEST',
};

const mockedSupportedChain: SupportedChain = {
  enabled: true,
  balanceScannerAddress: '0xabc',
  foxConnectAddresses: {
    global: '0xdef',
    us: '0xghi',
  },
  tokens: [mockedSupportedToken],
};

const mockedCardFeatureFlag: CardFeatureFlag = {
  constants: {
    onRampApiUrl: 'https://api.onramp.metamask.io',
    accountsApiUrl: 'https://api.accounts.metamask.io',
  },
  chains: {
    '1': mockedSupportedChain,
    '137': {
      enabled: false,
      tokens: null,
    },
  },
};

const mockedStateWithCardFeatureFlag = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          cardFeature: mockedCardFeatureFlag,
        },
        cacheTimestamp: 0,
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const mockedStateWithPartialCardFeatureFlag = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          cardFeature: {
            constants: {},
            chains: {
              '1': {
                enabled: true,
                // tokens is undefined
              },
              '137': {
                // enabled is undefined
                tokens: [],
              },
            },
          },
        },
        cacheTimestamp: 0,
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('selectCardFeatureFlag', () => {
  it('returns default card feature flag when feature flag state is empty', () => {
    const result = selectCardFeatureFlag(
      mockedEmptyFlagsState,
    ) as CardFeatureFlag;

    expect(result).toBeDefined();
    expect(result.constants).toBeDefined();
    expect(result.chains).toBeDefined();
  });

  it('returns default card feature flag when RemoteFeatureFlagController state is undefined', () => {
    const result = selectCardFeatureFlag(
      mockedUndefinedFlagsState,
    ) as CardFeatureFlag;

    expect(result).toBeDefined();
    expect(result.constants).toBeDefined();
    expect(result.chains).toBeDefined();
  });

  it('returns default card feature flag when cardFeature is null', () => {
    const stateWithNullCardFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              cardFeature: null,
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectCardFeatureFlag(
      stateWithNullCardFlag,
    ) as CardFeatureFlag;

    expect(result).toBeDefined();
    expect(result.constants).toBeDefined();
    expect(result.chains).toBeDefined();
  });

  it('returns default card feature flag when cardFeature is empty object', () => {
    const stateWithEmptyCardFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              cardFeature: {},
            },
            cacheTimestamp: 0,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = selectCardFeatureFlag(
      stateWithEmptyCardFlag,
    ) as CardFeatureFlag;

    expect(result).toBeDefined();
    expect(result.constants).toBeDefined();
    expect(result.chains).toBeDefined();
  });

  it('returns card feature flag when properly configured', () => {
    const result = selectCardFeatureFlag(mockedStateWithCardFeatureFlag);

    expect(result).toEqual(mockedCardFeatureFlag);
  });

  it('handles partial configuration correctly', () => {
    const result = selectCardFeatureFlag(mockedStateWithPartialCardFeatureFlag);

    expect(result).toEqual({
      constants: {},
      chains: {
        '1': {
          enabled: true,
          tokens: undefined,
        },
        '137': {
          enabled: undefined,
          tokens: [],
        },
      },
    });
  });

  it('preserves chain structure with undefined values', () => {
    const stateWithUndefinedChain = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              cardFeature: {
                constants: {},
                chains: {
                  '1': undefined,
                  '137': {
                    enabled: true,
                    tokens: [mockedSupportedToken],
                  },
                },
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = selectCardFeatureFlag(stateWithUndefinedChain);

    expect(result).toEqual({
      constants: {},
      chains: {
        '1': undefined,
        '137': {
          enabled: true,
          tokens: [mockedSupportedToken],
        },
      },
    });
  });

  it('handles tokens array correctly', () => {
    const stateWithMultipleTokens = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              cardFeature: {
                chains: {
                  '1': {
                    enabled: true,
                    tokens: [
                      mockedSupportedToken,
                      {
                        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
                        decimals: 6,
                        enabled: false,
                        name: 'Another Token',
                        symbol: 'ANOTHER',
                      },
                    ],
                  },
                },
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = selectCardFeatureFlag(
      stateWithMultipleTokens,
    ) as CardFeatureFlag;

    expect(result.chains?.['1']?.tokens).toHaveLength(2);
    expect(result.chains?.['1']?.tokens?.[0]).toEqual(mockedSupportedToken);
    expect(result.chains?.['1']?.tokens?.[1]).toEqual({
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      decimals: 6,
      enabled: false,
      name: 'Another Token',
      symbol: 'ANOTHER',
    });
  });

  it('handles disabled chain correctly', () => {
    const stateWithDisabledChain = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              cardFeature: {
                chains: {
                  '1': {
                    enabled: false,
                    tokens: null,
                  },
                },
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = selectCardFeatureFlag(
      stateWithDisabledChain,
    ) as CardFeatureFlag;

    expect(result.chains?.['1']?.enabled).toBe(false);
    expect(result.chains?.['1']?.tokens).toBeNull();
  });
});

describe('selectCardSupportedCountries', () => {
  it('returns default supported countries when feature flag state is empty', () => {
    const result = selectCardSupportedCountries(
      mockedEmptyFlagsState,
    ) as CardSupportedCountries;

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.GB).toBe(true);
    expect(result.US).toBeUndefined();
  });

  it('returns default supported countries when RemoteFeatureFlagController state is undefined', () => {
    const result = selectCardSupportedCountries(
      mockedUndefinedFlagsState,
    ) as CardSupportedCountries;

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('returns custom supported countries when defined in remote flags', () => {
    const customCountries: CardSupportedCountries = {
      US: true,
      CA: true,
      GB: false,
    };

    const stateWithCustomCountries = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              cardSupportedCountries: customCountries,
            },
            cacheTimestamp: 0,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = selectCardSupportedCountries(
      stateWithCustomCountries,
    ) as CardSupportedCountries;

    expect(result).toEqual(customCountries);
    expect(result.US).toBe(true);
    expect(result.CA).toBe(true);
    expect(result.GB).toBe(false);
  });

  it('handles null cardSupportedCountries by returning default', () => {
    const stateWithNullCountries = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              cardSupportedCountries: null,
            },
            cacheTimestamp: 0,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = selectCardSupportedCountries(stateWithNullCountries);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});

describe('selectDisplayCardButtonFeatureFlag', () => {
  const mockedValidatedVersionGatedFeatureFlag =
    validatedVersionGatedFeatureFlag as jest.MockedFunction<
      typeof validatedVersionGatedFeatureFlag
    >;

  it('returns false when feature flag state is empty', () => {
    mockedValidatedVersionGatedFeatureFlag.mockReturnValue(undefined);

    const result = selectDisplayCardButtonFeatureFlag(mockedEmptyFlagsState);

    expect(result).toBe(false);
  });

  it('returns false when RemoteFeatureFlagController state is undefined', () => {
    mockedValidatedVersionGatedFeatureFlag.mockReturnValue(undefined);

    const result = selectDisplayCardButtonFeatureFlag(
      mockedUndefinedFlagsState,
    );

    expect(result).toBe(false);
  });

  it('returns true when feature flag is enabled and version requirement is met', () => {
    mockedValidatedVersionGatedFeatureFlag.mockReturnValue(true);

    const stateWithDisplayCardButton = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              displayCardButton: {
                enabled: true,
                minimumVersion: '7.0.0',
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = selectDisplayCardButtonFeatureFlag(
      stateWithDisplayCardButton,
    );

    expect(result).toBe(true);
    expect(mockedValidatedVersionGatedFeatureFlag).toHaveBeenCalledWith({
      enabled: true,
      minimumVersion: '7.0.0',
    });
  });

  it('returns false when feature flag is disabled', () => {
    mockedValidatedVersionGatedFeatureFlag.mockReturnValue(false);

    const stateWithDisabledFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              displayCardButton: {
                enabled: false,
                minimumVersion: '7.0.0',
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = selectDisplayCardButtonFeatureFlag(stateWithDisabledFlag);

    expect(result).toBe(false);
  });

  it('returns false when version requirement is not met', () => {
    mockedValidatedVersionGatedFeatureFlag.mockReturnValue(false);

    const stateWithVersionGate = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              displayCardButton: {
                enabled: true,
                minimumVersion: '99.0.0',
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = selectDisplayCardButtonFeatureFlag(stateWithVersionGate);

    expect(result).toBe(false);
  });

  it('returns false when validatedVersionGatedFeatureFlag returns undefined', () => {
    mockedValidatedVersionGatedFeatureFlag.mockReturnValue(undefined);

    const stateWithMalformedFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              displayCardButton: {
                enabled: 'true', // Invalid type
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = selectDisplayCardButtonFeatureFlag(stateWithMalformedFlag);

    expect(result).toBe(false);
  });
});

describe('selectCardExperimentalSwitch', () => {
  const mockedValidatedVersionGatedFeatureFlag =
    validatedVersionGatedFeatureFlag as jest.MockedFunction<
      typeof validatedVersionGatedFeatureFlag
    >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when feature flag state is empty', () => {
    mockedValidatedVersionGatedFeatureFlag.mockReturnValue(undefined);

    const result = selectCardExperimentalSwitch(mockedEmptyFlagsState);

    expect(result).toBe(false);
  });

  it('returns false when RemoteFeatureFlagController state is undefined', () => {
    mockedValidatedVersionGatedFeatureFlag.mockReturnValue(undefined);

    const result = selectCardExperimentalSwitch(mockedUndefinedFlagsState);

    expect(result).toBe(false);
  });

  it('returns true when feature flag is enabled and version requirement is met', () => {
    mockedValidatedVersionGatedFeatureFlag.mockReturnValue(true);

    const stateWithExperimentalSwitch = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              cardExperimentalSwitch2: {
                enabled: true,
                minimumVersion: '7.0.0',
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = selectCardExperimentalSwitch(stateWithExperimentalSwitch);

    expect(result).toBe(true);
    expect(mockedValidatedVersionGatedFeatureFlag).toHaveBeenCalledWith({
      enabled: true,
      minimumVersion: '7.0.0',
    });
  });

  it('returns false when feature flag is disabled', () => {
    mockedValidatedVersionGatedFeatureFlag.mockReturnValue(false);

    const stateWithDisabledSwitch = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              cardExperimentalSwitch2: {
                enabled: false,
                minimumVersion: '7.0.0',
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = selectCardExperimentalSwitch(stateWithDisabledSwitch);

    expect(result).toBe(false);
  });

  it('returns false when version requirement is not met', () => {
    mockedValidatedVersionGatedFeatureFlag.mockReturnValue(false);

    const stateWithVersionGate = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              cardExperimentalSwitch2: {
                enabled: true,
                minimumVersion: '99.0.0',
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = selectCardExperimentalSwitch(stateWithVersionGate);

    expect(result).toBe(false);
  });

  it('returns false when validatedVersionGatedFeatureFlag returns undefined', () => {
    mockedValidatedVersionGatedFeatureFlag.mockReturnValue(undefined);

    const stateWithMalformedFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              cardExperimentalSwitch2: {
                enabled: 'true', // Invalid type
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = selectCardExperimentalSwitch(stateWithMalformedFlag);

    expect(result).toBe(false);
  });
});
