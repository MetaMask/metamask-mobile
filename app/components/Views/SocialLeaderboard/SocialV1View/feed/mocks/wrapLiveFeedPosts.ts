import { strings } from '../../../../../../../locales/i18n';
import type { TraderFeedRow } from '../../../FeedView/hooks/useTraderFeed';
import { formatPercent } from '../../../utils/formatters';
import { markMocked } from '../mockMarker';
import type { SocialV1FeedPost } from '../types';
import { toSocialV1FeedItem } from '../utils/toSocialV1FeedItem';

/**
 * Wraps live feed rows in the post envelope `SocialFeedPostShell` renders.
 *
 * The shell reads the author header off the envelope rather than off the item,
 * so the real actor has to be copied up here. The win-rate label is the one
 * invented value in the envelope and carries the mock marker; like and comment
 * counts stay at zero because no API reports them yet, and a fabricated count
 * would be a claim about other people rather than about the trade.
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
          : markMocked(
              strings('social_leaderboard.win_rate_tag', {
                winRate: formatPercent(item.author.winRatePercent, {
                  showSign: false,
                  decimals: 0,
                }),
              }),
            ),
      timestampMs: item.timestamp,
      likeCount: 0,
      commentCount: 0,
      item,
    };
  });
