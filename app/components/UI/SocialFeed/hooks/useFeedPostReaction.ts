import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  keepReactionOrder,
  rankReactions,
  type CommentEngagement,
  type FeedReaction,
} from '../reactions';
import { reactToComment, removeCommentReaction } from '../commentReactionApi';
import { invalidateModerationStatus } from '../moderationApi';
import { extractHttpStatus } from '../../../../util/social/socialServiceTelemetry';
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
  // Ranked once per post. Later counts, including the server's re-sorted
  // reply to the viewer's own tap, update in place so chips never restack.
  const [reactions, setReactions] = useState(() =>
    rankReactions(initialReactions),
  );
  const [userReaction, setUserReaction] = useState(initialUserReaction);
  const [isPending, setIsPending] = useState(false);
  const engagementSeed = serializeFeedEngagementSeed(
    commentId,
    initialReactions,
    initialUserReaction,
  );
  const lastPropsSeedRef = useRef(engagementSeed);
  const rankedCommentIdRef = useRef(commentId);

  useEffect(() => {
    if (isPending || lastPropsSeedRef.current === engagementSeed) {
      return;
    }
    lastPropsSeedRef.current = engagementSeed;
    // A recycled row can now hold a different post, which ranks afresh.
    const isSamePost = rankedCommentIdRef.current === commentId;
    rankedCommentIdRef.current = commentId;
    setReactions((current) =>
      isSamePost
        ? keepReactionOrder(current, initialReactions)
        : rankReactions(initialReactions),
    );
    setUserReaction(initialUserReaction);
  }, [
    commentId,
    engagementSeed,
    initialReactions,
    initialUserReaction,
    isPending,
  ]);

  const pickEmotion = useCallback(
    async (emotion: string) => {
      // A trade-only row has no swap comment, so there is nothing to persist.
      if (isPending || !commentId) {
        return;
      }

      const previous: CommentEngagement = { reactions, userReaction };
      const optimistic = applyOptimistic(previous, emotion);
      setReactions(optimistic.reactions);
      setUserReaction(optimistic.userReaction);
      setIsPending(true);

      try {
        const metrics =
          previous.userReaction === emotion
            ? await removeCommentReaction({ commentId })
            : await reactToComment({ commentId, emotion });
        setReactions((current) =>
          keepReactionOrder(current, metrics.reactions),
        );
        setUserReaction(metrics.userReaction);
        patchFeedCommentEngagementInCache(queryClient, commentId, metrics);
      } catch (error) {
        setReactions(previous.reactions);
        setUserReaction(previous.userReaction);
        // A 403 means the moderation team banned the viewer.
        if (extractHttpStatus(error) === 403) {
          invalidateModerationStatus().catch(() => undefined);
        }
      } finally {
        setIsPending(false);
      }
    },
    [commentId, isPending, queryClient, reactions, userReaction],
  );

  return { reactions, userReaction, isPending, pickEmotion };
};
