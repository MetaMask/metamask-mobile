import { act, renderHook } from '@testing-library/react-native';
import {
  ACCOUNT_GROUP_BALANCE_FETCH_TIMEOUT,
  useAccountGroupBalanceFetchState,
} from './useAccountGroupBalanceFetchState';

describe('useAccountGroupBalanceFetchState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns false before the balance fetch timeout expires', () => {
    const { result } = renderHook(() =>
      useAccountGroupBalanceFetchState({
        groupBalance: {
          groupId: 'wallet-1/group-1',
          totalBalanceInUserCurrency: 0,
        },
        accountGroupBalance: {
          totalBalanceInUserCurrency: 0,
        },
      }),
    );

    expect(result.current).toBe(false);
  });

  it('returns true when the balance fetch timeout expires', () => {
    const { result } = renderHook(() =>
      useAccountGroupBalanceFetchState({
        groupBalance: {
          groupId: 'wallet-1/group-1',
          totalBalanceInUserCurrency: 0,
        },
        accountGroupBalance: {
          totalBalanceInUserCurrency: 0,
        },
      }),
    );

    act(() => {
      jest.advanceTimersByTime(ACCOUNT_GROUP_BALANCE_FETCH_TIMEOUT);
    });

    expect(result.current).toBe(true);
  });

  it('returns true immediately when the selected group balance changes', () => {
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useAccountGroupBalanceFetchState>[0]) =>
        useAccountGroupBalanceFetchState(props),
      {
        initialProps: {
          groupBalance: {
            groupId: 'wallet-1/group-1',
            totalBalanceInUserCurrency: 0,
          },
          accountGroupBalance: {
            totalBalanceInUserCurrency: 0,
          },
        },
      },
    );

    rerender({
      groupBalance: {
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 123,
      },
      accountGroupBalance: {
        totalBalanceInUserCurrency: 123,
      },
    });

    expect(result.current).toBe(true);
  });

  it('resets when the selected account group changes', () => {
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useAccountGroupBalanceFetchState>[0]) =>
        useAccountGroupBalanceFetchState(props),
      {
        initialProps: {
          groupBalance: {
            groupId: 'wallet-1/group-1',
            totalBalanceInUserCurrency: 0,
          },
          accountGroupBalance: {
            totalBalanceInUserCurrency: 0,
          },
        },
      },
    );

    act(() => {
      jest.advanceTimersByTime(ACCOUNT_GROUP_BALANCE_FETCH_TIMEOUT);
    });
    expect(result.current).toBe(true);

    rerender({
      groupBalance: {
        groupId: 'wallet-1/group-2',
        totalBalanceInUserCurrency: 0,
      },
      accountGroupBalance: {
        totalBalanceInUserCurrency: 0,
      },
    });

    expect(result.current).toBe(false);
  });
});
