import {
  formatRateOfReturn,
  formatComputedAt,
  formatTierDisplayName,
  getTierMinNetDeposit,
} from './OndoLeaderboard.utils';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const t: Record<string, string> = {
      'rewards.ondo_campaign_leaderboard.tier_starter': 'Bronze',
      'rewards.ondo_campaign_leaderboard.tier_mid': 'Silver',
      'rewards.ondo_campaign_leaderboard.tier_upper': 'Platinum',
    };
    return t[key] ?? key;
  },
  default: { locale: 'en-US' },
}));

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

  describe('formatTierDisplayName', () => {
    it('maps STARTER to Bronze', () => {
      expect(formatTierDisplayName('STARTER')).toBe('Bronze');
    });

    it('maps MID to Silver', () => {
      expect(formatTierDisplayName('MID')).toBe('Silver');
    });

    it('maps UPPER to Platinum', () => {
      expect(formatTierDisplayName('UPPER')).toBe('Platinum');
    });

    it('handles lowercase input', () => {
      expect(formatTierDisplayName('starter')).toBe('Bronze');
    });

    it('handles mixed-case input', () => {
      expect(formatTierDisplayName('Mid')).toBe('Silver');
    });

    it('returns the raw key for an unknown tier', () => {
      expect(formatTierDisplayName('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getTierMinNetDeposit', () => {
    const tiers = [
      { name: 'STARTER', minNetDeposit: 500 },
      { name: 'MID', minNetDeposit: 1000 },
    ];

    it('returns minNetDeposit for a matching tier', () => {
      expect(getTierMinNetDeposit(tiers, 'STARTER')).toBe(500);
    });

    it('is case-insensitive', () => {
      expect(getTierMinNetDeposit(tiers, 'mid')).toBe(1000);
    });

    it('returns null for an unknown tier', () => {
      expect(getTierMinNetDeposit(tiers, 'UPPER')).toBeNull();
    });

    it('returns null when tiers is undefined', () => {
      expect(getTierMinNetDeposit(undefined, 'STARTER')).toBeNull();
    });
  });
});
