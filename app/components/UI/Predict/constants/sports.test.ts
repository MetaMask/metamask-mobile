import {
  MONEYLINE_MARKET_TYPES,
  filterSupportedLeagues,
  getMatchingSportTeam,
  getNegRiskMoneylineTeamLogo,
  getPrimaryMoneylineOutcomes,
  hasNegRiskMoneylineGroupItem,
  isMoneylineLikeMarketType,
  resolveNegRiskMoneylineShortTitles,
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
  it('contains exactly 6 entries', () => {
    expect(MONEYLINE_MARKET_TYPES.size).toBe(6);
  });

  it('contains moneyline', () => {
    expect(MONEYLINE_MARKET_TYPES.has('moneyline')).toBe(true);
  });

  it('contains first_half_moneyline', () => {
    expect(MONEYLINE_MARKET_TYPES.has('first_half_moneyline')).toBe(true);
  });

  it('contains soccer_halftime_result', () => {
    expect(MONEYLINE_MARKET_TYPES.has('soccer_halftime_result')).toBe(true);
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

  it('returns true for first_half_moneyline', () => {
    const result = isMoneylineLikeMarketType('first_half_moneyline');

    expect(result).toBe(true);
  });

  it('returns true for soccer_halftime_result', () => {
    const result = isMoneylineLikeMarketType('soccer_halftime_result');

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
    ]);
  });
});

describe('getPrimaryMoneylineOutcomes', () => {
  it('keeps only main moneyline outcomes when extended sports markets are present', () => {
    const moneylineOutcome = { id: 'moneyline', sportsMarketType: 'moneyline' };
    const spreadOutcome = { id: 'spread', sportsMarketType: 'spreads' };
    const halftimeOutcome = {
      id: 'halftime',
      sportsMarketType: 'soccer_halftime_result',
    };

    const result = getPrimaryMoneylineOutcomes([
      spreadOutcome,
      moneylineOutcome,
      halftimeOutcome,
    ]);

    expect(result).toEqual([moneylineOutcome]);
  });

  it('falls back to all outcomes when no main moneyline type is present', () => {
    const outcomes = [
      { id: 'legacy-away', sportsMarketType: undefined },
      { id: 'legacy-draw', sportsMarketType: undefined },
      { id: 'legacy-home', sportsMarketType: undefined },
    ];

    expect(getPrimaryMoneylineOutcomes(outcomes)).toBe(outcomes);
  });
});

describe('sports moneyline helpers', () => {
  it('detects neg-risk moneyline markets with group item titles', () => {
    expect(
      hasNegRiskMoneylineGroupItem({
        negRisk: true,
        sportsMarketType: 'moneyline',
        groupItemTitle: 'Korea Republic',
      }),
    ).toBe(true);
    expect(
      hasNegRiskMoneylineGroupItem({
        negRisk: true,
        sportsMarketType: 'spreads',
        groupItemTitle: 'Korea Republic',
      }),
    ).toBe(false);
  });

  it('matches sport teams by name, alias, or abbreviation', () => {
    expect(getMatchingSportTeam('south korea', game)).toBe(game.homeTeam);
    expect(getMatchingSportTeam('CZE', game)).toBe(game.awayTeam);
  });

  it('resolves neg-risk moneyline short titles for team and draw outcomes', () => {
    expect(
      resolveNegRiskMoneylineShortTitles(
        {
          negRisk: true,
          sportsMarketType: 'moneyline',
          groupItemTitle: 'Korea Republic',
        },
        game,
      ),
    ).toEqual({ yesShort: 'KOR', noShort: 'CZE' });
    expect(
      resolveNegRiskMoneylineShortTitles(
        {
          negRisk: true,
          sportsMarketType: 'moneyline',
          groupItemTitle: 'Draw',
        },
        game,
      ),
    ).toEqual({ yesShort: 'Draw' });
  });

  it('uses team logos only for neg-risk moneyline team outcomes', () => {
    expect(
      getNegRiskMoneylineTeamLogo(
        {
          negRisk: true,
          sportsMarketType: 'moneyline',
          groupItemTitle: 'Korea Republic',
        },
        game,
      ),
    ).toBe('https://example.com/korea.png');
    expect(
      getNegRiskMoneylineTeamLogo(
        {
          negRisk: true,
          sportsMarketType: 'moneyline',
          groupItemTitle: 'Draw',
        },
        game,
      ),
    ).toBeUndefined();
    expect(
      getNegRiskMoneylineTeamLogo(
        {
          negRisk: true,
          sportsMarketType: 'spreads',
          groupItemTitle: 'Korea Republic',
        },
        game,
      ),
    ).toBeUndefined();
  });
});
