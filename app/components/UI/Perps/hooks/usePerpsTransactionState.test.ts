import { renderHook } from '@testing-library/react-native';
import { usePerpsTransactionState } from './usePerpsTransactionState';
import { TransactionRecord } from '../types/transactionTypes';

// Mock the strings function
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'perps.multiple_transactions_in_progress': 'Transactions in progress',
      'perps.deposit_in_progress': 'Deposit in progress',
      'perps.withdraw_in_progress': 'Withdraw in progress',
      'perps.available_balance': 'Available balance',
    };
    return mockStrings[key] || key;
  }),
}));

describe('usePerpsTransactionState', () => {
  const defaultProps = {
    withdrawalRequests: [] as TransactionRecord[],
    isDepositInProgress: false,
  };

  it('returns correct initial state when no transactions are active', () => {
    const { result } = renderHook(() => usePerpsTransactionState(defaultProps));

    expect(result.current.withdrawalAmount).toBeNull();
    expect(result.current.hasActiveWithdrawals).toBe(false);
    expect(result.current.statusText).toBe('Available balance');
    expect(result.current.isAnyTransactionInProgress).toBe(false);
  });

  it('handles deposit in progress correctly', () => {
    const props = {
      ...defaultProps,
      isDepositInProgress: true,
    };

    const { result } = renderHook(() => usePerpsTransactionState(props));

    expect(result.current.withdrawalAmount).toBeNull();
    expect(result.current.hasActiveWithdrawals).toBe(false);
    expect(result.current.statusText).toBe('Deposit in progress');
    expect(result.current.isAnyTransactionInProgress).toBe(true);
  });

  it('handles active withdrawals correctly', () => {
    const props = {
      ...defaultProps,
      withdrawalRequests: [
        {
          id: '1',
          status: 'pending' as const,
          amount: '100',
          asset: 'USDC',
          timestamp: Date.now(),
          success: false,
        },
        {
          id: '2',
          status: 'completed' as const,
          amount: '50',
          asset: 'USDC',
          timestamp: Date.now(),
          success: true,
        },
      ],
    };

    const { result } = renderHook(() => usePerpsTransactionState(props));

    expect(result.current.withdrawalAmount).toBe('100');
    expect(result.current.hasActiveWithdrawals).toBe(true);
    expect(result.current.statusText).toBe('Withdraw in progress');
    expect(result.current.isAnyTransactionInProgress).toBe(true);
  });

  it('handles bridging withdrawals correctly', () => {
    const props = {
      ...defaultProps,
      withdrawalRequests: [
        {
          id: '1',
          status: 'bridging' as const,
          amount: '250',
          asset: 'USDC',
          timestamp: Date.now(),
          success: true,
        },
      ],
    };

    const { result } = renderHook(() => usePerpsTransactionState(props));

    expect(result.current.withdrawalAmount).toBe('250');
    expect(result.current.hasActiveWithdrawals).toBe(true);
    expect(result.current.statusText).toBe('Withdraw in progress');
    expect(result.current.isAnyTransactionInProgress).toBe(true);
  });

  it('handles multiple transactions in progress correctly', () => {
    const props = {
      withdrawalRequests: [
        {
          id: '1',
          status: 'pending' as const,
          amount: '100',
          asset: 'USDC',
          timestamp: Date.now(),
          success: false,
        },
      ],
      isDepositInProgress: true,
    };

    const { result } = renderHook(() => usePerpsTransactionState(props));

    expect(result.current.withdrawalAmount).toBe('100');
    expect(result.current.hasActiveWithdrawals).toBe(true);
    expect(result.current.statusText).toBe('Transactions in progress');
    expect(result.current.isAnyTransactionInProgress).toBe(true);
  });

  it('returns the first active withdrawal amount when multiple active withdrawals exist', () => {
    const props = {
      ...defaultProps,
      withdrawalRequests: [
        {
          id: '1',
          status: 'pending' as const,
          amount: '100',
          asset: 'USDC',
          timestamp: Date.now(),
          success: false,
        },
        {
          id: '2',
          status: 'bridging' as const,
          amount: '500',
          asset: 'USDC',
          timestamp: Date.now(),
          success: true,
        },
      ],
    };

    const { result } = renderHook(() => usePerpsTransactionState(props));

    expect(result.current.withdrawalAmount).toBe('100');
    expect(result.current.hasActiveWithdrawals).toBe(true);
  });

  it('updates when props change', () => {
    const { result, rerender } = renderHook(
      (props) => usePerpsTransactionState(props),
      {
        initialProps: defaultProps,
      },
    );

    expect(result.current.isAnyTransactionInProgress).toBe(false);

    // Add deposit in progress
    rerender({ ...defaultProps, isDepositInProgress: true });
    expect(result.current.isAnyTransactionInProgress).toBe(true);
    expect(result.current.statusText).toBe('Deposit in progress');

    // Add withdrawal
    rerender({
      withdrawalRequests: [
        {
          id: '1',
          status: 'pending',
          amount: '200',
          asset: 'USDC',
          timestamp: Date.now(),
          success: false,
        },
      ],
      isDepositInProgress: true,
    });
    expect(result.current.statusText).toBe('Transactions in progress');
    expect(result.current.withdrawalAmount).toBe('200');
  });

  it('ignores non-active withdrawal statuses', () => {
    const props = {
      ...defaultProps,
      withdrawalRequests: [
        {
          id: '1',
          status: 'completed' as const,
          amount: '100',
          asset: 'USDC',
          timestamp: Date.now(),
          success: true,
        },
        {
          id: '2',
          status: 'failed' as const,
          amount: '50',
          asset: 'USDC',
          timestamp: Date.now(),
          success: false,
        },
        {
          id: '3',
          status: 'failed' as const,
          amount: '25',
          asset: 'USDC',
          timestamp: Date.now(),
          success: false,
        },
      ],
    };

    const { result } = renderHook(() => usePerpsTransactionState(props));

    expect(result.current.withdrawalAmount).toBeNull();
    expect(result.current.hasActiveWithdrawals).toBe(false);
    expect(result.current.statusText).toBe('Available balance');
    expect(result.current.isAnyTransactionInProgress).toBe(false);
  });
});
