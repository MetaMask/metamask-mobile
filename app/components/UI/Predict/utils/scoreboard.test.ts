import {
  getSportLiveStatusText,
  getSportPeriodLabel,
  isBreakingPeriod,
  isGameEnded,
  SPORT_ELAPSED_SUFFIX,
} from './scoreboard';
import type { PredictSportsLeague } from '../types';

const SOCCER_LEAGUE: PredictSportsLeague = 'fifwc';
const BASKETBALL_LEAGUE: PredictSportsLeague = 'nba';

describe('scoreboard utils', () => {
  describe('isBreakingPeriod', () => {
    it.each(['HT', 'FT', 'VFT', 'End Q1', 'End Q3', 'End Q4', 'PK'] as const)(
      'treats %s as a breaking period',
      (period) => {
        expect(isBreakingPeriod(period)).toBe(true);
      },
    );

    it.each(['Q1', 'Q2', '1H', '2H', 'ET', 'OT'] as const)(
      'treats %s as a running period',
      (period) => {
        expect(isBreakingPeriod(period)).toBe(false);
      },
    );

    it('returns false for null/undefined periods', () => {
      expect(isBreakingPeriod(null)).toBe(false);
      expect(isBreakingPeriod(undefined)).toBe(false);
    });
  });

  describe('getSportPeriodLabel', () => {
    it('maps halftime and final to localized labels', () => {
      expect(getSportPeriodLabel('HT')).toBe('Halftime');
      expect(getSportPeriodLabel('FT')).toBe('Final');
      expect(getSportPeriodLabel('VFT')).toBe('Final');
    });

    it('falls back to the raw period code', () => {
      expect(getSportPeriodLabel('End Q1')).toBe('End Q1');
      expect(getSportPeriodLabel(null)).toBe('');
    });
  });

  describe('isGameEnded', () => {
    it('is true when status is ended', () => {
      expect(isGameEnded({ status: 'ended' })).toBe(true);
      expect(isGameEnded({ status: 'ended', period: 'Q2' })).toBe(true);
    });

    it('is true at a full-time period even when status is not ended', () => {
      expect(isGameEnded({ status: 'ongoing', period: 'FT' })).toBe(true);
      expect(isGameEnded({ status: 'ongoing', period: 'VFT' })).toBe(true);
      expect(isGameEnded({ status: 'scheduled', period: 'FT' })).toBe(true);
    });

    it('is true when an endTime is stamped even while status is ongoing', () => {
      expect(
        isGameEnded({
          status: 'ongoing',
          period: 'Q3',
          endTime: '2026-06-08T22:00:00Z',
        }),
      ).toBe(true);
    });

    it('is false for in-progress, scheduled, and breaking-but-not-final states', () => {
      expect(isGameEnded({ status: 'ongoing', period: 'Q3' })).toBe(false);
      expect(isGameEnded({ status: 'ongoing', period: 'HT' })).toBe(false);
      expect(isGameEnded({ status: 'scheduled', period: null })).toBe(false);
      expect(isGameEnded({ status: 'ongoing', endTime: null })).toBe(false);
      expect(isGameEnded({})).toBe(false);
    });
  });

  describe('getSportLiveStatusText', () => {
    it('shows Final for ended games regardless of league or period', () => {
      expect(
        getSportLiveStatusText({
          league: SOCCER_LEAGUE,
          status: 'ended',
          period: '2H',
          elapsed: '90',
        }),
      ).toBe('Final');
    });

    it('shows Final when the period is full time', () => {
      expect(
        getSportLiveStatusText({
          league: BASKETBALL_LEAGUE,
          status: 'ongoing',
          period: 'FT',
          elapsed: null,
        }),
      ).toBe('Final');
    });

    it('shows the period label at a breaking period (e.g. halftime)', () => {
      expect(
        getSportLiveStatusText({
          league: SOCCER_LEAGUE,
          status: 'ongoing',
          period: 'HT',
          elapsed: '45',
        }),
      ).toBe('Halftime');
    });

    it('shows soccer minutes with an apostrophe during running play', () => {
      expect(
        getSportLiveStatusText({
          league: SOCCER_LEAGUE,
          status: 'ongoing',
          period: '1H',
          elapsed: '25',
        }),
      ).toBe(`25${SPORT_ELAPSED_SUFFIX}`);
    });

    it('shows period and elapsed for non-soccer running play', () => {
      expect(
        getSportLiveStatusText({
          league: BASKETBALL_LEAGUE,
          status: 'ongoing',
          period: 'Q1',
          elapsed: '8:15',
        }),
      ).toBe('Q1 • 8:15');
    });

    it('falls back to the period when a non-soccer game has no elapsed', () => {
      expect(
        getSportLiveStatusText({
          league: BASKETBALL_LEAGUE,
          status: 'ongoing',
          period: 'Q4',
          elapsed: null,
        }),
      ).toBe('Q4');
    });

    it('falls back to the elapsed when no period is available', () => {
      expect(
        getSportLiveStatusText({
          league: BASKETBALL_LEAGUE,
          status: 'ongoing',
          period: null,
          elapsed: '12:00',
        }),
      ).toBe('12:00');
    });
  });
});
