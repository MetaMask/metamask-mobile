import type { EarnExperience, EarnRate } from '../types/earnAssets';
import { EARN_EXPERIENCES } from '../constants/experiences';
import {
  createEarnRate,
  getEarnRateCopy,
  getHighestReadyRateEntry,
  parseRatePercent,
} from './earnRate';

const createExperience = (rate: EarnRate): EarnExperience => ({
  id: 'experience',
  type: EARN_EXPERIENCES.STABLECOIN_LENDING,
  role: 'underlying',
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
      [
        'ready',
        { percentage: 6.2 },
        { type: 'APY', percentage: 6.2, status: 'ready' },
      ],
      ['loading', { isLoading: true }, { type: 'APY', status: 'loading' }],
      ['error', { isError: true }, { type: 'APY', status: 'error' }],
      ['unavailable', {}, { type: 'APY', status: 'unavailable' }],
    ] as const)('creates %s rate status', (_status, options, expected) => {
      expect(createEarnRate({ type: 'APY', ...options })).toEqual(expected);
    });
  });

  describe('getHighestReadyRateEntry', () => {
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
      ['APR', '4.21% APR'],
      ['APY', '4.21% APY'],
    ] as const)('formats %s copy', (rateType, expected) => {
      expect(getEarnRateCopy({ percentage: 4.219, rateType })).toBe(expected);
    });
  });
});
