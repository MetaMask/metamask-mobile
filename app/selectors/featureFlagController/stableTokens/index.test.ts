import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { selectStablecoins, STABLE_TOKENS_FLAG } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

const getMockedFeatureFlag = (value: unknown) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          [STABLE_TOKENS_FLAG]: value,
        },
        cacheTimestamp: 0,
      },
    },
  },
});

describe('selectStablecoins', () => {
  it('returns default stablecoins when flag state is undefined', () => {
    const result = selectStablecoins(mockedUndefinedFlagsState);
    expect(result[CHAIN_IDS.MAINNET as Hex]).toContain(
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    );
  });

  it('returns default stablecoins when no flags are set', () => {
    const result = selectStablecoins(mockedEmptyFlagsState);
    expect(result).toHaveProperty(CHAIN_IDS.MAINNET);
    expect(result).toHaveProperty(CHAIN_IDS.ARBITRUM);
    expect(result).toHaveProperty(CHAIN_IDS.LINEA_MAINNET);
    expect(result).toHaveProperty(CHAIN_IDS.POLYGON);
  });

  it('returns flag value when set to a valid object', () => {
    const flagValue = {
      '0x1': ['0xaaa', '0xbbb'],
      '0xa4b1': ['0xccc'],
    };
    const result = selectStablecoins(getMockedFeatureFlag(flagValue));
    expect(result).toStrictEqual(flagValue);
  });

  it('normalizes addresses and chain IDs to lowercase', () => {
    const result = selectStablecoins(
      getMockedFeatureFlag({
        '0xA4B1': ['0xAf88d065e77c8cC2239327C5EDb3A432268e5831'],
      }),
    );
    expect(result).toStrictEqual({
      '0xa4b1': ['0xaf88d065e77c8cc2239327c5edb3a432268e5831'],
    });
  });

  it('skips non-array entries in flag value', () => {
    const result = selectStablecoins(
      getMockedFeatureFlag({
        '0x1': ['0xaaa'],
        '0xa4b1': 'not-an-array',
      }),
    );
    expect(result).toStrictEqual({ '0x1': ['0xaaa'] });
  });

  it('returns default stablecoins when flag is an array', () => {
    const result = selectStablecoins(
      getMockedFeatureFlag(['not', 'an', 'object']),
    );
    expect(result).toHaveProperty(CHAIN_IDS.MAINNET);
  });

  it('returns default stablecoins when flag is a primitive', () => {
    const result = selectStablecoins(getMockedFeatureFlag(true));
    expect(result).toHaveProperty(CHAIN_IDS.MAINNET);
  });
});
