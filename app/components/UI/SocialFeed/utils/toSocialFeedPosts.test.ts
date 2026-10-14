import { mockPerpFeedItem, mockSpotFeedItem } from '../mocks/coreFeed.mock';
import { mapFeedItem } from './mapFeedItem';
import type { TraderFeedRow } from '../types';
import { KLIPY_STATIC_GIF_EXAMPLE } from './klipyGifComment';
import { toSocialFeedPosts } from './toSocialFeedPosts';

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

describe('toSocialFeedPosts', () => {
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

    const [post] = toSocialFeedPosts([row]);

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

    const [post] = toSocialFeedPosts([row]);

    expect(post.gifUri).toBe(KLIPY_STATIC_GIF_EXAMPLE);
    expect(post.item.comment).toBe('this is alpha');
  });

  it('omits commentId when the row has no Call', () => {
    const [post] = toSocialFeedPosts([buildRow()]);

    expect(post.commentId).toBeUndefined();
    expect(post.reactions).toStrictEqual([]);
  });

  it('copies triggering-trade market cap onto spot posts', () => {
    const base = mockSpotFeedItem();
    const trade = base.trades?.[0];
    if (!trade) {
      throw new Error('spot fixture has no trade');
    }
    const core = mockSpotFeedItem({
      trades: [{ ...trade, marketCap: 5_200_000_000 }],
    });
    const item = mapFeedItem(core);
    if (!item) {
      throw new Error('fixture did not map to a FeedItem');
    }

    const [post] = toSocialFeedPosts([{ item, core }]);

    expect(post.marketCapUsd).toBe(5_200_000_000);
  });

  it('sets marketCapUsd to null on perp posts', () => {
    const [post] = toSocialFeedPosts([buildRow()]);

    expect(post.marketCapUsd).toBeNull();
  });
});
