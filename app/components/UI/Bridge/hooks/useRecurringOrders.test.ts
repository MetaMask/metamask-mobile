import { useInfiniteQuery } from '@metamask/react-data-query';
import { MOCK_RECURRING_OPEN_ORDER } from '../api/recurringOrders.mock';
import {
  type GetRecurringOrdersResponse,
  RecurringOrderStatus,
} from '../api/recurringOrders.types';
import { useRecurringOrders } from './useRecurringOrders';

jest.mock('@metamask/react-data-query', () => ({
  useInfiniteQuery: jest.fn(),
}));

const mockUseInfiniteQuery = jest.mocked(useInfiniteQuery);
const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
const OPEN_STATUSES = [RecurringOrderStatus.Open];

function createPage(
  orderId: string,
  nextCursor?: string,
): GetRecurringOrdersResponse {
  return {
    orders: [{ ...MOCK_RECURRING_OPEN_ORDER, orderId }],
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
  pages?: GetRecurringOrdersResponse[];
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
  });

  it('uses a cursor-free service query key', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    useRecurringOrders({
      walletAddress: WALLET_ADDRESS.toUpperCase(),
      status: OPEN_STATUSES,
      chainId: 'eip155:1',
    });

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          'RecurringOrdersDataService:getRecurringOrders',
          {
            walletAddress: WALLET_ADDRESS,
            status: OPEN_STATUSES,
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

    const result = useRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: OPEN_STATUSES,
    });

    expect(result.orders.map(({ orderId }) => orderId)).toStrictEqual([
      'order-1',
      'order-2',
    ]);
  });

  it('returns the next page cursor from the service response', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);
    useRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: OPEN_STATUSES,
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

    useRecurringOrders({
      status: OPEN_STATUSES,
    });

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('disables the query while inactive', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    useRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: OPEN_STATUSES,
      enabled: false,
    });

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('requests the next page when one is available', () => {
    const queryResult = createQueryResult({ hasNextPage: true });
    mockUseInfiniteQuery.mockReturnValue(queryResult as never);
    const result = useRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: OPEN_STATUSES,
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
      const result = useRecurringOrders({
        walletAddress: WALLET_ADDRESS,
        status: OPEN_STATUSES,
      });

      result.fetchNextPage();

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

    const result = useRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: OPEN_STATUSES,
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
