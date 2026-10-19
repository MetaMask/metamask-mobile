import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useLogSocialQueryError } from '../../../../util/social/socialServiceTelemetry';
import { FEED_PAGE_LIMIT } from './socialFeedQueries';
import { mockFeedResponse, mockSpotFeedItem } from '../mocks/coreFeed.mock';
import type { SocialFeedSource } from './socialFeedSource';
import { useSocialFeed } from './useSocialFeed';

const mockCall = jest.fn();

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

const mockUseSelector = jest.mocked(useSelector);
const mockUseLogSocialQueryError = jest.mocked(useLogSocialQueryError);

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
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

  it('sorts the global feed newest first', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([olderItem, newerItem]));

    const { result } = renderHook(
      () => useSocialFeed({ kind: 'all', audience: 'all' }),
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

  it('does nothing on refresh or load-more without a source', async () => {
    const { result } = renderHook(() => useSocialFeed(null), {
      wrapper: createWrapper().wrapper,
    });

    await result.current.refresh();
    result.current.loadMore();

    expect(mockCall).not.toHaveBeenCalled();
  });
});
