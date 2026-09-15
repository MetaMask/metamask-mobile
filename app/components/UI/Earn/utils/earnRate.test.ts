import type { EarnExperience, EarnRate } from '../types/earnAssets';
import { EARN_EXPERIENCES } from '../constants/experiences';
import {
  createEarnRate,
  formatEarnRatePercentage,
  getEarnRateCopy,
  getHighestReadyRateEntry,
  parseRatePercent,
} from './earnRate';

const createExperience = (rate: EarnRate): EarnExperience => ({
  id: 'experience',
  type: EARN_EXPERIENCES.STABLECOIN_LENDING,
  role: 'underlying',
  depositReadiness: { status: 'ready' },
  rate,
  isFeeSubsidized: false,
});

describe('earnRate utilities', () => {
  describe('parseRatePercent', () => {
    it('parses numeric and percent-suffixed values', () => {
      expect(parseRatePercent(' 6.2% ')).toBe(6.2);
      expect(parseRatePercent(4.1)).toBe(4.1);
    });

    it('returns undefined for missing or invalid values', () => {
      expect(parseRatePercent(undefined)).toBeUndefined();
      expect(parseRatePercent(null)).toBeUndefined();
      expect(parseRatePercent('not-a-rate')).toBeUndefined();
    });
  });

  describe('createEarnRate', () => {
    it.each([
      {
        options: { percentage: 6.2 },
        expected: { type: 'APY', percentage: 6.2, status: 'ready' },
      },
      {
        options: { isLoading: true },
        expected: { type: 'APY', status: 'loading' },
      },
      {
        options: { isError: true },
        expected: { type: 'APY', status: 'error' },
      },
      {
        options: {},
        expected: { type: 'APY', status: 'unavailable' },
      },
    ] as const)('creates the expected rate status', ({ options, expected }) => {
      expect(createEarnRate({ type: 'APY', ...options })).toEqual(expected);
    });
  });

  describe('getHighestReadyRateEntry', () => {
    it.each([
      {
        entries: [],
      },
      {
        entries: [
          createExperience({
            type: 'APY',
            status: 'error',
          }),
        ],
      },
      {
        entries: [
          createExperience({
            type: 'APY',
            status: 'unavailable',
          }),
        ],
      },
    ] as const)('returns undefined when no rate is ready', ({ entries }) => {
      const result = getHighestReadyRateEntry(entries, (entry) => entry.rate);

      expect(result).toBeUndefined();
    });

    it('returns the highest finite ready rate and preserves its type', () => {
      const entries = [
        createExperience({
          type: 'APR',
          percentage: 8,
          status: 'ready',
        }),
        createExperience({
          type: 'APY',
          percentage: 9.5,
          status: 'ready',
        }),
        createExperience({ type: 'APY', status: 'loading' }),
      ];

      expect(getHighestReadyRateEntry(entries, (entry) => entry.rate)).toBe(
        entries[1],
      );
    });

    it('keeps the first entry when ready rates tie', () => {
      const first = createExperience({
        type: 'APR',
        percentage: 6.2,
        status: 'ready',
      });
      const second = createExperience({
        type: 'APY',
        percentage: 6.2,
        status: 'ready',
      });

      expect(
        getHighestReadyRateEntry([first, second], (entry) => entry.rate),
      ).toBe(first);
    });

    it('ignores ready rates with non-finite percentages', () => {
      const invalid = createExperience({
        type: 'APY',
        percentage: Number.NaN,
        status: 'ready',
      });

      expect(
        getHighestReadyRateEntry([invalid], (entry) => entry.rate),
      ).toBeUndefined();
    });
  });

  describe('getEarnRateCopy', () => {
    it.each([
      ['APR', '4.2% APR'],
      ['APY', '4.2% APY'],
    ] as const)('formats %s copy', (rateType, expected) => {
      expect(getEarnRateCopy({ percentage: 4.219, rateType })).toBe(expected);
    });
  });

  describe('formatEarnRatePercentage', () => {
    it.each([
      [0, '0'],
      [0.04, '0'],
      [0.05, '0.1'],
      [4.219, '4.2'],
      [4.249, '4.2'],
      [4.25, '4.3'],
      ['4.25', '4.3'],
      [4.2, '4.2'],
      [9.95, '10'],
    ] as const)('formats %s to one decimal place', (value, expected) => {
      const result = formatEarnRatePercentage(value);

      expect(result).toBe(expected);
    });

    it('rounds halfway values up at one decimal place', () => {
      const result = [4.25, 4.35].map(formatEarnRatePercentage);

      expect(result).toEqual(['4.3', '4.4']);
    });

    it('removes trailing zero after rounding', () => {
      const result = formatEarnRatePercentage('4.0');

      expect(result).toBe('4');
    });

    it('returns NaN for a NaN input', () => {
      const result = formatEarnRatePercentage(NaN);

      expect(result).toBe('NaN');
    });

    it('returns NaN for a non-numeric input', () => {
      const result = formatEarnRatePercentage('not-a-rate');

      expect(result).toBe('NaN');
    });

    it('returns Infinity for an infinite input', () => {
      const result = formatEarnRatePercentage(Infinity);

      expect(result).toBe('Infinity');
    });
  });
});
