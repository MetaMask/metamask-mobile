import type { SocialV1FeedPost } from '../../../../UI/SocialFeed/types';
import { toWholePercent } from '../../../../UI/SocialFeed/utils/feedCardStats';

/**
 * The trader profile the Performance grid already shows. Post cards on that
 * profile use these figures instead of the stats frozen onto each feed item.
 */
export interface LiveTraderCardStats {
  pnl30d?: number | null;
  /** 0–1 ratio, same as the trader profile. */
  winRate30d?: number | null;
  followerCount?: number | null;
}

const finiteOrNull = (value: number | null | undefined): number | null =>
  value != null && Number.isFinite(value) ? value : null;

/**
 * Copies the live profile onto every post on that profile, so the line under
 * the name matches the Performance grid.
 */
export const withLiveTraderCardStats = (
  posts: readonly SocialV1FeedPost[],
  live: LiveTraderCardStats | null,
): SocialV1FeedPost[] => {
  if (!live) {
    return posts as SocialV1FeedPost[];
  }

  const pnl30d = finiteOrNull(live.pnl30d);
  const winRatePercent = toWholePercent(live.winRate30d);
  const followerCount = finiteOrNull(live.followerCount) ?? 0;

  return posts.map((post) =>
    post.item?.author
      ? {
          ...post,
          item: {
            ...post.item,
            author: {
              ...post.item.author,
              pnl30d,
              winRatePercent,
              followerCount,
            },
          },
        }
      : post,
  );
};
