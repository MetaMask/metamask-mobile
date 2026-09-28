import type {
  SocialFilterNetwork,
  SocialFilterTimeframe,
  SocialFilterType,
  SocialFilterVerification,
  SocialRangeFilter,
  SocialShellFilters,
  SocialTraderCohort,
} from './types';
import type { SocialShellTab } from '../types';
import {
  ALL_CHAINS,
  PERP_CHAINS,
  SPOT_CHAINS,
} from '../../../shared/top-traders-constants';
import { LEADERBOARD_COHORT_LEADING_EMOJI } from '../../components/Filters/filterOptions';
import type {
  SocialTimeframe,
  SocialTypeFilter,
} from '../../components/Filters';

/**
 * Market cap slider bounds (USD billions). Matches the screenshot labels
 * `$0` and `$1000B`.
 */
export const MARKET_CAP_RANGE: SocialRangeFilter = {
  min: 0,
  max: 1000,
};

/**
 * 24h volume slider bounds (USD millions). Matches the screenshot labels
 * `$0` and `$100M`.
 */
export const VOLUME_24H_RANGE: SocialRangeFilter = {
  min: 0,
  max: 100,
};

export const DEFAULT_FILTERS: SocialShellFilters = {
  type: 'all',
  traderCohort: 'all',
  verification: 'all',
  timeframe: '7d',
  network: 'all',
  marketCap: { ...MARKET_CAP_RANGE },
  volume24h: { ...VOLUME_24H_RANGE },
};

/**
 * Seed per-tab filter state. Every tab starts from the same defaults; the
 * sheet hides sections per tab but the underlying model is shared in shape.
 */
export const DEFAULT_TAB_FILTER_STATE: Record<
  SocialShellTab,
  SocialShellFilters
> = {
  trending: { ...DEFAULT_FILTERS },
  following: { ...DEFAULT_FILTERS },
  liveTrades: { ...DEFAULT_FILTERS },
  leaderboard: { ...DEFAULT_FILTERS },
};

export const TYPE_OPTIONS: SocialFilterType[] = [
  'all',
  'tokens',
  'perps',
  'predictions',
];

export const TYPE_OPTIONS_FOLLOWING: SocialFilterType[] = [
  'all',
  'tokens',
  'perps',
];

export const TYPE_LABEL_KEY: Record<SocialFilterType, string> = {
  all: 'social_leaderboard.shell.filters.type.all',
  tokens: 'social_leaderboard.shell.filters.type.tokens',
  perps: 'social_leaderboard.shell.filters.type.perps',
  predictions: 'social_leaderboard.shell.filters.type.predictions',
};

export const COHORT_OPTIONS_FOLLOWING: SocialTraderCohort[] = [
  'all',
  'shrimp',
  'dolphin',
  'whale',
];

export const COHORT_OPTIONS_LIVE_TRADES: SocialTraderCohort[] = [
  'all',
  'following',
  'shrimp',
  'dolphin',
  'whale',
];

export const COHORT_OPTIONS_LEADERBOARD: SocialTraderCohort[] = [
  'all',
  'following',
  'shrimp',
  'dolphin',
  'whale',
  'verified',
];

/** @deprecated Use COHORT_OPTIONS_LIVE_TRADES. Kept for existing imports. */
export const COHORT_OPTIONS_WITH_FOLLOWING = COHORT_OPTIONS_LIVE_TRADES;

/** @deprecated Use COHORT_OPTIONS_FOLLOWING. */
export const COHORT_OPTIONS_WITHOUT_FOLLOWING = COHORT_OPTIONS_FOLLOWING;

export const COHORT_LABEL_KEY: Record<SocialTraderCohort, string> = {
  all: 'social_leaderboard.shell.filters.trader_cohort.all',
  following: 'social_leaderboard.shell.filters.trader_cohort.following',
  shrimp: 'social_leaderboard.shell.filters.trader_cohort.shrimp',
  dolphin: 'social_leaderboard.shell.filters.trader_cohort.dolphin',
  whale: 'social_leaderboard.shell.filters.trader_cohort.whale',
  verified: 'social_leaderboard.shell.filters.trader_cohort.verified',
};

