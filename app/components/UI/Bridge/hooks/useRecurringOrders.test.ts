import { useInfiniteQuery } from '@metamask/react-data-query';
import { focusManager, useQueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { MOCK_RECURRING_OPEN_ORDER } from '../api/recurringOrders.mock';
import {
  type ListRecurringOrdersResponse,
  RecurringOrderState,
} from '../api/recurringOrders.types';
import { useRecurringOrders } from './useRecurringOrders';

jest.mock('@metamask/react-data-query', () => ({
  useInfiniteQuery: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  focusManager: {
    isFocused: jest.fn(),
  },
  useQueryClient: jest.fn(),
}));

const mockUseInfiniteQuery = jest.mocked(useInfiniteQuery);
const mockIsFocused = jest.mocked(focusManager.isFocused);
const mockUseQueryClient = jest.mocked(useQueryClient);
const mockInvalidateQueries = jest.fn();
const messengerCall = Engine.controllerMessenger.call as jest.Mock;
const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
const OPEN_STATES = [RecurringOrderState.Open];
const REFETCH_INTERVAL = 20_000;

function createPage(
  orderId: string,
  endCursor?: string,
): ListRecurringOrdersResponse {
  return {
    orders: [{ ...MOCK_RECURRING_OPEN_ORDER, id: orderId }],
    endCursor,
    hasNextPage: Boolean(endCursor),
    total: 1,
  };
}

function createQueryResult({
  pages,
  isLoading = false,
  isError = false,
  hasNextPage = false,
  isFetchingNextPage = false,
}: {
  pages?: ListRecurringOrdersResponse[];
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

describe('useRecurringOrders', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockInvalidateQueries.mockResolvedValue(undefined);
    mockIsFocused.mockReturnValue(true);
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    } as never);
    messengerCall.mockReset();
    messengerCall.mockResolvedValue(undefined);
  });

  it('uses a cursor-free service query key', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    renderHook(() =>
      useRecurringOrders({
        walletAddress: WALLET_ADDRESS.toUpperCase(),
        orderStates: OPEN_STATES,
        chainId: 'eip155:1',
      }),
    );

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          'RecurringOrdersDataService:getRecurringOrders',
          {
            walletAddress: WALLET_ADDRESS,
            orderStates: OPEN_STATES,
            chainId: 'eip155:1',
            limit: 20,
          },
        ],
        enabled: true,
        initialPageParam: undefined,
      }),
    );
  });

  it('flattens orders from every loaded page', () => {
    const queryResult = createQueryResult({
      pages: [createPage('order-1'), createPage('order-2')],
    });
    mockUseInfiniteQuery.mockReturnValue(queryResult as never);

    const { result } = renderHook(() =>
      useRecurringOrders({
        walletAddress: WALLET_ADDRESS,
        orderStates: OPEN_STATES,
      }),
    );

    expect(result.current.orders.map(({ id }) => id)).toStrictEqual([
      'order-1',
      'order-2',
    ]);
  });

  it('returns the next page cursor from the service response', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);
    renderHook(() =>
      useRecurringOrders({
        walletAddress: WALLET_ADDRESS,
        orderStates: OPEN_STATES,
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

    renderHook(() =>
      useRecurringOrders({
        orderStates: OPEN_STATES,
      }),
    );

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('disables the query while inactive', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    renderHook(() =>
      useRecurringOrders({
        walletAddress: WALLET_ADDRESS,
        orderStates: OPEN_STATES,
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
      useRecurringOrders({
        walletAddress: WALLET_ADDRESS,
        orderStates: OPEN_STATES,
      }),
    );

    result.current.fetchNextPage();

    expect(queryResult.fetchNextPage).toHaveBeenCalledWith({
      cancelRefetch: false,
    });
  });

  it('invalidates the service query before the UI query', async () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);
    const callOrder: string[] = [];
    messengerCall.mockImplementation(async () => {
      callOrder.push('service-start');
      await Promise.resolve();
      callOrder.push('service-end');
    });
    mockInvalidateQueries.mockImplementation(async () => {
      callOrder.push('ui-start');
    });

    const { result } = renderHook(() =>
      useRecurringOrders({
        walletAddress: WALLET_ADDRESS,
        orderStates: OPEN_STATES,
        chainId: 'eip155:1',
      }),
    );
    const queryKey = mockUseInfiniteQuery.mock.calls[0][0].queryKey;

    await result.current.refresh();

    expect(messengerCall).toHaveBeenCalledWith(
      'RecurringOrdersDataService:invalidateQueries',
      { queryKey },
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey,
      exact: true,
    });
    expect(callOrder).toStrictEqual([
      'service-start',
      'service-end',
      'ui-start',
    ]);
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
        useRecurringOrders({
          walletAddress: WALLET_ADDRESS,
          orderStates: OPEN_STATES,
        }),
      );

      result.current.fetchNextPage();

      expect(queryResult.fetchNextPage).not.toHaveBeenCalled();
    },
  );

  it('forwards the underlying query state', () => {
    const queryResult = createQueryResult({
      isLoading: true,
      isError: true,
      hasNextPage: true,
      isFetchingNextPage: true,
    });
    mockUseInfiniteQuery.mockReturnValue(queryResult as never);

    const { result } = renderHook(() =>
      useRecurringOrders({
        walletAddress: WALLET_ADDRESS,
        orderStates: OPEN_STATES,
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

    it('invalidates its exact query on every interval', () => {
      renderHook(() =>
        useRecurringOrders({
          walletAddress: WALLET_ADDRESS,
          orderStates: OPEN_STATES,
          refetchInterval: REFETCH_INTERVAL,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(REFETCH_INTERVAL);
      });

      expect(mockInvalidateQueries).toHaveBeenCalledWith(
        {
          queryKey: mockUseInfiniteQuery.mock.calls[0][0].queryKey,
          exact: true,
        },
        { cancelRefetch: false },
      );
    });

    it.each([
      {
        reason: 'the query is disabled',
        walletAddress: WALLET_ADDRESS,
        enabled: false,
      },
      {
        reason: 'there is no wallet',
        walletAddress: undefined,
        enabled: true,
      },
    ])('does not poll while $reason', ({ walletAddress, enabled }) => {
      renderHook(() =>
        useRecurringOrders({
          walletAddress,
          orderStates: OPEN_STATES,
          enabled,
          refetchInterval: REFETCH_INTERVAL,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(REFETCH_INTERVAL * 2);
      });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });

    it('skips intervals while the app is backgrounded', () => {
      mockIsFocused.mockReturnValue(false);
      renderHook(() =>
        useRecurringOrders({
          walletAddress: WALLET_ADDRESS,
          orderStates: OPEN_STATES,
          refetchInterval: REFETCH_INTERVAL,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(REFETCH_INTERVAL);
      });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });

    it('stops polling after unmount', () => {
      const { unmount } = renderHook(() =>
        useRecurringOrders({
          walletAddress: WALLET_ADDRESS,
          orderStates: OPEN_STATES,
          refetchInterval: REFETCH_INTERVAL,
        }),
      );

      unmount();
      act(() => {
        jest.advanceTimersByTime(REFETCH_INTERVAL);
      });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });
  });
});
