import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  mockFeedResponse,
  mockSpotFeedItem,
} from '../../../../UI/SocialFeed/mocks/coreFeed.mock';
import { FEED_PAGE_LIMIT } from '../../../../UI/SocialFeed/data/socialFeedQueries';
import { mockOpenPerpsFeedItem } from '../../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import { useSelector } from 'react-redux';
import {
  addPendingPost,
  resetPendingPosts,
} from '../../pendingPosts/pendingPostsStore';
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

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => null,
}));

jest.mock('../../../../../util/social/socialServiceTelemetry', () => ({
  useLogSocialQueryError: jest.fn(),
  formatSocialQueryErrorMessage: (error: unknown) =>
    error ? (error instanceof Error ? error.message : String(error)) : null,
}));

jest.mock('../../../../UI/SocialFeed/utils/mapFeedItem', () => ({
  mapFeedItem: (core: { positionId?: string }) => ({
    id: core.positionId ?? 'item',
    timestamp: 1_700_000_000,
    type: 'spot',
  }),
}));

jest.mock('../../../../UI/SocialFeed/utils/toSocialFeedPosts', () => ({
  toSocialFeedPosts: (rows: { item: { id: string } }[]) =>
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
    jest.resetAllMocks();
    jest.mocked(useSelector).mockReturnValue(true);
    resetPendingPosts();
  });

  it('dates each post by its comment rather than its trade', async () => {
    mockCall.mockResolvedValueOnce(
      mockFeedResponse([
        mockSpotFeedItem({
          authorComment: {
            uid: 'comment-1',
            text: 'gm',
            timestamp: 1_700_000_200,
            engagement: { reactions: [], userReaction: null },
          },
        }),
      ]),
    );

    const { result } = renderHook(() => useMyProfilePosts('0xabc'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(result.current.posts[0].timestampMs).toBe(1_700_000_200_000);
  });

  it('shows the owner’s pending post on top of their Posts', async () => {
    mockCall.mockResolvedValueOnce(mockFeedResponse([mockSpotFeedItem()]));
    addPendingPost({
      ownerProfileId: 'viewer-profile',
      post: {
        id: 'pending-comment-1',
        commentId: 'comment-1',
        authorHandle: 'Giga Whale',
        timestampMs: 1,
        reactions: [],
        item: mockOpenPerpsFeedItem({ id: 'pending-item' }),
      },
    });

    const { result } = renderHook(
      () => useMyProfilePosts('0xabc', { ownerProfileId: 'viewer-profile' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.posts).toHaveLength(2));
    expect(result.current.posts[0].id).toBe('pending-comment-1');
  });

  it('keeps pending posts off someone else’s profile', async () => {
    mockCall.mockResolvedValueOnce(mockFeedResponse([mockSpotFeedItem()]));
    addPendingPost({
      ownerProfileId: 'viewer-profile',
      post: {
        id: 'pending-comment-1',
        commentId: 'comment-1',
        authorHandle: 'Giga Whale',
        timestampMs: 1,
        reactions: [],
        item: mockOpenPerpsFeedItem({ id: 'pending-item' }),
      },
    });

    const { result } = renderHook(() => useMyProfilePosts('0xother'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(result.current.posts[0].id).not.toBe('pending-comment-1');
  });

  it('fetches commented-only posts for the owner address', async () => {
    mockCall.mockResolvedValueOnce(mockFeedResponse([mockSpotFeedItem()]));

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
