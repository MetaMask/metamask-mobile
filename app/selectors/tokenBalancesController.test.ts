import { Hex } from '@metamask/utils';
import { RootState } from '../reducers';
import {
  selectContractBalances,
  selectAllTokenBalances,
  selectTokensBalances,
} from './tokenBalancesController';
import { TokenBalancesControllerState } from '@metamask/assets-controllers';

describe('TokenBalancesController Selectors', () => {
  const mockTokenBalancesControllerState: TokenBalancesControllerState = {
    tokenBalances: {
      '0xAccount1': {
        '0x1': {
          '0xToken1': '0x100',
          '0xToken2': '0x200',
        },
        '0x5': {
          '0xToken3': '0x300',
        },
      },
      '0xAccount2': {
        '0x1': {
          '0xToken1': '0x400',
        },
      },
    },
  };

  const mockRootState: RootState = {
    engine: {
      backgroundState: {
        TokenBalancesController: mockTokenBalancesControllerState,
        NetworkController: {
          providerConfig: {
            chainId: '0x1',
          },
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'account1',
            accounts: {
              account1: {
                id: 'account1',
                address: '0xAccount1',
              },
            },
          },
        },
      },
    },
  } as unknown as RootState;

  describe('selectContractBalances', () => {
    it('returns token balances for the selected account and chain ID', () => {
      const selectedAccount: Hex = '0xAccount1';
      const chainId: Hex = '0x1';

      const result = selectContractBalances.resultFunc(
        mockTokenBalancesControllerState,
        selectedAccount,
        chainId,
      );

      expect(result).toEqual({
        '0xToken1': '0x100',
        '0xToken2': '0x200',
      });
    });

    it('returns an empty object if no balances exist for the selected account', () => {
      const selectedAccount: Hex = '0xUnknownAccount';
      const chainId: Hex = '0x1';

      const result = selectContractBalances.resultFunc(
        mockTokenBalancesControllerState,
        selectedAccount,
        chainId,
      );

      expect(result).toEqual({});
    });

    it('returns an empty object if no balances exist for the selected chain ID', () => {
      const selectedAccount: Hex = '0xAccount1';
      const chainId: Hex = '0xUnknownChain';

      const result = selectContractBalances.resultFunc(
        mockTokenBalancesControllerState,
        selectedAccount,
        chainId,
      );

      expect(result).toEqual({});
    });

    it('returns an empty object if the selected account is undefined', () => {
      const selectedAccount: Hex | string = '';
      const chainId: Hex = '0x1';

      const result = selectContractBalances.resultFunc(
        mockTokenBalancesControllerState,
        selectedAccount as `0x${string}`,
        chainId,
      );

      expect(result).toEqual({});
    });
  });

  describe('selectAllTokenBalances', () => {
    it('returns all token balances', () => {
      const result = selectAllTokenBalances(mockRootState);
      expect(result).toEqual(mockTokenBalancesControllerState.tokenBalances);
    });

    it('returns an empty object if tokenBalances is not defined', () => {
      const stateWithoutTokenBalances = {
        ...mockRootState,
        engine: {
          backgroundState: {
            TokenBalancesController: {
              tokenBalances: undefined,
            },
          },
        },
      } as unknown as RootState;

      const result = selectAllTokenBalances(stateWithoutTokenBalances);
      expect(result).toEqual(undefined);
    });
  });

  describe('selectTokensBalances', () => {
    it('returns the same as selectAllTokenBalances', () => {
      const result = selectTokensBalances(mockRootState);
      expect(result).toEqual(mockTokenBalancesControllerState.tokenBalances);
    });
  });
});
