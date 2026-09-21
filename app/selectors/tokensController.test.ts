import { RootState } from '../reducers';
import {
  selectTokens,
  selectTokensByAddress,
  selectTokensLength,
  selectIgnoreTokens,
  selectAllTokens,
  selectAllTokensFlat,
  selectTokensByChainIdAndAddress,
  selectTokensByChainIdAndWalletAddress,
  getChainIdsToPoll,
  selectSingleTokenByAddressAndChainId,
} from './tokensController';
import { NetworkConfiguration } from '@metamask/network-controller';

describe('TokensController Selectors', () => {
  const ACCOUNT_1 = '0x1111111111111111111111111111111111111111';
  const ACCOUNT_2 = '0x2222222222222222222222222222222222222222';
  const TOKEN_1 = '0x0000000000000000000000000000000000000001';
  const TOKEN_2 = '0x0000000000000000000000000000000000000002';
  const ACCOUNT_ID_1 = 'acc-1';
  const ACCOUNT_ID_2 = 'acc-2';
  const TOKEN_1_ASSET_ID = `eip155:1/erc20:${TOKEN_1}`;
  const TOKEN_2_ASSET_ID = `eip155:1/erc20:${TOKEN_2}`;

  const mockToken = {
    address: TOKEN_1,
    symbol: 'TOKEN1',
    decimals: 18,
    name: 'Token 1',
    image: undefined as string | undefined,
  };
  const mockToken2 = {
    address: TOKEN_2,
    symbol: 'TOKEN2',
    decimals: 18,
    name: 'Token 2',
    image: undefined as string | undefined,
  };

  const evmAccounts = {
    [ACCOUNT_ID_1]: {
      id: ACCOUNT_ID_1,
      address: ACCOUNT_1,
      type: 'eip155:eoa',
    },
    [ACCOUNT_ID_2]: {
      id: ACCOUNT_ID_2,
      address: ACCOUNT_2,
      type: 'eip155:eoa',
    },
  };

  const defaultAssetsController = {
    assetsInfo: {
      [TOKEN_1_ASSET_ID]: {
        type: 'erc20' as const,
        symbol: 'TOKEN1',
        name: 'Token 1',
        decimals: 18,
      },
      [TOKEN_2_ASSET_ID]: {
        type: 'erc20' as const,
        symbol: 'TOKEN2',
        name: 'Token 2',
        decimals: 18,
      },
    },
    assetsBalance: {
      [ACCOUNT_ID_1]: { [TOKEN_1_ASSET_ID]: { amount: '1' } },
      [ACCOUNT_ID_2]: { [TOKEN_2_ASSET_ID]: { amount: '1' } },
    },
    customAssets: {},
    assetPreferences: {
      [TOKEN_2_ASSET_ID]: { hidden: true },
    },
  };

  const networkController = {
    selectedNetworkClientId: 'mainnet',
    networkConfigurationsByChainId: {
      '0x1': {
        chainId: '0x1',
        nativeCurrency: 'ETH',
        rpcEndpoints: [{ networkClientId: 'mainnet' }],
        defaultRpcEndpointIndex: 0,
      },
    },
  };

  const createState = (
    assetsController: Record<string, unknown> = defaultAssetsController,
  ): RootState =>
    ({
      engine: {
        backgroundState: {
          AssetsController: assetsController,
          NetworkController: networkController,
          AccountsController: {
            internalAccounts: {
              selectedAccount: ACCOUNT_ID_1,
              accounts: evmAccounts,
            },
          },
        },
      },
    }) as unknown as RootState;

  const mockRootState = createState();
  const emptyTokensState = createState({
    ...defaultAssetsController,
    assetsBalance: {},
    customAssets: {},
  });
  const noIgnoredTokensState = createState({
    ...defaultAssetsController,
    assetPreferences: {},
  });

  describe('selectTokens', () => {
    it('returns tokens from TokensController state', () => {
      expect(selectTokens(mockRootState)).toStrictEqual([mockToken]);
    });

    it('returns an empty array if no tokens are present', () => {
      expect(selectTokens(emptyTokensState)).toStrictEqual([]);
    });

    it('returns tokens from TokensController state if portfolio view is enabled', () => {
      expect(selectTokens(mockRootState)).toStrictEqual([mockToken]);
    });
  });

  describe('selectTokensByAddress', () => {
    it('returns tokens mapped by address', () => {
      expect(selectTokensByAddress(mockRootState)).toStrictEqual({
        [TOKEN_1]: mockToken,
      });
    });

    it('handles an empty tokens array', () => {
      expect(selectTokensByAddress(emptyTokensState)).toStrictEqual({});
    });

    it('returns a stable reference when called twice with the same state', () => {
      selectTokens.clearCache();
      selectTokensByAddress.clearCache();

      const first = selectTokensByAddress(mockRootState);
      const second = selectTokensByAddress(mockRootState);

      expect(first).toBe(second);
    });

    it('returns a stable reference across equal-content states', () => {
      selectTokens.clearCache();
      selectTokensByAddress.clearCache();

      const equalContentState = createState();

      const first = selectTokensByAddress(mockRootState);
      const second = selectTokensByAddress(equalContentState);

      expect(first).toBe(second);
      expect(first).toStrictEqual({
        [TOKEN_1]: mockToken,
      });
    });

    it('returns a stable empty-object reference for empty tokens', () => {
      selectTokens.clearCache();
      selectTokensByAddress.clearCache();

      const first = selectTokensByAddress(emptyTokensState);
      const second = selectTokensByAddress(
        createState({
          ...defaultAssetsController,
          assetsBalance: {},
          customAssets: {},
        }),
      );

      expect(first).toBe(second);
      expect(first).toStrictEqual({});
    });
  });

  describe('selectTokensLength', () => {
    it('returns the number of tokens', () => {
      expect(selectTokensLength(mockRootState)).toBe(1);
    });

    it('returns 0 if no tokens are present', () => {
      expect(selectTokensLength(emptyTokensState)).toBe(0);
    });
  });

  describe('selectIgnoreTokens', () => {
    it('returns ignored tokens', () => {
      expect(selectIgnoreTokens(mockRootState)).toStrictEqual([TOKEN_2]);
    });

    it('returns undefined if ignored tokens are not set', () => {
      expect(selectIgnoreTokens(noIgnoredTokensState)).toBeUndefined();
    });
  });

  describe('selectAllTokensFlat', () => {
    it('returns all tokens as a flat array', () => {
      expect(selectAllTokensFlat(mockRootState)).toStrictEqual([
        mockToken,
        mockToken2,
      ]);
    });

    it('returns an empty array if no tokens are present', () => {
      expect(selectAllTokensFlat(emptyTokensState)).toStrictEqual([]);
    });

    it('returns a stable reference when called twice with the same state', () => {
      selectAllTokens.clearCache();
      selectAllTokensFlat.clearCache();

      const first = selectAllTokensFlat(mockRootState);
      const second = selectAllTokensFlat(mockRootState);

      expect(first).toBe(second);
    });

    it('returns a stable reference across equal-content states', () => {
      selectAllTokens.clearCache();
      selectAllTokensFlat.clearCache();

      const equalContentState = createState();

      const first = selectAllTokensFlat(mockRootState);
      const second = selectAllTokensFlat(equalContentState);

      expect(first).toBe(second);
      expect(first).toStrictEqual([mockToken, mockToken2]);
    });

    it('returns a stable empty-array reference for empty tokens', () => {
      selectAllTokens.clearCache();
      selectAllTokensFlat.clearCache();

      const first = selectAllTokensFlat(emptyTokensState);
      const second = selectAllTokensFlat(
        createState({
          ...defaultAssetsController,
          assetsBalance: {},
          customAssets: {},
        }),
      );

      expect(first).toBe(second);
      expect(first).toStrictEqual([]);
    });
  });

  describe('selectTokensByChainIdAndAddress', () => {
    it('returns mapped tokens for given chain ID', () => {
      expect(
        selectTokensByChainIdAndAddress(mockRootState, '0x1'),
      ).toStrictEqual({
        [TOKEN_1]: mockToken,
      });
    });

    it('returns empty object if no tokens exist for chain ID', () => {
      expect(
        selectTokensByChainIdAndAddress(mockRootState, '0x2'),
      ).toStrictEqual({});
    });
  });

  describe('selectTokensByChainIdAndWalletAddress', () => {
    it('returns tokens for the given chain and explicit wallet address', () => {
      expect(
        selectTokensByChainIdAndWalletAddress(mockRootState, '0x1', ACCOUNT_2),
      ).toStrictEqual({ [TOKEN_2]: mockToken2 });
    });

    it('returns empty object when wallet address has no tokens on that chain', () => {
      expect(
        selectTokensByChainIdAndWalletAddress(mockRootState, '0x2', ACCOUNT_1),
      ).toStrictEqual({});
    });

    it('returns empty object when wallet address is undefined', () => {
      expect(
        selectTokensByChainIdAndWalletAddress(mockRootState, '0x1', undefined),
      ).toStrictEqual({});
    });
  });

  describe('getChainIdsToPoll', () => {
    const mockNetworkConfigurations = {
      '0x1': { chainId: '0x1' } as unknown as NetworkConfiguration,
      '0x2': { chainId: '0x2' } as unknown as NetworkConfiguration,
    };

    it('returns only the chainIds included in PopularList', () => {
      const chainIds = getChainIdsToPoll.resultFunc(
        mockNetworkConfigurations,
        '0x1',
      );
      expect(chainIds).toStrictEqual(['0x1']);
    });
  });

  describe('selectSingleTokenByAddressAndChainId', () => {
    it('returns the token for the given address and chain ID', () => {
      const token = selectSingleTokenByAddressAndChainId(
        mockRootState,
        TOKEN_1,
        '0x1',
      );
      expect(token).toStrictEqual(mockToken);
    });

    it('returns undefined if no token exists for the given address and chain ID', () => {
      const token = selectSingleTokenByAddressAndChainId(
        mockRootState,
        '0x0000000000000000000000000000000000000003',
        '0x2',
      );
      expect(token).toBeUndefined();
    });

    it('returns token not from selected address', () => {
      const token = selectSingleTokenByAddressAndChainId(
        mockRootState,
        TOKEN_2,
        '0x1',
      );
      expect(token).toStrictEqual(mockToken2);
    });
  });
});
