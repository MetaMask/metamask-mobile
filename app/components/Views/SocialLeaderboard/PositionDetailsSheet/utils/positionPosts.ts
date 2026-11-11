import type {
  AuthorComment,
  Position,
  Trade,
} from '@metamask/social-controllers';

const byTimestampDesc = (a: { timestamp: number }, b: { timestamp: number }) =>
  b.timestamp - a.timestamp;

/**
 * Every author comment on the position's fills, newest first. A comment is
 * listed once even if two fills carry it (a Hyperliquid flip's legs share a
 * transaction).
 */
export const getPositionPosts = (
  position: Position | undefined,
): AuthorComment[] => {
  const seen = new Set<string>();
  const posts: AuthorComment[] = [];
  for (const trade of position?.trades ?? []) {
    for (const comment of trade.comments ?? []) {
      if (!seen.has(comment.uid)) {
        seen.add(comment.uid);
        posts.push(comment);
      }
    }
  }
  return posts.sort(byTimestampDesc);
};

/** The position's fills, newest first. */
export const getPositionTransactions = (
  position: Position | undefined,
): Trade[] => [...(position?.trades ?? [])].sort(byTimestampDesc);
