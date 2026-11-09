import {
  FEED_REACTION_EMOJIS,
  readAuthorComment,
  totalReactionCount,
  visibleReactions,
} from './reactions';

describe('feed reactions helpers', () => {
  it('sums reaction counts and drops zeros', () => {
    const reactions = [
      { emotion: '🔥', count: 2 },
      { emotion: '👍', count: 0 },
      { emotion: '😂', count: 1 },
    ];

    expect(totalReactionCount(reactions)).toBe(3);
    expect(visibleReactions(reactions)).toStrictEqual([
      { emotion: '🔥', count: 2 },
      { emotion: '😂', count: 1 },
    ]);
  });

  it('returns null when authorComment is missing or has no uid', () => {
    expect(readAuthorComment({})).toBeNull();
    expect(readAuthorComment({ authorComment: { text: 'hi' } })).toBeNull();
  });

  it('includes trading reactions beyond the original eight', () => {
    expect(FEED_REACTION_EMOJIS).toEqual(
      expect.arrayContaining(['🐐', '😡', '👎', '🚀', '💎', '📈', '💀']),
    );
  });
});
