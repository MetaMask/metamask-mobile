import {
  MONEYLINE_MARKET_TYPES,
  filterSupportedLeagues,
  isLineMarketType,
  isMoneylineLikeMarketType,
  isSpreadLikeMarketType,
  isTeamToAdvanceMarketType,
  shouldShowRegTimeTag,
} from './sports';
import type { PredictMarketGame } from '../types';

const game: PredictMarketGame = {
  id: 'game-1',
  startTime: '2026-06-11T23:00:00Z',
  status: 'scheduled',
  league: 'fifwc',
  elapsed: null,
  period: null,
  score: null,
  homeTeam: {
    id: 'team-home',
    name: 'Korea Republic',
    logo: 'https://example.com/korea.png',
    abbreviation: 'KOR',
    color: 'red',
    alias: 'South Korea',
  },
  awayTeam: {
    id: 'team-away',
    name: 'Czechia',
    logo: 'https://example.com/czechia.png',
    abbreviation: 'CZE',
    color: 'blue',
  },
};

describe('MONEYLINE_MARKET_TYPES', () => {
  it('contains exactly 8 entries', () => {
    expect(MONEYLINE_MARKET_TYPES.size).toBe(8);
  });

  it('contains moneyline', () => {
    expect(MONEYLINE_MARKET_TYPES.has('moneyline')).toBe(true);
  });

  it('contains child_moneyline', () => {
    expect(MONEYLINE_MARKET_TYPES.has('child_moneyline')).toBe(true);
  });

  it('contains first_half_moneyline', () => {
    expect(MONEYLINE_MARKET_TYPES.has('first_half_moneyline')).toBe(true);
  });

  it('contains soccer_halftime_result', () => {
    expect(MONEYLINE_MARKET_TYPES.has('soccer_halftime_result')).toBe(true);
  });

  it('contains soccer_second_half_result', () => {
    expect(MONEYLINE_MARKET_TYPES.has('soccer_second_half_result')).toBe(true);
  });

  it('contains soccer_first_to_score', () => {
    expect(MONEYLINE_MARKET_TYPES.has('soccer_first_to_score')).toBe(true);
  });

  it('contains soccer_team_to_advance', () => {
    expect(MONEYLINE_MARKET_TYPES.has('soccer_team_to_advance')).toBe(true);
  });

  it('contains tennis_first_set_winner', () => {
    expect(MONEYLINE_MARKET_TYPES.has('tennis_first_set_winner')).toBe(true);
  });
});

describe('isMoneylineLikeMarketType', () => {
  it('returns true for moneyline', () => {
    const result = isMoneylineLikeMarketType('moneyline');

    expect(result).toBe(true);
  });

  it('returns true for child_moneyline', () => {
    const result = isMoneylineLikeMarketType('child_moneyline');

    expect(result).toBe(true);
  });

  it('returns true for first_half_moneyline', () => {
    const result = isMoneylineLikeMarketType('first_half_moneyline');

    expect(result).toBe(true);
  });

  it('returns true for soccer_halftime_result', () => {
    const result = isMoneylineLikeMarketType('soccer_halftime_result');

    expect(result).toBe(true);
  });

  it('returns true for soccer_second_half_result', () => {
    const result = isMoneylineLikeMarketType('soccer_second_half_result');

    expect(result).toBe(true);
  });

  it('returns true for soccer_first_to_score', () => {
    const result = isMoneylineLikeMarketType('soccer_first_to_score');

    expect(result).toBe(true);
  });

  it('returns true for soccer_team_to_advance', () => {
    const result = isMoneylineLikeMarketType('soccer_team_to_advance');

    expect(result).toBe(true);
  });

  it('returns true for tennis_first_set_winner', () => {
    const result = isMoneylineLikeMarketType('tennis_first_set_winner');

    expect(result).toBe(true);
  });

  it('returns true for mixed-case moneyline values', () => {
    expect(isMoneylineLikeMarketType('Moneyline')).toBe(true);
    expect(isMoneylineLikeMarketType('FIRST_HALF_MONEYLINE')).toBe(true);
    expect(isMoneylineLikeMarketType('Soccer_Halftime_Result')).toBe(true);
    expect(isMoneylineLikeMarketType('Soccer_Second_Half_Result')).toBe(true);
    expect(isMoneylineLikeMarketType('Soccer_First_To_Score')).toBe(true);
    expect(isMoneylineLikeMarketType('Soccer_Team_To_Advance')).toBe(true);
    expect(isMoneylineLikeMarketType('Tennis_First_Set_Winner')).toBe(true);
  });

  it('returns false for spreads', () => {
    const result = isMoneylineLikeMarketType('spreads');

    expect(result).toBe(false);
  });

  it('returns false for undefined', () => {
    const result = isMoneylineLikeMarketType(undefined);

    expect(result).toBe(false);
  });
});

