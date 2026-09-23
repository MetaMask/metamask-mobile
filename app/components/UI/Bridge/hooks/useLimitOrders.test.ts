import { useInfiniteQuery } from '@metamask/react-data-query';
import { MOCK_LIMIT_OPEN_ORDER } from '../api/limitOrders/getLimitOrders/mock';
import {
  type GetLimitOrdersResponse,
  LimitOrderStatus,
} from '../api/limitOrders/getLimitOrders/types';
import { useLimitOrders } from './useLimitOrders';
import { LIMIT_ORDERS_STALE_TIME } from '../constants/limitOrders';

jest.mock('@metamask/react-data-query', () => ({
  useInfiniteQuery: jest.fn(),
}));

const mockUseInfiniteQuery = jest.mocked(useInfiniteQuery);
const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
const OPEN_STATUSES = [LimitOrderStatus.Open];

function createPage(
  orderId: string,
  nextCursor?: string,
): GetLimitOrdersResponse {
  return {
    orders: [{ ...MOCK_LIMIT_OPEN_ORDER, orderId }],
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
  });

  it('uses a cursor-free service query key and polls hourly', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    useLimitOrders({
      walletAddress: WALLET_ADDRESS.toUpperCase(),
      status: OPEN_STATUSES,
      chainId: 'eip155:1',
    });

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          'LimitOrdersDataService:getLimitOrders',
          {
            walletAddress: WALLET_ADDRESS,
            status: OPEN_STATUSES,
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
      status: OPEN_STATUSES,
    });

    expect(result.orders.map(({ orderId }) => orderId)).toStrictEqual([
      'order-1',
      'order-2',
    ]);
  });

  it('returns the next page cursor from the service response', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);
    useLimitOrders({
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

    useLimitOrders({ status: OPEN_STATUSES });

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('disables the query while inactive', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    useLimitOrders({
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
    const result = useLimitOrders({
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
      const result = useLimitOrders({
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

    const result = useLimitOrders({
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
