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
  'ucl',
  'fif',
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
]);

export const isDrawCapableLeague = (league: PredictSportsLeague): boolean =>
  DRAW_CAPABLE_LEAGUES.has(league);
