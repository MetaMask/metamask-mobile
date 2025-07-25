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
  tokens: [mockedSupportedToken],
};

const mockedCardFeatureFlag: CardFeatureFlag = {
  '1': mockedSupportedChain, // Ethereum mainnet
  '137': {
    // Polygon
    enabled: false,
    tokens: null,
  },
  '56': undefined, // BSC - undefined chain
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
};

const mockedStateWithPartialCardFeatureFlag = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          cardFeature: {
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
        cacheTimestamp: 0,
      },
    },
  },
};

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = selectCardFeatureFlag(stateWithNullCardFlag as any);
    expect(result).toBeNull();
  });

  it('returns card feature flag when properly configured', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = selectCardFeatureFlag(mockedStateWithCardFeatureFlag as any);
    expect(result).toEqual(mockedCardFeatureFlag);
  });

  it('handles partial configuration correctly', () => {
    const result = selectCardFeatureFlag(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockedStateWithPartialCardFeatureFlag as any,
    );

    expect(result).toEqual({
      '1': {
        enabled: true,
        tokens: undefined,
      },
      '137': {
        enabled: undefined,
        tokens: [],
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
                '1': undefined,
                '137': {
                  enabled: true,
                  tokens: [mockedSupportedToken],
                },
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = selectCardFeatureFlag(stateWithUndefinedChain as any);

    expect(result).toEqual({
      '1': undefined,
      '137': {
        enabled: true,
        tokens: [mockedSupportedToken],
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
            cacheTimestamp: 0,
          },
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = selectCardFeatureFlag(stateWithMultipleTokens as any);

    expect(result?.['1']?.tokens).toHaveLength(2);
    expect(result?.['1']?.tokens?.[0]).toEqual(mockedSupportedToken);
    expect(result?.['1']?.tokens?.[1]).toEqual({
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
                '1': {
                  enabled: false,
                  tokens: null,
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

    expect(result?.['1']?.enabled).toBe(false);
    expect(result?.['1']?.tokens).toBeNull();
  });
});
