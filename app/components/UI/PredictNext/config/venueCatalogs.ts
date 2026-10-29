/**
 * Static Venue catalogs: client configuration for each Venue's product
 * support, in the catalog wire shape. Every value is parsed with
 * `parsePredictVenueCatalog` before use, like a backend response.
 */

/**
 * Kalshi V1: American football discovery, search, and buy and sell. No Claim
 * (Kalshi settles automatically) and no Deposit or Withdraw until the funding
 * slices (PRED-1161, PRED-1163) ship real implementations. `sports` is the
 * Venue's general sports discovery Feed, which for V1 is NFL Games. PRED-1403
 * replaces this with the Predict API catalog behind the same adapter method.
 */
export const KALSHI_STATIC_VENUE_CATALOG = {
  venueId: 'kalshi',
  actions: ['buy', 'sell'],
  feeds: {
    sports: 'sports-football-nfl-games',
    'nfl-games': 'sports-football-nfl-games',
    'nfl-props': 'sports-football-nfl-win-totals',
    'college-football-games': 'sports-football-ncaa-games',
    'college-football-props': 'sports-football-ncaa-win-totals',
  },
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
