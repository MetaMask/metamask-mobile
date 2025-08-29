import { renderHook } from '@testing-library/react-hooks';
import { useWalletBalances } from './useWalletBalances';
import { useSelector } from 'react-redux';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('useWalletBalances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the correct formatted total and filters balances for provided accounts', () => {
    (useSelector as jest.Mock)
      .mockReturnValueOnce({
        // selectBalanceByWallet
        walletId: 'wallet-1',
        totalBalanceInUserCurrency: 300,
        userCurrency: 'USD',
        groups: {
          'wallet-1/group-1': {
            walletId: 'wallet-1',
            groupId: 'wallet-1/group-1',
            totalBalanceInUserCurrency: 100,
            userCurrency: 'USD',
          },
          'wallet-1/group-2': {
            walletId: 'wallet-1',
            groupId: 'wallet-1/group-2',
            totalBalanceInUserCurrency: 200,
            userCurrency: 'USD',
          },
        },
      })
      .mockReturnValueOnce('USD'); // selectCurrentCurrency

    const { result } = renderHook(() => useWalletBalances('wallet-1'));
    expect(result.current.formattedWalletTotalBalance).toBe('$300.00');
    expect(
      Object.keys(result.current.multichainBalancesForAllAccounts),
    ).toContain('wallet-1/group-1');
    expect(
      Object.keys(result.current.multichainBalancesForAllAccounts),
    ).toContain('wallet-1/group-2');
  });

  it('returns undefined total if totalBalance is not available', () => {
    (useSelector as jest.Mock)
      .mockReturnValueOnce({
        // selectBalanceByWallet
        walletId: 'wallet-1',
        totalBalanceInUserCurrency: undefined,
        userCurrency: 'USD',
        groups: {
          'wallet-1/group-1': {
            walletId: 'wallet-1',
            groupId: 'wallet-1/group-1',
            totalBalanceInUserCurrency: undefined,
            userCurrency: 'USD',
          },
        },
      })
      .mockReturnValueOnce('USD'); // selectCurrentCurrency

    const { result } = renderHook(() => useWalletBalances('wallet-1'));
    expect(result.current.formattedWalletTotalBalance).toBeUndefined();
  });

  it('formats different currencies correctly', () => {
    (useSelector as jest.Mock)
      .mockReturnValueOnce({
        // selectBalanceByWallet
        walletId: 'wallet-1',
        totalBalanceInUserCurrency: 300,
        userCurrency: 'EUR',
        groups: {
          'wallet-1/group-1': {
            walletId: 'wallet-1',
            groupId: 'wallet-1/group-1',
            totalBalanceInUserCurrency: 100,
            userCurrency: 'EUR',
          },
          'wallet-1/group-2': {
            walletId: 'wallet-1',
            groupId: 'wallet-1/group-2',
            totalBalanceInUserCurrency: 200,
            userCurrency: 'EUR',
          },
        },
      })
      .mockReturnValueOnce('EUR'); // selectCurrentCurrency

    const { result } = renderHook(() => useWalletBalances('wallet-1'));
    expect(result.current.formattedWalletTotalBalance).toBe('€300.00');
  });

  it('formats small balances with threshold correctly', () => {
    (useSelector as jest.Mock)
      .mockReturnValueOnce({
        // selectBalanceByWallet
        walletId: 'wallet-1',
        totalBalanceInUserCurrency: 0.008,
        userCurrency: 'USD',
        groups: {
          'wallet-1/group-1': {
            walletId: 'wallet-1',
            groupId: 'wallet-1/group-1',
            totalBalanceInUserCurrency: 0.005,
            userCurrency: 'USD',
          },
          'wallet-1/group-2': {
            walletId: 'wallet-1',
            groupId: 'wallet-1/group-2',
            totalBalanceInUserCurrency: 0.003,
            userCurrency: 'USD',
          },
        },
      })
      .mockReturnValueOnce('USD'); // selectCurrentCurrency

    const { result } = renderHook(() => useWalletBalances('wallet-1'));
    expect(result.current.formattedWalletTotalBalance).toBe('<$0.01');
  });

  it('formats balances at threshold correctly', () => {
    (useSelector as jest.Mock)
      .mockReturnValueOnce({
        // selectBalanceByWallet
        walletId: 'wallet-1',
        totalBalanceInUserCurrency: 0.01,
        userCurrency: 'USD',
        groups: {
          'wallet-1/group-1': {
            walletId: 'wallet-1',
            groupId: 'wallet-1/group-1',
            totalBalanceInUserCurrency: 0.01,
            userCurrency: 'USD',
          },
        },
      })
      .mockReturnValueOnce('USD'); // selectCurrentCurrency

    const { result } = renderHook(() => useWalletBalances('wallet-1'));
    expect(result.current.formattedWalletTotalBalance).toBe('$0.01');
  });

  it('formats zero balance correctly', () => {
    (useSelector as jest.Mock)
      .mockReturnValueOnce({
        // selectBalanceByWallet
        walletId: 'wallet-1',
        totalBalanceInUserCurrency: 0,
        userCurrency: 'USD',
        groups: {
          'wallet-1/group-1': {
            walletId: 'wallet-1',
            groupId: 'wallet-1/group-1',
            totalBalanceInUserCurrency: 0,
            userCurrency: 'USD',
          },
        },
      })
      .mockReturnValueOnce('USD'); // selectCurrentCurrency

    const { result } = renderHook(() => useWalletBalances('wallet-1'));
    expect(result.current.formattedWalletTotalBalance).toBe('$0.00');
  });
});
