import {
  FEED_REACTION_EMOJIS,
  keepReactionOrder,
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

  it('updates counts in place, appends new emojis, and drops emptied ones', () => {
    const current = [
      { emotion: '❤️', count: 2 },
      { emotion: '😡', count: 1 },
      { emotion: '😂', count: 1 },
    ];

    expect(
      keepReactionOrder(current, [
        { emotion: '😡', count: 3 },
        { emotion: '🚀', count: 1 },
        { emotion: '❤️', count: 1 },
        { emotion: '😂', count: 0 },
      ]),
    ).toStrictEqual([
      { emotion: '❤️', count: 1 },
      { emotion: '😡', count: 3 },
      { emotion: '🚀', count: 1 },
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
