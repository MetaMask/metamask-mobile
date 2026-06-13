import { areSetsEqual } from './sets';

describe('areSetsEqual', () => {
  it('returns true for sets with the same values in different insertion order', () => {
    expect(areSetsEqual(new Set(['b', 'a']), new Set(['a', 'b']))).toBe(true);
  });

  it('returns false when set sizes differ', () => {
    expect(areSetsEqual(new Set(['a']), new Set(['a', 'b']))).toBe(false);
  });

  it('returns false when sets contain different values', () => {
    expect(areSetsEqual(new Set(['a', 'c']), new Set(['a', 'b']))).toBe(false);
  });
});
