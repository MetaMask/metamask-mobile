export const FEED_REACTION_EMOJIS = [
  '❤️',
  '🔥',
  '👍',
  '😂',
  '👀',
  '😢',
  '😮',
  '❗',
] as const;

export type FeedReactionEmoji = (typeof FEED_REACTION_EMOJIS)[number];

export interface FeedReaction {
  emotion: string;
  count: number;
}

export interface CommentEngagement {
  reactions: FeedReaction[];
  userReaction: string | null;
}

export interface FeedAuthorComment {
  uid: string;
  text: string;
  timestamp: number;
  engagement: {
    reactions: FeedReaction[];
    userReaction: string | null;
  };
}

export const readAuthorComment = (core: object): FeedAuthorComment | null => {
  const value = (core as { authorComment?: FeedAuthorComment | null })
    .authorComment;
  if (!value || typeof value.uid !== 'string') {
    return null;
  }
  return value;
};

export const totalReactionCount = (reactions: FeedReaction[]): number =>
  reactions.reduce((sum, reaction) => sum + reaction.count, 0);

export const visibleReactions = (reactions: FeedReaction[]): FeedReaction[] =>
  reactions.filter((reaction) => reaction.count > 0);
