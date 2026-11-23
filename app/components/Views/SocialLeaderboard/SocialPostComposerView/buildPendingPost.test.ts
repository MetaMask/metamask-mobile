import type { SwapCommentResponse } from '@metamask/social-controllers';
import { mockSpotFeedItem } from '../../../UI/SocialFeed/mocks/coreFeed.mock';
import { mockOpenPerpsFeedItem } from '../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';
import { buildPendingPost } from './buildPendingPost';

const created: SwapCommentResponse = {
  uid: 'comment-1',
  transactionHash: '0xhash',
  chain: 'ethereum',
  tokenAddress: '0xtoken',
  commentText: 'this is alpha',
  author: { id: 'viewer-profile', name: 'Giga Whale' },
  timestamp: 1_700_000_100,
  isAppUserComment: true,
  metrics: { reactions: [], userReaction: null },
};

const fallbackPost: SocialV1FeedPost = {
  id: 'fallback',
  authorHandle: 'Local Name',
  timestampMs: 1,
  reactions: [],
  item: mockOpenPerpsFeedItem({ id: 'fallback-item' }),
};

describe('buildPendingPost', () => {
  it('maps the server feed item into the card, keyed to the comment', () => {
    const feedItem = mockSpotFeedItem({
      authorComment: {
        uid: 'comment-1',
        text: 'this is alpha',
        timestamp: 1_700_000_100,
        engagement: { reactions: [], userReaction: null },
      },
    });
    const fallback = jest.fn(() => fallbackPost);

    const post = buildPendingPost(
      { ...created, positionUid: feedItem.positionId, feedItem },
      fallback,
    );

    expect(fallback).not.toHaveBeenCalled();
    expect(post).toMatchObject({
      id: 'pending-comment-1',
      commentId: 'comment-1',
      timestampMs: 1_700_000_100_000,
      authorHandle: feedItem.actor.name,
      position: expect.objectContaining({ positionId: feedItem.positionId }),
    });
    expect(post?.item.comment).toBe('this is alpha');
  });

  it('adds nothing when the server says no feed serves the position', () => {
    const fallback = jest.fn(() => fallbackPost);

    expect(
      buildPendingPost(
        { ...created, positionUid: 'p', feedItem: null },
        fallback,
      ),
    ).toBeNull();
    expect(fallback).not.toHaveBeenCalled();
  });

  it('adds nothing for a feed item the app cannot read', () => {
    expect(
      buildPendingPost(
        {
          ...created,
          feedItem: { positionId: 'p' } as never,
        },
        () => fallbackPost,
      ),
    ).toBeNull();
  });

  it('falls back to a local card for a social-api without feed items', () => {
    const post = buildPendingPost(created, () => fallbackPost);

    expect(post).toMatchObject({
      authorHandle: 'Local Name',
      id: 'pending-comment-1',
      commentId: 'comment-1',
      timestampMs: 1_700_000_100_000,
    });
  });

  it('falls back to a local card when a trade in flight has no feed item yet', () => {
    const post = buildPendingPost(
      { ...created, positionUid: null, feedItem: null },
      () => fallbackPost,
      { isTradeInFlight: true },
    );

    expect(post).toMatchObject({
      authorHandle: 'Local Name',
      id: 'pending-comment-1',
      commentId: 'comment-1',
    });
  });

  it('adds nothing when the fallback has no card either', () => {
    expect(buildPendingPost(created, () => null)).toBeNull();
  });
});
