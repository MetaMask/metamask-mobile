import { act, renderHook } from '@testing-library/react-native';
import { useInfiniteQuery } from '@metamask/react-data-query';
import { focusManager, useQueryClient } from '@tanstack/react-query';
import { MOCK_LIMIT_OPEN_ORDER } from '../api/limitOrders/getLimitOrders/mock';
import {
  type GetLimitOrdersResponse,
  LimitOrderState,
} from '../api/limitOrders/getLimitOrders/types';
import { useLimitOrders } from './useLimitOrders';

jest.mock('@metamask/react-data-query', () => ({
  useInfiniteQuery: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  focusManager: { isFocused: jest.fn() },
  useQueryClient: jest.fn(),
}));

const mockUseInfiniteQuery = jest.mocked(useInfiniteQuery);
const mockIsFocused = jest.mocked(focusManager.isFocused);
const mockInvalidateQueries = jest.fn();
const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
const OPEN_STATES = [LimitOrderState.Open];
const REFETCH_INTERVAL = 20_000;

function createPage(
  id: string,
  nextCursor?: string,
  total = 1,
): GetLimitOrdersResponse {
  return {
    orders: [{ ...MOCK_LIMIT_OPEN_ORDER, id }],
    nextCursor,
    total,
  };
}

function createQueryResult({
  pages,
  isLoading = false,
  isError = false,
  hasNextPage = false,
  isFetchingNextPage = false,
}: {
  pages?: GetLimitOrdersResponse[];
  isLoading?: boolean;
  isError?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
} = {}) {
  return {
    data: pages ? { pages, pageParams: [] } : undefined,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage: jest.fn().mockResolvedValue(undefined),
    refetch: jest.fn().mockResolvedValue(undefined),
  };
}

