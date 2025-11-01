import type { RootState } from '../../reducers';

// Mock the core calculation functions from assets-controllers BEFORE importing
jest.mock('@metamask/assets-controllers', () => {
  const actual = jest.requireActual('@metamask/assets-controllers');
  return {
    ...actual,
    calculateBalanceForAllWallets: jest.fn().mockReturnValue({
      userCurrency: 'usd',
      wallets: {
        'wallet-1': {
          totalBalanceInUserCurrency: 1000,
          groups: {
            'wallet-1/group-1': {
              walletId: 'wallet-1',
              groupId: 'wallet-1/group-1',
              totalBalanceInUserCurrency: 500,
              userCurrency: 'usd',
            },
            'wallet-1/group-2': {
              walletId: 'wallet-1',
              groupId: 'wallet-1/group-2',
              totalBalanceInUserCurrency: 500,
              userCurrency: 'usd',
            },
          },
        },
        'wallet-2': {
          totalBalanceInUserCurrency: 2000,
          groups: {
            'wallet-2/group-1': {
              walletId: 'wallet-2',
              groupId: 'wallet-2/group-1',
              totalBalanceInUserCurrency: 2000,
              userCurrency: 'usd',
            },
          },
        },
      },
    }),
    calculateBalanceChangeForAllWallets: jest
      .fn()
      .mockImplementation((...args) => {
        const period = args[args.length - 1]; // Last argument is the period
        if (period === '1d') {
          return {
            period: '1d',
            currentTotalInUserCurrency: 1000,
            previousTotalInUserCurrency: 950,
            amountChangeInUserCurrency: 50,
            percentChange: 5.67,
            userCurrency: 'usd',
          };
        }
        if (period === '7d') {
          return {
            period: '7d',
            currentTotalInUserCurrency: 1000,
            previousTotalInUserCurrency: 920,
            amountChangeInUserCurrency: 80,
            percentChange: 8.9,
            userCurrency: 'usd',
          };
        }
        return {
          period: '30d',
          currentTotalInUserCurrency: 1000,
          previousTotalInUserCurrency: 890,
          amountChangeInUserCurrency: 110,
          percentChange: 12.34,
          userCurrency: 'usd',
        };
      }),
    calculateBalanceChangeForAccountGroup: jest
      .fn()
      .mockImplementation((...args) => {
        const groupId = args[args.length - 2]; // Second to last argument is the groupId
        if (typeof groupId === 'string' && groupId.includes('wallet-1')) {
          return {
            period: '1d',
            currentTotalInUserCurrency: 500,
            previousTotalInUserCurrency: 490,
            amountChangeInUserCurrency: 10,
            percentChange: 2.1,
            userCurrency: 'usd',
          };
        }
        return {
          period: '1d',
          currentTotalInUserCurrency: 2000,
          previousTotalInUserCurrency: 1920,
          amountChangeInUserCurrency: 80,
          percentChange: 4.2,
          userCurrency: 'usd',
        };
      }),
  };
});

// Now import the selectors
import {
  selectBalanceForAllWallets,
  selectBalanceByWallet,
  selectBalanceByAccountGroup,
  selectBalanceChangeForAllWallets,
  selectBalanceChangeByAccountGroup,
  selectBalancePercentChangeByAccountGroup,
  selectBalanceBySelectedAccountGroup,
  selectBalanceChangeBySelectedAccountGroup,
} from './balances';

// Enhanced state factory with realistic data
const makeState = (overrides: Record<string, unknown> = {}) => ({
  engine: {
    backgroundState: {
      AccountTreeController: {
        accountTree: {
          wallets: {
            'wallet-1': {
              id: 'wallet-1',
              groups: {
                'wallet-1/group-1': { accounts: ['acc-1'] },
                'wallet-1/group-2': { accounts: ['acc-2'] },
              },
            },
            'wallet-2': {
              id: 'wallet-2',
              groups: {
                'wallet-2/group-1': { accounts: ['acc-3'] },
              },
            },
          },
          selectedAccountGroup: 'wallet-1/group-1',
        },
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            'acc-1': { id: 'acc-1', address: '0xabc' },
            'acc-2': { id: 'acc-2', address: '0xdef' },
            'acc-3': { id: 'acc-3', address: '0xghi' },
          },
          selectedAccount: 'acc-1',
        },
      },
      TokenBalancesController: {
        tokenBalances: {
          '0x1': {
            '0xabc': { balance: '1000000000000000000' },
            '0xdef': { balance: '2000000000000000000' },
          },
        },
      },
      TokenRatesController: {
        marketData: {
          '0x1': {
            '0xabc': { price: 2000 },
            '0xdef': { price: 0.5 },
          },
        },
      },
      MultichainAssetsRatesController: {
        conversionRates: {
          '0x1': { ETH: 1 },
          '0x137': { MATIC: 0.5 },
        },
      },
      MultichainBalancesController: {
        balances: {
          '0x1': {
            '0xabc': { balance: '1000000000000000000' },
            '0xdef': { balance: '2000000000000000000' },
          },
        },
      },
      TokensController: {
        allTokens: {
          '0x1': {
            '0xabc': { symbol: 'ETH', decimals: 18 },
            '0xdef': { symbol: 'BAT', decimals: 18 },
          },
        },
        allIgnoredTokens: {},
        allDetectedTokens: {},
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: { conversionRate: 2000 },
          BAT: { conversionRate: 0.5 },
        },
      },
      NetworkEnablementController: {
        enabledNetworkMap: {
          '0x1': { '0x1': true },
          '0x137': { '0x137': true },
        },
      },
    },
  },
  ...overrides,
});

