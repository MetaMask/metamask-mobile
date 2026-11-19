/**
 * Venue catalogs in the wire shape. Polymarket's is client configuration
 * until PRED-1356; Kalshi's is a test fixture because its production catalog
 * comes from the Predict API. Every value is parsed with
 * `parsePredictVenueCatalog` before use, like a backend response.
 */

/**
 * A test fixture in the Kalshi catalog wire shape: discovery Feeds, the
 * Politics topic Feeds (Trump, Congress, Iran), and the Categories Sports and
 * Politics. No production code reads it; Kalshi's adapter serves the Predict
 * API catalog, which alone decides which actions a deployment supports.
 * Tests that need a catalog use this shape instead of inventing one. Withdraw
 * is listed here only so fixtures can exercise the UI path; it is not a claim
 * that a deployment serves it.
 */
export const KALSHI_STATIC_VENUE_CATALOG = {
  venueId: 'kalshi',
  actions: ['buy', 'sell', 'deposit', 'withdraw'],
  feeds: {
    sports: 'sports-football-nfl-games',
    'nfl-games': 'sports-football-nfl-games',
    'nfl-props': 'sports-football-nfl-win-totals',
    'college-football-games': 'sports-football-ncaa-games',
    'college-football-props': 'sports-football-ncaa-win-totals',
    politics: 'politics-trump',
    'politics-trump': 'politics-trump',
    'politics-congress': 'politics-congress',
    'politics-iran': 'politics-iran',
  },
  categories: ['sports', 'politics'],
  searchSupported: true,
} as const;

/**
 * What legacy Polymarket supports today. Its Feed IDs are identifiers legacy
 * code resolves (redesign `feedConfig` IDs, the BTC up/down Series slug, the
 * World Cup tag slug), not Predict API Feeds. Client config until PRED-1356
 * moves Polymarket to the Predict API.
 */
export const POLYMARKET_STATIC_VENUE_CATALOG = {
  venueId: 'polymarket',
  actions: ['buy', 'sell', 'claim', 'deposit', 'withdraw'],
  feeds: {
    trending: 'trending',
    live: 'live',
    sports: 'sports',
    crypto: 'crypto',
    politics: 'politics',
    'crypto-up-down-live': 'btc-up-or-down-5m',
    'world-cup': 'fifa-world-cup',
  },
  searchSupported: true,
} as const;
