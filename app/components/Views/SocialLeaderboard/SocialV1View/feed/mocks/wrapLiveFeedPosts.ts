import { strings } from '../../../../../../../locales/i18n';
import type { TraderFeedRow } from '../../../FeedView/hooks/useTraderFeed';
import { formatPercent } from '../../../utils/formatters';
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
 * The shell reads the author header off the envelope rather than off the item,
 * so the real actor has to be copied up here. The win-rate label comes from
 * the actor's 30-day win rate and is omitted when that stat is missing. The
 * heart count is the sum of reactions on the author's Call; the comment count
 * is the position's reply count.
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
      winRateLabel:
        item.author.winRatePercent == null
          ? undefined
          : strings('social_leaderboard.win_rate_tag', {
              winRate: formatPercent(item.author.winRatePercent, {
                showSign: false,
                decimals: 0,
              }),
            }),
      timestampMs: item.timestamp,
      likeCount: reactionCount(row),
      commentCount: replyCount(row),
      item,
    };
  });
