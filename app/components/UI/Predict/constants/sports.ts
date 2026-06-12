import {
  SPORTS_MARKET_TYPE_PRIORITIES,
  SPORTS_MARKET_TYPE_TO_GROUP,
} from '../providers/polymarket/constants';
import { PredictSportsLeague } from '../types';

/**
 * Leagues with live game data support.
 *
 * To add a new league:
 * 1. Add the league to `PredictSportsLeague` type in `../types/index.ts`
 * 2. Add a slug config to `LEAGUE_SLUG_CONFIGS` in `../utils/gameParser.ts`
 * 3. Add the league to this array
 * 4. Add tests for the new league's slug parsing
 */
export const SUPPORTED_SPORTS_LEAGUES: PredictSportsLeague[] = [
  'nfl',
  'nba',
  'wnba',
  'mlb',
  'nhl',
  'ucl',
  'fif',
  'lal',
  'uef',
  'bra2',
  'tur',
  'col1',
  'mls',
  'mex',
  'bun',
  'chi',
  'epl',
  'cze1',
  'j1100',
  'j2100',
  'fl1',
  'nor',
  'aus',
  'den',
  'sea',
  'kor',
  'ere',
  'spl',
  'bra',
  'por',
  'chi1',
  'per1',
  'lib',
  'cdr',
  'sud',
  'egy1',
  'uel',
  'rou1',
  'col',
  'bol1',
  'itc',
  'dfb',
  'cde',
  'fifwc',
  'atp',
  'wta',
  'itf',
];

export const filterSupportedLeagues = (
  leagues: string[],
): PredictSportsLeague[] =>
  leagues.filter((league): league is PredictSportsLeague =>
    SUPPORTED_SPORTS_LEAGUES.includes(league as PredictSportsLeague),
  );

const DRAW_CAPABLE_LEAGUES: ReadonlySet<PredictSportsLeague> = new Set([
  'ucl',
  'fif',
  'lal',
  'uef',
  'bra2',
  'tur',
  'col1',
  'mls',
  'mex',
  'bun',
  'chi',
  'epl',
  'cze1',
  'j1100',
  'j2100',
  'fl1',
  'nor',
  'aus',
  'den',
  'sea',
  'kor',
  'ere',
  'spl',
  'bra',
  'por',
  'chi1',
  'per1',
  'lib',
  'cdr',
  'sud',
  'egy1',
  'uel',
  'rou1',
  'col',
  'bol1',
  'itc',
  'dfb',
  'cde',
  'fifwc',
]);

export const isDrawCapableLeague = (league: PredictSportsLeague): boolean =>
  DRAW_CAPABLE_LEAGUES.has(league);

/**
 * Whether a league is association football (soccer).
 *
 * Soccer leagues use minute-based match clocks (rendered as "75’") and play in
 * halves rather than quarters. In this codebase the soccer leagues are exactly
 * the draw-capable leagues, so we reuse that set here. If a non-soccer
 * draw-capable league is ever added, introduce a dedicated soccer set.
 */
export const isSoccerLeague = (league: PredictSportsLeague): boolean =>
  isDrawCapableLeague(league);

export const SUPPORTED_SPORTS_MARKET_TYPES: ReadonlySet<string> = new Set([
  'moneyline',
  'spreads',
  'totals',
  'nrfi',
  'both_teams_to_score',
  'first_half_moneyline',
  'first_half_spreads',
  'first_half_totals',
  'second_half_totals',
  'points',
  'assists',
  'rebounds',
  'basketball_total_points',
  'basketball_odd_even',
  'basketball_team_to_score_first',
  'goalscorers',
  'exact_score',
  'halftime_result',
  'corners',
  'team_totals',
  'anytime_touchdowns',
  'first_touchdowns',
  'rushing_yards',
  'receiving_yards',
  'soccer_anytime_goalscorer',
  'soccer_exact_score',
  'soccer_halftime_result',
  'soccer_first_half_team_totals',
  'both_teams_to_score_first_half',
  'soccer_second_half_result',
  'soccer_second_half_team_totals',
  'both_teams_to_score_second_half',
  'soccer_first_to_score',
  'soccer_team_totals',
  'total_corners',
  'soccer_team_total_corners',
  'soccer_first_corner',
  'soccer_first_half_total_corners',
  'soccer_second_half_total_corners',
  'soccer_game_corners_odd_even',
  'soccer_player_goals',
  'soccer_player_assists',
  'soccer_player_shots',
  'soccer_player_goals_plus_assists',
  'soccer_player_shots_on_target',
  'soccer_player_goalkeeper_saves',
  'tennis_set_totals',
  'tennis_set_handicap',
  'tennis_match_totals',
  'tennis_first_set_totals',
  'tennis_first_set_winner',
  'tennis_completed_match',
  ...Object.keys(SPORTS_MARKET_TYPE_TO_GROUP),
  ...Object.keys(SPORTS_MARKET_TYPE_PRIORITIES),
]);

export const isSupportedSportsMarketType = (type?: string): boolean =>
  type === undefined || SUPPORTED_SPORTS_MARKET_TYPES.has(type.toLowerCase());

export const MONEYLINE_MARKET_TYPES: ReadonlySet<string> = new Set([
  'moneyline',
  'first_half_moneyline',
  'soccer_halftime_result',
  'soccer_second_half_result',
  'soccer_first_to_score',
  'tennis_first_set_winner',
]);

export const isMoneylineLikeMarketType = (type?: string): boolean =>
  type !== undefined && MONEYLINE_MARKET_TYPES.has(type.toLowerCase());

/**
 * Per-player markets (goals, assists, shots, points, ...). These are split into
 * one card per player. Soccer types follow the `*_player_*` naming; the rest
 * are listed explicitly.
 */
export const PLAYER_PROP_MARKET_TYPES: ReadonlySet<string> = new Set([
  'points',
  'assists',
  'rebounds',
  'rushing_yards',
  'receiving_yards',
  'anytime_touchdowns',
  'first_touchdowns',
  'soccer_anytime_goalscorer',
  'soccer_player_goals',
  'soccer_player_assists',
  'soccer_player_shots',
]);

export const isPlayerPropMarketType = (type?: string): boolean => {
  if (type === undefined) {
    return false;
  }
  const lower = type.toLowerCase();
  return PLAYER_PROP_MARKET_TYPES.has(lower) || lower.includes('player');
};

export const getPrimaryMoneylineOutcomes = <
  T extends { sportsMarketType?: string },
>(
  outcomes: T[],
): T[] => {
  const moneylineOutcomes = outcomes.filter(
    (outcome) => outcome.sportsMarketType?.toLowerCase() === 'moneyline',
  );

  return moneylineOutcomes.length > 0 ? moneylineOutcomes : outcomes;
};
