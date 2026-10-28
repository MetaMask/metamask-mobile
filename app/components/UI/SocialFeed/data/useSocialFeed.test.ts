import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  hashKey,
  hydrate,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useLogSocialQueryError } from '../../../../util/social/socialServiceTelemetry';
import { FEED_CAIP2_CHAINS } from './feed-constants';
import { FEED_PAGE_LIMIT, buildSocialFeedQueryKey } from './socialFeedQueries';
import { mockFeedResponse, mockSpotFeedItem } from '../mocks/coreFeed.mock';
import {
  toSocialFeedRequest,
  type SocialFeedQuery,
  type SocialFeedSource,
} from './socialFeedSource';
import { useSocialFeed } from './useSocialFeed';
import {
  useSocialFeedRealtime,
  type UseSocialFeedRealtimeResult,
} from './useSocialFeedRealtime';
import { createSocialFeedEntrances } from './socialFeedEntrances';
import type { SocialV1FeedPost } from '../types';
import { mapFeedItem } from '../utils/mapFeedItem';
import { toSocialFeedPosts } from '../utils/toSocialFeedPosts';
import { measureSocialDataFetch } from '../../../../util/social/socialPerformance';

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

jest.mock('../../../../util/social/socialServiceTelemetry', () => ({
  useLogSocialQueryError: jest.fn(),
  formatSocialQueryErrorMessage: (error: unknown) =>
    error ? (error instanceof Error ? error.message : String(error)) : null,
}));

