import type { FeedReaction } from '../reactions';

export const serializeFeedEngagementSeed = (
  commentId: string | undefined,
  reactions: FeedReaction[],
  userReaction: string | null,
): string =>
  JSON.stringify({
    commentId: commentId ?? null,
    reactions,
    userReaction,
  });
