/**
 * Social Leaderboard analytics — property keys, closed-set values and source
 * unions. Property keys mirror the segment-schema YAMLs in
 * `metamask-mobile-social`. Event names live in `MetaMetrics.events.ts`
 * (see `SOCIAL_*`) as the single source of truth.
 *
 * This mirrors the per-feature pattern used by Perps and Predict.
 */

/** Property-key constants for analytics property bags. */
export const SocialLeaderboardEventProperties = {
  ACTION: 'action',
  AMOUNT_SELECTION_METHOD: 'amount_selection_method',
  AMOUNT_TOKEN: 'amount_token',
  AMOUNT_USD: 'amount_usd',
  ASSET_NAME: 'asset_name',
  CAIP19: 'caip19',
  CHAIN_FILTER: 'chain_filter',
  DISMISS_STAGE: 'dismiss_stage',
  EXECUTION_TIME_MS: 'execution_time_ms',
  IS_FOLLOWING: 'is_following',
  IS_OPEN: 'is_open',
  LATENCY_MS: 'latency_ms',
  MARKET_CAP: 'market_cap',
  NOTIFICATION_TYPE: 'notification_type',
  PAY_WITH_TOKEN: 'pay_with_token',
  PRESET_VALUE: 'preset_value',
  PREVIOUS_CHAIN_FILTER: 'previous_chain_filter',
  QUOTE_COUNT: 'quote_count',
  SOURCE: 'source',
  STATUS: 'status',
  TAB: 'tab',
  TRADER_ADDRESS: 'trader_address',
  TRADER_RANK: 'trader_rank',
  TRADER_TRADE_TYPE: 'trader_trade_type',
  TRADER_USERNAME: 'trader_username',
  TX_HASH: 'tx_hash',
} as const;

/** Closed-set property values used by enum-typed properties. */
export const SocialLeaderboardEventValues = {
  ACTION: {
    FOLLOW: 'follow',
    UNFOLLOW: 'unfollow',
  },
  AMOUNT_SELECTION_METHOD: {
    PRESET: 'preset',
    CUSTOM_INPUT: 'custom_input',
    SLIDER: 'slider',
  },
  DISMISS_STAGE: {
    TOKEN_DETAIL: 'token_detail',
    AMOUNT_SELECTION: 'amount_selection',
    CONFIRMATION: 'confirmation',
  },
  STATUS: {
    SUCCESS: 'success',
    FAILED: 'failed',
  },
  TAB: {
    OPEN: 'open',
    CLOSED: 'closed',
  },
  TRADER_TRADE_TYPE: {
    BUY: 'buy',
    SELL: 'sell',
  },
} as const;

/**
 * Surface from which an event was triggered. The valid values per event are
 * tighter than this union (see each per-event union below); the broad union
 * exists so callers can forward a single typed `source` via nav params.
 */
export type SocialLeaderboardSource =
  | 'home_banner'
  | 'nav_tab'
  | 'nux'
  | 'notification'
  | 'deep_link'
  | 'home_carousel'
  | 'leaderboard'
  | 'trader_profile'
  | 'profile_position';

export type LeaderboardScreenViewedSource = Extract<
  SocialLeaderboardSource,
  | 'home_banner'
  | 'nav_tab'
  | 'nux'
  | 'notification'
  | 'deep_link'
  | 'home_carousel'
>;

export type TraderProfileScreenViewedSource = Extract<
  SocialLeaderboardSource,
  'leaderboard' | 'home_carousel' | 'notification' | 'deep_link'
>;

export type TraderFollowInteractionSource = Extract<
  SocialLeaderboardSource,
  'leaderboard' | 'trader_profile' | 'home_carousel'
>;

export type FollowTradingTokenSource = Extract<
  SocialLeaderboardSource,
  'leaderboard' | 'trader_profile' | 'notification' | 'deep_link'
>;

export type QuickBuySheetSource = Extract<
  SocialLeaderboardSource,
  'notification' | 'profile_position' | 'leaderboard'
>;
