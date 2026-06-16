import { formatFullPnl } from './formatPnl';

describe('formatFullPnl', () => {
  describe('positive values', () => {
    it('formats a sub-thousand value with two decimals', () => {
      expect(formatFullPnl(500)).toBe('+$500.00');
    });

    it('formats a value with fractional cents rounded to two decimals', () => {
      expect(formatFullPnl(963_146.8)).toBe('+$963,146.80');
    });

    it('formats a thousands value with a comma', () => {
      expect(formatFullPnl(1_200)).toBe('+$1,200.00');
    });

    it('formats a millions value with commas', () => {
      expect(formatFullPnl(1_500_000)).toBe('+$1,500,000.00');
    });

    it('formats zero as positive', () => {
      expect(formatFullPnl(0)).toBe('+$0.00');
    });

    it('rounds to two decimals', () => {
      expect(formatFullPnl(499.999)).toBe('+$500.00');
    });
  });

  describe('negative values', () => {
    it('formats a sub-thousand negative value', () => {
      expect(formatFullPnl(-500)).toBe('-$500.00');
    });

    it('formats a negative millions value with commas', () => {
      expect(formatFullPnl(-1_200_000)).toBe('-$1,200,000.00');
    });
  });

  describe('missing / invalid values', () => {
    it('returns an em-dash for null', () => {
      expect(formatFullPnl(null)).toBe('—');
    });

    it('returns an em-dash for undefined', () => {
      expect(formatFullPnl(undefined)).toBe('—');
    });

    it('returns an em-dash for NaN', () => {
      expect(formatFullPnl(NaN)).toBe('—');
    });

    it('returns an em-dash for Infinity', () => {
      expect(formatFullPnl(Infinity)).toBe('—');
    });
  });
});
