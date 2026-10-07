import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommentEngagement, FeedReaction } from '../reactions';
import { reactToComment, removeCommentReaction } from '../commentReactionApi';
import { patchFeedCommentEngagementInCache } from '../utils/patchFeedCommentEngagementInCache';
import { serializeFeedEngagementSeed } from '../utils/serializeFeedEngagementSeed';

export interface UseFeedPostReactionResult {
  reactions: FeedReaction[];
  userReaction: string | null;
  isPending: boolean;
  pickEmotion: (emotion: string) => Promise<void>;
}

const applyOptimistic = (
  previous: CommentEngagement,
  emotion: string,
): CommentEngagement => {
  if (previous.userReaction === emotion) {
    return {
      userReaction: null,
      reactions: previous.reactions
        .map((reaction) =>
          reaction.emotion === emotion
            ? { ...reaction, count: reaction.count - 1 }
            : reaction,
        )
        .filter((reaction) => reaction.count > 0),
    };
  }

  const withoutPrevious = previous.reactions
    .map((reaction) =>
      reaction.emotion === previous.userReaction
        ? { ...reaction, count: reaction.count - 1 }
        : reaction,
    )
    .filter((reaction) => reaction.count > 0);

  const existing = withoutPrevious.find(
    (reaction) => reaction.emotion === emotion,
  );
  const reactions = existing
    ? withoutPrevious.map((reaction) =>
        reaction.emotion === emotion
          ? { ...reaction, count: reaction.count + 1 }
          : reaction,
      )
    : [...withoutPrevious, { emotion, count: 1 }];

  return { reactions, userReaction: emotion };
};

export const useFeedPostReaction = (
  commentId: string | undefined,
  initialReactions: FeedReaction[],
  initialUserReaction: string | null = null,
): UseFeedPostReactionResult => {
  const queryClient = useQueryClient();
  const [reactions, setReactions] = useState(initialReactions);
  const [userReaction, setUserReaction] = useState(initialUserReaction);
  const [isPending, setIsPending] = useState(false);
  const engagementSeed = serializeFeedEngagementSeed(
    commentId,
    initialReactions,
    initialUserReaction,
  );
  const lastPropsSeedRef = useRef(engagementSeed);

  useEffect(() => {
    if (isPending || lastPropsSeedRef.current === engagementSeed) {
      return;
    }
    lastPropsSeedRef.current = engagementSeed;
    setReactions(initialReactions);
    setUserReaction(initialUserReaction);
  }, [engagementSeed, initialReactions, initialUserReaction, isPending]);

  const pickEmotion = useCallback(
    async (emotion: string) => {
      if (isPending) {
        return;
      }

      const previous: CommentEngagement = { reactions, userReaction };
      const optimistic = applyOptimistic(previous, emotion);
      setReactions(optimistic.reactions);
      setUserReaction(optimistic.userReaction);

      // No Call id on this row yet — keep the session-local toggle only.
      if (!commentId) {
        return;
      }

      setIsPending(true);

      try {
        const metrics =
          previous.userReaction === emotion
            ? await removeCommentReaction({ commentId })
            : await reactToComment({ commentId, emotion });
        setReactions(metrics.reactions);
        setUserReaction(metrics.userReaction);
        patchFeedCommentEngagementInCache(queryClient, commentId, metrics);
      } catch {
        setReactions(previous.reactions);
        setUserReaction(previous.userReaction);
      } finally {
        setIsPending(false);
      }
    },
    [commentId, isPending, queryClient, reactions, userReaction],
  );

  return { reactions, userReaction, isPending, pickEmotion };
};
