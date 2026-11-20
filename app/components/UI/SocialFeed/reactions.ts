export const FEED_REACTION_EMOJIS = [
  '❤️',
  '🔥',
  '👍',
  '😂',
  '👀',
  '😢',
  '😮',
  '❗',
  '🐐',
  '😡',
  '👎',
  '🚀',
  '💎',
  '📈',
  '💀',
  '🦊',
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
  /**
   * Language the Call was written in. `null` when detection has not run.
   * Absent on responses from older social-api builds.
   */
  sourceLanguage?: string | null;
  /** Translations keyed by language code, for example `{ en: 'Hello' }`. */
  translations?: Record<string, string>;
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

/**
 * Applies `next` counts without moving chips the viewer can already see.
 * Known emojis keep their slot, a new one joins at the end, and an emoji
 * that drops to zero leaves.
 */
export const keepReactionOrder = (
  current: FeedReaction[],
  next: FeedReaction[],
): FeedReaction[] => {
  const nextByEmotion = new Map(
    next.map((reaction) => [reaction.emotion, reaction]),
  );
  const known = new Set(current.map((reaction) => reaction.emotion));
  const kept = current.flatMap((reaction) => {
    const updated = nextByEmotion.get(reaction.emotion);
    return updated ? [updated] : [];
  });
  const added = next.filter((reaction) => !known.has(reaction.emotion));
  return visibleReactions([...kept, ...added]);
};
