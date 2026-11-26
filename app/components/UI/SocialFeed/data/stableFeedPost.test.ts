import { mockSpotFeedItem } from '../mocks/coreFeed.mock';
import type { TraderFeedRow } from '../types';
import { mapFeedItem } from '../utils/mapFeedItem';
import { toSocialFeedPosts } from '../utils/toSocialFeedPosts';
import { retainStableFeedPost, sameFeedPost } from './stableFeedPost';

const HOUR_MS = 3_600_000;

const rowFor = (core: ReturnType<typeof mockSpotFeedItem>): TraderFeedRow => {
  const item = mapFeedItem(core);
  if (!item) {
    throw new Error('Expected the feed item to map');
  }
  return { core, item };
};

describe('stableFeedPost', () => {
  it('treats a newer open hold label as the same post', () => {
    const row = rowFor(
      mockSpotFeedItem({ isOpen: true, firstTradeAt: 1_700_000_000 }),
    );
    const openedAtMs = 1_700_000_000_000;
    const [earlier] = toSocialFeedPosts([row], openedAtMs + HOUR_MS);
    const [later] = toSocialFeedPosts([row], openedAtMs + 5 * HOUR_MS);

    expect(earlier?.item.holdTimeLabel).toBe('1h');
    expect(later?.item.holdTimeLabel).toBe('5h');
    expect(earlier && later && sameFeedPost(earlier, later)).toBe(true);
  });

  it('returns the cached post when the position reference is unchanged', () => {
    const core = mockSpotFeedItem({ positionId: 'pos-a' });
    const row = rowFor(core);
    const cache = new Map();
    const [built] = toSocialFeedPosts([row]);
    if (!built) {
      throw new Error('Expected a post');
    }
    const first = retainStableFeedPost(
      cache,
      row.item.id,
      core,
      undefined,
      () => built,
    );
    let builds = 0;

    const second = retainStableFeedPost(
      cache,
      row.item.id,
      core,
      undefined,
      () => {
        builds += 1;
        return built;
      },
    );

    expect(second).toBe(first);
    expect(builds).toBe(0);
  });

  it('replaces the cached post when the copy count changes', () => {
    const row = rowFor(mockSpotFeedItem({ positionId: 'pos-a' }));
    const [post] = toSocialFeedPosts([row]);
    if (!post) {
      throw new Error('Expected a post');
    }

    const changed = { ...post, copyCount: (post.copyCount ?? 0) + 1 };

    expect(sameFeedPost(post, changed)).toBe(false);
  });
});
