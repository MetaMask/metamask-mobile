import type { CaipAssetType } from '@metamask/utils';
import { getDefaultAssetsControllerState } from '@metamask/assets-controller';
import type { RootState } from '../../reducers';
import {
  getCustomAssets,
  getAssetsBalance,
  getAssetsInfo,
  selectErc20MetadataLookup,
} from './assets-controller';

type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

const defaultAssetsControllerState = getDefaultAssetsControllerState();

const buildState = (
  assetsController?: DeepPartial<
    RootState['engine']['backgroundState']['AssetsController']
  >,
): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      AssetsController: assetsController,
    },
  },
});

describe('getCustomAssets', () => {
  it('returns customAssets from AssetsController state', () => {
    // customAssets is Record<AccountId, CaipAssetType[]> — per-account asset-ID arrays
    const customAssets = {
      'mock-account-id': ['eip155:1/erc20:0xabc' as CaipAssetType],
    };
    const state = buildState({ customAssets });

    expect(getCustomAssets(state as unknown as RootState)).toStrictEqual(
      customAssets,
    );
  });

  it('returns an empty object when customAssets is undefined', () => {
    const state = buildState({});

    expect(getCustomAssets(state as unknown as RootState)).toStrictEqual({});
  });

  it('returns an empty object when AssetsController is undefined', () => {
    const state = buildState(undefined);

    expect(getCustomAssets(state as unknown as RootState)).toStrictEqual({});
  });

  it('returns an empty object when engine state is absent', () => {
    expect(getCustomAssets({} as unknown as RootState)).toStrictEqual({});
  });
});

describe('getAssetsBalance', () => {
  it('returns assetsBalance from AssetsController state', () => {
    const assetsBalance = {
      'mock-account-id': {
        'eip155:1/erc20:0xabc': { amount: '100', unit: 'TKA' },
      },
    };
    const state = buildState({ assetsBalance });

    expect(getAssetsBalance(state as unknown as RootState)).toStrictEqual(
      assetsBalance,
    );
  });

  it('returns an empty object when assetsBalance is undefined', () => {
    const state = buildState({});

    expect(getAssetsBalance(state as unknown as RootState)).toStrictEqual({});
  });

  it('returns an empty object when AssetsController is undefined', () => {
    const state = buildState(undefined);

    expect(getAssetsBalance(state as unknown as RootState)).toStrictEqual({});
  });

  it('returns an empty object when engine state is absent', () => {
    expect(getAssetsBalance({} as unknown as RootState)).toStrictEqual({});
  });
});

describe('getAssetsInfo', () => {
  it('returns assetsInfo from AssetsController state', () => {
    const assetsInfo = {
      'eip155:1/erc20:0xabc': {
        decimals: 18,
        name: 'Token A',
        symbol: 'TKA',
        type: 'erc20' as const,
      },
    };
    const state = buildState({ assetsInfo });

    expect(getAssetsInfo(state as unknown as RootState)).toStrictEqual(
      assetsInfo,
    );
  });

  it('returns default assetsInfo when assetsInfo is undefined', () => {
    const state = buildState({});

    expect(getAssetsInfo(state as unknown as RootState)).toStrictEqual(
      defaultAssetsControllerState.assetsInfo,
    );
  });

  it('returns default assetsInfo when AssetsController is undefined', () => {
    const state = buildState(undefined);

    expect(getAssetsInfo(state as unknown as RootState)).toStrictEqual(
      defaultAssetsControllerState.assetsInfo,
    );
  });

  it('returns default assetsInfo when engine state is absent', () => {
    expect(getAssetsInfo({} as unknown as RootState)).toStrictEqual(
      defaultAssetsControllerState.assetsInfo,
    );
  });
});

describe('selectErc20MetadataLookup', () => {
  const usdc = '0x754704bc059f8c67012fed69bc8a327a5aafb603';
  // USDC is absent from assetsBalance, as after sending the full balance.
  const assetsInfo = {
    [`eip155:143/erc20:${usdc}`]: {
      type: 'erc20' as const,
      symbol: 'USDC',
      decimals: 6,
    },
    'eip155:143/slip44:268435456': {
      type: 'native' as const,
      symbol: 'MON',
      decimals: 18,
    },
  };
  const state = buildState({ assetsInfo, assetsBalance: {} });

  it('resolves symbol and decimals by hex chain id and contract address', () => {
    const lookup = selectErc20MetadataLookup(state as unknown as RootState);

    expect(lookup('0x8f', usdc)).toStrictEqual({
      symbol: 'USDC',
      decimals: 6,
    });
  });

  it('matches the contract address case-insensitively', () => {
    const lookup = selectErc20MetadataLookup(state as unknown as RootState);

    expect(
      lookup('0x8f', usdc.toUpperCase().replace('0X', '0x')),
    ).toStrictEqual({ symbol: 'USDC', decimals: 6 });
  });

  it('returns undefined for an unknown token, another chain, or a native asset', () => {
    const lookup = selectErc20MetadataLookup(state as unknown as RootState);

    expect(lookup('0x8f', '0x0000000000000000000000000000000000000001')).toBe(
      undefined,
    );
    expect(lookup('0x1', usdc)).toBeUndefined();
    expect(lookup('0x8f', '268435456')).toBeUndefined();
  });

  it('finds metadata stored under an EIP-55 checksummed asset id, as the controller writes it', () => {
    const assetsInfo = {
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
        type: 'erc20' as const,
        symbol: 'USDC',
        decimals: 6,
      },
    };
    const lookup = selectErc20MetadataLookup(
      buildState({ assetsInfo }) as unknown as RootState,
    );

    expect(
      lookup('0x1', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'),
    ).toStrictEqual({ symbol: 'USDC', decimals: 6 });
  });
});
