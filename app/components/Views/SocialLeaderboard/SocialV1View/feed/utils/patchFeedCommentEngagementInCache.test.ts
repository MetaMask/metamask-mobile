import { QueryClient } from '@tanstack/react-query';
import type { FeedResponse } from '@metamask/social-controllers';
import { mockPerpFeedItem } from '../../../FeedView/mocks/coreFeed.mock';
import { buildTraderFeedQueryKey } from '../../../FeedView/hooks/traderFeedQueries';
import { readAuthorComment } from '../reactions';
import { patchFeedCommentEngagementInCache } from './patchFeedCommentEngagementInCache';

const feedItem = (commentId: string, count: number) =>
  mockPerpFeedItem({
    authorComment: {
      uid: commentId,
      text: 'alpha',
      timestamp: 1,
      engagement: {
        reactions: [{ emotion: '🔥', count, profiles: [] }],
        userReaction: null,
      },
    },
  });

describe('patchFeedCommentEngagementInCache', () => {
  it('updates authorComment engagement for the matching Call id', () => {
    const queryClient = new QueryClient();
    const queryKey = buildTraderFeedQueryKey('leaderboard');
    queryClient.setQueryData(queryKey, {
      pages: [
        {
          items: [feedItem('comment-1', 2)],
          pagination: { olderCursor: null, newerCursor: null },
        },
      ],
      pageParams: [undefined],
    });

    patchFeedCommentEngagementInCache(queryClient, 'comment-1', {
      reactions: [{ emotion: '👍', count: 5 }],
      userReaction: '👍',
    });

    const cached = queryClient.getQueryData<{
      pages: FeedResponse[];
    }>(queryKey);
    const authorComment = readAuthorComment(cached?.pages[0]?.items[0] ?? {});
    expect(authorComment?.engagement.reactions).toStrictEqual([
      { emotion: '👍', count: 5, profiles: [] },
    ]);
    expect(authorComment?.engagement.userReaction).toBe('👍');
  });

  it('updates authorComment engagement on the owner self-feed cache', () => {
    const queryClient = new QueryClient();
    const queryKey = [
      'SocialService:fetchTraderFeed',
      { addressOrId: '0xabc', commentedOnly: true, limit: 30 },
    ];
    queryClient.setQueryData(queryKey, {
      pages: [
        {
          items: [feedItem('comment-1', 2)],
          pagination: { olderCursor: null, newerCursor: null },
        },
      ],
      pageParams: [undefined],
    });

    patchFeedCommentEngagementInCache(queryClient, 'comment-1', {
      reactions: [{ emotion: '👍', count: 5 }],
      userReaction: '👍',
    });

    const cached = queryClient.getQueryData<{
      pages: FeedResponse[];
    }>(queryKey);
    const authorComment = readAuthorComment(cached?.pages[0]?.items[0] ?? {});
    expect(authorComment?.engagement.userReaction).toBe('👍');
  });

  it('updates authorComment engagement on token and perp feed caches', () => {
    const queryClient = new QueryClient();
    const queryKey = [
      'SocialService:fetchTokenFeed',
      { chain: 'hyperliquid', contractAddress: 'BTC', limit: 3 },
    ];
    queryClient.setQueryData(queryKey, {
      pages: [
        {
          items: [feedItem('comment-1', 2)],
          pagination: { olderCursor: null, newerCursor: null },
        },
      ],
      pageParams: [undefined],
    });

    patchFeedCommentEngagementInCache(queryClient, 'comment-1', {
      reactions: [{ emotion: '👍', count: 5 }],
      userReaction: '👍',
    });

    const cached = queryClient.getQueryData<{
      pages: FeedResponse[];
    }>(queryKey);
    const authorComment = readAuthorComment(cached?.pages[0]?.items[0] ?? {});
    expect(authorComment?.engagement.userReaction).toBe('👍');
  });

  it('leaves caches without the Call untouched', () => {
    const queryClient = new QueryClient();
    const queryKey = buildTraderFeedQueryKey('following');
    const data = {
      pages: [
        {
          items: [feedItem('comment-2', 2)],
          pagination: { olderCursor: null, newerCursor: null },
        },
      ],
      pageParams: [undefined],
    };
    queryClient.setQueryData(queryKey, data);

    patchFeedCommentEngagementInCache(queryClient, 'comment-1', {
      reactions: [{ emotion: '👍', count: 5 }],
      userReaction: '👍',
    });

    expect(queryClient.getQueryData(queryKey)).toBe(data);
  });
});
