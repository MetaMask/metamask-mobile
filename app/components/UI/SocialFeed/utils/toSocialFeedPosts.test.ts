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
    expect(post.sourceLanguage).toBeUndefined();
    expect(post.reactions).toStrictEqual([{ emotion: '🔥', count: 2 }]);
    expect(post.userReaction).toBe('🔥');
    expect(post.item.comment).toBe('this is alpha');
  });

  it('copies the Call language and translations onto the post', () => {
    const row = buildRow({
      authorComment: {
        uid: 'comment-1',
        text: '안녕하세요',
        timestamp: 1_700_000_000,
        sourceLanguage: 'ko',
        translations: { en: 'Hello' },
        engagement: {
          reactions: [],
          userReaction: null,
        },
      },
    });

    const [post] = toSocialFeedPosts([row]);

    expect(post.sourceLanguage).toBe('ko');
    expect(post.translations).toStrictEqual({ en: 'Hello' });
  });

  it('keeps a null Call language so the translate control can show', () => {
    const row = buildRow({
      authorComment: {
        uid: 'comment-1',
        text: 'hello',
        timestamp: 1_700_000_000,
        sourceLanguage: null,
        engagement: {
          reactions: [],
          userReaction: null,
        },
      },
    });

    const [post] = toSocialFeedPosts([row]);

    expect(post.sourceLanguage).toBeNull();
  });

  it('keeps the core position for the details sheet', () => {
    const row = buildRow();

    const [post] = toSocialFeedPosts([row]);

    expect(post.position).toBe(row.core);
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

  it('carries the detected copy count onto the post', () => {
    const [post] = toSocialFeedPosts([buildRow({ copyCount: 4 })]);

    expect(post.copyCount).toBe(4);
  });

  it('keeps a reported zero copy count', () => {
    const [post] = toSocialFeedPosts([buildRow({ copyCount: 0 })]);

    expect(post.copyCount).toBe(0);
  });

  it('omits the copy count when the API did not send one', () => {
    const [post] = toSocialFeedPosts([buildRow()]);

    expect(post).not.toHaveProperty('copyCount');
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
