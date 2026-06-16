import {
  MONEYLINE_MARKET_TYPES,
  PLAYER_PROP_MARKET_TYPES,
  SUPPORTED_SPORTS_MARKET_TYPES,
  filterSupportedLeagues,
  getPrimaryMoneylineOutcomes,
  getSportsMarketTypeGroupKey,
  isMoneylineLikeMarketType,
  isPlayerPropMarketType,
  isSupportedSportsMarketType,
} from './sports';

describe('MONEYLINE_MARKET_TYPES', () => {
  it('contains exactly the expected entries', () => {
    expect([...MONEYLINE_MARKET_TYPES].sort()).toEqual(
      [
        'moneyline',
        'first_half_moneyline',
        'soccer_halftime_result',
        'soccer_second_half_result',
        'soccer_first_to_score',
        'tennis_first_set_winner',
      ].sort(),
    );
  });
});

describe('isPlayerPropMarketType', () => {
  it('returns true for listed player prop types', () => {
    expect(isPlayerPropMarketType('points')).toBe(true);
    expect(isPlayerPropMarketType('soccer_anytime_goalscorer')).toBe(true);
    expect(PLAYER_PROP_MARKET_TYPES.has('soccer_player_goals')).toBe(true);
  });

  it('returns true for any *_player_* type', () => {
    expect(isPlayerPropMarketType('soccer_player_shots')).toBe(true);
    expect(isPlayerPropMarketType('basketball_player_blocks')).toBe(true);
  });

  it('returns false for team and game markets', () => {
    expect(isPlayerPropMarketType('totals')).toBe(false);
    expect(isPlayerPropMarketType('soccer_team_totals')).toBe(false);
    expect(isPlayerPropMarketType(undefined)).toBe(false);
  });
});

describe('isSupportedSportsMarketType', () => {
  it('contains the expected supported market types', () => {
    expect(SUPPORTED_SPORTS_MARKET_TYPES.has('moneyline')).toBe(true);
    expect(
      SUPPORTED_SPORTS_MARKET_TYPES.has('soccer_first_half_team_totals'),
    ).toBe(true);
    expect(
      SUPPORTED_SPORTS_MARKET_TYPES.has('soccer_player_goalkeeper_saves'),
    ).toBe(true);
    expect(SUPPORTED_SPORTS_MARKET_TYPES.has('tennis_completed_match')).toBe(
      true,
    );
  });

  it('returns true for supported market types and undefined', () => {
    expect(isSupportedSportsMarketType('moneyline')).toBe(true);
    expect(isSupportedSportsMarketType('Soccer_First_To_Score')).toBe(true);
    expect(isSupportedSportsMarketType(undefined)).toBe(true);
  });

  it('returns false for unsupported market types', () => {
    expect(isSupportedSportsMarketType('basketball_player_blocks')).toBe(false);
  });
});

describe('isMoneylineLikeMarketType', () => {
  it.each([
    'moneyline',
    'first_half_moneyline',
    'soccer_halftime_result',
    'soccer_second_half_result',
    'soccer_first_to_score',
    'tennis_first_set_winner',
    'Moneyline',
    'FIRST_HALF_MONEYLINE',
  ])('returns true for %s', (marketType) => {
    expect(isMoneylineLikeMarketType(marketType)).toBe(true);
  });

  it.each(['spreads', undefined])('returns false for %s', (marketType) => {
    expect(isMoneylineLikeMarketType(marketType)).toBe(false);
  });
});

describe('getSportsMarketTypeGroupKey', () => {
  it.each([
    ['soccer_player_goals', 'goals'],
    ['soccer_player_shots_on_target', 'shots_on_target'],
    ['soccer_player_goals_plus_assists', 'goals_plus_assists'],
    ['soccer_player_goalkeeper_saves', 'goalkeeper_saves'],
    ['totals', 'game_lines'],
  ])('groups %s as %s', (marketType, expectedGroup) => {
    expect(getSportsMarketTypeGroupKey(marketType)).toBe(expectedGroup);
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
