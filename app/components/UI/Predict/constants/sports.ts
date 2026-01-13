import { PredictSportsLeague } from '../types';

/**
 * Leagues with live game data support.
 *
 * To add a new league:
 * 1. Add the league to `PredictSportsLeague` type in `../types/index.ts`
 * 2. Add a slug pattern regex to `LEAGUE_SLUG_PATTERNS` in `../utils/gameParser.ts`
 * 3. Add the league to this array
 * 4. Add tests for the new league's slug parsing
 */
export const LIVE_SPORTS_LEAGUES: PredictSportsLeague[] = ['nfl'];

export const isLiveSportsEnabled = (): boolean =>
  Array.isArray(LIVE_SPORTS_LEAGUES) && LIVE_SPORTS_LEAGUES.length > 0;
