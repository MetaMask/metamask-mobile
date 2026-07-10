import type { PredictMarketGame, PredictSportsLeague } from '../types';

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

export const WORLD_CUP_LEAGUE: PredictSportsLeague = 'fifwc';
export const SOCCER_TEAM_TO_ADVANCE_MARKET_TYPE = 'soccer_team_to_advance';

export const DEFAULT_NON_REG_TIME_SPORTS_MARKET_TYPES = [
  SOCCER_TEAM_TO_ADVANCE_MARKET_TYPE,
  'soccer_extra_time',
  'soccer_penalty_shootout',
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

export const MONEYLINE_MARKET_TYPES: ReadonlySet<string> = new Set([
  'moneyline',
  'first_half_moneyline',
  'soccer_halftime_result',
  'soccer_first_to_score',
  SOCCER_TEAM_TO_ADVANCE_MARKET_TYPE,
  'tennis_first_set_winner',
]);

export const isMoneylineLikeMarketType = (type?: string): boolean =>
  type !== undefined && MONEYLINE_MARKET_TYPES.has(type.toLowerCase());

export const isTeamToAdvanceMarketType = (type?: string): boolean =>
  type?.toLowerCase() === SOCCER_TEAM_TO_ADVANCE_MARKET_TYPE;

export const shouldShowRegTimeTag = ({
  game,
  sportsMarketType,
  nonRegTimeSportsMarketTypes = [],
}: {
  game?: PredictMarketGame;
  sportsMarketType?: string;
  nonRegTimeSportsMarketTypes?: string[];
}): boolean => {
  if (game?.league !== WORLD_CUP_LEAGUE) {
    return false;
  }

  if (!sportsMarketType) {
    return true;
  }

  return !nonRegTimeSportsMarketTypes.includes(sportsMarketType.toLowerCase());
};
