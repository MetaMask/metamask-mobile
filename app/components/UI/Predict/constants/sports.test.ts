import {
  MONEYLINE_MARKET_TYPES,
  PLAYER_PROP_MARKET_TYPES,
  SUPPORTED_SPORTS_MARKET_TYPES,
  filterSupportedLeagues,
  getPrimaryMoneylineOutcomes,
  isMoneylineLikeMarketType,
  isPlayerPropMarketType,
  isSupportedSportsMarketType,
} from './sports';

describe('SUPPORTED_SPORTS_MARKET_TYPES', () => {
  it('contains the currently supported sports market types', () => {
    expect([...SUPPORTED_SPORTS_MARKET_TYPES].sort()).toEqual(
      [
        'anytime_touchdowns',
        'assists',
        'basketball_odd_even',
        'basketball_team_to_score_first',
        'basketball_total_points',
        'both_teams_to_score',
        'both_teams_to_score_first_half',
        'both_teams_to_score_second_half',
        'corners',
        'exact_score',
        'first_half_moneyline',
        'first_half_spreads',
        'first_half_totals',
        'first_touchdowns',
        'goalscorers',
        'halftime_result',
        'moneyline',
        'nrfi',
        'points',
        'rebounds',
        'receiving_yards',
        'rushing_yards',
        'second_half_totals',
        'soccer_anytime_goalscorer',
        'soccer_exact_score',
        'soccer_first_corner',
        'soccer_first_half_team_totals',
        'soccer_first_half_total_corners',
        'soccer_first_to_score',
        'soccer_game_corners_odd_even',
        'soccer_halftime_result',
        'soccer_player_assists',
        'soccer_player_goalkeeper_saves',
        'soccer_player_goals',
        'soccer_player_goals_plus_assists',
        'soccer_player_shots',
        'soccer_player_shots_on_target',
        'soccer_second_half_result',
        'soccer_second_half_team_totals',
        'soccer_second_half_total_corners',
        'soccer_team_total_corners',
        'soccer_team_totals',
        'spreads',
        'team_totals',
        'tennis_completed_match',
        'tennis_first_set_totals',
        'tennis_first_set_winner',
        'tennis_match_totals',
        'tennis_set_handicap',
        'tennis_set_totals',
        'total_corners',
        'totals',
      ].sort(),
    );
  });
});

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

  it('contains moneyline', () => {
    expect(MONEYLINE_MARKET_TYPES.has('moneyline')).toBe(true);
  });

  it('contains first_half_moneyline', () => {
    expect(MONEYLINE_MARKET_TYPES.has('first_half_moneyline')).toBe(true);
  });

  it('contains soccer_halftime_result', () => {
    expect(MONEYLINE_MARKET_TYPES.has('soccer_halftime_result')).toBe(true);
  });

  it('contains first to score and second half result', () => {
    expect(MONEYLINE_MARKET_TYPES.has('soccer_first_to_score')).toBe(true);
    expect(MONEYLINE_MARKET_TYPES.has('soccer_second_half_result')).toBe(true);
  });

  it('contains tennis_first_set_winner', () => {
    expect(MONEYLINE_MARKET_TYPES.has('tennis_first_set_winner')).toBe(true);
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

  it('returns true for tennis_first_set_winner', () => {
    const result = isMoneylineLikeMarketType('tennis_first_set_winner');

    expect(result).toBe(true);
  });

  it('returns true for mixed-case moneyline values', () => {
    expect(isMoneylineLikeMarketType('Moneyline')).toBe(true);
    expect(isMoneylineLikeMarketType('FIRST_HALF_MONEYLINE')).toBe(true);
    expect(isMoneylineLikeMarketType('Soccer_Halftime_Result')).toBe(true);
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

describe('isSupportedSportsMarketType', () => {
  it('returns true for supported market types', () => {
    expect(isSupportedSportsMarketType('moneyline')).toBe(true);
    expect(isSupportedSportsMarketType('Soccer_Player_Goals')).toBe(true);
    expect(isSupportedSportsMarketType(undefined)).toBe(true);
  });

  it('returns false for unsupported market types', () => {
    expect(isSupportedSportsMarketType('basketball_player_blocks')).toBe(false);
    expect(isSupportedSportsMarketType('soccer_unknown_market')).toBe(false);
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
