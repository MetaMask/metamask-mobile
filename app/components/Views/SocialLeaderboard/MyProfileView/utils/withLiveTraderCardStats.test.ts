import { withLiveTraderCardStats } from './withLiveTraderCardStats';
import type { SocialV1FeedPost } from '../../../../UI/SocialFeed/types';

const post = {
  id: 'post-1',
  authorHandle: 'trader',
  timestampMs: 1,
  reactions: [],
  item: {
    id: 'post-1',
    author: {
      id: 'trader-1',
      username: 'trader',
      winRatePercent: 0,
      pnl30d: -0.01,
      followerCount: 2,
    },
  },
} as unknown as SocialV1FeedPost;

describe('withLiveTraderCardStats', () => {
  it('replaces the post line with the live profile stats', () => {
    const [next] = withLiveTraderCardStats([post], {
      pnl30d: -6,
      winRate30d: 0.5,
      followerCount: 9,
    });

    expect(next.item.author).toMatchObject({
      pnl30d: -6,
      winRatePercent: 50,
      followerCount: 9,
      username: 'trader',
    });
  });

  it('clears a snapshotted stat the live profile no longer has', () => {
    const [next] = withLiveTraderCardStats([post], {
      pnl30d: null,
      winRate30d: null,
      followerCount: 0,
    });

    expect(next.item.author.pnl30d).toBeNull();
    expect(next.item.author.winRatePercent).toBeNull();
    expect(next.item.author.followerCount).toBe(0);
  });

  it('leaves the posts untouched until the profile has loaded', () => {
    expect(withLiveTraderCardStats([post], null)).toEqual([post]);
  });
});
