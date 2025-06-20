import { renderHook } from '@testing-library/react-hooks';
import { useWalletBalances } from './useWalletBalances';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import useMultichainBalancesForAllAccounts from '../../../../hooks/useMultichainBalances/useMultichainBalancesForAllAccounts';
import { useSelector } from 'react-redux';

jest.mock(
  '../../../../hooks/useMultichainBalances/useMultichainBalancesForAllAccounts',
);
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('useWalletBalances', () => {
  const account1 = createMockInternalAccount('0x1', 'Account 1');
  const account2 = createMockInternalAccount('0x2', 'Account 2');
  const account3 = createMockInternalAccount('0x3', 'Account 3');

  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockImplementation(() => 'USD');
  });

  it('returns the correct formatted total and filters balances for provided accounts', () => {
    (useMultichainBalancesForAllAccounts as jest.Mock).mockReturnValue({
      multichainBalancesForAllAccounts: {
        [account1.id]: {
          totalFiatBalance: 100,
          isLoadingAccount: false,
          displayBalance: '$100.00',
          displayCurrency: 'USD',
        },
        [account2.id]: {
          totalFiatBalance: 200,
          isLoadingAccount: false,
          displayBalance: '$200.00',
          displayCurrency: 'USD',
        },
        [account3.id]: {
          totalFiatBalance: 300,
          isLoadingAccount: false,
          displayBalance: '$300.00',
          displayCurrency: 'USD',
        },
      },
    });
    const { result } = renderHook(() =>
      useWalletBalances([account1, account2]),
    );
    expect(result.current.formattedWalletTotalBalance).toBe('$300.00');
    expect(
      Object.keys(result.current.multichainBalancesForAllAccounts),
    ).toContain(account1.id);
    expect(
      Object.keys(result.current.multichainBalancesForAllAccounts),
    ).toContain(account2.id);
  });

  it('returns undefined total if any account is loading', () => {
    (useMultichainBalancesForAllAccounts as jest.Mock).mockReturnValue({
      multichainBalancesForAllAccounts: {
        [account1.id]: {
          totalFiatBalance: 100,
          isLoadingAccount: true,
          displayBalance: '$100.00',
        },
        [account2.id]: {
          totalFiatBalance: 200,
          isLoadingAccount: false,
          displayBalance: '$200.00',
        },
      },
    });
    const { result } = renderHook(() =>
      useWalletBalances([account1, account2]),
    );
    expect(result.current.formattedWalletTotalBalance).toBeUndefined();
  });

  it('returns undefined formatted total if no balances are present for the accounts', () => {
    (useMultichainBalancesForAllAccounts as jest.Mock).mockReturnValue({
      multichainBalancesForAllAccounts: {},
    });
    const { result } = renderHook(() =>
      useWalletBalances([account1, account2]),
    );
    expect(result.current.formattedWalletTotalBalance).toBeUndefined();
  });

  it('ignores accounts not present in the balances map', () => {
    (useMultichainBalancesForAllAccounts as jest.Mock).mockReturnValue({
      multichainBalancesForAllAccounts: {
        [account1.id]: {
          totalFiatBalance: 100,
          isLoadingAccount: false,
          displayBalance: '$100.00',
        },
      },
    });
    const { result } = renderHook(() =>
      useWalletBalances([account1, account2]),
    );
    expect(result.current.formattedWalletTotalBalance).toBeUndefined();
  });

  it('formats different currencies correctly', () => {
    (useMultichainBalancesForAllAccounts as jest.Mock).mockReturnValue({
      multichainBalancesForAllAccounts: {
        [account1.id]: {
          totalFiatBalance: 100,
          isLoadingAccount: false,
          displayBalance: '€100.00',
          displayCurrency: 'EUR',
        },
        [account2.id]: {
          totalFiatBalance: 200,
          isLoadingAccount: false,
          displayBalance: '€200.00',
          displayCurrency: 'EUR',
        },
      },
    });
    const { result } = renderHook(() =>
      useWalletBalances([account1, account2]),
    );
    expect(result.current.formattedWalletTotalBalance).toBe('€300.00');
  });

  it('formats small balances with threshold correctly', () => {
    (useMultichainBalancesForAllAccounts as jest.Mock).mockReturnValue({
      multichainBalancesForAllAccounts: {
        [account1.id]: {
          totalFiatBalance: 0.005,
          isLoadingAccount: false,
          displayBalance: '$0.005',
          displayCurrency: 'USD',
        },
        [account2.id]: {
          totalFiatBalance: 0.003,
          isLoadingAccount: false,
          displayBalance: '$0.003',
          displayCurrency: 'USD',
        },
      },
    });
    const { result } = renderHook(() =>
      useWalletBalances([account1, account2]),
    );
    expect(result.current.formattedWalletTotalBalance).toBe('<$0.01');
  });

  it('formats balances at threshold correctly', () => {
    (useMultichainBalancesForAllAccounts as jest.Mock).mockReturnValue({
      multichainBalancesForAllAccounts: {
        [account1.id]: {
          totalFiatBalance: 0.01,
          isLoadingAccount: false,
          displayBalance: '$0.01',
          displayCurrency: 'USD',
        },
      },
    });
    const { result } = renderHook(() => useWalletBalances([account1]));
    expect(result.current.formattedWalletTotalBalance).toBe('$0.01');
  });

  it('formats zero balance correctly', () => {
    (useMultichainBalancesForAllAccounts as jest.Mock).mockReturnValue({
      multichainBalancesForAllAccounts: {
        [account1.id]: {
          totalFiatBalance: 0,
          isLoadingAccount: false,
          displayBalance: '$0.00',
          displayCurrency: 'USD',
        },
      },
    });
    const { result } = renderHook(() => useWalletBalances([account1]));
    expect(result.current.formattedWalletTotalBalance).toBe('$0.00');
  });
});
