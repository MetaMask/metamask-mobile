import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTraderFeed } from './useTraderFeed';
import type { FeedTypeFilter } from '../types';
import { FEED_CAIP2_CHAINS } from '../feed-constants';
import {
  mockFeedResponse,
  mockPerpFeedItem,
  mockSpotFeedItem,
} from '../mocks/coreFeed.mock';
import { prefetchTraderFeeds } from './traderFeedQueries';

const expectedFeedFetchOptions = {
  limit: 30,
  chains: [...FEED_CAIP2_CHAINS],
};

const mockCall = jest.fn();

// Emulate the real messenger: `call` relies on its `this` binding (it looks up
// `this.getAction(...)`). If the hook aliases `.call` into a local and detaches
// it, `this` is undefined and the real messenger throws
// "Cannot read property 'getAction' of undefined" — so this mock reproduces
// that failure mode to guard against the regression.
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      _brand: 'rootMessenger',
      call(this: unknown, ...args: unknown[]) {
        if (!this || (this as { _brand?: string })._brand !== 'rootMessenger') {
          throw new TypeError("Cannot read property 'getAction' of undefined");
        }
        return mockCall(...args);
      },
    },
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => true),
}));

jest.mock('../../../../../util/social/socialServiceTelemetry', () => ({
  useLogSocialQueryError: jest.fn(),
  formatSocialQueryErrorMessage: (error: unknown) =>
    error ? (error instanceof Error ? error.message : String(error)) : null,
}));

const createWrapper = (queryClient?: QueryClient) => {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
};

