import { getUTCWeekRange } from '.';

describe('date utils', () => {
  describe('getUTCWeekRange', () => {
    it('should return the correct week range during a month', () => {
      const weekRange = getUTCWeekRange(new Date('2024-01-18'));
      expect(weekRange.start).toBeDefined();
      expect(weekRange.end).toBeDefined();
      expect(weekRange.start).toBe('2024-01-15');
      expect(weekRange.end).toBe('2024-01-21');
    });

    it('should return the correct week range across months', () => {
      const weekRange = getUTCWeekRange(new Date('2024-01-31'));
      expect(weekRange.start).toBeDefined();
      expect(weekRange.end).toBeDefined();
      expect(weekRange.start).toBe('2024-01-29');
      expect(weekRange.end).toBe('2024-02-04');
    });

    it('should return the correct week range across years', () => {
      const weekRange = getUTCWeekRange(new Date('2024-12-31'));
      expect(weekRange.start).toBeDefined();
      expect(weekRange.end).toBeDefined();
      expect(weekRange.start).toBe('2024-12-30');
      expect(weekRange.end).toBe('2025-01-05');
    });

    it('should error if the date is not a valid date', () => {
      expect(() => getUTCWeekRange('not a date')).toThrow();
    });
  });
});
