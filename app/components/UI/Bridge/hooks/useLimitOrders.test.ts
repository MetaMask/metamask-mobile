import { useInfiniteQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import { MOCK_LIMIT_OPEN_ORDER } from '../api/limitOrders/getLimitOrders/mock';
import {
  type GetLimitOrdersResponse,
  LimitOrderState,
} from '../api/limitOrders/getLimitOrders/types';
import { useLimitOrders } from './useLimitOrders';
import { LIMIT_ORDERS_STALE_TIME } from '../constants/limitOrders';

jest.mock('@metamask/react-data-query', () => ({
  useInfiniteQuery: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
}));

const mockUseInfiniteQuery = jest.mocked(useInfiniteQuery);
const mockInvalidateQueries = jest.fn();
const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
const OPEN_STATES = [LimitOrderState.Open];

function createPage(id: string, nextCursor?: string): GetLimitOrdersResponse {
  return {
    orders: [{ ...MOCK_LIMIT_OPEN_ORDER, id }],
    nextCursor,
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
    jest.mocked(useQueryClient).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    } as never);
  });

  it('uses a cursor-free service query key and polls hourly', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    useLimitOrders({
      walletAddress: WALLET_ADDRESS.toUpperCase(),
      states: OPEN_STATES,
      chainId: 'eip155:1',
    });

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
        refetchInterval: LIMIT_ORDERS_STALE_TIME,
      }),
    );
  });

  it('flattens orders from every loaded page', () => {
    const queryResult = createQueryResult({
      pages: [createPage('order-1'), createPage('order-2')],
    });
    mockUseInfiniteQuery.mockReturnValue(queryResult as never);

    const result = useLimitOrders({
      walletAddress: WALLET_ADDRESS,
      states: OPEN_STATES,
    });

    expect(result.orders.map(({ id }) => id)).toStrictEqual([
      'order-1',
      'order-2',
    ]);
  });

  it('returns the next page cursor from the service response', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);
    useLimitOrders({
      walletAddress: WALLET_ADDRESS,
      states: OPEN_STATES,
    });
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

    useLimitOrders({ states: OPEN_STATES });

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('disables the query while inactive', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    useLimitOrders({
      walletAddress: WALLET_ADDRESS,
      states: OPEN_STATES,
      enabled: false,
    });

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('requests the next page when one is available', () => {
    const queryResult = createQueryResult({ hasNextPage: true });
    mockUseInfiniteQuery.mockReturnValue(queryResult as never);
    const result = useLimitOrders({
      walletAddress: WALLET_ADDRESS,
      states: OPEN_STATES,
    });

    result.fetchNextPage();

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
      const result = useLimitOrders({
        walletAddress: WALLET_ADDRESS,
        states: OPEN_STATES,
      });

      result.fetchNextPage();

      expect(queryResult.fetchNextPage).not.toHaveBeenCalled();
    },
  );

  it('refreshes by invalidating exactly its own query', async () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);
    const result = useLimitOrders({
      walletAddress: WALLET_ADDRESS,
      states: OPEN_STATES,
      chainId: 'eip155:1',
    });

    await result.refresh();

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

    const result = useLimitOrders({
      walletAddress: WALLET_ADDRESS,
      states: OPEN_STATES,
    });

    expect(result).toMatchObject({
      isLoading: true,
      isError: true,
      hasNextPage: true,
      isFetchingNextPage: true,
      refetch: queryResult.refetch,
    });
  });
});
