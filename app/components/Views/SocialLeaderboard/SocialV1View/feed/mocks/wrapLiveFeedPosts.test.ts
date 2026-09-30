import { mockPerpFeedItem } from '../../../FeedView/mocks/coreFeed.mock';
import { mapFeedItem } from '../../../FeedView/utils/mapFeedItem';
import type { TraderFeedRow } from '../../../FeedView/hooks/useTraderFeed';
import { KLIPY_STATIC_GIF_EXAMPLE } from '../../../utils/klipyGifComment';
import { wrapLiveFeedPosts } from './wrapLiveFeedPosts';

const buildRow = (
  overrides: Parameters<typeof mockPerpFeedItem>[0] = {},
): TraderFeedRow => {
  const core = mockPerpFeedItem(overrides);
  const item = mapFeedItem(core);
  if (!item) {
    throw new Error('fixture did not map to a FeedItem');
  }
  return { item, core };
};

describe('wrapLiveFeedPosts', () => {
  it('copies Call engagement onto the post envelope', () => {
    const row = buildRow({
      authorComment: {
        uid: 'comment-1',
        text: 'this is alpha',
        timestamp: 1_700_000_000,
        engagement: {
          reactions: [{ emotion: '🔥', count: 2, profiles: [] }],
          userReaction: '🔥',
        },
      },
    });

    const [post] = wrapLiveFeedPosts([row]);

    expect(post.commentId).toBe('comment-1');
    expect(post.reactions).toStrictEqual([{ emotion: '🔥', count: 2 }]);
    expect(post.userReaction).toBe('🔥');
    expect(post.item.comment).toBe('this is alpha');
  });

  it('lifts a static.klipy.com gif url from the Call text onto gifUri', () => {
    const row = buildRow({
      authorComment: {
        uid: 'comment-1',
        text: `this is alpha\n${KLIPY_STATIC_GIF_EXAMPLE}`,
        timestamp: 1_700_000_000,
        engagement: {
          reactions: [],
          userReaction: null,
        },
      },
    });

    const [post] = wrapLiveFeedPosts([row]);

    expect(post.gifUri).toBe(KLIPY_STATIC_GIF_EXAMPLE);
    expect(post.item.comment).toBe('this is alpha');
  });

  it('omits commentId when the row has no Call', () => {
    const [post] = wrapLiveFeedPosts([buildRow()]);

    expect(post.commentId).toBeUndefined();
    expect(post.reactions).toStrictEqual([]);
  });
});
