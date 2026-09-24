import type { TraderFeedRow } from '../../../FeedView/hooks/useTraderFeed';
import type { SocialV1FeedPost } from '../types';
import { asFeedCardItem } from '../utils/feedCardStats';
import { toSocialV1FeedItem } from '../utils/toSocialV1FeedItem';

const reactionCount = (row: TraderFeedRow): number =>
  (row.core.authorComment?.engagement.reactions ?? []).reduce(
    (sum, reaction) => sum + reaction.count,
    0,
  );

const replyCount = (row: TraderFeedRow): number => {
  const card = asFeedCardItem(row.core);
  if (card.replyCount != null) {
    return card.replyCount;
  }
  return row.core.authorComment?.engagement.replyCount ?? 0;
};

/**
 * Wraps live feed rows in the post envelope `SocialFeedPostShell` renders.
 *
 * The shell reads the avatar, handle and time off the envelope, so the real
 * actor has to be copied up here; the trader's stats stay on `item.author`,
 * where the header's rotating stat line reads them. The heart count is the
 * sum of reactions on the author's Call; the comment count is the position's
 * reply count.
 */
export const wrapLiveFeedPosts = (
  rows: TraderFeedRow[],
  now: number = Date.now(),
): SocialV1FeedPost[] =>
  rows.map((row) => {
    const item = toSocialV1FeedItem(row, now);

    return {
      id: item.id,
      authorHandle: item.author.username,
      authorImageUrl: item.author.avatarUri ?? null,
      timestampMs: item.timestamp,
      likeCount: reactionCount(row),
      commentCount: replyCount(row),
      item,
    };
  });
