import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  keepReactionOrder,
  visibleReactions,
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
  // The feed already sorts by count, and the cache holds the on-screen order
  // once the viewer reacts, so a remount must not re-rank. Later counts,
  // including the server's re-sorted reply, update in place.
  const [reactions, setReactions] = useState(() =>
    visibleReactions(initialReactions),
  );
  const [userReaction, setUserReaction] = useState(initialUserReaction);
  const [isPending, setIsPending] = useState(false);
  const engagementSeed = serializeFeedEngagementSeed(
    commentId,
    initialReactions,
    initialUserReaction,
  );
  const lastPropsSeedRef = useRef(engagementSeed);
  const seededCommentIdRef = useRef(commentId);

  useEffect(() => {
    if (isPending || lastPropsSeedRef.current === engagementSeed) {
      return;
    }
    lastPropsSeedRef.current = engagementSeed;
    // If the hook gets a different post, take its order afresh. Trade-only
    // rows all have an undefined id and count as the same post, which is
    // harmless because they cannot react.
    const isSamePost = seededCommentIdRef.current === commentId;
    seededCommentIdRef.current = commentId;
    setReactions((current) =>
      isSamePost
        ? keepReactionOrder(current, initialReactions)
        : visibleReactions(initialReactions),
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
        // Ordered against the row before the tap, so a chip the optimistic
        // update removed but the server kept goes back to its old slot.
        const onScreen: CommentEngagement = {
          reactions: keepReactionOrder(previous.reactions, metrics.reactions),
          userReaction: metrics.userReaction,
        };
        setReactions(onScreen.reactions);
        setUserReaction(onScreen.userReaction);
        patchFeedCommentEngagementInCache(queryClient, commentId, onScreen);
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
