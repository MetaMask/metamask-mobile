import { QueryClient } from '@tanstack/react-query';
import type { FeedResponse } from '@metamask/social-controllers';
import { buildTraderFeedQueryKey } from '../../../FeedView/hooks/traderFeedQueries';
import { patchFeedCommentEngagementInCache } from './patchFeedCommentEngagementInCache';

const feedItem = (commentId: string, count: number) =>
  ({
    positionId: 'pos-1',
    authorComment: {
      uid: commentId,
      text: 'alpha',
      timestamp: 1,
      engagement: {
        reactions: [{ emotion: '🔥', count, profiles: [] }],
        userReaction: null,
      },
    },
  }) as FeedResponse['items'][number];

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
    expect(
      cached?.pages[0]?.items[0]?.authorComment?.engagement.reactions,
    ).toStrictEqual([{ emotion: '👍', count: 5, profiles: [] }]);
    expect(
      cached?.pages[0]?.items[0]?.authorComment?.engagement.userReaction,
    ).toBe('👍');
  });
});
