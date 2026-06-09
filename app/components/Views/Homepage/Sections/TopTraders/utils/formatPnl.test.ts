import { formatPnl } from './formatPnl';

describe('formatPnl', () => {
  describe('positive values', () => {
    it('formats a sub-thousand value with no comma', () => {
      expect(formatPnl(500)).toBe('+$500');
    });

    it('formats a sub-thousand value with rounding', () => {
      expect(formatPnl(499.7)).toBe('+$500');
    });

    it('formats a thousands value with K suffix', () => {
      expect(formatPnl(963_000)).toBe('+$963K');
    });

    it('formats a thousands value that needs a comma with K suffix', () => {
      expect(formatPnl(1_200_000)).toBe('+$1,200K');
    });

    it('formats a millions value with K suffix and comma', () => {
      expect(formatPnl(1_500_000)).toBe('+$1,500K');
    });

    it('formats zero as positive', () => {
      expect(formatPnl(0)).toBe('+$0');
    });
  });

  describe('negative values', () => {
    it('formats a sub-thousand negative value', () => {
      expect(formatPnl(-500)).toBe('-$500');
    });

    it('formats a negative thousands value with K suffix', () => {
      expect(formatPnl(-963_000)).toBe('-$963K');
    });

    it('formats a negative value that needs a comma', () => {
      expect(formatPnl(-1_200_000)).toBe('-$1,200K');
    });
  });

  describe('boundary values', () => {
    it('formats exactly 1,000', () => {
      expect(formatPnl(1_000)).toBe('+$1K');
    });

    it('formats just below 1,000', () => {
      expect(formatPnl(999)).toBe('+$999');
    });

    it('formats 999.5 as +$1K (rounds up to 1000 before branching)', () => {
      expect(formatPnl(999.5)).toBe('+$1K');
    });

    it('formats -999.7 as -$1K (rounds up to 1000 before branching)', () => {
      expect(formatPnl(-999.7)).toBe('-$1K');
    });

    it('formats exactly 1,000,000', () => {
      expect(formatPnl(1_000_000)).toBe('+$1,000K');
    });

    it('rounds fractional values correctly', () => {
      expect(formatPnl(1_499)).toBe('+$1K');
      expect(formatPnl(1_500)).toBe('+$2K');
    });
  });
});
