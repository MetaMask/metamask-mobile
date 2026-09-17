import { usesTemporaryApiRanking } from './usesTemporaryApiRanking';

describe('usesTemporaryApiRanking', () => {
  it.each([
    'l',
    'la',
    'lap',
    'lapt',
    'lapto',
    'laptop',
    'LAPTOP',
    ' laptop ',
    'laptop token',
  ])('returns true for LAPTOP query "%s"', (query) => {
    const result = usesTemporaryApiRanking(query);

    expect(result).toBe(true);
  });

  it.each(['$l', '$lap', '$lapt', '$lapto', '$laptop', ' $LAPTOP '])(
    'returns true for ticker-prefixed LAPTOP query "%s"',
    (query) => {
      const result = usesTemporaryApiRanking(query);

      expect(result).toBe(true);
    },
  );

  it.each([undefined, '', '   ', 'eth', '$eth', 'desktop'])(
    'returns false for unrelated query "%s"',
    (query) => {
      const result = usesTemporaryApiRanking(query);

      expect(result).toBe(false);
    },
  );

  it('returns false when the remote flag is disabled', () => {
    const result = usesTemporaryApiRanking('laptop', false);

    expect(result).toBe(false);
  });
});
