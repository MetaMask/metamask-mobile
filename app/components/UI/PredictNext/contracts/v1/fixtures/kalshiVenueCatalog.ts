/**
 * A test fixture in the Kalshi catalog wire shape: discovery Feeds, the
 * Politics topic Feeds (Trump, Congress, Iran), the Categories Sports and
 * Politics, and the Feed Screens. It mirrors what the Predict API serves
 * (`venue-catalogs.ts` in va-mmcx-predict-api, PRED-1525), except `withdraw`. No production code reads it; Kalshi's adapter serves the Predict
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
  screens: [
    {
      id: 'sports-football-nfl',
      title: 'Sports',
      subtitle: 'NFL',
      tabs: [
        { id: 'games', title: 'Games', feed: 'nfl-games' },
        { id: 'props', title: 'Props', feed: 'nfl-props' },
      ],
    },
    {
      id: 'sports-football-ncaa',
      title: 'Sports',
      subtitle: 'NCAAF',
      tabs: [
        { id: 'games', title: 'Games', feed: 'college-football-games' },
        { id: 'props', title: 'Props', feed: 'college-football-props' },
      ],
    },
    {
      id: 'sports',
      title: 'Sports',
      tabs: [
        { id: 'nfl', title: 'NFL', feed: 'nfl-games' },
        { id: 'ncaaf', title: 'NCAAF', feed: 'college-football-games' },
      ],
    },
    {
      id: 'politics',
      title: 'Politics',
      tabs: [
        { id: 'trump', title: 'Trump', feed: 'politics-trump' },
        { id: 'congress', title: 'Congress', feed: 'politics-congress' },
        { id: 'iran', title: 'Iran', feed: 'politics-iran' },
      ],
    },
  ],
} as const;
