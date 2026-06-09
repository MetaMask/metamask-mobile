import { PredictMarketGame, PredictOutcome } from '../../types';
import {
  BET_AMOUNT,
  LEAGUE_DISPLAY_NAMES,
  getTimeRemaining,
  formatScheduledTime,
  getPayoutDisplay,
  calculateTotalVolume,
} from './FeaturedCarouselCard.utils';

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
}));

jest.mock('../../../../../util/intl', () => ({
  getIntlDateTimeFormatter: (
    _locale: string,
    opts: Intl.DateTimeFormatOptions,
  ) => new Intl.DateTimeFormat('en-US', opts),
}));

const createMockGame = (
  overrides: Partial<PredictMarketGame> = {},
): PredictMarketGame => ({
  id: 'game-1',
  startTime: '2026-03-30T20:00:00Z',
  status: 'ongoing',
  league: 'ucl',
  elapsed: '45:00',
  period: '2H',
  score: { away: 1, home: 2, raw: '1-2' },
  homeTeam: {
    id: 'team-home',
    name: 'Barcelona',
    logo: '',
    abbreviation: 'BAR',
    color: 'blue',
    alias: 'Barcelona',
  },
  awayTeam: {
    id: 'team-away',
    name: 'Real Madrid',
    logo: '',
    abbreviation: 'RMA',
    color: 'white',
    alias: 'Real Madrid',
  },
  ...overrides,
});

