import type { TraderFeedRow } from '../../../FeedView/hooks/useTraderFeed';
import { readAuthorComment } from '../reactions';
import type { SocialV1FeedPost } from '../types';
import { toSocialV1FeedItem } from '../utils/toSocialV1FeedItem';

/**
 * Wraps live feed rows in the post envelope `SocialFeedPostShell` renders.
 *
 * The shell reads the avatar, handle and time off the envelope, so the real
 * actor has to be copied up here; the trader's stats stay on `item.author`,
 * where the header's rotating stat line reads them. Reactions come from the
 * Call (`authorComment`). Posts without a Call still show the empty heart;
 * picks stay session-local until a comment id exists.
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
