import type { RootState } from '../../reducers';

// Mock only the portfolio change calculators from assets-controllers
jest.mock('@metamask/assets-controllers', () => {
  const actual = jest.requireActual('@metamask/assets-controllers');
  return {
    ...actual,
    calculateAggregatedChangeForAllWallets: jest
      .fn()
      .mockImplementation(() => ({
        amountChangeInUserCurrency: 12.34,
        percentChange: 5.67,
        userCurrency: 'usd',
      })),
    calculateAggregatedChangeForGroup: jest.fn().mockImplementation(() => ({
      amountChangeInUserCurrency: 4.2,
      percentChange: 2.1,
      userCurrency: 'usd',
    })),
  };
});

import {
  selectPortfolioChangeForAllWallets,
  selectPortfolioPercentChange,
  selectPortfolioChangeByAccountGroup,
  selectPortfolioPercentChangeByAccountGroup,
  selectSelectedGroupAggregatedBalance,
  selectAggregatedBalanceByAccountGroup,
} from './balances';

// Minimal state with required controller keys present
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
      TokenBalancesController: { tokenBalances: {} },
      TokenRatesController: { marketData: {} },
      MultichainAssetsRatesController: { conversionRates: {} },
      MultichainBalancesController: { balances: {} },
      TokensController: { allTokens: {} },
      CurrencyRateController: { currentCurrency: 'usd', currencyRates: {} },
      NetworkEnablementController: { enabledNetworkMap: {} },
    },
  },
  ...overrides,
});

describe('assets portfolio change selectors (mobile)', () => {
  it('selectPortfolioChangeForAllWallets returns mocked calculator result', () => {
    const state = makeState() as unknown as RootState;
    const selector = selectPortfolioChangeForAllWallets('1d');
    const result = selector(state);
    expect(result).toEqual({
      amountChangeInUserCurrency: 12.34,
      percentChange: 5.67,
      userCurrency: 'usd',
    });
  });

  it('selectPortfolioPercentChange returns percent from all-wallet change', () => {
    const state = makeState() as unknown as RootState;
    const selector = selectPortfolioPercentChange('1d');
    expect(selector(state)).toBe(5.67);
  });

  it('selectPortfolioChangeByAccountGroup returns mocked group calculator result', () => {
    const state = makeState() as unknown as RootState;
    const selector = selectPortfolioChangeByAccountGroup(
      'wallet-1/group-1',
      '1d',
    );
    const result = selector(state);
    expect(result).toEqual({
      amountChangeInUserCurrency: 4.2,
      percentChange: 2.1,
      userCurrency: 'usd',
    });
  });

  it('selectPortfolioPercentChangeByAccountGroup returns percent from group change', () => {
    const state = makeState() as unknown as RootState;
    const selector = selectPortfolioPercentChangeByAccountGroup(
      'wallet-1/group-1',
      '1d',
    );
    expect(selector(state)).toBe(2.1);
  });

  it('selectSelectedGroupAggregatedBalance returns null when no selected group', () => {
    const state = makeState() as unknown as RootState;
    expect(selectSelectedGroupAggregatedBalance(state)).toBeNull();
  });

  it('selectAggregatedBalanceByAccountGroup returns zeroed fallback for unknown group', () => {
    const state = makeState() as unknown as RootState;
    const selector = selectAggregatedBalanceByAccountGroup('wallet-1/group-1');
    const result = selector(state);
    expect(result).toEqual({
      walletId: 'wallet-1',
      groupId: 'wallet-1/group-1',
      totalBalanceInUserCurrency: 0,
      userCurrency: 'usd',
    });
  });
});