const createMockOutcome = (
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome => ({
  id: 'outcome-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  title: 'Yes',
  description: '',
  image: '',
  status: 'open',
  tokens: [{ id: 't1', title: 'Yes', price: 0.65 }],
  volume: 1000,
  groupItemTitle: 'Yes',
  negRisk: false,
  tickSize: '0.01',
  ...overrides,
});

describe('FeaturedCarouselCard.utils', () => {
  describe('LEAGUE_DISPLAY_NAMES', () => {
    it('maps league keys to display names', () => {
      expect(LEAGUE_DISPLAY_NAMES.nfl).toBe('NFL');
      expect(LEAGUE_DISPLAY_NAMES.nba).toBe('NBA');
      expect(LEAGUE_DISPLAY_NAMES.ucl).toBe('UCL');
    });
  });

  describe('getTimeRemaining', () => {
    it('returns remaining minutes for MM:SS elapsed format', () => {
      const game = createMockGame({ league: 'ucl' });

      const result = getTimeRemaining(game, '45:00', 'ongoing');

      expect(result).toBe('45 mins');
    });

    it('rounds up minutes when seconds >= 30', () => {
      const game = createMockGame({ league: 'ucl' });

      const result = getTimeRemaining(game, '67:30', 'ongoing');

      expect(result).toBe('22 mins');
    });

    it('does not round up when seconds < 30', () => {
      const game = createMockGame({ league: 'ucl' });

      const result = getTimeRemaining(game, '67:20', 'ongoing');

      expect(result).toBe('23 mins');
    });

    it('handles plain number elapsed format without colon', () => {
      const game = createMockGame({ league: 'ucl' });

      const result = getTimeRemaining(game, '20', 'ongoing');

      expect(result).toBe('70 mins');
    });

    it('returns null when status is not ongoing', () => {
      const game = createMockGame({ status: 'scheduled' });

      const result = getTimeRemaining(game, '45:00', 'scheduled');

      expect(result).toBeNull();
    });

    it('returns null when elapsed is null', () => {
      const game = createMockGame({ elapsed: null });

      const result = getTimeRemaining(game, null, 'ongoing');

      expect(result).toBeNull();
    });

    it('returns null for non-numeric elapsed string', () => {
      const game = createMockGame();

      const result = getTimeRemaining(game, 'abc', 'ongoing');

      expect(result).toBeNull();
    });

    it('uses status parameter over game.status', () => {
      const game = createMockGame({ status: 'scheduled' });

      const result = getTimeRemaining(game, '20', 'ongoing');

      expect(result).toBe('70 mins');
    });

    it('falls back to game.status when status param is undefined', () => {
      const game = createMockGame({ status: 'ended' });

      const result = getTimeRemaining(game, '20');

      expect(result).toBeNull();
    });

    it('falls back to game.elapsed when elapsed param is undefined', () => {
      const game = createMockGame({ elapsed: '30:00', status: 'ongoing' });

      const result = getTimeRemaining(game);

      expect(result).toBe('60 mins');
    });

    it('clamps to 0 when elapsed exceeds total minutes', () => {
      const game = createMockGame({ league: 'ucl' });

      const result = getTimeRemaining(game, '95:00', 'ongoing');

      expect(result).toBe('0 mins');
    });

    it('uses 48 total minutes for NBA', () => {
      const game = createMockGame({ league: 'nba' });

      const result = getTimeRemaining(game, '24:00', 'ongoing');

      expect(result).toBe('24 mins');
    });

    it('uses 60 total minutes for NFL', () => {
      const game = createMockGame({ league: 'nfl' });

      const result = getTimeRemaining(game, '30:00', 'ongoing');

      expect(result).toBe('30 mins');
    });
  });

  describe('formatScheduledTime', () => {
    it('formats ISO start time with month, day, and time', () => {
      const result = formatScheduledTime('2026-03-30T20:00:00Z');

      expect(result).toMatch(/Mar/);
      expect(result).toMatch(/30/);
    });

    it('returns a non-empty string for valid dates', () => {
      const result = formatScheduledTime('2026-12-25T15:30:00Z');

      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/Dec/);
      expect(result).toMatch(/25/);
    });
  });

  describe('getPayoutDisplay', () => {
    it('returns calculated payout for valid price', () => {
      const result = getPayoutDisplay(0.5);

      expect(result).toBe('$200.00');
    });

    it('returns bet amount when price is 0', () => {
      const result = getPayoutDisplay(0);

      expect(result).toBe(`$${BET_AMOUNT.toFixed(2)}`);
    });

    it('returns bet amount when price is negative', () => {
      const result = getPayoutDisplay(-0.5);

      expect(result).toBe(`$${BET_AMOUNT.toFixed(2)}`);
    });

    it('returns bet amount when price is 1', () => {
      const result = getPayoutDisplay(1);

      expect(result).toBe(`$${BET_AMOUNT.toFixed(2)}`);
    });

    it('returns bet amount when price exceeds 1', () => {
      const result = getPayoutDisplay(1.5);

      expect(result).toBe(`$${BET_AMOUNT.toFixed(2)}`);
    });

    it('calculates correct payout for 65% price', () => {
      const result = getPayoutDisplay(0.65);

      expect(result).toBe('$153.85');
    });
  });

  describe('calculateTotalVolume', () => {
    it('sums numeric volumes across outcomes', () => {
      const outcomes = [
        createMockOutcome({ id: 'o1', volume: 1000 }),
        createMockOutcome({ id: 'o2', volume: 2000 }),
      ];

      const result = calculateTotalVolume(outcomes);

      expect(result).toBe(3000);
    });

    it('returns 0 for empty outcomes', () => {
      const result = calculateTotalVolume([]);

      expect(result).toBe(0);
    });

    it('treats falsy numeric volume as 0', () => {
      const outcomes = [
        createMockOutcome({ id: 'o1', volume: 0 }),
        createMockOutcome({ id: 'o2', volume: 1000 }),
      ];

      const result = calculateTotalVolume(outcomes);

      expect(result).toBe(1000);
    });

    it('handles undefined volume gracefully', () => {
      const outcomes = [
        createMockOutcome({ id: 'o1' }),
        createMockOutcome({ id: 'o2', volume: 1000 }),
      ];
      delete (outcomes[0] as Record<string, unknown>).volume;

      const result = calculateTotalVolume(outcomes);

      expect(result).toBe(1000);
    });
  });
});
