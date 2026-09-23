import { strings } from '../../../../../../../locales/i18n';
import type { TraderFeedRow } from '../../../FeedView/hooks/useTraderFeed';
import { formatPercent } from '../../../utils/formatters';
import { markMocked } from '../mockMarker';
import { readAuthorComment } from '../reactions';
import type { SocialV1FeedPost } from '../types';
import { toSocialV1FeedItem } from '../utils/toSocialV1FeedItem';

/**
 * Wraps live feed rows in the post envelope `SocialFeedPostShell` renders.
 *
 * The shell reads the author header off the envelope rather than off the item,
 * so the real actor has to be copied up here. The win-rate label is the one
 * invented value in the envelope and carries the mock marker. Reactions come
 * from the Call (`authorComment`). Posts without a Call still show the empty
 * heart; picks stay session-local until a comment id exists.
 */
export const wrapLiveFeedPosts = (
  rows: TraderFeedRow[],
  now: number = Date.now(),
): SocialV1FeedPost[] =>
  rows.map((row) => {
    const item = toSocialV1FeedItem(row, now);
    const authorComment = readAuthorComment(row.core);

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
      commentId: authorComment?.uid,
      reactions: (authorComment?.engagement.reactions ?? []).map(
        (reaction) => ({
          emotion: reaction.emotion,
          count: reaction.count,
        }),
      ),
      userReaction: authorComment?.engagement.userReaction ?? null,
      item,
    };
  });
