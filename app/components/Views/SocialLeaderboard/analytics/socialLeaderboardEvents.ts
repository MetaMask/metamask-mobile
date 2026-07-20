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
  ASSET_NAME: 'asset_name',
  CAIP19: 'caip19',
  PERPS_MARKET: 'perps_market',
  CHAIN_FILTER: 'chain_filter',
  CTA_TYPE: 'cta_type',
  IS_FOLLOWING: 'is_following',
  IS_OPEN: 'is_open',
  NOTIFICATION_SUBTYPE: 'notification_subtype',
  NOTIFICATION_TEMPLATE_VARIANT: 'notification_template_variant',
  PREVIOUS_CHAIN_FILTER: 'previous_chain_filter',
  SOURCE: 'source',
  TAB: 'tab',
  TRADER_ADDRESS: 'trader_address',
  TRADER_HAS_PROFILE_PICTURE_SET: 'trader_has_profile_picture_set',
  TRADER_RANK: 'trader_rank',
  TRADER_USERNAME: 'trader_username',
} as const;

/** Closed-set property values used by enum-typed properties. */
export const SocialLeaderboardEventValues = {
  ACTION: {
    FOLLOW: 'follow',
    UNFOLLOW: 'unfollow',
  },
  TAB: {
    OPEN: 'open',
    CLOSED: 'closed',
  },
  CTA_TYPE: {
    BUY: 'buy',
    TRADE: 'trade',
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
  | 'profile_position'
  | 'asset_details'
  | 'market_insights'
  | 'security_trust'
  | 'explore_search'
  | 'explore_crypto'
  | 'explore_now'
  | 'explore_rwas'
  | 'explore_trending'
  | 'explore_stocks';

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