describe('useTraderFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the leaderboard scope for the "all" audience and groups items', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));

    const { result } = renderHook(() => useTraderFeed({ audience: 'all' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(mockCall).toHaveBeenCalledWith('SocialService:fetchFeed', {
      scope: 'leaderboard',
      ...expectedFeedFetchOptions,
    });
    expect(result.current.sections).toHaveLength(1);
  });

  it('fetches the following scope for the "following" audience', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));

    const { result } = renderHook(
      () => useTraderFeed({ audience: 'following' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(mockCall).toHaveBeenCalledWith('SocialService:fetchFeed', {
      scope: 'following',
      ...expectedFeedFetchOptions,
    });
  });

  it('paginates using the older cursor when loadMore is called', async () => {
    mockCall
      .mockResolvedValueOnce(mockFeedResponse([mockSpotFeedItem()], 'cursor-1'))
      .mockResolvedValueOnce(mockFeedResponse([mockPerpFeedItem()]));

    const { result } = renderHook(() => useTraderFeed({ audience: 'all' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(mockCall).toHaveBeenLastCalledWith('SocialService:fetchFeed', {
      scope: 'leaderboard',
      ...expectedFeedFetchOptions,
      olderThan: 'cursor-1',
    });
  });

  it('returns empty sections when the feed has no items', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([]));

    const { result } = renderHook(() => useTraderFeed(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(0);
    expect(result.current.sections).toHaveLength(0);
  });

  it('does not fetch while disabled and fetches once enabled', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useTraderFeed({ audience: 'all', enabled }),
      { wrapper: createWrapper(), initialProps: { enabled: false } },
    );

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);

    rerender({ enabled: true });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  // `dataUpdatedAt` is what consumers use both as the clock for relative ages
  // and as the signal that busts memoized rows. It has to move on a refetch
  // that returns an identical payload — the case where React Query's
  // structural sharing keeps the previous `data` reference, so nothing else in
  // the result changes.
  it('advances dataUpdatedAt when a refetch returns a reference-identical payload', async () => {
    // The same object every call, so structural sharing definitely kicks in.
    const identicalPage = mockFeedResponse([mockSpotFeedItem()]);
    mockCall.mockResolvedValue(identicalPage);

    jest.useFakeTimers();
    try {
      const { result, rerender } = renderHook(
        () => useTraderFeed({ audience: 'all' }),
        { wrapper: createWrapper() },
      );

      expect(result.current.dataUpdatedAt).toBeUndefined();

      await waitFor(() => expect(result.current.items).toHaveLength(1));

      const firstFetchAt = result.current.dataUpdatedAt as number;
      expect(typeof firstFetchAt).toBe('number');

      jest.setSystemTime(firstFetchAt + 10_000);

      await act(async () => {
        await result.current.refresh();
      });

      // Nothing else in the result changed — the payload is the same object —
      // so a render is needed to read the advanced instant back out.
      act(() => {
        rerender(undefined);
      });

      expect(result.current.dataUpdatedAt).toBeGreaterThanOrEqual(
        firstFetchAt + 10_000,
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('resets to the first page and refetches the newest activity on refresh', async () => {
    mockCall
      .mockResolvedValueOnce(mockFeedResponse([mockSpotFeedItem()], 'cursor-1'))
      .mockResolvedValueOnce(mockFeedResponse([mockPerpFeedItem()]));

    const { result } = renderHook(() => useTraderFeed({ audience: 'all' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));

    mockCall.mockClear();
    mockCall.mockResolvedValueOnce(mockFeedResponse([mockSpotFeedItem()]));

    await act(async () => {
      await result.current.refresh();
    });

    // Only the newest (first) page is refetched, without the older cursor.
    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(mockCall).toHaveBeenCalledWith('SocialService:fetchFeed', {
      scope: 'leaderboard',
      ...expectedFeedFetchOptions,
    });
    // Older paginated pages are dropped, leaving just the fresh first page.
    await waitFor(() => expect(result.current.items).toHaveLength(1));
  });

  it('surfaces a normalised error message and no items on failure', async () => {
    mockCall.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useTraderFeed(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBe('boom'));
    expect(result.current.items).toHaveLength(0);
    expect(result.current.hasLoadedItems).toBe(false);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('filters loaded items to spot rows for the tokens type filter', async () => {
    mockCall.mockResolvedValue(
      mockFeedResponse([mockSpotFeedItem(), mockPerpFeedItem()]),
    );

    const { result } = renderHook(
      () => useTraderFeed({ typeFilter: 'tokens' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.hasLoadedItems).toBe(true));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.type).toBe('spot');
  });

  it('filters loaded items to perp rows for the perps type filter', async () => {
    mockCall.mockResolvedValue(
      mockFeedResponse([mockSpotFeedItem(), mockPerpFeedItem()]),
    );

    const { result } = renderHook(
      () => useTraderFeed({ typeFilter: 'perps' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.hasLoadedItems).toBe(true));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.type).toBe('perps');
  });

  it('sorts loaded items newest-first so same-day rows share one section header', async () => {
    const newerSameDay = mockSpotFeedItem({
      positionId: 'pos-newer-same-day',
      timestamp: 1_777_000_800,
    });
    const olderDifferentDay = mockPerpFeedItem({
      positionId: 'pos-older-day',
      timestamp: 1_776_800_000,
    });
    const olderSameDay = mockSpotFeedItem({
      positionId: 'pos-older-same-day',
      timestamp: 1_777_000_100,
    });
    mockCall.mockResolvedValue(
      mockFeedResponse([olderSameDay, olderDifferentDay, newerSameDay]),
    );

    const { result } = renderHook(() => useTraderFeed({ audience: 'all' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.items).toHaveLength(3));

    expect(result.current.items.map((item) => item.timestamp)).toEqual([
      1_777_000_800_000, 1_777_000_100_000, 1_776_800_000_000,
    ]);
    expect(result.current.sections).toHaveLength(2);
    expect(result.current.sections[0]?.data).toHaveLength(2);
    expect(result.current.sections[1]?.data).toHaveLength(1);
  });

  // Mirrors a real leaderboard response: the feed splices a notable position
  // from two days earlier into the middle of the page, and the `olderThan`
  // cursor is the last item's timestamp — so page 2 returns events that are
  // newer than that spliced-in row. Without a global sort the day headers read
  // Aug 20, Aug 18, Aug 20.
  it('keeps one section per day when a later page is newer than a spliced-in row', async () => {
    const newest = mockSpotFeedItem({
      positionId: 'pos-aug-20-latest',
      timestamp: 1_787_217_322, // Aug 20 05:15 EDT
    });
    const splicedInOlderDay = mockPerpFeedItem({
      positionId: 'pos-aug-18-spliced',
      timestamp: 1_787_069_401, // Aug 18 12:10 EDT
    });
    const pageBoundary = mockSpotFeedItem({
      positionId: 'pos-aug-20-boundary',
      timestamp: 1_787_215_115, // Aug 20 04:38 EDT
    });
    const nextPage = mockPerpFeedItem({
      positionId: 'pos-aug-20-next-page',
      timestamp: 1_787_209_200, // Aug 20 03:00 EDT
    });
    mockCall
      .mockResolvedValueOnce(
        mockFeedResponse(
          [newest, splicedInOlderDay, pageBoundary],
          'older-cursor',
        ),
      )
      .mockResolvedValueOnce(mockFeedResponse([nextPage]));

    const { result } = renderHook(() => useTraderFeed({ audience: 'all' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.items).toHaveLength(4));

    expect(result.current.items.map((item) => item.timestamp)).toEqual([
      1_787_217_322_000, 1_787_215_115_000, 1_787_209_200_000,
      1_787_069_401_000,
    ]);
    expect(result.current.sections).toHaveLength(2);
    expect(result.current.sections[0]?.data).toHaveLength(3);
    expect(result.current.sections[1]?.data).toHaveLength(1);
  });

  it('does not refetch when the type filter changes', async () => {
    mockCall.mockResolvedValue(
      mockFeedResponse([mockSpotFeedItem(), mockPerpFeedItem()]),
    );

    const { result, rerender } = renderHook(
      ({ typeFilter }: { typeFilter: FeedTypeFilter }) =>
        useTraderFeed({ typeFilter }),
      {
        wrapper: createWrapper(),
        initialProps: { typeFilter: 'tokens' },
      },
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(mockCall).toHaveBeenCalledTimes(1);

    mockCall.mockClear();
    rerender({ typeFilter: 'perps' });

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.type).toBe('perps');
    expect(result.current.hasLoadedItems).toBe(true);
  });

  it('does not refetch when first-page data is already in the cache', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 5 * 60 * 1000 },
      },
    });

    await prefetchTraderFeeds(queryClient);
    expect(mockCall).toHaveBeenCalledTimes(2);
    mockCall.mockClear();

    const { result } = renderHook(
      () => useTraderFeed({ audience: 'following' }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});
