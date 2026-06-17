import { isTopRank } from './topRank.colors';

describe('isTopRank', () => {
  it.each([1, 2, 3])('returns true for podium rank %s', (rank) => {
    expect(isTopRank(rank)).toBe(true);
  });

  it.each([0, 4, 5, 100, -1])('returns false for rank %s', (rank) => {
    expect(isTopRank(rank)).toBe(false);
  });
});
