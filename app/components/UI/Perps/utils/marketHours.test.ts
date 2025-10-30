import {
  getMarketHoursStatus,
  formatCountdown,
  isEquityAsset,
} from './marketHours';

describe('marketHours utilities', () => {
  describe('formatCountdown', () => {
    it('formats minutes correctly', () => {
      const oneMinute = 60 * 1000;
      expect(formatCountdown(oneMinute)).toBe('1 minute');
      expect(formatCountdown(oneMinute * 30)).toBe('30 minutes');
      expect(formatCountdown(oneMinute * 45)).toBe('45 minutes');
    });

    it('formats hours and minutes correctly', () => {
      const oneHour = 60 * 60 * 1000;
      expect(formatCountdown(oneHour)).toBe('1 hour, 0 minutes');
      expect(formatCountdown(oneHour + 10 * 60 * 1000)).toBe(
        '1 hour, 10 minutes',
      );
      expect(formatCountdown(oneHour * 8 + 10 * 60 * 1000)).toBe(
        '8 hours, 10 minutes',
      );
    });

    it('handles plural forms correctly', () => {
      const oneMinute = 60 * 1000;
      const oneHour = 60 * 60 * 1000;

      expect(formatCountdown(oneMinute)).toBe('1 minute');
      expect(formatCountdown(oneMinute * 2)).toBe('2 minutes');
      expect(formatCountdown(oneHour)).toBe('1 hour, 0 minutes');
      expect(formatCountdown(oneHour * 2)).toBe('2 hours, 0 minutes');
    });
  });

  describe('isEquityAsset', () => {
    it('returns true for equity market type', () => {
      expect(isEquityAsset('equity')).toBe(true);
    });

    it('returns false for non-equity market types', () => {
      expect(isEquityAsset('crypto')).toBe(false);
      expect(isEquityAsset('commodity')).toBe(false);
      expect(isEquityAsset('forex')).toBe(false);
      expect(isEquityAsset(undefined)).toBe(false);
      expect(isEquityAsset('')).toBe(false);
    });
  });

  describe('getMarketHoursStatus', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('during market hours', () => {
      it('indicates market is open during weekday market hours', () => {
        // Tuesday, 2:00 PM EST (14:00)
        const mockDate = new Date('2025-01-14T19:00:00.000Z'); // 2 PM EST
        const status = getMarketHoursStatus(mockDate);

        expect(status.isOpen).toBe(true);
        expect(status.countdownText).toMatch(/\d+ hours?, \d+ minutes?/);
      });

      it('calculates time until market close correctly', () => {
        // Tuesday, 3:30 PM EST (should close in 30 minutes)
        const mockDate = new Date('2025-01-14T20:30:00.000Z'); // 3:30 PM EST
        const status = getMarketHoursStatus(mockDate);

        expect(status.isOpen).toBe(true);
        expect(status.countdownText).toBe('30 minutes');
      });
    });

    describe('outside market hours', () => {
      it('indicates market is closed on weekends', () => {
        // Saturday, 12:00 PM EST
        const mockDate = new Date('2025-01-11T17:00:00.000Z'); // Saturday noon EST
        const status = getMarketHoursStatus(mockDate);

        expect(status.isOpen).toBe(false);
      });

      it('indicates market is closed after hours on weekdays', () => {
        // Tuesday, 5:00 PM EST (after market close)
        const mockDate = new Date('2025-01-14T22:00:00.000Z'); // 5 PM EST
        const status = getMarketHoursStatus(mockDate);

        expect(status.isOpen).toBe(false);
      });

      it('indicates market is closed before hours on weekdays', () => {
        // Tuesday, 8:00 AM EST (before market open)
        const mockDate = new Date('2025-01-14T13:00:00.000Z'); // 8 AM EST
        const status = getMarketHoursStatus(mockDate);

        expect(status.isOpen).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('handles market open time exactly', () => {
        // Tuesday, 9:30 AM EST exactly
        const mockDate = new Date('2025-01-14T14:30:00.000Z'); // 9:30 AM EST
        const status = getMarketHoursStatus(mockDate);

        expect(status.isOpen).toBe(true);
      });

      it('handles market close time exactly', () => {
        // Tuesday, 4:00 PM EST exactly
        const mockDate = new Date('2025-01-14T21:00:00.000Z'); // 4 PM EST
        const status = getMarketHoursStatus(mockDate);

        expect(status.isOpen).toBe(false);
      });

      it('handles Friday to Monday transition', () => {
        // Friday, 5:00 PM EST (market closed, reopens Monday)
        const mockDate = new Date('2025-01-17T22:00:00.000Z'); // Friday 5 PM EST
        const status = getMarketHoursStatus(mockDate);

        expect(status.isOpen).toBe(false);
        // Multiple days until reopening
        expect(status.countdownText).toMatch(/\d+ hours?/);
      });
    });

    describe('return values', () => {
      it('returns all required properties', () => {
        const mockDate = new Date('2025-01-14T19:00:00.000Z'); // Tuesday 2 PM EST
        const status = getMarketHoursStatus(mockDate);

        expect(status).toHaveProperty('isOpen');
        expect(status).toHaveProperty('nextTransition');
        expect(status).toHaveProperty('countdownText');
        expect(typeof status.isOpen).toBe('boolean');
        expect(status.nextTransition).toBeInstanceOf(Date);
        expect(typeof status.countdownText).toBe('string');
      });
    });
  });
});
