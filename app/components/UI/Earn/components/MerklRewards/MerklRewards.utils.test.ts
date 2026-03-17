import {
  MIN_CLAIMABLE_BONUS_USD,
  isClaimableBonusAboveThreshold,
} from './MerklRewards.utils';

describe('MerklRewards.utils', () => {
  describe('MIN_CLAIMABLE_BONUS_USD', () => {
    it('is 0.01', () => {
      expect(MIN_CLAIMABLE_BONUS_USD).toBe(0.01);
    });
  });

  describe('isClaimableBonusAboveThreshold', () => {
    it('returns false for null', () => {
      expect(isClaimableBonusAboveThreshold(null)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isClaimableBonusAboveThreshold('')).toBe(false);
    });

    it('returns false for "< 0.01" (useMerklRewards small-amount format)', () => {
      expect(isClaimableBonusAboveThreshold('< 0.01')).toBe(false);
    });

    it('returns false for values below 0.01', () => {
      expect(isClaimableBonusAboveThreshold('0')).toBe(false);
      expect(isClaimableBonusAboveThreshold('0.005')).toBe(false);
      expect(isClaimableBonusAboveThreshold('0.009')).toBe(false);
    });

    it('returns true for exactly 0.01 (boundary)', () => {
      expect(isClaimableBonusAboveThreshold('0.01')).toBe(true);
    });

    it('returns true for values above 0.01', () => {
      expect(isClaimableBonusAboveThreshold('0.02')).toBe(true);
      expect(isClaimableBonusAboveThreshold('1.50')).toBe(true);
      expect(isClaimableBonusAboveThreshold('10')).toBe(true);
    });

    it('returns false for non-numeric string', () => {
      expect(isClaimableBonusAboveThreshold('abc')).toBe(false);
    });

    it('returns false for string starting with "<"', () => {
      expect(isClaimableBonusAboveThreshold('< 1.00')).toBe(false);
    });
  });
});