describe('useLimitOrders', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockInvalidateQueries.mockResolvedValue(undefined);
    mockIsFocused.mockReturnValue(true);
    jest.mocked(useQueryClient).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    } as never);
  });

  it('uses a cursor-free service query key', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    renderHook(() =>
      useLimitOrders({
        walletAddress: WALLET_ADDRESS.toUpperCase(),
        states: OPEN_STATES,
        chainId: 'eip155:1',
      }),
    );

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          'LimitOrdersDataService:getLimitOrders',
          {
            walletAddress: WALLET_ADDRESS,
            states: OPEN_STATES,
            chainId: 'eip155:1',
            limit: 20,
          },
        ],
        enabled: true,
        initialPageParam: undefined,
      }),
    );
  });

  it('includes the asset and custom limit in the service query key', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    renderHook(() =>
      useLimitOrders({
        walletAddress: WALLET_ADDRESS,
        states: OPEN_STATES,
        assetId: 'eip155:1/slip44:60',
        limit: 1,
      }),
    );

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          'LimitOrdersDataService:getLimitOrders',
          {
            walletAddress: WALLET_ADDRESS,
            states: OPEN_STATES,
            assetId: 'eip155:1/slip44:60',
            limit: 1,
          },
        ],
      }),
    );
  });

  it('flattens orders from every loaded page', () => {
    const queryResult = createQueryResult({
      pages: [createPage('order-1'), createPage('order-2')],
    });
    mockUseInfiniteQuery.mockReturnValue(queryResult as never);

    const { result } = renderHook(() =>
      useLimitOrders({
        walletAddress: WALLET_ADDRESS,
        states: OPEN_STATES,
      }),
    );

    expect(result.current.orders.map(({ id }) => id)).toStrictEqual([
      'order-1',
      'order-2',
    ]);
  });

  it('returns the total reported by the latest loaded page', () => {
    mockUseInfiniteQuery.mockReturnValue(
      createQueryResult({
        pages: [
          createPage('order-1', 'cursor-2', 25),
          createPage('order-2', undefined, 26),
        ],
      }) as never,
    );

    const { result } = renderHook(() =>
      useLimitOrders({
        walletAddress: WALLET_ADDRESS,
        states: OPEN_STATES,
      }),
    );

    expect(result.current.total).toBe(26);
  });

  it('returns no total before any page has loaded', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    const { result } = renderHook(() =>
      useLimitOrders({
        walletAddress: WALLET_ADDRESS,
        states: OPEN_STATES,
      }),
    );

    expect(result.current.total).toBeUndefined();
  });

  it('returns the next page cursor from the service response', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);
    renderHook(() =>
      useLimitOrders({
        walletAddress: WALLET_ADDRESS,
        states: OPEN_STATES,
      }),
    );
    const options = mockUseInfiniteQuery.mock.calls[0][0];

    const nextCursor = options.getNextPageParam?.(
      createPage('order-1', 'opaque-cursor'),
      [],
      undefined,
      [],
    );

    expect(nextCursor).toBe('opaque-cursor');
  });

  it('disables the query without a wallet', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    renderHook(() => useLimitOrders({ states: OPEN_STATES }));

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('disables the query while inactive', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    renderHook(() =>
      useLimitOrders({
        walletAddress: WALLET_ADDRESS,
        states: OPEN_STATES,
        enabled: false,
      }),
    );

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('requests the next page when one is available', () => {
    const queryResult = createQueryResult({ hasNextPage: true });
    mockUseInfiniteQuery.mockReturnValue(queryResult as never);
    const { result } = renderHook(() =>
      useLimitOrders({
        walletAddress: WALLET_ADDRESS,
        states: OPEN_STATES,
      }),
    );

    result.current.fetchNextPage();

    expect(queryResult.fetchNextPage).toHaveBeenCalledWith({
      cancelRefetch: false,
    });
  });

  it.each([
    {
      reason: 'no page is available',
      hasNextPage: false,
      isFetchingNextPage: false,
    },
    {
      reason: 'a page request is pending',
      hasNextPage: true,
      isFetchingNextPage: true,
    },
  ])(
    'skips the next-page request when $reason',
    ({ hasNextPage, isFetchingNextPage }) => {
      const queryResult = createQueryResult({
        hasNextPage,
        isFetchingNextPage,
      });
      mockUseInfiniteQuery.mockReturnValue(queryResult as never);
      const { result } = renderHook(() =>
        useLimitOrders({
          walletAddress: WALLET_ADDRESS,
          states: OPEN_STATES,
        }),
      );

      result.current.fetchNextPage();

      expect(queryResult.fetchNextPage).not.toHaveBeenCalled();
    },
  );

  it('refreshes by invalidating exactly its own query', async () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);
    const { result } = renderHook(() =>
      useLimitOrders({
        walletAddress: WALLET_ADDRESS,
        states: OPEN_STATES,
        chainId: 'eip155:1',
      }),
    );

    await result.current.refresh();

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: mockUseInfiniteQuery.mock.calls[0][0].queryKey,
      exact: true,
    });
  });

  it('forwards the underlying query state', () => {
    const queryResult = createQueryResult({
      isLoading: true,
      isError: true,
      hasNextPage: true,
      isFetchingNextPage: true,
    });
    mockUseInfiniteQuery.mockReturnValue(queryResult as never);

    const { result } = renderHook(() =>
      useLimitOrders({
        walletAddress: WALLET_ADDRESS,
        states: OPEN_STATES,
      }),
    );

    expect(result.current).toMatchObject({
      isLoading: true,
      isError: true,
      hasNextPage: true,
      isFetchingNextPage: true,
      refetch: queryResult.refetch,
    });
  });

  describe('refetch interval', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('invalidates exactly its own query on every interval', () => {
      renderHook(() =>
        useLimitOrders({
          walletAddress: WALLET_ADDRESS,
          states: OPEN_STATES,
          refetchInterval: REFETCH_INTERVAL,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(REFETCH_INTERVAL - 1);
      });
      expect(mockInvalidateQueries).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
      expect(mockInvalidateQueries).toHaveBeenCalledWith(
        {
          queryKey: mockUseInfiniteQuery.mock.calls[0][0].queryKey,
          exact: true,
        },
        { cancelRefetch: false },
      );

      act(() => {
        jest.advanceTimersByTime(REFETCH_INTERVAL);
      });
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    });

    it.each([
      { reason: 'no interval is given', refetchInterval: undefined },
      { reason: 'the interval is zero', refetchInterval: 0 },
    ])('does not refetch when $reason', ({ refetchInterval }) => {
      renderHook(() =>
        useLimitOrders({
          walletAddress: WALLET_ADDRESS,
          states: OPEN_STATES,
          refetchInterval,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(REFETCH_INTERVAL * 3);
      });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });

    it.each([
      {
        reason: 'the query is disabled',
        walletAddress: WALLET_ADDRESS,
        enabled: false,
      },
      { reason: 'there is no wallet', walletAddress: undefined, enabled: true },
    ])('does not refetch while $reason', ({ walletAddress, enabled }) => {
      renderHook(() =>
        useLimitOrders({
          walletAddress,
          states: OPEN_STATES,
          enabled,
          refetchInterval: REFETCH_INTERVAL,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(REFETCH_INTERVAL * 3);
      });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });

    it('skips refetches while the app is in the background', () => {
      mockIsFocused.mockReturnValue(false);
      renderHook(() =>
        useLimitOrders({
          walletAddress: WALLET_ADDRESS,
          states: OPEN_STATES,
          refetchInterval: REFETCH_INTERVAL,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(REFETCH_INTERVAL);
      });
      expect(mockInvalidateQueries).not.toHaveBeenCalled();

      mockIsFocused.mockReturnValue(true);
      act(() => {
        jest.advanceTimersByTime(REFETCH_INTERVAL);
      });
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    });

    it('stops refetching once disabled', () => {
      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useLimitOrders({
            walletAddress: WALLET_ADDRESS,
            states: OPEN_STATES,
            enabled,
            refetchInterval: REFETCH_INTERVAL,
          }),
        { initialProps: { enabled: true } },
      );

      rerender({ enabled: false });
      act(() => {
        jest.advanceTimersByTime(REFETCH_INTERVAL * 3);
      });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });

    it('stops refetching once unmounted', () => {
      const { unmount } = renderHook(() =>
        useLimitOrders({
          walletAddress: WALLET_ADDRESS,
          states: OPEN_STATES,
          refetchInterval: REFETCH_INTERVAL,
        }),
      );

      unmount();
      act(() => {
        jest.advanceTimersByTime(REFETCH_INTERVAL * 3);
      });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });
  });
});