describe('isSpreadLikeMarketType', () => {
  it.each([
    'spreads',
    'map_handicap',
    'round_handicap_game_3',
    'round_handicap_game_7',
  ])('returns true for %s', (type) => {
    expect(isSpreadLikeMarketType(type)).toBe(true);
  });

  it('returns false for an over-under market', () => {
    expect(isSpreadLikeMarketType('round_over_under_game_7')).toBe(false);
  });
});

describe('isLineMarketType', () => {
  it.each([
    'map_handicap',
    'round_handicap_game_1',
    'round_handicap_game_7',
    'round_over_under_game_2',
    'round_over_under_game_7',
    'kill_over_under_game',
    'map_participant_win_total',
  ])('returns true for esports line market %s', (type) => {
    expect(isLineMarketType(type)).toBe(true);
  });

  it.each([
    'totals',
    'first_half_totals',
    'second_half_totals',
    'team_totals',
    'soccer_team_totals',
    'tennis_set_totals',
    'tennis_first_set_totals',
    'tennis_match_totals',
  ])('returns true for totals line market %s', (type) => {
    expect(isLineMarketType(type)).toBe(true);
  });

  it('returns false for an esports binary prop', () => {
    expect(isLineMarketType('lol_penta_kill')).toBe(false);
  });
});

describe('filterSupportedLeagues', () => {
  it('keeps the extended sports leagues supported by Predict', () => {
    const result = filterSupportedLeagues([
      'nba',
      'wnba',
      'mlb',
      'nhl',
      'fifwc',
      'ucl',
      'epl',
      'lal',
      'sea',
      'bun',
      'mls',
      'fif',
      'atp',
      'wta',
      'itf',
      'cs2',
      'lol',
      'dota2',
      'val',
      'r6siege',
      'fake_league',
    ]);

    expect(result).toEqual([
      'nba',
      'wnba',
      'mlb',
      'nhl',
      'fifwc',
      'ucl',
      'epl',
      'lal',
      'sea',
      'bun',
      'mls',
      'fif',
      'atp',
      'wta',
      'itf',
      'cs2',
      'lol',
      'dota2',
      'val',
      'r6siege',
    ]);
  });
});

describe('isTeamToAdvanceMarketType', () => {
  it('detects team-to-advance market types case-insensitively', () => {
    expect(isTeamToAdvanceMarketType('soccer_team_to_advance')).toBe(true);
    expect(isTeamToAdvanceMarketType('SOCCER_TEAM_TO_ADVANCE')).toBe(true);
    expect(isTeamToAdvanceMarketType('moneyline')).toBe(false);
    expect(isTeamToAdvanceMarketType()).toBe(false);
  });
});

describe('shouldShowRegTimeTag', () => {
  it('shows Reg time only for World Cup regular-time markets', () => {
    expect(
      shouldShowRegTimeTag({
        game,
        sportsMarketType: 'moneyline',
        nonRegTimeSportsMarketTypes: ['soccer_team_to_advance'],
      }),
    ).toBe(true);
    expect(
      shouldShowRegTimeTag({
        game,
        sportsMarketType: 'soccer_team_to_advance',
        nonRegTimeSportsMarketTypes: ['soccer_team_to_advance'],
      }),
    ).toBe(false);
    expect(
      shouldShowRegTimeTag({
        game: { ...game, league: 'ucl' },
        sportsMarketType: 'moneyline',
        nonRegTimeSportsMarketTypes: ['soccer_team_to_advance'],
      }),
    ).toBe(false);
  });
});
