import type { TraderFeedRow, SocialV1FeedPost } from '../types';
import { splitKlipyGifFromCommentText } from './klipyGifComment';
import { readAuthorComment } from '../reactions';
import { readTriggeringTradeMarketCapUsd } from './mapFeedItem';
import { toSocialV1FeedItem } from './toSocialV1FeedItem';

/**
 * Wraps live feed rows in the post envelope `SocialFeedPostShell` renders.
 *
 * The shell reads the avatar, handle and time off the envelope, so the real
 * actor has to be copied up here; the trader's stats stay on `item.author`,
 * where the header's rotating stat line reads them. Reactions come from the
 * Call (`authorComment`). Posts without a Call still show the add-reaction
 * button; picks stay session-local until a comment id exists. The copy count
 * is passed through only when the API sent it.
 */
export const toSocialFeedPosts = (
  rows: TraderFeedRow[],
  now: number = Date.now(),
): SocialV1FeedPost[] =>
  rows.map((row) => {
    const item = toSocialV1FeedItem(row, now);
    const authorComment = readAuthorComment(row.core);
    const { gifUrl } = splitKlipyGifFromCommentText(authorComment?.text ?? '');

    return {
      id: item.id,
      authorHandle: item.author.username,
      authorImageUrl: item.author.avatarUri ?? null,
      timestampMs: item.timestamp,
      commentId: authorComment?.uid,
      ...(authorComment && 'sourceLanguage' in authorComment
        ? { sourceLanguage: authorComment.sourceLanguage ?? null }
        : {}),
      ...(authorComment?.translations
        ? { translations: authorComment.translations }
        : {}),
      ...(gifUrl ? { gifUri: gifUrl } : {}),
      reactions: (authorComment?.engagement.reactions ?? []).map(
        (reaction) => ({
          emotion: reaction.emotion,
          count: reaction.count,
        }),
      ),
      userReaction: authorComment?.engagement.userReaction ?? null,
      ...(row.core.copyCount !== undefined
        ? { copyCount: row.core.copyCount }
        : {}),
      marketCapUsd: readTriggeringTradeMarketCapUsd(row.core),
      item,
      position: row.core,
    };
  });
