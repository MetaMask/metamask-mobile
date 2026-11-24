import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  QueryClient,
  QueryClientProvider,
  type InfiniteData,
} from '@tanstack/react-query';
import type {
  FeedItem as CoreFeedItem,
  FeedResponse,
} from '@metamask/social-controllers';
import { useSelector } from 'react-redux';
import { mockSpotFeedItem } from '../mocks/coreFeed.mock';
import type { SocialFeedSource } from './socialFeedSource';
import { useSocialFeed } from './useSocialFeed';
import { useSocialFeedRealtime } from './useSocialFeedRealtime';

const mockCall = jest.fn();

jest.mock('./useSocialFeedRealtime', () => {
  const actual = jest.requireActual('./useSocialFeedRealtime');
  return {
    ...actual,
    useSocialFeedRealtime: jest.fn(actual.useSocialFeedRealtime),
  };
});

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
    },
    context: {},
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => true),
}));

jest.mock('../../../../util/social/socialServiceTelemetry', () => ({
  useLogSocialQueryError: jest.fn(),
  formatSocialQueryErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : null,
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseSocialFeedRealtime = jest.mocked(useSocialFeedRealtime);

const MAX_PAGES = 3;
const ITEMS_PER_PAGE = 2;
const liveSource: SocialFeedSource = { scope: 'all' };

interface FeedOptions {
  olderThan?: string;
  newerThan?: string;
}

/** Page `n` holds older posts than page `n - 1`. */
const pageItems = (page: number): CoreFeedItem[] =>
  Array.from({ length: ITEMS_PER_PAGE }, (_, index) => {
    const timestamp = 1_700_000_000 - (page * ITEMS_PER_PAGE + index) * 60;
    return mockSpotFeedItem({
      positionId: `p${page}-${index}`,
      timestamp,
      lastTradeAt: timestamp,
      trades: [
        {
          ...mockSpotFeedItem().trades[0],
          timestamp,
        },
      ],
    });
  });

const feedPage = (page: number): FeedResponse => ({
  items: pageItems(page),
  pagination: {
    olderCursor: `older-${page + 1}`,
    newerCursor: `newer-${page}`,
  },
});

/** A cursor feed: `olderThan: older-n` is page n, `newerThan: newer-n` page n - 1. */
const serveFeed = async (
  _action: string,
  options: FeedOptions,
): Promise<FeedResponse> => {
  if (options.newerThan) {
    const page = Number(options.newerThan.replace('newer-', '')) - 1;
    return page < 0
      ? { items: [], pagination: { olderCursor: null, newerCursor: null } }
      : feedPage(page);
  }
  if (options.olderThan) {
    return feedPage(Number(options.olderThan.replace('older-', '')));
  }
  return feedPage(0);
};

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, wrapper };
};

const positionIds = (
  posts: { position?: { positionId: string } }[],
): (string | undefined)[] => posts.map((post) => post.position?.positionId);

const cachedPages = (client: QueryClient): number => {
  const [query] = client.getQueryCache().getAll();
  return (
    (query?.state.data as InfiniteData<FeedResponse> | undefined)?.pages
      .length ?? 0
  );
};

describe('useSocialFeed with maxPages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(true);
    mockCall.mockImplementation(serveFeed);
    mockUseSocialFeedRealtime.mockImplementation(
      jest.requireActual('./useSocialFeedRealtime').useSocialFeedRealtime,
    );
  });

  const renderBounded = (maxPages: number | null = MAX_PAGES) => {
    const { client, wrapper } = createWrapper();
    const hook = renderHook(
      () =>
        useSocialFeed(liveSource, {
          maxPages: maxPages ?? undefined,
          pageSize: ITEMS_PER_PAGE,
        }),
      { wrapper },
    );
    return { client, ...hook };
  };

  const loadPages = async (
    result: { current: ReturnType<typeof useSocialFeed> },
    count: number,
  ) => {
    for (let page = 1; page < count; page++) {
      await waitFor(() =>
        expect(result.current.isFetchingNextPage).toBe(false),
      );
      act(() => result.current.loadMore());
      await waitFor(() =>
        expect(positionIds(result.current.posts)).toContain(`p${page}-0`),
      );
    }
    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false));
  };

  it('keeps every page without maxPages', async () => {
    const { result, client } = renderBounded(null);
    await waitFor(() => expect(result.current.posts).toHaveLength(2));

    await loadPages(result, 5);

    expect(cachedPages(client)).toBe(5);
    expect(result.current.hasPreviousPage).toBe(false);
  });

  it('stays bounded after paging through more than 100 pages', async () => {
    const { result, client } = renderBounded();
    await waitFor(() => expect(result.current.posts).toHaveLength(2));

    await loadPages(result, 105);

    expect(cachedPages(client)).toBe(MAX_PAGES);
    expect(result.current.posts).toHaveLength(MAX_PAGES * ITEMS_PER_PAGE);
    expect(positionIds(result.current.posts)).toEqual([
      'p102-0',
      'p102-1',
      'p103-0',
      'p103-1',
      'p104-0',
      'p104-1',
    ]);
    expect(result.current.hasPreviousPage).toBe(true);
  }, 60_000);

  it('fetches a dropped newer page with newerThan when going back up', async () => {
    const { result } = renderBounded();
    await waitFor(() => expect(result.current.posts).toHaveLength(2));
    await loadPages(result, 5);

    act(() => result.current.loadPrevious?.());

    await waitFor(() =>
      expect(positionIds(result.current.posts)[0]).toBe('p1-0'),
    );
    expect(mockCall).toHaveBeenLastCalledWith(
      'SocialService:fetchFeed',
      expect.objectContaining({ newerThan: 'newer-2' }),
    );
    expect(positionIds(result.current.posts)).toEqual([
      'p1-0',
      'p1-1',
      'p2-0',
      'p2-1',
      'p3-0',
      'p3-1',
    ]);
  });

  it('stops going back up once nothing newer is left', async () => {
    const { result } = renderBounded();
    await waitFor(() => expect(result.current.posts).toHaveLength(2));
    await loadPages(result, 4);

    for (const expectedTop of ['p0-0', undefined]) {
      act(() => result.current.loadPrevious?.());
      await waitFor(() =>
        expect(result.current.isFetchingPreviousPage).toBe(false),
      );
      if (expectedTop) {
        await waitFor(() =>
          expect(positionIds(result.current.posts)[0]).toBe(expectedTop),
        );
      }
    }

    await waitFor(() => expect(result.current.hasPreviousPage).toBe(false));
    const calls = mockCall.mock.calls.length;
    act(() => result.current.loadPrevious?.());
    expect(mockCall).toHaveBeenCalledTimes(calls);
  });

  it('refreshes to the newest page after the first page was dropped', async () => {
    const { result, client } = renderBounded();
    await waitFor(() => expect(result.current.posts).toHaveLength(2));
    await loadPages(result, 6);
    expect(result.current.hasPreviousPage).toBe(true);
    mockCall.mockClear();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockCall).toHaveBeenCalledTimes(1);
    const [, options] = mockCall.mock.calls[0];
    expect(options).not.toHaveProperty('olderThan');
    expect(options).not.toHaveProperty('newerThan');
    await waitFor(() =>
      expect(positionIds(result.current.posts)).toEqual(['p0-0', 'p0-1']),
    );
    expect(cachedPages(client)).toBe(1);
    expect(result.current.hasPreviousPage).toBe(false);
  });

  it('does not page back while a next page is loading', async () => {
    const { result } = renderBounded();
    await waitFor(() => expect(result.current.posts).toHaveLength(2));
    await loadPages(result, 5);
    let resolveNext: (page: FeedResponse) => void = () => undefined;
    mockCall.mockImplementationOnce(
      async () =>
        new Promise<FeedResponse>((resolve) => {
          resolveNext = resolve;
        }),
    );

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(true));
    const calls = mockCall.mock.calls.length;
    act(() => result.current.loadPrevious?.());

    expect(mockCall).toHaveBeenCalledTimes(calls);
    await act(async () => resolveNext(feedPage(5)));
  });

  it('holds new socket posts while newer pages are dropped', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSocialFeed(liveSource, {
          maxPages: MAX_PAGES,
          pageSize: ITEMS_PER_PAGE,
          realtime: true,
          nearTop: true,
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.posts).toHaveLength(2));
    await loadPages(result, 5);

    const [, options] = mockUseSocialFeedRealtime.mock.lastCall ?? [];
    expect(options?.nearTop).toBe(false);
  });

  it('streams normally while the newest page is loaded', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSocialFeed(liveSource, {
          maxPages: MAX_PAGES,
          pageSize: ITEMS_PER_PAGE,
          realtime: true,
          nearTop: true,
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.posts).toHaveLength(2));

    const [, options] = mockUseSocialFeedRealtime.mock.lastCall ?? [];
    expect(options?.nearTop).toBe(true);
  });
});
