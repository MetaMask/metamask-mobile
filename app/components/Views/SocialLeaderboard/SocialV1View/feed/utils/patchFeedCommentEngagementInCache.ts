import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { FeedResponse } from '@metamask/social-controllers';
import {
  buildTraderFeedQueryKey,
  PREFETCH_FEED_AUDIENCES,
  toFeedScope,
} from '../../../FeedView/hooks/traderFeedQueries';
import type { CommentEngagement } from '../reactions';

const patchPage = (
  page: FeedResponse,
  commentId: string,
  engagement: CommentEngagement,
): { page: FeedResponse; changed: boolean } => {
  let changed = false;
  const items = page.items.map((item) => {
    const authorComment = item.authorComment;
    if (!authorComment || authorComment.uid !== commentId) {
      return item;
    }
    changed = true;
    return {
      ...item,
      authorComment: {
        ...authorComment,
        engagement: {
          ...authorComment.engagement,
          reactions: engagement.reactions.map((reaction) => ({
            emotion: reaction.emotion,
            count: reaction.count,
            profiles: [],
          })),
          userReaction: engagement.userReaction,
        },
      },
    };
  });
  return changed ? { page: { ...page, items }, changed } : { page, changed };
};

/**
 * Writes confirmed Call engagement into both warmed feed caches so refresh,
 * remount, and list reshuffles see the same counts the user just committed.
 */
export const patchFeedCommentEngagementInCache = (
  queryClient: QueryClient,
  commentId: string,
  engagement: CommentEngagement,
): void => {
  for (const audience of PREFETCH_FEED_AUDIENCES) {
    const queryKey = buildTraderFeedQueryKey(toFeedScope(audience));
    queryClient.setQueryData<InfiniteData<FeedResponse>>(queryKey, (old) => {
      if (!old) {
        return old;
      }
      let anyChanged = false;
      const pages = old.pages.map((page) => {
        const { page: nextPage, changed } = patchPage(
          page,
          commentId,
          engagement,
        );
        anyChanged = anyChanged || changed;
        return nextPage;
      });
      return anyChanged ? { ...old, pages } : old;
    });
  }
};
