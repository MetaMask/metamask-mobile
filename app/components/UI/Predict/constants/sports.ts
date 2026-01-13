import { PredictSportsLeague } from '../types';

/**
 * Leagues with live game data support. Adding a league enables team caching,
 * game parsing, and WebSocket subscriptions for that league.
 */
export const LIVE_SPORTS_LEAGUES: PredictSportsLeague[] = ['nfl'];
