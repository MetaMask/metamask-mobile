import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  mockFeedResponse,
  mockSpotFeedItem,
} from '../../../FeedView/mocks/coreFeed.mock';
import { TOKEN_FEED_PAGE_LIMIT } from './tokenFeedQueries';
import { useSocialV1TokenFeed } from './useSocialV1TokenFeed';

const mockCall = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
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

jest.mock('../../../../../../util/social/socialServiceTelemetry', () => ({
  useLogSocialQueryError: jest.fn(),
  formatSocialQueryErrorMessage: (error: unknown) =>
    error ? (error instanceof Error ? error.message : String(error)) : null,
}));

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
};

const target = {
  chain: 'solana',
  contractAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
};

describe('useSocialV1TokenFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call the messenger when no token is selected', () => {
    const { result } = renderHook(() => useSocialV1TokenFeed(null), {
      wrapper: createWrapper(),
    });

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.posts).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches the token feed for the selected contract', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));

    const { result } = renderHook(() => useSocialV1TokenFeed(target), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(mockCall).toHaveBeenCalledWith('SocialService:fetchTokenFeed', {
      chain: target.chain,
      contractAddress: target.contractAddress,
      limit: TOKEN_FEED_PAGE_LIMIT,
    });
    expect(result.current.posts[0]?.item.asset.symbol).toBe('PEPE');
  });

  it('does nothing on refresh or load-more when no token is selected', async () => {
    const { result } = renderHook(() => useSocialV1TokenFeed(null), {
      wrapper: createWrapper(),
    });

    await result.current.refresh();
    result.current.loadMore();

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.hasNextPage).toBe(false);
  });

  it('pages with olderThan, ignores a load-more that is already in flight, then refreshes only the first page', async () => {
    const secondItem = mockSpotFeedItem({
      positionId: 'pos-spot-2',
      tokenSymbol: 'DOGE',
    });
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
        return Promise.resolve(
          mockFeedResponse([mockSpotFeedItem()], 'cursor-1'),
        );
      },
    );

    const { result } = renderHook(() => useSocialV1TokenFeed(target), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    expect(mockCall).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(true));
    act(() => {
      result.current.loadMore();
    });
    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(mockCall).toHaveBeenLastCalledWith('SocialService:fetchTokenFeed', {
      chain: target.chain,
      contractAddress: target.contractAddress,
      limit: TOKEN_FEED_PAGE_LIMIT,
      olderThan: 'cursor-1',
    });

    await act(async () => {
      resolveNextPage(mockFeedResponse([secondItem]));
    });
    await waitFor(() => expect(result.current.posts).toHaveLength(2));

    act(() => {
      result.current.loadMore();
    });
    expect(mockCall).toHaveBeenCalledTimes(2);

    mockCall.mockClear();
    mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));
    await act(async () => {
      await result.current.refresh();
    });

    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(mockCall).toHaveBeenCalledWith('SocialService:fetchTokenFeed', {
      chain: target.chain,
      contractAddress: target.contractAddress,
      limit: TOKEN_FEED_PAGE_LIMIT,
    });
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
  });

  it('surfaces a fetch error and does not page further', async () => {
    mockCall.mockRejectedValue(new Error('token feed down'));

    const { result } = renderHook(() => useSocialV1TokenFeed(target), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBe('token feed down'));
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.posts).toEqual([]);

    result.current.loadMore();
    expect(mockCall).toHaveBeenCalledTimes(1);
  });
});
