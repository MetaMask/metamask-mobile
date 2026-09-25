import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  mockFeedResponse,
  mockSpotFeedItem,
} from '../../FeedView/mocks/coreFeed.mock';
import { FEED_PAGE_LIMIT } from '../../FeedView/hooks/traderFeedQueries';
import { useMyProfilePosts } from './useMyProfilePosts';

const mockCall = jest.fn();

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

jest.mock('../../FeedView/utils/mapFeedItem', () => ({
  mapFeedItem: (core: { positionId?: string }) => ({
    id: core.positionId ?? 'item',
    timestamp: 1_700_000_000,
    type: 'spot',
  }),
}));

jest.mock('../../SocialV1View/feed/mocks/wrapLiveFeedPosts', () => ({
  wrapLiveFeedPosts: (rows: { item: { id: string } }[]) =>
    rows.map((row) => ({
      id: row.item.id,
      authorHandle: 'owner',
      timestampMs: 1,
      reactions: [],
      item: row.item,
    })),
}));

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
};

describe('useMyProfilePosts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches commented-only posts for the owner address', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));

    const { result } = renderHook(() => useMyProfilePosts('0xabc'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(mockCall).toHaveBeenCalledWith('SocialService:fetchTraderFeed', {
      addressOrId: '0xabc',
      commentedOnly: true,
      limit: FEED_PAGE_LIMIT,
    });
  });

  it('does not fetch when addressOrId is missing', () => {
    const { result } = renderHook(() => useMyProfilePosts(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.posts).toHaveLength(0);
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('paginates using the older cursor when loadMore is called', async () => {
    mockCall
      .mockResolvedValueOnce(mockFeedResponse([mockSpotFeedItem()], 'cursor-1'))
      .mockResolvedValueOnce(
        mockFeedResponse([mockSpotFeedItem({ positionId: 'position-2' })]),
      );

    const { result } = renderHook(() => useMyProfilePosts('0xabc'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.posts.length).toBeGreaterThan(1));
    expect(mockCall).toHaveBeenLastCalledWith('SocialService:fetchTraderFeed', {
      addressOrId: '0xabc',
      commentedOnly: true,
      limit: FEED_PAGE_LIMIT,
      olderThan: 'cursor-1',
    });
  });
});
