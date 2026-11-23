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
