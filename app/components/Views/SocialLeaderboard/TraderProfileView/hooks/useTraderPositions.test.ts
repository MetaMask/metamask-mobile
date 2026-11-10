import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import {
  focusManager,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { PositionsResponse, Position } from '@metamask/social-controllers';
import { addBreadcrumb } from '@sentry/react-native';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import { useTraderPositions } from './useTraderPositions';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../selectors/keyringController', () => ({
  selectIsUnlocked: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('@metamask/react-data-query');

jest.mock('@tanstack/react-query', () => ({
  focusManager: { isFocused: jest.fn(() => true) },
  useInfiniteQuery: jest.fn(),
  useQueryClient: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: { controllerMessenger: { call: jest.fn() } },
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

const mockAddBreadcrumb = addBreadcrumb as jest.Mock;

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseInfiniteQuery = useInfiniteQuery as unknown as jest.Mock;
const mockUseQueryClient = useQueryClient as unknown as jest.Mock;
const mockIsFocused = focusManager.isFocused as unknown as jest.Mock;
const mockEngineCall = Engine.controllerMessenger.call as unknown as jest.Mock;

const mockSetQueryData = jest.fn();
const mockQueryClient = { setQueryData: mockSetQueryData };

const makeInfiniteQueryResult = (overrides: Record<string, unknown> = {}) => ({
  data: undefined,
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  fetchNextPage: jest.fn().mockResolvedValue(undefined),
  refetch: jest.fn().mockResolvedValue(undefined),
  error: null,
  ...overrides,
});

/** Builds one API page whose positions are identified by `ids`. */
const makePage = (
  ids: string[],
  hasMore = false,
  nextPage?: number,
): PositionsResponse =>
  ({
    positions: ids.map(
      (id) =>
        ({
          positionId: id,
          tokenAddress: `0x${id}`,
          chain: 'ethereum',
        }) as unknown as Position,
    ),
    pagination: { hasMore, nextPage },
  }) as PositionsResponse;

const makeQueryResult = (
  overrides: Partial<ReturnType<typeof useQuery>> = {},
): ReturnType<typeof useQuery> =>
  ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  }) as ReturnType<typeof useQuery>;

const mockOpenPositions = [
  {
    tokenSymbol: 'ETH',
    tokenName: 'Ethereum',
    tokenAddress: '0x1',
    chain: 'ethereum',
    positionAmount: 5,
    boughtUsd: 10000,
    soldUsd: 0,
    realizedPnl: 0,
    costBasis: 10000,
    trades: [],
    lastTradeAt: Date.now(),
    currentValueUSD: 15000,
    pnlValueUsd: 5000,
    pnlPercent: 50,
  },
];

const mockClosedPositions = [
  {
    tokenSymbol: 'USDC',
    tokenName: 'USD Coin',
    tokenAddress: '0x2',
    chain: 'base',
    positionAmount: 1000,
    boughtUsd: 1000,
    soldUsd: 1100,
    realizedPnl: 100,
    costBasis: 1000,
    trades: [],
    lastTradeAt: Date.now(),
    currentValueUSD: 0,
    pnlValueUsd: 100,
    pnlPercent: 10,
  },
];

describe('useTraderPositions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue(makeQueryResult());
    mockUseInfiniteQuery.mockReturnValue(makeInfiniteQueryResult());
    mockUseQueryClient.mockReturnValue(mockQueryClient);
    mockIsFocused.mockReturnValue(true);
    mockEngineCall.mockReset();
    mockAddBreadcrumb.mockClear();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) return true;
      return undefined;
    });
  });

  describe('query configuration', () => {
    it('passes the correct queryKeys for open and closed positions', () => {
      renderHook(() => useTraderPositions('trader-1'));

      expect(mockUseQuery).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          queryKey: [
            'SocialService:fetchOpenPositions',
            { addressOrId: 'trader-1', limit: 100 },
          ],
        }),
      );
      expect(mockUseQuery).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          queryKey: [
            'SocialService:fetchClosedPositions',
            { addressOrId: 'trader-1', sort: 'latest', limit: 100 },
          ],
        }),
      );
    });

    it('enables both queries when addressOrId is non-empty and wallet is unlocked', () => {
      renderHook(() => useTraderPositions('trader-1'));

      expect(mockUseQuery.mock.calls[0][0]).toEqual(
        expect.objectContaining({ enabled: true }),
      );
      expect(mockUseQuery.mock.calls[1][0]).toEqual(
        expect.objectContaining({ enabled: true }),
      );
    });

    it('disables both queries when addressOrId is empty', () => {
      renderHook(() => useTraderPositions(''));

      expect(mockUseQuery.mock.calls[0][0]).toEqual(
        expect.objectContaining({ enabled: false }),
      );
      expect(mockUseQuery.mock.calls[1][0]).toEqual(
        expect.objectContaining({ enabled: false }),
      );
    });

    it('disables both queries when wallet is locked', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectIsUnlocked) return false;
        return undefined;
      });
      renderHook(() => useTraderPositions('trader-1'));

      expect(mockUseQuery.mock.calls[0][0]).toEqual(
        expect.objectContaining({ enabled: false }),
      );
      expect(mockUseQuery.mock.calls[1][0]).toEqual(
        expect.objectContaining({ enabled: false }),
      );
    });

    it('forwards refetchInterval to both open and closed positions queries', () => {
      renderHook(() =>
        useTraderPositions('trader-1', { refetchInterval: 30_000 }),
      );

      const calls = mockUseQuery.mock.calls;
      expect(calls[0][0]).toEqual(
        expect.objectContaining({ refetchInterval: 30_000 }),
      );
      expect(calls[1][0]).toEqual(
        expect.objectContaining({ refetchInterval: 30_000 }),
      );
    });

    it('uses refetchOnMount always on both position queries', () => {
      renderHook(() => useTraderPositions('trader-1'));

      const calls = mockUseQuery.mock.calls;
      expect(calls[0][0]).toEqual(
        expect.objectContaining({ refetchOnMount: 'always' }),
      );
      expect(calls[1][0]).toEqual(
        expect.objectContaining({ refetchOnMount: 'always' }),
      );
    });

    it('does not set refetchInterval on either query when option is omitted', () => {
      renderHook(() => useTraderPositions('trader-1'));

      const calls = mockUseQuery.mock.calls;
      expect(calls[0][0]).toEqual(
        expect.objectContaining({ refetchInterval: undefined }),
      );
      expect(calls[1][0]).not.toEqual(
        expect.objectContaining({ refetchInterval: expect.anything() }),
      );
    });
  });

  describe('position data', () => {
    it('returns empty arrays when both queries return undefined data', () => {
      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.openPositions).toEqual([]);
      expect(result.current.closedPositions).toEqual([]);
    });

    it('returns open positions from the open query', () => {
      mockUseQuery
        .mockReturnValueOnce(
          makeQueryResult({ data: { positions: mockOpenPositions } as never }),
        )
        .mockReturnValueOnce(makeQueryResult());

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.openPositions).toEqual(mockOpenPositions);
    });

    it('returns closed positions from the closed query', () => {
      mockUseQuery.mockReturnValueOnce(makeQueryResult()).mockReturnValueOnce(
        makeQueryResult({
          data: { positions: mockClosedPositions } as never,
        }),
      );

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.closedPositions).toEqual(mockClosedPositions);
    });

    it('falls back to empty arrays when positions is missing', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ data: {} as never }))
        .mockReturnValueOnce(makeQueryResult({ data: {} as never }));

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.openPositions).toEqual([]);
      expect(result.current.closedPositions).toEqual([]);
    });
  });

  describe('loading states', () => {
    it('exposes isLoadingOpen from the open query', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ isLoading: true }))
        .mockReturnValueOnce(makeQueryResult());

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.isLoadingOpen).toBe(true);
      expect(result.current.isLoadingClosed).toBe(false);
    });

    it('exposes isLoadingClosed from the closed query', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult())
        .mockReturnValueOnce(makeQueryResult({ isLoading: true }));

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.isLoadingOpen).toBe(false);
      expect(result.current.isLoadingClosed).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns null when there are no errors', () => {
      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.error).toBeNull();
      expect(result.current.openError).toBeNull();
      expect(result.current.closedError).toBeNull();
    });

    it('returns the open query error before the closed query error', () => {
      mockUseQuery
        .mockReturnValueOnce(
          makeQueryResult({ error: new Error('open error') }),
        )
        .mockReturnValueOnce(
          makeQueryResult({ error: new Error('closed error') }),
        );

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.error).toBe('open error');
      expect(result.current.openError).toBe('open error');
      expect(result.current.closedError).toBe('closed error');
    });

    it('returns the closed query error when the open query succeeds', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult())
        .mockReturnValueOnce(
          makeQueryResult({ error: new Error('closed error') }),
        );

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.error).toBe('closed error');
      expect(result.current.openError).toBeNull();
      expect(result.current.closedError).toBe('closed error');
    });

    it('converts non-Error values to strings', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ error: 'raw error' as never }))
        .mockReturnValueOnce(makeQueryResult());

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.error).toBe('raw error');
    });

    it('logs the open error with feature:social tags', () => {
      const error = new Error('fetch failed');

      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ error }))
        .mockReturnValueOnce(makeQueryResult());

      renderHook(() => useTraderPositions('trader-1'));

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            surface: 'trader_profile',
            operation: 'fetch_open_positions',
            endpoint: 'open_positions',
          }),
          extras: expect.objectContaining({
            message: 'Trader open positions fetch failed at useTraderPositions',
            endpoint: 'open_positions',
          }),
        }),
      );
    });

    it('logs the closed error with feature:social tags', () => {
      const error = new Error('closed fetch failed');

      mockUseQuery
        .mockReturnValueOnce(makeQueryResult())
        .mockReturnValueOnce(makeQueryResult({ error }));

      renderHook(() => useTraderPositions('trader-1'));

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            surface: 'trader_profile',
            operation: 'fetch_closed_positions',
            endpoint: 'closed_positions',
          }),
          extras: expect.objectContaining({
            message:
              'Trader closed positions fetch failed at useTraderPositions',
            endpoint: 'closed_positions',
          }),
        }),
      );
    });

    it('does not log when there is no error', () => {
      renderHook(() => useTraderPositions('trader-1'));
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('does NOT include addressOrId in the Logger.error payload', () => {
      const error = new Error('fetch failed');

      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ error }))
        .mockReturnValueOnce(makeQueryResult());

      renderHook(() => useTraderPositions('0xSensitiveAddress'));

      const call = (Logger.error as jest.Mock).mock.calls[0];
      const serialised = JSON.stringify(call[1]);
      expect(serialised).not.toContain('0xSensitiveAddress');
      expect(serialised).not.toContain('addressOrId');
    });
  });

  describe('refetch', () => {
    it('calls both per-query refetch functions in parallel', async () => {
      const refetchOpen = jest.fn().mockResolvedValue(undefined);
      const refetchClosed = jest.fn().mockResolvedValue(undefined);
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ refetch: refetchOpen }))
        .mockReturnValueOnce(makeQueryResult({ refetch: refetchClosed }));

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      await act(async () => {
        await result.current.refetch();
      });

      expect(refetchOpen).toHaveBeenCalledTimes(1);
      expect(refetchClosed).toHaveBeenCalledTimes(1);
    });

    it('logs and rethrows when refetch fails', async () => {
      const error = new Error('boom');
      const refetchOpen = jest.fn().mockRejectedValue(error);
      const refetchClosed = jest.fn().mockResolvedValue(undefined);
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ refetch: refetchOpen }))
        .mockReturnValueOnce(makeQueryResult({ refetch: refetchClosed }));

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      await expect(result.current.refetch()).rejects.toThrow('boom');

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            surface: 'trader_profile',
            operation: 'refetch_positions',
          }),
        }),
      );
    });

    it('waits for both per-query refetch functions before rethrowing a failure', async () => {
      const error = new Error('open failed');
      let resolveClosed!: () => void;
      const closedPromise = new Promise<void>((resolve) => {
        resolveClosed = resolve;
      });
      const refetchOpen = jest.fn().mockRejectedValue(error);
      const refetchClosed = jest.fn().mockReturnValue(closedPromise);
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ refetch: refetchOpen }))
        .mockReturnValueOnce(makeQueryResult({ refetch: refetchClosed }));

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      const refetchPromise = result.current.refetch();
      await Promise.resolve();

      expect(refetchOpen).toHaveBeenCalledTimes(1);
      expect(refetchClosed).toHaveBeenCalledTimes(1);
      expect(Logger.error).not.toHaveBeenCalled();

      resolveClosed();

      await expect(refetchPromise).rejects.toThrow('open failed');
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            operation: 'refetch_positions',
          }),
        }),
      );
    });

    it('logs each failed per-query refetch before rethrowing the first failure', async () => {
      const openError = new Error('open failed');
      const closedError = new Error('closed failed');
      const refetchOpen = jest.fn().mockRejectedValue(openError);
      const refetchClosed = jest.fn().mockRejectedValue(closedError);
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ refetch: refetchOpen }))
        .mockReturnValueOnce(makeQueryResult({ refetch: refetchClosed }));

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      await expect(result.current.refetch()).rejects.toThrow('open failed');

      expect(Logger.error).toHaveBeenNthCalledWith(
        1,
        openError,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            operation: 'refetch_positions',
          }),
        }),
      );
      expect(Logger.error).toHaveBeenNthCalledWith(
        2,
        closedError,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            operation: 'refetch_positions',
          }),
        }),
      );
    });
  });

  describe('breadcrumbs', () => {
    it('emits a failure breadcrumb for open_positions on error', () => {
      const error = new Error('open failed');
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ error }))
        .mockReturnValueOnce(makeQueryResult());

      renderHook(() => useTraderPositions('trader-1'));

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining(
            'social_service.open_positions.failure',
          ),
        }),
      );
    });

    it('emits a failure breadcrumb for closed_positions on error', () => {
      const error = new Error('closed failed');
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult())
        .mockReturnValueOnce(makeQueryResult({ error }));

      renderHook(() => useTraderPositions('trader-1'));

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining(
            'social_service.closed_positions.failure',
          ),
        }),
      );
    });

    it('does not emit a breadcrumb when there are no errors', () => {
      renderHook(() => useTraderPositions('trader-1'));
      expect(mockAddBreadcrumb).not.toHaveBeenCalled();
    });

    it('never includes addressOrId in breadcrumb data', () => {
      const error = new Error('open failed');
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ error }))
        .mockReturnValueOnce(makeQueryResult());

      renderHook(() => useTraderPositions('0xSensitiveAddress'));

      mockAddBreadcrumb.mock.calls.forEach(([breadcrumb]) => {
        const serialised = JSON.stringify(breadcrumb);
        expect(serialised).not.toContain('0xSensitiveAddress');
      });
    });
  });

  describe('single-page mode (paginated omitted)', () => {
    it('keeps the infinite queries disabled', () => {
      renderHook(() => useTraderPositions('trader-1'));

      expect(mockUseInfiniteQuery).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ enabled: false }),
      );
      expect(mockUseInfiniteQuery).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ enabled: false }),
      );
    });

    it('reports no more pages and a no-op loadMore', () => {
      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.hasMoreOpen).toBe(false);
      expect(result.current.hasMoreClosed).toBe(false);
      expect(result.current.isFetchingMoreOpen).toBe(false);
      expect(result.current.isFetchingMoreClosed).toBe(false);
      expect(() => result.current.loadMoreOpen?.()).not.toThrow();
    });

    it('does not poll the first page even when a refetch interval is set', () => {
      jest.useFakeTimers();
      renderHook(() =>
        useTraderPositions('trader-1', { refetchInterval: 30_000 }),
      );

      jest.advanceTimersByTime(60_000);

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(mockSetQueryData).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('paginated mode', () => {
    it('reads both tabs through infinite queries and disables the single-page queries', () => {
      renderHook(() => useTraderPositions('trader-1', { paginated: true }));

      expect(mockUseInfiniteQuery).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          queryKey: [
            'SocialService:fetchOpenPositions',
            { addressOrId: 'trader-1', limit: 100 },
            'infinite',
          ],
          enabled: true,
          initialPageParam: 1,
        }),
      );
      expect(mockUseInfiniteQuery).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          queryKey: [
            'SocialService:fetchClosedPositions',
            { addressOrId: 'trader-1', sort: 'latest', limit: 100 },
            'infinite',
          ],
          enabled: true,
          initialPageParam: 1,
        }),
      );
      expect(mockUseQuery.mock.calls[0][0]).toEqual(
        expect.objectContaining({ enabled: false }),
      );
      expect(mockUseQuery.mock.calls[1][0]).toEqual(
        expect.objectContaining({ enabled: false }),
      );
    });

    it('does not forward the refetch interval to the infinite queries', () => {
      renderHook(() =>
        useTraderPositions('trader-1', {
          paginated: true,
          refetchInterval: 30_000,
        }),
      );

      expect(mockUseInfiniteQuery.mock.calls[0][0]).not.toHaveProperty(
        'refetchInterval',
      );
      expect(mockUseQuery.mock.calls[0][0]).toEqual(
        expect.objectContaining({ refetchInterval: undefined }),
      );
    });

    it('stays disabled when the wallet is locked', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectIsUnlocked) return false;
        return undefined;
      });

      renderHook(() => useTraderPositions('trader-1', { paginated: true }));

      expect(mockUseInfiniteQuery).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ enabled: false }),
      );
    });

    it('flattens loaded pages in order and drops duplicate positions', () => {
      mockUseInfiniteQuery.mockReturnValueOnce(
        makeInfiniteQueryResult({
          data: {
            pages: [makePage(['a', 'b'], true, 2), makePage(['b', 'c'])],
            pageParams: [1, 2],
          },
        }),
      );

      const { result } = renderHook(() =>
        useTraderPositions('trader-1', { paginated: true }),
      );

      expect(
        result.current.openPositions.map((position) => position.positionId),
      ).toEqual(['a', 'b', 'c']);
    });

    it('reports hasMore per tab from the infinite queries', () => {
      mockUseInfiniteQuery
        .mockReturnValueOnce(makeInfiniteQueryResult({ hasNextPage: true }))
        .mockReturnValueOnce(makeInfiniteQueryResult({ hasNextPage: false }));

      const { result } = renderHook(() =>
        useTraderPositions('trader-1', { paginated: true }),
      );

      expect(result.current.hasMoreOpen).toBe(true);
      expect(result.current.hasMoreClosed).toBe(false);
    });

    it('loads the next open page when one is available', () => {
      const fetchNextPage = jest.fn().mockResolvedValue(undefined);
      mockUseInfiniteQuery.mockReturnValueOnce(
        makeInfiniteQueryResult({ hasNextPage: true, fetchNextPage }),
      );

      const { result } = renderHook(() =>
        useTraderPositions('trader-1', { paginated: true }),
      );

      act(() => {
        result.current.loadMoreOpen?.();
      });

      expect(fetchNextPage).toHaveBeenCalledTimes(1);
      expect(fetchNextPage).toHaveBeenCalledWith({ cancelRefetch: false });
    });

    it('does not load more when no page is left', () => {
      const fetchNextPage = jest.fn().mockResolvedValue(undefined);
      mockUseInfiniteQuery.mockReturnValueOnce(
        makeInfiniteQueryResult({ hasNextPage: false, fetchNextPage }),
      );

      const { result } = renderHook(() =>
        useTraderPositions('trader-1', { paginated: true }),
      );

      act(() => {
        result.current.loadMoreOpen?.();
      });

      expect(fetchNextPage).not.toHaveBeenCalled();
    });

    it('does not start a second page while one is in flight', () => {
      const fetchNextPage = jest.fn().mockResolvedValue(undefined);
      mockUseInfiniteQuery.mockReturnValueOnce(
        makeInfiniteQueryResult({
          hasNextPage: true,
          isFetchingNextPage: true,
          fetchNextPage,
        }),
      );

      const { result } = renderHook(() =>
        useTraderPositions('trader-1', { paginated: true }),
      );

      expect(result.current.isFetchingMoreOpen).toBe(true);
      act(() => {
        result.current.loadMoreOpen?.();
      });

      expect(fetchNextPage).not.toHaveBeenCalled();
    });

    it('logs the paginated open error under the open-positions operation', () => {
      const error = new Error('page 2 failed');
      mockUseInfiniteQuery.mockReturnValueOnce(
        makeInfiniteQueryResult({ error }),
      );

      const { result } = renderHook(() =>
        useTraderPositions('trader-1', { paginated: true }),
      );

      expect(result.current.openError).toBe('page 2 failed');
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            operation: 'fetch_open_positions',
          }),
        }),
      );
    });

    it('starts over at page 1 on refetch by dropping later pages first', async () => {
      const refetchOpen = jest.fn().mockResolvedValue(undefined);
      const refetchClosed = jest.fn().mockResolvedValue(undefined);
      mockUseInfiniteQuery
        .mockReturnValueOnce(makeInfiniteQueryResult({ refetch: refetchOpen }))
        .mockReturnValueOnce(
          makeInfiniteQueryResult({ refetch: refetchClosed }),
        );

      const { result } = renderHook(() =>
        useTraderPositions('trader-1', { paginated: true }),
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockSetQueryData).toHaveBeenCalledTimes(2);
      const [openKey, openUpdater] = mockSetQueryData.mock.calls[0];
      expect(openKey).toEqual([
        'SocialService:fetchOpenPositions',
        { addressOrId: 'trader-1', limit: 100 },
        'infinite',
      ]);
      const twoPages = {
        pages: [makePage(['a']), makePage(['b'])],
        pageParams: [1, 2],
      };
      expect(openUpdater(twoPages).pages).toHaveLength(1);
      expect(refetchOpen).toHaveBeenCalledTimes(1);
      expect(refetchClosed).toHaveBeenCalledTimes(1);
    });

    it('polls only page 1 for each tab on the interval', async () => {
      jest.useFakeTimers();
      const freshFirstPage = makePage(['fresh']);
      mockEngineCall.mockResolvedValue(freshFirstPage);

      renderHook(() =>
        useTraderPositions('trader-1', {
          paginated: true,
          refetchInterval: 30_000,
        }),
      );

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'SocialService:fetchOpenPositions',
        { addressOrId: 'trader-1', limit: 100, page: 1 },
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'SocialService:fetchClosedPositions',
        { addressOrId: 'trader-1', sort: 'latest', limit: 100, page: 1 },
      );
      expect(mockSetQueryData).toHaveBeenCalledTimes(2);

      const [, openUpdater] = mockSetQueryData.mock.calls[0];
      const loaded = {
        pages: [makePage(['old-1']), makePage(['older-2'])],
        pageParams: [1, 2],
      };
      const updated = openUpdater(loaded);
      expect(updated.pages[0]).toBe(freshFirstPage);
      expect(updated.pages[1]).toBe(loaded.pages[1]);
      expect(updated.pageParams).toEqual([1, 2]);
      jest.useRealTimers();
    });

    it('skips the poll while the app is unfocused', async () => {
      jest.useFakeTimers();
      mockIsFocused.mockReturnValue(false);

      renderHook(() =>
        useTraderPositions('trader-1', {
          paginated: true,
          refetchInterval: 30_000,
        }),
      );

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('does not poll without a refetch interval', async () => {
      jest.useFakeTimers();

      renderHook(() => useTraderPositions('trader-1', { paginated: true }));

      await act(async () => {
        jest.advanceTimersByTime(120_000);
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('stops polling on unmount', async () => {
      jest.useFakeTimers();

      const { unmount } = renderHook(() =>
        useTraderPositions('trader-1', {
          paginated: true,
          refetchInterval: 30_000,
        }),
      );
      unmount();

      await act(async () => {
        jest.advanceTimersByTime(60_000);
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('logs a failed page-1 poll and leaves cached pages untouched', async () => {
      jest.useFakeTimers();
      const pollError = new Error('poll failed');
      mockEngineCall.mockRejectedValue(pollError);

      renderHook(() =>
        useTraderPositions('trader-1', {
          paginated: true,
          refetchInterval: 30_000,
        }),
      );

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });

      expect(mockSetQueryData).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(
        pollError,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            operation: 'refetch_positions',
          }),
        }),
      );
      jest.useRealTimers();
    });
  });
});
