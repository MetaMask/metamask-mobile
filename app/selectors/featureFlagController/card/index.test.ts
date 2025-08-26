import {
  CardFeatureFlag,
  SupportedChain,
  SupportedToken,
  selectCardFeatureFlag,
} from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
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

describe('Card Feature Flag Selector', () => {
  it('returns null when feature flag state is empty', () => {
    const result = selectCardFeatureFlag(mockedEmptyFlagsState);

    expect(result).toEqual(null);
  });

  it('returns null when RemoteFeatureFlagController state is undefined', () => {
    const result = selectCardFeatureFlag(mockedUndefinedFlagsState);

    expect(result).toEqual(null);
  });

  it('returns null when cardFeature is null', () => {
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

    const result = selectCardFeatureFlag(stateWithNullCardFlag);

    expect(result).toBeNull();
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

    const result = selectCardFeatureFlag(stateWithMultipleTokens);

    expect(result?.chains?.['1']?.tokens).toHaveLength(2);
    expect(result?.chains?.['1']?.tokens?.[0]).toEqual(mockedSupportedToken);
    expect(result?.chains?.['1']?.tokens?.[1]).toEqual({
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
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = selectCardFeatureFlag(stateWithDisabledChain as any);

    expect(result?.chains?.['1']?.enabled).toBe(false);
    expect(result?.chains?.['1']?.tokens).toBeNull();
  });
});
