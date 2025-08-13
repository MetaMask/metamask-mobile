import { selectBalanceForAllWallets, selectBalanceByWallet } from './balances';
import type { RootState } from '../../reducers';

// Build a minimal background state shape for the aggregation function
const makeState = (overrides: Record<string, unknown> = {}) => ({
  engine: {
    backgroundState: {
      AccountTreeController: {
        accountTree: {
          wallets: {},
          selectedAccountGroup: '',
        },
      },
      AccountsController: {
        internalAccounts: {
          accounts: {},
          selectedAccount: '',
        },
      },
      TokenBalancesController: {
        tokenBalances: {},
      },
      TokenRatesController: {
        marketData: {},
      },
      MultichainAssetsRatesController: {
        conversionRates: {},
      },
      MultichainBalancesController: {
        balances: {},
      },
      TokensController: {
        allTokens: {},
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {},
      },
      NetworkEnablementController: {
        enabledNetworkMap: {},
      },
    },
  },
  ...overrides,
});

describe('assets balances selectors (mobile)', () => {
  it('returns totals with empty structures', () => {
    const state = makeState() as unknown as RootState;
    const result = selectBalanceForAllWallets(state);
    expect(result.totalBalanceInUserCurrency).toBe(0);
    expect(result.wallets).toEqual({});
    expect(result.userCurrency).toBe('usd');
  });

  it('selectBalanceByWallet fallback when wallet missing', () => {
    const state = makeState() as unknown as RootState;
    const selectWallet = selectBalanceByWallet('wallet-1');
    const wallet = selectWallet(state);
    expect(wallet).toEqual({
      walletId: 'wallet-1',
      totalBalanceInUserCurrency: 0,
      userCurrency: 'usd',
      groups: {},
    });
  });
});
