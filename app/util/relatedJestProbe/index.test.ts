import { clampToRange, isEvenLength } from '.';

describe('relatedJestProbe', () => {
  describe('clampToRange', () => {
    it('returns the value when it is inside the range', () => {
      expect(clampToRange(5, 1, 10)).toBe(5);
    });

    it('returns the minimum when the value is below the range', () => {
      expect(clampToRange(-3, 1, 10)).toBe(1);
    });

    it('returns the maximum when the value is above the range', () => {
      expect(clampToRange(42, 1, 10)).toBe(10);
    });

    it('throws when the minimum exceeds the maximum', () => {
      expect(() => clampToRange(5, 10, 1)).toThrow(
        'min must not exceed max',
      );
    });
  });

  describe('isEvenLength', () => {
    it('returns true for an even length string', () => {
      expect(isEvenLength('ab')).toBe(true);
    });

    it('returns false for an odd length string', () => {
      expect(isEvenLength('abc')).toBe(false);
    });
  });
});
