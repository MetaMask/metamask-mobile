/**
 * Polymarket Gamma event for the 2025–26 NBA Finals winner (neg-risk group; each
 * child market is a team “Will X win the 2026 NBA Finals?”).
 *
 * @see https://gamma-api.polymarket.com/events/27830
 */
export const NBA_2026_CHAMPION_POLYMARKET_EVENT_ID = '27830';

/** Passed as `customQueryParams` to `getMarkets` / sports pagination (same pattern as World Cup `id=` filters). */
export const PREDICT_HOME_NBA_CHAMPION_EVENT_QUERY = `id=${NBA_2026_CHAMPION_POLYMARKET_EVENT_ID}`;