describe('assets balance and balance change selectors (mobile)', () => {
  describe('selectBalanceForAllWallets', () => {
    it('returns calculated balance for all wallets', () => {
      const state = makeState() as unknown as RootState;
      const result = selectBalanceForAllWallets(state);

      expect(result.userCurrency).toBe('usd');
      expect(result.wallets).toHaveProperty('wallet-1');
      expect(result.wallets).toHaveProperty('wallet-2');
      expect(result.wallets['wallet-1'].totalBalanceInUserCurrency).toBe(1000);
      expect(result.wallets['wallet-2'].totalBalanceInUserCurrency).toBe(2000);
    });

    it('handles empty state gracefully', () => {
      const state = makeState({
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: { wallets: {}, selectedAccountGroup: '' },
            },
            AccountsController: {
              internalAccounts: { accounts: {}, selectedAccount: '' },
            },
            TokenBalancesController: { tokenBalances: {} },
            TokenRatesController: { marketData: {} },
            MultichainAssetsRatesController: { conversionRates: {} },
            MultichainBalancesController: { balances: {} },
            TokensController: {
              allTokens: {},
              allIgnoredTokens: {},
              allDetectedTokens: {},
            },
            CurrencyRateController: {
              currentCurrency: 'usd',
              currencyRates: {},
            },
            NetworkEnablementController: { enabledNetworkMap: {} },
          },
        },
      }) as unknown as RootState;

      const result = selectBalanceForAllWallets(state);
      expect(result).toBeDefined();
    });
  });

  describe('selectBalanceByWallet', () => {
    it('returns wallet balance when wallet exists', () => {
      const state = makeState() as unknown as RootState;
      const selector = selectBalanceByWallet('wallet-1');
      const result = selector(state);

      expect(result.walletId).toBe('wallet-1');
      expect(result.totalBalanceInUserCurrency).toBe(1000);
      expect(result.userCurrency).toBe('usd');
      expect(result.groups).toHaveProperty('wallet-1/group-1');
      expect(result.groups).toHaveProperty('wallet-1/group-2');
    });

    it('returns zeroed fallback when wallet does not exist', () => {
      const state = makeState() as unknown as RootState;
      const selector = selectBalanceByWallet('wallet-999');
      const result = selector(state);

      expect(result.walletId).toBe('wallet-999');
      expect(result.totalBalanceInUserCurrency).toBe(0);
      expect(result.userCurrency).toBe('usd');
      expect(result.groups).toEqual({});
    });
  });

  describe('selectBalanceByAccountGroup', () => {
    it('returns group balance when group exists', () => {
      const state = makeState() as unknown as RootState;
      const selector = selectBalanceByAccountGroup('wallet-1/group-1');
      const result = selector(state);

      expect(result).toEqual({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 500,
        userCurrency: 'usd',
      });
    });

    it('returns zeroed fallback for unknown group', () => {
      const state = makeState() as unknown as RootState;
      const selector = selectBalanceByAccountGroup('wallet-1/group-999');
      const result = selector(state);

      expect(result).toEqual({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-999',
        totalBalanceInUserCurrency: 0,
        userCurrency: 'usd',
      });
    });
  });

  describe('selectBalanceChangeForAllWallets', () => {
    it('returns 1d change when period is 1d', () => {
      const state = makeState() as unknown as RootState;
      const selector = selectBalanceChangeForAllWallets('1d');
      const result = selector(state);

      expect(result).toEqual({
        period: '1d',
        currentTotalInUserCurrency: 1000,
        previousTotalInUserCurrency: 950,
        amountChangeInUserCurrency: 50,
        percentChange: 5.67,
        userCurrency: 'usd',
      });
    });

    it('returns 7d change when period is 7d', () => {
      const state = makeState() as unknown as RootState;
      const selector = selectBalanceChangeForAllWallets('7d');
      const result = selector(state);

      expect(result).toEqual({
        period: '7d',
        currentTotalInUserCurrency: 1000,
        previousTotalInUserCurrency: 920,
        amountChangeInUserCurrency: 80,
        percentChange: 8.9,
        userCurrency: 'usd',
      });
    });

    it('returns 30d change when period is 30d', () => {
      const state = makeState() as unknown as RootState;
      const selector = selectBalanceChangeForAllWallets('30d');
      const result = selector(state);

      expect(result).toEqual({
        period: '30d',
        currentTotalInUserCurrency: 1000,
        previousTotalInUserCurrency: 890,
        amountChangeInUserCurrency: 110,
        percentChange: 12.34,
        userCurrency: 'usd',
      });
    });
  });
  describe('selectBalanceChangeByAccountGroup', () => {
    it('returns group change for wallet-1 group', () => {
      const state = makeState() as unknown as RootState;
      const selector = selectBalanceChangeByAccountGroup(
        'wallet-1/group-1',
        '1d',
      );
      const result = selector(state);

      expect(result).toEqual({
        period: '1d',
        currentTotalInUserCurrency: 500,
        previousTotalInUserCurrency: 490,
        amountChangeInUserCurrency: 10,
        percentChange: 2.1,
        userCurrency: 'usd',
      });
    });

    it('returns group change for wallet-2 group', () => {
      const state = makeState() as unknown as RootState;
      const selector = selectBalanceChangeByAccountGroup(
        'wallet-2/group-1',
        '1d',
      );
      const result = selector(state);

      expect(result).toEqual({
        period: '1d',
        currentTotalInUserCurrency: 2000,
        previousTotalInUserCurrency: 1920,
        amountChangeInUserCurrency: 80,
        percentChange: 4.2,
        userCurrency: 'usd',
      });
    });
  });

  describe('selectBalancePercentChangeByAccountGroup', () => {
    it('returns percent from group change for wallet-1', () => {
      const state = makeState() as unknown as RootState;
      const selector = selectBalancePercentChangeByAccountGroup(
        'wallet-1/group-1',
        '1d',
      );
      expect(selector(state)).toBe(2.1);
    });

    it('returns percent from group change for wallet-2', () => {
      const state = makeState() as unknown as RootState;
      const selector = selectBalancePercentChangeByAccountGroup(
        'wallet-2/group-1',
        '1d',
      );
      expect(selector(state)).toBe(4.2);
    });
  });

  describe('selectBalanceBySelectedAccountGroup', () => {
    it('returns selected group balance when group exists', () => {
      const state = makeState() as unknown as RootState;
      const result = selectBalanceBySelectedAccountGroup(state);

      expect(result).toEqual({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 500,
        userCurrency: 'usd',
      });
    });

    it('returns zeroed fallback when selected group does not exist', () => {
      const state = makeState() as unknown as RootState;
      state.engine.backgroundState.AccountTreeController.accountTree.selectedAccountGroup =
        'keyring:wallet-1/group-999';

      const result = selectBalanceBySelectedAccountGroup(state);
      expect(result).toEqual({
        walletId: 'keyring:wallet-1',
        groupId: 'keyring:wallet-1/group-999',
        totalBalanceInUserCurrency: 0,
        userCurrency: 'usd',
      });
    });

    it('returns null when no selected account group', () => {
      const state = makeState() as unknown as RootState;
      state.engine.backgroundState.AccountTreeController.accountTree.selectedAccountGroup =
        '';

      const result = selectBalanceBySelectedAccountGroup(state);
      expect(result).toBeNull();
    });
  });

  describe('selectBalanceChangeBySelectedAccountGroup', () => {
    it('returns change for selected wallet-1 group (1d)', () => {
      const state = makeState() as unknown as RootState;
      const selector = selectBalanceChangeBySelectedAccountGroup('1d');
      const result = selector(state);

      expect(result).toEqual({
        period: '1d',
        currentTotalInUserCurrency: 500,
        previousTotalInUserCurrency: 490,
        amountChangeInUserCurrency: 10,
        percentChange: 2.1,
        userCurrency: 'usd',
      });
    });

    it('returns change for selected wallet-2 group (1d)', () => {
      const state = makeState() as unknown as RootState;
      state.engine.backgroundState.AccountTreeController.accountTree.selectedAccountGroup =
        'keyring:wallet-2/group-1';

      const selector = selectBalanceChangeBySelectedAccountGroup('1d');
      const result = selector(state);

      expect(result).toEqual({
        period: '1d',
        currentTotalInUserCurrency: 2000,
        previousTotalInUserCurrency: 1920,
        amountChangeInUserCurrency: 80,
        percentChange: 4.2,
        userCurrency: 'usd',
      });
    });

    it('returns null when no selected account group', () => {
      const state = makeState() as unknown as RootState;
      state.engine.backgroundState.AccountTreeController.accountTree.selectedAccountGroup =
        '';

      const selector = selectBalanceChangeBySelectedAccountGroup('1d');
      expect(selector(state)).toBeNull();
    });
  });
});
