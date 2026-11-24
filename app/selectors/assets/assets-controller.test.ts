import type { CaipAssetType } from '@metamask/utils';
import { getDefaultAssetsControllerState } from '@metamask/assets-controller';
import type { RootState } from '../../reducers';
import {
  getCustomAssets,
  getAssetsBalance,
  getAssetsInfo,
  selectAssetsHaveLoadedForSelectedAccountGroup,
  selectErc20MetadataLookup,
  selectEvmAssetIdEncoder,
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

describe('selectAssetsHaveLoadedForSelectedAccountGroup', () => {
  const accountId = 'account-1';
  const groupId = 'keyring:wallet-1/group-1';

  const buildRootState = ({
    assetsLoadingStatus,
    assetsBackgroundLoadingStatus,
    isAccountTreeSyncingInProgress = false,
    selectedAccountGroup = groupId,
  }: {
    assetsLoadingStatus?: Record<string, 'loading' | 'loaded'>;
    assetsBackgroundLoadingStatus?: Record<string, 'loading' | 'loaded'>;
    isAccountTreeSyncingInProgress?: boolean;
    selectedAccountGroup?: string | null;
  }): RootState =>
    ({
      engine: {
        backgroundState: {
          AssetsController: {
            ...defaultAssetsControllerState,
            assetsLoadingStatus,
            assetsBackgroundLoadingStatus,
          },
          AccountTreeController: {
            selectedAccountGroup,
            isAccountTreeSyncingInProgress,
            accountTree: {
              wallets: {
                'keyring:wallet-1': {
                  id: 'keyring:wallet-1',
                  groups: {
                    [groupId]: {
                      id: groupId,
                      accounts: [accountId],
                    },
                  },
                },
              },
            },
          },
        },
      },
    }) as unknown as RootState;

  it('returns false when the initial load has not started for a group with accounts', () => {
    expect(
      selectAssetsHaveLoadedForSelectedAccountGroup(buildRootState({})),
    ).toBe(false);
  });

  it('returns true when the selected group has no accounts and no status was written', () => {
    const state = buildRootState({});
    (
      state.engine.backgroundState.AccountTreeController as {
        accountTree: {
          wallets: Record<
            string,
            { groups: Record<string, { accounts: string[] }> }
          >;
        };
      }
    ).accountTree.wallets['keyring:wallet-1'].groups[groupId].accounts = [];

    expect(selectAssetsHaveLoadedForSelectedAccountGroup(state)).toBe(true);
  });

  it('returns false while the account tree is still syncing', () => {
    expect(
      selectAssetsHaveLoadedForSelectedAccountGroup(
        buildRootState({
          assetsLoadingStatus: { [accountId]: 'loaded' },
          isAccountTreeSyncingInProgress: true,
        }),
      ),
    ).toBe(false);
  });

  it('returns false while background loading is still running', () => {
    expect(
      selectAssetsHaveLoadedForSelectedAccountGroup(
        buildRootState({
          assetsLoadingStatus: { [accountId]: 'loaded' },
          assetsBackgroundLoadingStatus: { [accountId]: 'loading' },
        }),
      ),
    ).toBe(false);
  });

  it('returns true once initial and background loads have settled', () => {
    expect(
      selectAssetsHaveLoadedForSelectedAccountGroup(
        buildRootState({
          assetsLoadingStatus: { [accountId]: 'loaded' },
          assetsBackgroundLoadingStatus: { [accountId]: 'loaded' },
        }),
      ),
    ).toBe(true);
  });

  it('returns true when initial load settled and no background status was written', () => {
    expect(
      selectAssetsHaveLoadedForSelectedAccountGroup(
        buildRootState({
          assetsLoadingStatus: { [accountId]: 'loaded' },
        }),
      ),
    ).toBe(true);
  });
});

describe('selectEvmAssetIdEncoder', () => {
  const USDC_ASSET_ID =
    'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as CaipAssetType;

  const state = {
    engine: {
      backgroundState: {
        AssetsController: {
          ...defaultAssetsControllerState,
          assetsInfo: {
            [USDC_ASSET_ID]: { type: 'erc20', symbol: 'USDC', decimals: 6 },
            'eip155:137/slip44:966': {
              type: 'native',
              symbol: 'POL',
              decimals: 18,
            },
          },
        },
      },
    },
  } as unknown as RootState;

  it('resolves an ERC-20 token to its AssetsController key', () => {
    const encodeAssetId = selectEvmAssetIdEncoder(state);

    expect(
      encodeAssetId({
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1',
      }),
    ).toBe(USDC_ASSET_ID);
  });

  it('resolves a native token to the native asset of its chain', () => {
    const encodeAssetId = selectEvmAssetIdEncoder(state);

    expect(
      encodeAssetId({
        address: '0x0000000000000000000000000000000000001010',
        chainId: '0x89',
      }),
    ).toBe('eip155:137/slip44:966');
  });

  it('returns the same resolver while assetsInfo is unchanged', () => {
    expect(selectEvmAssetIdEncoder(state)).toBe(selectEvmAssetIdEncoder(state));
  });
});
