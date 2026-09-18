import { useInfiniteQuery } from '@metamask/react-data-query';
import { MOCK_RECURRING_OPEN_ORDER_SWAPS } from '../api/recurringSwaps.mock';
import type { GetRecurringSwapsResponse } from '../api/recurringOrders.types';
import { useRecurringSwaps } from './useRecurringSwaps';

jest.mock('@metamask/react-data-query', () => ({
  useInfiniteQuery: jest.fn(),
}));

const mockUseInfiniteQuery = jest.mocked(useInfiniteQuery);
const ORDER_ID = MOCK_RECURRING_OPEN_ORDER_SWAPS[0].orderId;

function createPage(
  swapIndex: number,
  nextCursor?: string,
): GetRecurringSwapsResponse {
  return {
    swaps: [MOCK_RECURRING_OPEN_ORDER_SWAPS[swapIndex]],
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
  pages?: GetRecurringSwapsResponse[];
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

describe('useRecurringSwaps', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('uses the cursor-free recurring-swaps service key', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    useRecurringSwaps({ orderId: ORDER_ID });

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          'RecurringOrdersDataService:getRecurringSwaps',
          ORDER_ID,
          { limit: 20 },
        ],
        enabled: true,
        initialPageParam: undefined,
      }),
    );
  });

  it('returns the next page cursor from the service response', () => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);
    useRecurringSwaps({ orderId: ORDER_ID });
    const options = mockUseInfiniteQuery.mock.calls[0][0];

    const nextCursor = options.getNextPageParam?.(
      createPage(0, 'opaque-cursor'),
      [],
      undefined,
      [],
    );

    expect(nextCursor).toBe('opaque-cursor');
  });

  it('flattens swaps from every loaded page', () => {
    mockUseInfiniteQuery.mockReturnValue(
      createQueryResult({
        pages: [createPage(0), createPage(1)],
      }) as never,
    );

    const result = useRecurringSwaps({ orderId: ORDER_ID });

    expect(result.swaps).toStrictEqual([
      MOCK_RECURRING_OPEN_ORDER_SWAPS[0],
      MOCK_RECURRING_OPEN_ORDER_SWAPS[1],
    ]);
  });

  it.each([
    { orderId: undefined, enabled: true },
    { orderId: ORDER_ID, enabled: false },
  ])('disables the query for %o', (params) => {
    mockUseInfiniteQuery.mockReturnValue(createQueryResult() as never);

    useRecurringSwaps(params);

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('requests the next page when one is available', () => {
    const queryResult = createQueryResult({ hasNextPage: true });
    mockUseInfiniteQuery.mockReturnValue(queryResult as never);
    const result = useRecurringSwaps({ orderId: ORDER_ID });

    result.fetchNextPage();

    expect(queryResult.fetchNextPage).toHaveBeenCalledWith({
      cancelRefetch: false,
    });
  });

  it.each([
    { hasNextPage: false, isFetchingNextPage: false },
    { hasNextPage: true, isFetchingNextPage: true },
  ])('guards pagination for %o', ({ hasNextPage, isFetchingNextPage }) => {
    const queryResult = createQueryResult({
      hasNextPage,
      isFetchingNextPage,
    });
    mockUseInfiniteQuery.mockReturnValue(queryResult as never);
    const result = useRecurringSwaps({ orderId: ORDER_ID });

    result.fetchNextPage();

    expect(queryResult.fetchNextPage).not.toHaveBeenCalled();
  });

  it('forwards the underlying query state', () => {
    const queryResult = createQueryResult({
      isLoading: true,
      isError: true,
      hasNextPage: true,
      isFetchingNextPage: true,
    });
    mockUseInfiniteQuery.mockReturnValue(queryResult as never);

    const result = useRecurringSwaps({ orderId: ORDER_ID });

    expect(result).toMatchObject({
      isLoading: true,
      isError: true,
      hasNextPage: true,
      isFetchingNextPage: true,
      refetch: queryResult.refetch,
    });
  });
});
