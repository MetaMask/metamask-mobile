import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  mockFeedResponse,
  mockSpotFeedItem,
} from '../../../../UI/SocialFeed/mocks/coreFeed.mock';
import { FEED_PAGE_LIMIT } from '../../../../UI/SocialFeed/data/socialFeedQueries';
import { FEED_CAIP2_CHAINS } from '../../../../UI/SocialFeed/data/feed-constants';
import { useSocialFeedRealtime } from '../../../../UI/SocialFeed/data/useSocialFeedRealtime';
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

jest.mock('../../../../UI/SocialFeed/data/useSocialFeedRealtime', () => ({
  useSocialFeedRealtime: jest.fn(() => null),
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
  mapFeedItem: (core: {
    positionId?: string;
    actor?: { profileId?: string };
  }) => ({
    id: core.positionId ?? 'item',
    author: { id: core.actor?.profileId ?? 'profile-1' },
    timestamp: 1_700_000_000,
    type: 'spot',
  }),
}));

jest.mock('../../../../UI/SocialFeed/utils/toSocialFeedPosts', () => ({
  toSocialFeedPosts: (
    rows: {
      core: {
        authorComment?: { uid: string; timestamp: number } | null;
      };
      item: { id: string; author: { id: string }; timestamp: number };
    }[],
  ) =>
    rows.map((row) => ({
      id: row.item.id,
      authorHandle: 'owner',
      timestampMs: row.item.timestamp * 1000,
      commentId: row.core.authorComment?.uid,
      reactions: [],
      item: row.item,
      position: row.core,
    })),
}));

const commentedFeedItem = (
  overrides: Parameters<typeof mockSpotFeedItem>[0] = {},
) =>
  mockSpotFeedItem({
    authorComment: {
      uid: 'server-comment',
      text: 'gm',
      timestamp: 1_700_000_200,
      engagement: { reactions: [], userReaction: null },
    },
    ...overrides,
  });

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
    jest.mocked(useSocialFeedRealtime).mockReturnValue(null);
    jest.mocked(useSelector).mockReturnValue(true);
    resetPendingPosts();
  });

  it('dates each post by its comment rather than its trade', async () => {
    mockCall.mockResolvedValueOnce(
      mockFeedResponse([
        commentedFeedItem({
          authorComment: {
            uid: 'comment-1',
            text: 'gm',
            timestamp: 1_700_000_200,
            engagement: { reactions: [], userReaction: null },
          },
        }),
      ]),
    );

    const { result } = renderHook(() => useMyProfilePosts('profile-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(result.current.posts[0].timestampMs).toBe(1_700_000_200_000);
  });

  it('shows the owner’s pending post on top of their Posts', async () => {
    mockCall.mockResolvedValueOnce(mockFeedResponse([commentedFeedItem()]));
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
      () =>
        useMyProfilePosts('profile-1', {
          ownerProfileId: 'viewer-profile',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.posts).toHaveLength(2));
    expect(result.current.posts[0].id).toBe('pending-comment-1');
  });

  it('keeps pending posts off someone else’s profile', async () => {
    mockCall.mockResolvedValueOnce(mockFeedResponse([commentedFeedItem()]));
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

    const { result } = renderHook(() => useMyProfilePosts('profile-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(result.current.posts[0].id).not.toBe('pending-comment-1');
  });

  it('fetches commented-only posts for the profile ID', async () => {
    mockCall.mockResolvedValueOnce(mockFeedResponse([commentedFeedItem()]));

    const { result } = renderHook(() => useMyProfilePosts('profile-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(mockCall).toHaveBeenCalledWith('SocialService:fetchFeed', {
      scope: 'all',
      chains: FEED_CAIP2_CHAINS,
      profileId: 'profile-1',
      commentedOnly: true,
      limit: FEED_PAGE_LIMIT,
    });
  });

  it('does not fetch when the profile ID is missing', () => {
    const { result } = renderHook(() => useMyProfilePosts(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.posts).toHaveLength(0);
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('streams only commented posts from the viewed profile', async () => {
    mockCall.mockResolvedValueOnce(
      mockFeedResponse([commentedFeedItem({ positionId: 'live-position' })]),
    );

    const { result } = renderHook(() => useMyProfilePosts('profile-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    const realtimeOptions = jest
      .mocked(useSocialFeedRealtime)
      .mock.calls.at(-1)?.[1];
    const filterPost = realtimeOptions?.filterPost;
    const viewedPost = result.current.posts[0];

    expect(realtimeOptions?.realtimeScope).toBe('all');
    expect(filterPost?.(viewedPost)).toBe(true);
    expect(
      filterPost?.({
        ...viewedPost,
        item: {
          ...viewedPost.item,
          author: { ...viewedPost.item.author, id: 'profile-2' },
        },
      }),
    ).toBe(false);
    expect(filterPost?.({ ...viewedPost, commentId: undefined })).toBe(false);
  });

  it('paginates using the older cursor when loadMore is called', async () => {
    mockCall
      .mockResolvedValueOnce(
        mockFeedResponse([commentedFeedItem()], 'cursor-1'),
      )
      .mockResolvedValueOnce(
        mockFeedResponse([commentedFeedItem({ positionId: 'position-2' })]),
      );

    const { result } = renderHook(() => useMyProfilePosts('profile-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.posts.length).toBeGreaterThan(1));
    expect(mockCall).toHaveBeenLastCalledWith('SocialService:fetchFeed', {
      scope: 'all',
      chains: FEED_CAIP2_CHAINS,
      profileId: 'profile-1',
      commentedOnly: true,
      limit: FEED_PAGE_LIMIT,
      olderThan: 'cursor-1',
    });
  });
});