jest.mock('../../../../util/social/socialPerformance', () => ({
  measureSocialDataFetch: jest.fn(
    ({ request }: { request: () => Promise<unknown> }) => request(),
  ),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseLogSocialQueryError = jest.mocked(useLogSocialQueryError);
const mockUseSocialFeedRealtime = jest.mocked(useSocialFeedRealtime);
const mockMeasureSocialDataFetch = jest.mocked(measureSocialDataFetch);

const createWrapper = (staleTime = 0) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, wrapper };
};

const perpSource: SocialFeedSource = { kind: 'perp', symbol: 'BTC' };

const olderItem = mockSpotFeedItem({
  positionId: 'older',
  timestamp: 1_700_000_000,
});
const newerItem = mockSpotFeedItem({
  positionId: 'newer',
  timestamp: 1_700_000_900,
});

describe('useSocialFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(true);
    mockUseSocialFeedRealtime.mockImplementation(
      jest.requireActual('./useSocialFeedRealtime').useSocialFeedRealtime,
    );
  });

  it('stays idle for a null source', () => {
    const { result } = renderHook(() => useSocialFeed(null), {
      wrapper: createWrapper().wrapper,
    });

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.posts).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('stays idle for a source with no feed, such as an untracked chain', () => {
    const { result } = renderHook(
      () =>
        useSocialFeed({ kind: 'token', assetId: 'eip155:42161/erc20:0xabc' }),
      { wrapper: createWrapper().wrapper },
    );

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('does not fetch while the wallet is locked', () => {
    mockUseSelector.mockReturnValue(false);

    renderHook(() => useSocialFeed(perpSource), {
      wrapper: createWrapper().wrapper,
    });

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useSocialFeed(perpSource, { enabled: false }), {
      wrapper: createWrapper().wrapper,
    });

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('fetches a token source with the normalised contract and page size', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));

    const { result } = renderHook(
      () =>
        useSocialFeed(
          {
            kind: 'token',
            assetId:
              'eip155:1/erc20:0x910037DC20FBDF3A347979A9553F3B8100B5EFEB',
          },
          { pageSize: 3 },
        ),
      { wrapper: createWrapper().wrapper },
    );

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(mockCall).toHaveBeenCalledWith('SocialService:fetchTokenFeed', {
      chain: 'ethereum',
      contractAddress: '0x910037dc20fbdf3a347979a9553f3b8100b5efeb',
      limit: 3,
    });
    expect(result.current.rows[0]?.core.positionId).toBe('pos-spot-1');
    expect(result.current.posts[0]?.item.asset.symbol).toBe('PEPE');
    expect(result.current.dataUpdatedAt).toEqual(expect.any(Number));
  });

  it('loads every trader on the chain for a native asset', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([olderItem, newerItem]));

    const { result } = renderHook(
      () =>
        useSocialFeed(
          { kind: 'token', assetId: 'eip155:1/slip44:60' },
          { pageSize: 3 },
        ),
      { wrapper: createWrapper().wrapper },
    );

    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(mockCall).toHaveBeenCalledWith('SocialService:fetchFeed', {
      scope: 'leaderboard',
      chains: ['eip155:1'],
      limit: 3,
    });
    expect(result.current.rows.map((row) => row.core.positionId)).toEqual([
      'newer',
      'older',
    ]);
  });

  it('defaults to the shared feed page size', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([]));

    renderHook(
      () => useSocialFeed({ kind: 'trader', addressOrId: 'profile-1' }),
      { wrapper: createWrapper().wrapper },
    );

    await waitFor(() =>
      expect(mockCall).toHaveBeenCalledWith('SocialService:fetchTraderFeed', {
        addressOrId: 'profile-1',
        limit: FEED_PAGE_LIMIT,
      }),
    );
  });

  it('does not refetch on focus or reconnect', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([]));
    const { client, wrapper } = createWrapper();

    renderHook(() => useSocialFeed(perpSource), { wrapper });
    await waitFor(() => expect(mockCall).toHaveBeenCalled());

    const observer = client.getQueryCache().getAll()[0]?.observers[0];
    expect(observer?.options.refetchOnWindowFocus).toBe(false);
    expect(observer?.options.refetchOnReconnect).toBe(false);
  });

  it('shares one cache entry between sources that normalise to the same request', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));
    const { client, wrapper } = createWrapper();

    const { result } = renderHook(
      () => ({
        checksummed: useSocialFeed({
          kind: 'token',
          assetId: 'eip155:1/erc20:0xABC0000000000000000000000000000000000001',
        }),
        lowercase: useSocialFeed({
          kind: 'token',
          assetId: 'eip155:1/erc20:0xabc0000000000000000000000000000000000001',
        }),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.lowercase.posts).toHaveLength(1));
    expect(result.current.checksummed.posts).toHaveLength(1);
    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(client.getQueryCache().getAll()).toHaveLength(1);
  });

  describe('query', () => {
    const trendingQuery: SocialFeedQuery = { scope: 'trending' };
    const assetIds = [
      'eip155:999/perp:BTC',
      'eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    ] as const;

    it('sends assetIds with the chains on the global feed', async () => {
      mockCall.mockResolvedValue(mockFeedResponse([]));

      renderHook(() => useSocialFeed({ ...trendingQuery, assetIds }), {
        wrapper: createWrapper().wrapper,
      });

      await waitFor(() =>
        expect(mockCall).toHaveBeenCalledWith('SocialService:fetchFeed', {
          scope: 'trending',
          chains: [...FEED_CAIP2_CHAINS],
          assetIds: [...assetIds],
          limit: FEED_PAGE_LIMIT,
        }),
      );
    });

    it('sends the trader and commented-only options', async () => {
      mockCall.mockResolvedValue(mockFeedResponse([]));

      renderHook(
        () =>
          useSocialFeed({
            scope: 'all',
            profileId: 'profile-1',
            commentedOnly: true,
          }),
        { wrapper: createWrapper().wrapper },
      );

      await waitFor(() =>
        expect(mockCall).toHaveBeenCalledWith('SocialService:fetchFeed', {
          scope: 'all',
          chains: [...FEED_CAIP2_CHAINS],
          profileId: 'profile-1',
          commentedOnly: true,
          limit: FEED_PAGE_LIMIT,
        }),
      );
    });

    it('keys the cache on assetIds', async () => {
      mockCall.mockResolvedValue(mockFeedResponse([]));
      const { client, wrapper } = createWrapper();
      const filteredQuery: SocialFeedQuery = { ...trendingQuery, assetIds };

      renderHook(
        () => ({
          all: useSocialFeed(trendingQuery),
          filtered: useSocialFeed(filteredQuery),
        }),
        { wrapper },
      );

      await waitFor(() => expect(mockCall).toHaveBeenCalledTimes(2));
      const filteredRequest = toSocialFeedRequest(filteredQuery);
      if (!filteredRequest) {
        throw new Error('Expected a request for the global feed');
      }
      expect(
        client.getQueryCache().find({
          queryKey: buildSocialFeedQueryKey(filteredRequest, FEED_PAGE_LIMIT),
          exact: true,
        }),
      ).toBeDefined();
      expect(client.getQueryCache().getAll()).toHaveLength(2);
    });

    it('omits an empty assetIds filter and shares the unfiltered entry', async () => {
      mockCall.mockResolvedValue(mockFeedResponse([]));
      const { client, wrapper } = createWrapper();

      renderHook(() => useSocialFeed({ ...trendingQuery, assetIds: [] }), {
        wrapper,
      });

      await waitFor(() =>
        expect(mockCall).toHaveBeenCalledWith('SocialService:fetchFeed', {
          scope: 'trending',
          chains: [...FEED_CAIP2_CHAINS],
          limit: FEED_PAGE_LIMIT,
        }),
      );
      expect(client.getQueryCache().getAll()[0]?.queryHash).toBe(
        hashKey(
          buildSocialFeedQueryKey(
            {
              action: 'SocialService:fetchFeed',
              options: { scope: 'trending', chains: FEED_CAIP2_CHAINS },
            },
            FEED_PAGE_LIMIT,
          ),
        ),
      );
    });

    it('turns realtime off while filtering by asset', async () => {
      mockCall.mockResolvedValue(mockFeedResponse([]));

      renderHook(
        () => useSocialFeed({ scope: 'all', assetIds }, { realtime: true }),
        { wrapper: createWrapper().wrapper },
      );

      await waitFor(() => expect(mockCall).toHaveBeenCalled());
      expect(mockUseSocialFeedRealtime).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ realtimeScope: null }),
      );
    });

    it('keeps the pages fresh for the staleTime it is given', async () => {
      mockCall.mockResolvedValue(mockFeedResponse([]));
      const { client, wrapper } = createWrapper();

      renderHook(() => useSocialFeed(trendingQuery, { staleTime: Infinity }), {
        wrapper,
      });
      await waitFor(() => expect(mockCall).toHaveBeenCalled());

      const observer = client.getQueryCache().getAll()[0]?.observers[0];
      expect(observer?.options.staleTime).toBe(Infinity);
    });
  });

  it('sorts the global feed newest first', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([olderItem, newerItem]));

    const { result } = renderHook(
      () => useSocialFeed({ scope: 'leaderboard' }),
      { wrapper: createWrapper().wrapper },
    );

    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(result.current.rows.map((row) => row.core.positionId)).toEqual([
      'newer',
      'older',
    ]);
  });

  it('keeps the API order on a scoped feed', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([olderItem, newerItem]));

    const { result } = renderHook(() => useSocialFeed(perpSource), {
      wrapper: createWrapper().wrapper,
    });

    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(result.current.rows.map((row) => row.core.positionId)).toEqual([
      'older',
      'newer',
    ]);
  });

  it('pages with olderThan, ignores a load-more already in flight, then refreshes only the first page', async () => {
    let resolveNextPage: (
      value: ReturnType<typeof mockFeedResponse>,
    ) => void = () => undefined;
    mockCall.mockImplementation(
      (_action: string, options: { olderThan?: string }) => {
        if (options.olderThan) {
          return new Promise((resolve) => {
            resolveNextPage = resolve;
          });
        }
        return Promise.resolve(mockFeedResponse([newerItem], 'cursor-1'));
      },
    );

    const { result } = renderHook(() => useSocialFeed(perpSource), {
      wrapper: createWrapper().wrapper,
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(true));
    act(() => {
      result.current.loadMore();
    });
    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(mockCall).toHaveBeenLastCalledWith('SocialService:fetchTokenFeed', {
      chain: 'hyperliquid',
      contractAddress: 'BTC',
      limit: FEED_PAGE_LIMIT,
      olderThan: 'cursor-1',
    });

    await act(async () => {
      resolveNextPage(mockFeedResponse([olderItem]));
    });
    await waitFor(() => expect(result.current.posts).toHaveLength(2));

    mockCall.mockClear();
    mockCall.mockResolvedValue(mockFeedResponse([newerItem]));
    await act(async () => {
      await result.current.refresh();
    });

    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(mockCall).toHaveBeenCalledWith('SocialService:fetchTokenFeed', {
      chain: 'hyperliquid',
      contractAddress: 'BTC',
      limit: FEED_PAGE_LIMIT,
    });
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
  });

  it('surfaces a fetch error, logs it, and does not page further', async () => {
    mockCall.mockRejectedValue(new Error('feed down'));

    const { result } = renderHook(() => useSocialFeed(perpSource), {
      wrapper: createWrapper().wrapper,
    });

    await waitFor(() => expect(result.current.error).toBe('feed down'));
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.posts).toEqual([]);
    expect(mockUseLogSocialQueryError).toHaveBeenLastCalledWith(
      expect.any(Error),
      expect.objectContaining({
        operation: 'fetch_token_feed',
        source: 'useSocialFeed',
        queryParams: { chain: 'hyperliquid', contractAddress: 'BTC' },
      }),
    );

    result.current.loadMore();
    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it('keeps paginated posts when a plain feed page hydrates under the service key', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));
    const { client, wrapper } = createWrapper();
    const source: SocialFeedSource = {
      kind: 'trader',
      addressOrId: '0xabc',
      commentedOnly: true,
    };
    const request = toSocialFeedRequest(source);
    if (!request) {
      throw new Error('trader source did not resolve to a feed request');
    }
    const infiniteKey = buildSocialFeedQueryKey(request, FEED_PAGE_LIMIT);
    const serviceKey = [
      'SocialService:fetchTraderFeed',
      { addressOrId: '0xabc', commentedOnly: true, limit: FEED_PAGE_LIMIT },
    ] as const;
    const hydratedPage = mockFeedResponse([
      mockSpotFeedItem({ positionId: 'hydrated-page' }),
    ]);

    const { result } = renderHook(() => useSocialFeed(source), { wrapper });

    await waitFor(() => expect(result.current.posts).toHaveLength(1));

    act(() => {
      hydrate(client, {
        queries: [
          {
            queryHash: hashKey(serviceKey),
            queryKey: [...serviceKey],
            dehydratedAt: Date.now() + 60_000,
            state: {
              data: hydratedPage,
              dataUpdateCount: 1,
              dataUpdatedAt: Date.now() + 60_000,
              error: null,
              errorUpdateCount: 0,
              errorUpdatedAt: 0,
              fetchFailureCount: 0,
              fetchFailureReason: null,
              fetchMeta: null,
              isInvalidated: false,
              status: 'success',
              fetchStatus: 'idle',
            },
          },
        ],
      });
    });

    expect(hashKey(serviceKey)).not.toBe(hashKey(infiniteKey));
    expect(result.current.posts).toHaveLength(1);
    expect(result.current.error).toBeNull();
    expect(client.getQueryData(infiniteKey)).toEqual(
      expect.objectContaining({
        pages: [expect.objectContaining({ items: expect.any(Array) })],
      }),
    );
    expect(client.getQueryData(serviceKey)).toEqual(hydratedPage);
  });

  it('does nothing on refresh or load-more without a source', async () => {
    const { result } = renderHook(() => useSocialFeed(null), {
      wrapper: createWrapper().wrapper,
    });

    await result.current.refresh();
    result.current.loadMore();

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('applies filterPost to the posts but not the rows', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([olderItem, newerItem]));
    const filterPost = (post: SocialV1FeedPost) =>
      post.position?.positionId === 'older';

    const { result } = renderHook(
      () => useSocialFeed(perpSource, { filterPost }),
      { wrapper: createWrapper().wrapper },
    );

    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(
      result.current.posts.map((post) => post.position?.positionId),
    ).toEqual(['older']);
  });

  describe('realtime', () => {
    const trendingSource: SocialFeedSource = {
      scope: 'trending',
    };

    it('keeps realtime off and omits its state by default', async () => {
      mockCall.mockResolvedValue(mockFeedResponse([]));

      const { result } = renderHook(() => useSocialFeed(trendingSource), {
        wrapper: createWrapper().wrapper,
      });

      await waitFor(() => expect(mockCall).toHaveBeenCalled());
      expect(mockUseSocialFeedRealtime).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ realtimeScope: null }),
      );
      expect(result.current).not.toHaveProperty('realtime');
    });

    it('ignores realtime for a source without a socket channel', () => {
      renderHook(() => useSocialFeed(perpSource, { realtime: true }), {
        wrapper: createWrapper().wrapper,
      });

      expect(mockUseSocialFeedRealtime).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ realtimeScope: null }),
      );
    });

    it('streams the source scope with the hold options', () => {
      mockUseSocialFeedRealtime.mockReturnValue(null);
      mockUseSelector.mockReturnValue(false);
      const filterPost = jest.fn(() => true);

      renderHook(
        () =>
          useSocialFeed(trendingSource, {
            realtime: true,
            paused: true,
            nearTop: false,
            holdNewPosts: true,
            filterPost,
          }),
        { wrapper: createWrapper().wrapper },
      );

      expect(mockUseSocialFeedRealtime).toHaveBeenLastCalledWith(
        expect.objectContaining({ rows: [], dataUpdatedAt: undefined }),
        {
          realtimeScope: 'trending',
          active: false,
          paused: true,
          nearTop: false,
          holdNewPosts: true,
          filterPost,
        },
      );
    });

    it('returns the realtime posts and state while streaming', () => {
      const liveCore = mockSpotFeedItem({ positionId: 'live-post' });
      const liveItem = mapFeedItem(liveCore);
      if (!liveItem) {
        throw new Error('Expected the feed item to map');
      }
      const [livePost] = toSocialFeedPosts(
        [{ core: liveCore, item: liveItem }],
        0,
      );
      const live: UseSocialFeedRealtimeResult = {
        posts: [livePost],
        realtime: {
          pendingNewCount: 3,
          revealPending: jest.fn(),
          entrances: createSocialFeedEntrances(),
        },
      };
      mockUseSocialFeedRealtime.mockReturnValue(live);
      mockCall.mockResolvedValue(mockFeedResponse([]));

      const { result } = renderHook(
        () => useSocialFeed(trendingSource, { realtime: true }),
        { wrapper: createWrapper().wrapper },
      );

      expect(result.current.posts).toEqual([livePost]);
      expect(result.current.realtime).toBe(live.realtime);
    });

    it('never marks the pages stale while streaming', async () => {
      mockUseSocialFeedRealtime.mockReturnValue(null);
      mockCall.mockResolvedValue(mockFeedResponse([]));
      const { client, wrapper } = createWrapper();

      renderHook(() => useSocialFeed(trendingSource, { realtime: true }), {
        wrapper,
      });
      await waitFor(() => expect(mockCall).toHaveBeenCalled());

      const observer = client.getQueryCache().getAll()[0]?.observers[0];
      expect(observer?.options.staleTime).toBe(Infinity);
    });

    it('keeps every loaded page while streaming', async () => {
      mockUseSocialFeedRealtime.mockReturnValue(null);
      const oldestItem = mockSpotFeedItem({
        positionId: 'oldest',
        timestamp: 1_699_999_000,
      });
      mockCall.mockImplementation(
        (_action: string, options: { olderThan?: string }) => {
          if (options.olderThan === 'cursor-2') {
            return Promise.resolve(mockFeedResponse([oldestItem]));
          }
          if (options.olderThan === 'cursor-1') {
            return Promise.resolve(mockFeedResponse([olderItem], 'cursor-2'));
          }
          return Promise.resolve(mockFeedResponse([newerItem], 'cursor-1'));
        },
      );
      const { result } = renderHook(
        () => useSocialFeed(trendingSource, { realtime: true }),
        { wrapper: createWrapper().wrapper },
      );
      await waitFor(() => expect(result.current.hasNextPage).toBe(true));

      act(() => result.current.loadMore());
      await waitFor(() => expect(result.current.posts).toHaveLength(2));
      act(() => result.current.loadMore());

      await waitFor(() => expect(result.current.posts).toHaveLength(3));
      expect(result.current.hasNextPage).toBe(false);
    });
  });

  it('measures the first Social V1 initial-page request as cold', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));

    const { result } = renderHook(
      () =>
        useSocialFeed(
          { scope: 'trending' },
          { performance: { tab: 'trending' } },
        ),
      { wrapper: createWrapper().wrapper },
    );

    await waitFor(() => expect(result.current.posts).toHaveLength(1));

    expect(mockMeasureSocialDataFetch).toHaveBeenCalledTimes(1);
    expect(mockMeasureSocialDataFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: 'trending',
        cacheState: 'cold',
        request: expect.any(Function),
      }),
    );
  });

  it('measures a stale cached Social V1 request as warm', async () => {
    const source: SocialFeedSource = { scope: 'following' };
    const request = toSocialFeedRequest(source);
    if (!request) {
      throw new Error('following source did not resolve to a feed request');
    }
    const { client, wrapper } = createWrapper();
    client.setQueryData(buildSocialFeedQueryKey(request, FEED_PAGE_LIMIT), {
      pages: [mockFeedResponse([mockSpotFeedItem()])],
      pageParams: [undefined],
    });
    mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));

    renderHook(
      () =>
        useSocialFeed(source, {
          performance: { tab: 'following' },
        }),
      { wrapper },
    );

    await waitFor(() =>
      expect(mockMeasureSocialDataFetch).toHaveBeenCalledWith(
        expect.objectContaining({ cacheState: 'warm' }),
      ),
    );
  });

  it('emits no data-fetch trace when a fresh cache satisfies the tab', async () => {
    const source: SocialFeedSource = { scope: 'following' };
    const request = toSocialFeedRequest(source);
    if (!request) {
      throw new Error('following source did not resolve to a feed request');
    }
    const { client, wrapper } = createWrapper(60_000);
    client.setQueryData(buildSocialFeedQueryKey(request, FEED_PAGE_LIMIT), {
      pages: [mockFeedResponse([mockSpotFeedItem()])],
      pageParams: [undefined],
    });

    const { result } = renderHook(
      () =>
        useSocialFeed(source, {
          performance: { tab: 'following' },
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.posts).toHaveLength(1));

    expect(mockCall).not.toHaveBeenCalled();
    expect(mockMeasureSocialDataFetch).not.toHaveBeenCalled();
  });

  it('does not measure pagination or refresh after the initial request', async () => {
    mockCall.mockResolvedValue(
      mockFeedResponse([mockSpotFeedItem()], 'cursor-1'),
    );
    const { result } = renderHook(
      () =>
        useSocialFeed(perpSource, {
          performance: { tab: 'trending' },
        }),
      { wrapper: createWrapper().wrapper },
    );
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(mockCall).toHaveBeenCalledTimes(2));
    await act(async () => {
      await result.current.refresh();
    });

    expect(mockMeasureSocialDataFetch).toHaveBeenCalledTimes(1);
  });

  it('does not measure shared feed requests without Social V1 context', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([]));

    renderHook(() => useSocialFeed(perpSource), {
      wrapper: createWrapper().wrapper,
    });
    await waitFor(() => expect(mockCall).toHaveBeenCalledTimes(1));

    expect(mockMeasureSocialDataFetch).not.toHaveBeenCalled();
  });
});
