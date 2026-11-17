/**
 * Static Venue catalogs: client configuration for each Venue's product
 * support, in the catalog wire shape. Every value is parsed with
 * `parsePredictVenueCatalog` before use, like a backend response.
 */

/**
 * Kalshi V1: American football discovery, search, buy and sell, and Withdraw
 * (PRED-1163, USDC on Base). The Categories are Sports and Politics;
 * `politics` is the Politics Category's Feed, which for V1 is Trump. No Claim
 * (Kalshi settles automatically) and no Deposit until PRED-1161 ships.
 * `sports` is the Venue's general sports discovery Feed, which for V1 is NFL
 * Games. Each Politics key maps to the Feed ID of the same name
 * (va-mmcx-predict-api#71).
 *
 * This bundled catalog is only what this client can do; the Predict API
 * catalog behind `KalshiRemoteAdapter.marketData.fetchVenueCatalog` is
 * authoritative whenever it is read, and there the API adds `withdraw` only
 * while `KALSHI_WITHDRAWALS_ENABLED` is on. PRED-1403 replaces this with that
 * catalog.
 */
export const KALSHI_STATIC_VENUE_CATALOG = {
  venueId: 'kalshi',
  actions: ['buy', 'sell', 'withdraw'],
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
