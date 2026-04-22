import { formatRateOfReturn, formatComputedAt } from './OndoLeaderboard.utils';

describe('OndoLeaderboard.utils', () => {
  describe('formatRateOfReturn', () => {
    it('formats positive rate with plus sign', () => {
      expect(formatRateOfReturn(0.15)).toBe('+15.00%');
    });

    it('formats negative rate without plus sign', () => {
      expect(formatRateOfReturn(-0.05)).toBe('-5.00%');
    });

    it('formats zero with plus sign', () => {
      expect(formatRateOfReturn(0)).toBe('+0.00%');
    });

    it('rounds to two decimal places', () => {
      expect(formatRateOfReturn(0.1523)).toBe('+15.23%');
    });

    it('formats large positive rate', () => {
      expect(formatRateOfReturn(1.0)).toBe('+100.00%');
    });

    it('formats small negative rate', () => {
      expect(formatRateOfReturn(-0.0832)).toBe('-8.32%');
    });
  });

  describe('formatComputedAt', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-20T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns empty string for null', () => {
      expect(formatComputedAt(null)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(formatComputedAt('')).toBe('');
    });

    it('returns a non-empty string for a valid ISO timestamp', () => {
      const result = formatComputedAt('2024-03-20T12:00:00.000Z');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('returns empty string for an unparseable value', () => {
      expect(formatComputedAt('not-a-date')).toBe('');
    });
  });
});
