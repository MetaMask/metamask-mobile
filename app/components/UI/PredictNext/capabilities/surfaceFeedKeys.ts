import type { PredictFeedKey } from '../types';

/**
 * The one table from each surface's sections and tabs to Feed keys. A section
 * renders only when the Active Venue's descriptor has its key
 * (`resolveSurfaceFeeds`); a missing key never falls back to another Feed or
 * Venue. Surfaces own their section IDs; this table owns which Feed each one
 * shows.
 */
export const PREDICT_SURFACE_FEED_KEYS = {
  /**
   * Wallet Homepage Predictions section slots (PRED-1406). The pinned
   * championship slots name Events, not Feeds, so they are not listed.
   */
  homepageSlots: {
    'trending-carousel': 'trending',
    'btc-up-down': 'crypto-up-down-live',
    'world-cup': 'world-cup',
    'nfl-games': 'nfl-games',
    'college-football-games': 'college-football-games',
  },
  /** Prediction sections on the Explore (Trending) tabs (PRED-1408). */
  exploreTabs: {
    now: 'trending',
    macro: 'politics',
    rwas: 'politics',
    crypto: 'crypto',
    sports: 'sports',
  },
  /** Rewards campaign rows. Predict The Pitch is a World Cup campaign. */
  campaignRows: {
    'predict-the-pitch': 'world-cup',
  },
  /** PredictNext Home preview sections, keyed by the Feed Screen each opens. */
  nextHomeSections: {
    'sports-football-nfl': 'nfl-games',
    'sports-football-ncaa': 'college-football-games',
  },
  /** PredictNext Feed Screen tabs, by Feed Screen and tab. */
  nextFeedScreenTabs: {
    'sports-football-nfl': {
      games: 'nfl-games',
      props: 'nfl-props',
    },
    'sports-football-ncaa': {
      games: 'college-football-games',
      props: 'college-football-props',
    },
  },
} as const satisfies {
  homepageSlots: Record<string, PredictFeedKey>;
  exploreTabs: Record<string, PredictFeedKey>;
  campaignRows: Record<string, PredictFeedKey>;
  nextHomeSections: Record<string, PredictFeedKey>;
  nextFeedScreenTabs: Record<string, Record<string, PredictFeedKey>>;
};
