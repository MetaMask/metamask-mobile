import { RootState } from '../reducers';
import {
  selectTokens,
  selectTokensByAddress,
  selectTokensLength,
  selectIgnoreTokens,
  selectAllTokensFlat,
  selectTokensByChainIdAndAddress,
  selectTokensByChainIdAndWalletAddress,
  getChainIdsToPoll,
  selectSingleTokenByAddressAndChainId,
} from './tokensController';
import { NetworkConfiguration } from '@metamask/network-controller';

describe('TokensController Selectors', () => {
  const mockToken = { address: '0xToken1', symbol: 'TOKEN1' };
  const mockToken2 = { address: '0xToken2', symbol: 'TOKEN2' };

  const mockTokensControllerState = {
    allTokens: {
      '0x1': {
        '0xAddress1': [mockToken],
        '0xAddress2': [mockToken2],
      },
    },
    allIgnoredTokens: {
      '0x1': {
        '0xAddress1': ['0xToken2'],
      },
    },
  };

  const mockRootState: RootState = {
    engine: {
      backgroundState: {
        TokensController: mockTokensControllerState,
        AccountsController: {
          internalAccounts: {
            selectedAccount: '0xAddress1',
            accounts: {
              '0xAddress1': {
                address: '0xAddress1',
              },
            },
          },
        },
      },
    },
  } as unknown as RootState;

  describe('selectTokens', () => {
    it('returns tokens from TokensController state', () => {
      expect(selectTokens(mockRootState)).toStrictEqual([mockToken]);
    });

    it('returns an empty array if no tokens are present', () => {
      const stateWithoutTokens = {
        ...mockRootState,
        engine: {
          backgroundState: {
            TokensController: {
              ...mockTokensControllerState,
              allTokens: {
                '0x1': {
                  '0xAddress1': [],
                },
              },
              tokens: [],
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: '0xAddress1',
                accounts: {
                  '0xAddress1': {
                    address: '0xAddress1',
                  },
                },
              },
            },
          },
        },
      } as unknown as RootState;

      expect(selectTokens(stateWithoutTokens)).toStrictEqual([]);
    });

    it('returns tokens from TokensController state if portfolio view is enabled', () => {
      expect(selectTokens(mockRootState)).toStrictEqual([mockToken]);
    });
  });

  describe('selectTokensByAddress', () => {
    it('returns tokens mapped by address', () => {
      expect(selectTokensByAddress(mockRootState)).toStrictEqual({
        '0xToken1': mockToken,
      });
    });

    it('handles an empty tokens array', () => {
      const stateWithoutTokens = {
        ...mockRootState,
        engine: {
          backgroundState: {
            TokensController: {
              ...mockTokensControllerState,
              allTokens: {
                '0x1': {
                  '0xAddress1': [],
                },
              },
              tokens: [],
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: '0xAddress1',
                accounts: {
                  '0xAddress1': {
                    address: '0xAddress1',
                  },
                },
              },
            },
          },
        },
      } as unknown as RootState;

      expect(selectTokensByAddress(stateWithoutTokens)).toStrictEqual({});
    });
  });

  describe('selectTokensLength', () => {
    it('returns the number of tokens', () => {
      expect(selectTokensLength(mockRootState)).toBe(1);
    });

    it('returns 0 if no tokens are present', () => {
      const stateWithoutTokens = {
        ...mockRootState,
        engine: {
          backgroundState: {
            TokensController: {
              ...mockTokensControllerState,
              tokens: [],
              allTokens: {
                '0x1': {
                  '0xAddress1': [],
                },
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: '0xAddress1',
                accounts: {
                  '0xAddress1': {
                    address: '0xAddress1',
                  },
                },
              },
            },
          },
        },
      } as unknown as RootState;

      expect(selectTokensLength(stateWithoutTokens)).toBe(0);
    });
  });

  describe('selectIgnoreTokens', () => {
    it('returns ignored tokens', () => {
      expect(selectIgnoreTokens(mockRootState)).toStrictEqual(['0xToken2']);
    });

    it('returns undefined if ignored tokens are not set', () => {
      const stateWithoutIgnoredTokens = {
        ...mockRootState,
        engine: {
          backgroundState: {
            TokensController: {
              ...mockTokensControllerState,
              allIgnoredTokens: undefined,
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: '0xAddress1',
                accounts: {
                  '0xAddress1': {
                    address: '0xAddress1',
                  },
                },
              },
            },
          },
        },
      } as unknown as RootState;

      expect(selectIgnoreTokens(stateWithoutIgnoredTokens)).toBeUndefined();
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
      const stateWithoutAllTokens = {
        ...mockRootState,
        engine: {
          backgroundState: {
            TokensController: {
              ...mockTokensControllerState,
              allTokens: {},
            },
          },
        },
      } as unknown as RootState;

      expect(selectAllTokensFlat(stateWithoutAllTokens)).toStrictEqual([]);
    });
  });

  describe('selectTokensByChainIdAndAddress', () => {
    it('returns mapped tokens for given chain ID', () => {
      expect(
        selectTokensByChainIdAndAddress(mockRootState, '0x1'),
      ).toStrictEqual({
        '0xToken1': mockToken,
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
        selectTokensByChainIdAndWalletAddress(
          mockRootState,
          '0x1',
          '0xAddress2',
        ),
      ).toStrictEqual({ '0xToken2': mockToken2 });
    });

    it('returns empty object when wallet address has no tokens on that chain', () => {
      expect(
        selectTokensByChainIdAndWalletAddress(
          mockRootState,
          '0x2',
          '0xAddress1',
        ),
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
        '0xToken1',
        '0x1',
      );
      expect(token).toStrictEqual(mockToken);
    });

    it('returns undefined if no token exists for the given address and chain ID', () => {
      const token = selectSingleTokenByAddressAndChainId(
        mockRootState,
        '0xToken3',
        '0x2',
      );
      expect(token).toBeUndefined();
    });

    it('returns token not from selected address', () => {
      const token = selectSingleTokenByAddressAndChainId(
        mockRootState,
        '0xToken2',
        '0x1',
      );
      expect(token).toStrictEqual(mockToken2);
    });
  });
});
