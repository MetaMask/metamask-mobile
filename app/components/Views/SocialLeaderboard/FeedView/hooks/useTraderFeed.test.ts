import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTraderFeed } from './useTraderFeed';
import {
  mockFeedResponse,
  mockPerpFeedItem,
  mockSpotFeedItem,
} from '../mocks/coreFeed.mock';

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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
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
      limit: 30,
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
      limit: 30,
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
      limit: 30,
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
      limit: 30,
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
    expect(result.current.hasNextPage).toBe(false);
  });
});
