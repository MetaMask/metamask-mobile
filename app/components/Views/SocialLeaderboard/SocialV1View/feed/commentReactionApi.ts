import Engine from '../../../../../core/Engine';
import type { CommentEngagement, FeedReaction } from './reactions';

interface ReactToCommentOptions {
  commentId: string;
  emotion: string;
}

interface RemoveCommentReactionOptions {
  commentId: string;
}

interface CommentReactionMessenger {
  call: (
    action:
      | 'SocialService:reactToComment'
      | 'SocialService:removeCommentReaction',
    options: ReactToCommentOptions | RemoveCommentReactionOptions,
  ) => Promise<CommentEngagement>;
}

const getMessenger = (): CommentReactionMessenger =>
  Engine.controllerMessenger as unknown as CommentReactionMessenger;

const toFeedReactions = (
  reactions: CommentEngagement['reactions'],
): FeedReaction[] =>
  reactions.map((reaction) => ({
    emotion: reaction.emotion,
    count: reaction.count,
  }));

/**
 * Adds or replaces the viewer's reaction on a Call.
 *
 * Call as a member expression so the messenger keeps its `this` binding.
 */
export const reactToComment = async (
  options: ReactToCommentOptions,
): Promise<CommentEngagement> => {
  const metrics = await getMessenger().call(
    'SocialService:reactToComment',
    options,
  );
  return {
    reactions: toFeedReactions(metrics.reactions),
    userReaction: metrics.userReaction,
  };
};

/**
 * Removes the viewer's reaction on a Call.
 */
export const removeCommentReaction = async (
  options: RemoveCommentReactionOptions,
): Promise<CommentEngagement> => {
  const metrics = await getMessenger().call(
    'SocialService:removeCommentReaction',
    options,
  );
  return {
    reactions: toFeedReactions(metrics.reactions),
    userReaction: metrics.userReaction,
  };
};
