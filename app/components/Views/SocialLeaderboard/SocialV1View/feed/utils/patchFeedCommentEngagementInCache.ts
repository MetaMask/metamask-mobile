import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { FeedResponse } from '@metamask/social-controllers';
import { SOCIAL_FEED_QUERY_ACTIONS } from '../../../SocialFeed/socialFeedQueries';
import { readAuthorComment, type CommentEngagement } from '../reactions';

const patchPage = (
  page: FeedResponse,
  commentId: string,
  engagement: CommentEngagement,
): { page: FeedResponse; changed: boolean } => {
  let changed = false;
  const items = page.items.map((item) => {
    const authorComment = readAuthorComment(item);
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
    } as (typeof page.items)[number];
  });
  return changed ? { page: { ...page, items }, changed } : { page, changed };
};

const patchInfiniteFeedData = (
  old: InfiniteData<FeedResponse> | undefined,
  commentId: string,
  engagement: CommentEngagement,
): InfiniteData<FeedResponse> | undefined => {
  if (!old) {
    return old;
  }
  let anyChanged = false;
  const pages = old.pages.map((page) => {
    const { page: nextPage, changed } = patchPage(page, commentId, engagement);
    anyChanged = anyChanged || changed;
    return nextPage;
  });
  return anyChanged ? { ...old, pages } : old;
};

/**
 * Writes confirmed Call engagement into every loaded feed cache (global,
 * token, perp and trader feeds) so refresh, remount, and list reshuffles see
 * the same counts the user just committed, wherever the post is shown.
 */
export const patchFeedCommentEngagementInCache = (
  queryClient: QueryClient,
  commentId: string,
  engagement: CommentEngagement,
): void => {
  for (const action of SOCIAL_FEED_QUERY_ACTIONS) {
    const feedQueries = queryClient.getQueriesData<InfiniteData<FeedResponse>>({
      queryKey: [action],
    });
    for (const [queryKey] of feedQueries) {
      queryClient.setQueryData<InfiniteData<FeedResponse>>(queryKey, (old) =>
        patchInfiniteFeedData(old, commentId, engagement),
      );
    }
  }
};
