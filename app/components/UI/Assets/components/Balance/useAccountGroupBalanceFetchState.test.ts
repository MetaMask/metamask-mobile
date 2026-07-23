import { act, renderHook } from '@testing-library/react-native';
import Logger from '../../../../../util/Logger';
import { useBalanceRefresh } from '../../../../Views/Wallet/hooks/useBalanceRefresh';
import {
  ACCOUNT_GROUP_BALANCE_FETCH_TIMEOUT,
  useAccountGroupBalanceFetchState,
} from './useAccountGroupBalanceFetchState';

jest.mock('../../../../Views/Wallet/hooks/useBalanceRefresh', () => ({
  useBalanceRefresh: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

describe('useAccountGroupBalanceFetchState', () => {
  const mockRefreshBalance = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockRefreshBalance.mockReturnValue(new Promise<void>(() => undefined));
    jest.mocked(useBalanceRefresh).mockReturnValue({
      refreshBalance: mockRefreshBalance,
      handleRefresh: jest.fn(),
      refreshing: false,
    });
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

  it('returns true immediately when the account group balance becomes positive from zero', () => {
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
        totalBalanceInUserCurrency: 0,
      },
      accountGroupBalance: {
        totalBalanceInUserCurrency: 50,
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

  it('stays false while the refresh promise is pending and the balance is zero', () => {
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
      jest.advanceTimersByTime(ACCOUNT_GROUP_BALANCE_FETCH_TIMEOUT - 1);
    });

    expect(mockRefreshBalance).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(false);
  });

  it('returns true once the refresh promise resolves with the balance still zero', async () => {
    let resolveRefresh!: () => void;
    mockRefreshBalance.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
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

    await act(async () => {
      resolveRefresh();
    });

    expect(result.current).toBe(true);
  });

  it('returns true and logs the error when the refresh promise rejects', async () => {
    let rejectRefresh!: (error: Error) => void;
    const refreshError = new Error('refresh failed');
    mockRefreshBalance.mockReturnValue(
      new Promise<void>((_resolve, reject) => {
        rejectRefresh = reject;
      }),
    );
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

    await act(async () => {
      rejectRefresh(refreshError);
    });

    expect(result.current).toBe(true);
    expect(Logger.error).toHaveBeenCalledTimes(1);
    expect(jest.mocked(Logger.error).mock.calls[0][0]).toBe(refreshError);
  });

  it('fires the balance refresh exactly once for a group across rerenders', () => {
    const { rerender } = renderHook(
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
    expect(mockRefreshBalance).toHaveBeenCalledTimes(1);

    rerender({
      groupBalance: {
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 0,
      },
      accountGroupBalance: {
        totalBalanceInUserCurrency: 0,
      },
    });
    rerender({
      groupBalance: {
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 0,
      },
      accountGroupBalance: {
        totalBalanceInUserCurrency: 0,
      },
    });

    expect(mockRefreshBalance).toHaveBeenCalledTimes(1);
  });

  it('does not fire the balance refresh when balances are nonzero at mount', () => {
    const { result } = renderHook(() =>
      useAccountGroupBalanceFetchState({
        groupBalance: {
          groupId: 'wallet-1/group-1',
          totalBalanceInUserCurrency: 100,
        },
        accountGroupBalance: {
          totalBalanceInUserCurrency: 100,
        },
      }),
    );

    expect(result.current).toBe(true);
    expect(mockRefreshBalance).not.toHaveBeenCalled();
  });

  it('does not fire the balance refresh when there is no group balance', () => {
    const { result } = renderHook(() =>
      useAccountGroupBalanceFetchState({
        groupBalance: null,
        accountGroupBalance: null,
      }),
    );

    expect(result.current).toBe(false);
    expect(mockRefreshBalance).not.toHaveBeenCalled();
  });

  it('fires a new balance refresh after the selected account group changes', () => {
    const { rerender } = renderHook(
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
    expect(mockRefreshBalance).toHaveBeenCalledTimes(1);

    rerender({
      groupBalance: {
        groupId: 'wallet-1/group-2',
        totalBalanceInUserCurrency: 0,
      },
      accountGroupBalance: {
        totalBalanceInUserCurrency: 0,
      },
    });

    expect(mockRefreshBalance).toHaveBeenCalledTimes(2);
  });

  it('ignores a stale refresh settlement from a previous account group', async () => {
    let resolveFirstRefresh!: () => void;
    let resolveSecondRefresh!: () => void;
    mockRefreshBalance
      .mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveFirstRefresh = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveSecondRefresh = resolve;
        }),
      );
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
        groupId: 'wallet-1/group-2',
        totalBalanceInUserCurrency: 0,
      },
      accountGroupBalance: {
        totalBalanceInUserCurrency: 0,
      },
    });
    await act(async () => {
      resolveFirstRefresh();
    });
    expect(result.current).toBe(false);

    await act(async () => {
      resolveSecondRefresh();
    });
    expect(result.current).toBe(true);
  });

  it('does not update state when the refresh settles after unmount', async () => {
    let resolveRefresh!: () => void;
    mockRefreshBalance.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { unmount } = renderHook(() =>
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

    unmount();
    await act(async () => {
      resolveRefresh();
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('latches true via the safety timeout when the refresh promise never settles', () => {
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
    expect(mockRefreshBalance).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(ACCOUNT_GROUP_BALANCE_FETCH_TIMEOUT);
    });

    expect(result.current).toBe(true);
  });
});