export const COHORT_LEADING_EMOJI: Partial<Record<SocialTraderCohort, string>> =
  {
    shrimp: LEADERBOARD_COHORT_LEADING_EMOJI.shrimp,
    dolphin: LEADERBOARD_COHORT_LEADING_EMOJI.dolphin,
    whale: LEADERBOARD_COHORT_LEADING_EMOJI.whale,
  };

export const VERIFICATION_OPTIONS: SocialFilterVerification[] = [
  'all',
  'verified',
  'unverified',
];

export const VERIFICATION_LABEL_KEY: Record<SocialFilterVerification, string> =
  {
    all: 'social_leaderboard.shell.filters.verification.all',
    verified: 'social_leaderboard.shell.filters.verification.verified',
    unverified: 'social_leaderboard.shell.filters.verification.unverified',
  };

export const TIMEFRAME_OPTIONS: SocialFilterTimeframe[] = [
  '1h',
  '24h',
  '7d',
  '30d',
];

export const TIMEFRAME_LABEL_KEY: Record<SocialFilterTimeframe, string> = {
  '1h': 'social_leaderboard.shell.filters.timeframe.1h',
  '24h': 'social_leaderboard.shell.filters.timeframe.24h',
  '7d': 'social_leaderboard.shell.filters.timeframe.7d',
  '30d': 'social_leaderboard.shell.filters.timeframe.30d',
};

export const NETWORK_OPTIONS: SocialFilterNetwork[] = [
  'all',
  'robinhood',
  'bnb',
  'solana',
  'base',
];

export const NETWORK_LABEL_KEY: Record<SocialFilterNetwork, string> = {
  all: 'social_leaderboard.shell.filters.network.all',
  robinhood: 'social_leaderboard.shell.filters.network.robinhood',
  bnb: 'social_leaderboard.shell.filters.network.bnb',
  solana: 'social_leaderboard.shell.filters.network.solana',
  base: 'social_leaderboard.shell.filters.network.base',
};

/**
 * Maps filter-sheet network ids to social-service chain ids. The sheet
 * surfaces `bnb` for user-facing copy; the API expects `bsc` (see V0
 * `SPOT_CHAINS` / `TopTradersView`).
 */
export const NETWORK_TO_CHAIN_ID: Record<
  Exclude<SocialFilterNetwork, 'all'>,
  string
> = {
  robinhood: 'robinhood',
  bnb: 'bsc',
  solana: 'solana',
  base: 'base',
};

/**
 * Chains surfaced for each `type` selection. Reuses the V0 chain sets so the
 * API param mapper stays consistent with `TopTradersView`.
 */
export const TYPE_CHAINS: Record<SocialFilterType, readonly string[]> = {
  all: ALL_CHAINS,
  tokens: SPOT_CHAINS,
  perps: PERP_CHAINS,
  // Predictions reuse the spot chain set for now; the backend will narrow
  // this once the predictions endpoint lands.
  predictions: SPOT_CHAINS,
};

/**
 * Maps a sheet type onto the three leaderboard queries (`all` / `tokens` /
 * `perps`). Predictions ride the tokens query until a dedicated ranking exists.
 */
export const toLeaderboardTypeFilter = (
  type: SocialFilterType,
): SocialTypeFilter => {
  if (type === 'perps') {
    return 'perps';
  }
  if (type === 'tokens' || type === 'predictions') {
    return 'tokens';
  }
  return 'all';
};

/**
 * `useTopTraders` only accepts `7d` | `30d`. Shorter sheet windows use 7d.
 */
export const toLeaderboardTimeframe = (
  timeframe: SocialFilterTimeframe,
): SocialTimeframe => (timeframe === '30d' ? '30d' : '7d');
