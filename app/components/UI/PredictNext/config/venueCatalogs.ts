/**
 * Venue catalogs in the wire shape. Only Polymarket's is client
 * configuration, until PRED-1356; Kalshi's comes from the Predict API. Every
 * value is parsed with `parsePredictVenueCatalog` before use, like a backend
 * response.
 */

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
