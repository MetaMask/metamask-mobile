import type { CaipAssetType } from '@metamask/utils';
import type { RootState } from '../../reducers';
import {
  getCustomAssets,
  getAssetsBalance,
  getAssetsInfo,
} from './assets-controller';

type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

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

  it('returns an empty object when assetsInfo is undefined', () => {
    const state = buildState({});

    expect(getAssetsInfo(state as unknown as RootState)).toStrictEqual({});
  });

  it('returns an empty object when AssetsController is undefined', () => {
    const state = buildState(undefined);

    expect(getAssetsInfo(state as unknown as RootState)).toStrictEqual({});
  });

  it('returns an empty object when engine state is absent', () => {
    expect(getAssetsInfo({} as unknown as RootState)).toStrictEqual({});
  });
});
