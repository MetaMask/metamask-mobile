export const SocialEvent = {
  Interaction: {
    TAP: 'tap',
    BUTTON_CLICKED: 'button_clicked',
    FILTER_APPLIED: 'filter_applied',
    SORT_APPLIED: 'sort_applied',
    REFRESH: 'refresh',
    SHEET_DISPLAYED: 'sheet_displayed',
    SHEET_DISMISSED: 'sheet_dismissed',
    REACTION_ADDED: 'reaction_added',
    REACTION_REMOVED: 'reaction_removed',
    REACTION_PICKER_OPENED: 'reaction_picker_opened',
    COPY_TRADE_TAPPED: 'copy_trade_tapped',
    /** Copy trade tap sent to the terms or profile onboarding gate instead. */
    COPY_TRADE_BLOCKED: 'copy_trade_blocked',
    COPY_TRADE_SUBMITTED: 'copy_trade_submitted',
    POST_SUBMITTED: 'post_submitted',
    POST_FAILED: 'post_failed',
    SUBMIT_BLOCKED: 'submit_blocked',
    ONBOARDING_COMPLETED: 'onboarding_completed',
    /**
     * Profile onboarding X OAuth finished. Pair with `outcome` and `path: x`.
     */
    X_SIGN_IN: 'x_sign_in',
    POST_SHARED: 'post_shared',
    GIF_PICKER_OPENED: 'gif_picker_opened',
    STEP_VIEWED: 'step_viewed',
    USERNAME_SHUFFLED: 'username_shuffled',
    USERNAME_CLAIMED: 'username_claimed',
    LINKED_ACCOUNT_SELECTED: 'linked_account_selected',
    PROFILE_EDITED: 'profile_edited',
    AVATAR_CHANGED: 'avatar_changed',
    STREAM_TOGGLED: 'stream_toggled',
  },
  /** Profile onboarding intro choice. Sent on intro taps and completion. */
  Path: {
    X: 'x',
    MANUAL: 'manual',
  },
  Screen: {
    TRENDING: 'social_trending',
    FOLLOWING: 'social_following',
    LEADERBOARD: 'social_leaderboard',
    LIVE_TRADES: 'social_live_trades',
    MY_PROFILE: 'my_profile',
    /** Social V1 profile of another trader. */
    TRADER_PROFILE: 'trader_profile',
    /**
     * Default Perps copy surface when the order is not opened from a Social
     * tab. Matches `SocialEvent.Source.TRADER_FEED`.
     */
    TRADER_FEED: 'trader_feed',
    POSITION_DETAILS_SHEET: 'position_details_sheet',
    MANAGE_PROFILE: 'manage_profile',
    PROFILE_ONBOARDING: 'profile_onboarding',
    POST_COMPOSER: 'post_composer',
    SHARE_POSITION_SHEET: 'share_position_sheet',
    POST_TRADE_SHARE_SHEET: 'post_trade_share_sheet',
    POST_TO_FEED_TOAST: 'post_to_feed_toast',
    TOKEN_DETAILS_FEED: 'token_details_feed',
    TOKEN_DETAILS_HOLDERS: 'token_details_holders',
    PERPS_MARKET_FEED: 'perps_market_feed',
    PERPS_MARKET_HOLDERS: 'perps_market_holders',
    FOLLOW_CONNECTIONS: 'follow_connections',
    PROFILES_TO_FOLLOW: 'profiles_to_follow',
  },
  Tab: {
    TRENDING: 'trending',
    FOLLOWING: 'following',
    LEADERBOARD: 'leaderboard',
    LIVE_TRADES: 'live_trades',
  },
  Source: {
    HOME_BANNER: 'home_banner',
    NAV_TAB: 'nav_tab',
    NUX: 'nux',
    NOTIFICATION: 'notification',
    DEEP_LINK: 'deep_link',
    HOME_CAROUSEL: 'home_carousel',
    TRENDING_CAROUSEL: 'trending_carousel',
    PROFILES_TO_FOLLOW: 'profiles_to_follow',
    LEADERBOARD: 'leaderboard',
    TRADER_PROFILE: 'trader_profile',
    TRADER_FEED: 'trader_feed',
    PROFILE_POSITION: 'profile_position',
    ASSET_DETAILS: 'asset_details',
    MARKET_INSIGHTS: 'market_insights',
    SECURITY_TRUST: 'security_trust',
    EXPLORE_SEARCH: 'explore_search',
    EXPLORE_CRYPTO: 'explore_crypto',
    EXPLORE_NOW: 'explore_now',
    EXPLORE_RWAS: 'explore_rwas',
    EXPLORE_TRENDING: 'explore_trending',
    EXPLORE_STOCKS: 'explore_stocks',
    PERPS_HOME: 'perps_home',
    PERP_ASSET_SCREEN: 'perp_asset_screen',
    TOKEN_DETAILS_FEED: 'token_details_feed',
    TOKEN_DETAILS_HOLDERS: 'token_details_holders',
    PERPS_MARKET_FEED: 'perps_market_feed',
    PERPS_MARKET_HOLDERS: 'perps_market_holders',
    MY_PROFILE: 'my_profile',
    /**
     * Feed tab that started a Social V1 action. Valid on Social Screen Viewed
     * and Social UI Interaction only — not on leaderboard, profile, onboarding,
     * trader-feed, or What's Happening events.
     */
    SOCIAL_TRENDING: 'social_trending',
    SOCIAL_FOLLOWING: 'social_following',
    SOCIAL_LIVE_TRADES: 'social_live_trades',
  },
  ShareDestination: {
    EXTERNAL: 'external',
    METAMASK_POST: 'metamask_post',
  },
  Outcome: {
    CONTENT: 'content',
    EMPTY: 'empty',
    ERROR: 'error',
    SUCCESS: 'success',
    FAILED: 'failed',
    DISMISSED: 'dismissed',
    CANCELLED: 'cancelled',
  },
  Trade: { PERPS: 'perps', SPOT: 'spot' },
  Direction: { LONG: 'long', SHORT: 'short' },
  PositionStatus: { OPEN: 'open', CLOSED: 'closed' },
  BlockedReason: {
    TERMS: 'terms',
    PROFILE_ONBOARDING: 'profile_onboarding',
  },
  ComposerEntry: {
    POST_TRADE_SPOT: 'post_trade_spot',
    POST_TRADE_SWAP: 'post_trade_swap',
    POST_TRADE_PERPS: 'post_trade_perps',
    SOCIAL_FEED: 'social_feed',
    MY_PROFILE: 'my_profile',
    TOKEN_DETAILS: 'token_details',
    PERPS_POSITION: 'perps_position',
  },
  StreamState: { LIVE: 'live', PAUSED: 'paused' },
  Filter: {
    STREAM_STATE: 'stream_state',
    FEED_SORT: 'feed_sort',
    SOCIAL_FILTERS: 'social_filters',
    PROFILE_ASSET_TYPE: 'profile_asset_type',
  },
  FeedSort: { MOST_RECENT: 'most_recent', POPULAR: 'popular' },
  ProfileAsset: { ALL: 'all', TOKENS: 'tokens', PERPS: 'perps' },
  Reaction: {
    '❤️': 'heart',
    '🔥': 'fire',
    '👍': 'thumbs_up',
    '😂': 'laugh',
    '👀': 'eyes',
    '😢': 'sad',
    '😮': 'surprised',
    '❗': 'exclamation',
    '🐐': 'goat',
    '😡': 'angry',
    '👎': 'thumbs_down',
    '🚀': 'rocket',
    '💎': 'diamond',
    '📈': 'chart_up',
    '💀': 'skull',
  },
  Step: {
    INTRO: 'intro',
    TERMS: 'terms',
    USERNAME: 'username',
    X_IDENTITY: 'x_identity',
    AVATAR: 'avatar',
    ACCOUNT: 'account',
    READY: 'ready',
  },
} as const;
type ValueOf<T> = T[keyof T];
type EventValue<K extends keyof typeof SocialEvent> = ValueOf<
  (typeof SocialEvent)[K]
>;
export type SocialInteractionType = EventValue<'Interaction'>;
export type SocialScreenName = EventValue<'Screen'>;
export type SocialTabName = EventValue<'Tab'>;
export type SocialTradeType = EventValue<'Trade'>;
export type SocialOnboardingStep = EventValue<'Step'>;
export type SocialOnboardingPath = EventValue<'Path'>;
export type SocialFilterValue =
  | EventValue<'StreamState'>
  | EventValue<'FeedSort'>
  | EventValue<'ProfileAsset'>;
export type SocialReactionType = EventValue<'Reaction'>;
export type SocialEventSource = EventValue<'Source'>;
export type SocialShareDestination = EventValue<'ShareDestination'>;
export type SocialDirection = EventValue<'Direction'>;
export type SocialPositionStatus = EventValue<'PositionStatus'>;
export type SocialBlockedReason = EventValue<'BlockedReason'>;
export type SocialComposerEntry = EventValue<'ComposerEntry'>;
/**
 * Trader and position a Social event is about. The trader is the author of
 * the post or the owner of the profile, never the viewer.
 */
export interface SocialPositionAnalyticsProperties {
  trade_type?: SocialTradeType;
  /** Display ticker or perps market of the position. */
  asset?: string;
  /** Perps only. */
  direction?: SocialDirection;
  position_status?: SocialPositionStatus;
  trader_address?: string;
  trader_username?: string;
}
/**
 * A copy-trade tap: the trade's trader plus the source post the copy came
 * from and that post's author.
 */
export interface SocialCopyTradeAnalyticsProperties
  extends SocialPositionAnalyticsProperties {
  post_id?: string;
  author_trader_id?: string;
}
export interface SocialScreenViewedProperties
  extends SocialPositionAnalyticsProperties {
  screen_name: SocialScreenName;
  tab_name?: SocialTabName;
  source?: SocialEventSource;
  outcome?: Extract<EventValue<'Outcome'>, 'content' | 'empty' | 'error'>;
  step?: SocialOnboardingStep;
  /** Composer views only. */
  composer_entry?: SocialComposerEntry;
  share_id?: string;
  order_id?: string;
  transaction_hash?: string;
}
export type SocialPostFailureReason =
  | 'ban'
  | 'timeout'
  | 'min_balance'
  | 'unknown';
/** Coarse reason when profile onboarding X sign-in fails (TSA-1860). */
export const SOCIAL_X_SIGN_IN_FAILURE_REASONS = [
  'network',
  'state_mismatch',
  'missing_code',
  'backend_error',
  'not_signed_in',
  'no_evm_account',
  'unknown',
] as const;
export type SocialXSignInFailureReason =
  (typeof SOCIAL_X_SIGN_IN_FAILURE_REASONS)[number];
/** Surface that produced a `Social Error Occurred` event (TSA-1860). */
export type SocialErrorArea =
  | 'screen_load'
  | 'x_auth'
  | 'profile_save'
  | 'post'
  | 'render';
export type SocialFailureReason =
  | SocialPostFailureReason
  | SocialXSignInFailureReason
  | SocialProfileSaveFailureReason;
/** Coarse reason when profile create/update fails during onboarding. */
export type SocialProfileSaveFailureReason =
  | 'username_taken'
  | 'username_invalid'
  | 'conflict'
  | 'auth'
  | 'rate_limit'
  | 'network'
  | 'ineligible_account'
  | 'unknown';
export type SocialBlockedSubmitReason =
  | 'empty_caption'
  | 'no_position'
  | 'too_long';
export interface SocialUIInteractionProperties
  extends SocialPositionAnalyticsProperties {
  interaction_type: SocialInteractionType;
  screen_name: SocialScreenName;
  tab_name?: SocialTabName;
  source?: SocialEventSource;
  outcome?: Extract<
    EventValue<'Outcome'>,
    'success' | 'failed' | 'dismissed' | 'cancelled'
  >;
  filter_name?: EventValue<'Filter'>;
  filter_value?: SocialFilterValue;
  previous_filter_value?: SocialFilterValue;
  reaction_type?: SocialReactionType;
  step?: SocialOnboardingStep;
  item_position?: number;
  /** Only sent with `post_shared`. */
  share_destination?: SocialShareDestination;
  /** Only sent on the terms step. */
  terms_version?: string;
  /** Only sent with `copy_trade_blocked`. */
  blocked_reason?: SocialBlockedReason;
  /**
   * Profile onboarding path. Sent on intro/continue/ready `button_clicked`,
   * terms sheet events, `x_sign_in`, `username_claimed`, and
   * `onboarding_completed`.
   */
  path?: SocialOnboardingPath;
  /**
   * True when the claimed handle is still the linked X username. Sent on
   * `onboarding_completed` and the X-identity use-X-username toggle.
   */
  uses_x_username?: boolean;
  /**
   * `username_claimed` with `outcome: failed` only. Coarse create/update
   * failure bucket for Ready drop-off.
   */
  profile_save_failure_reason?: SocialProfileSaveFailureReason;
  amount_usd?: number;
  metamask_fee?: number;
  /** Composer interactions only. */
  composer_entry?: SocialComposerEntry;
  /**
   * `post_submitted` and `post_failed` only. A post always has a caption and
   * a position, so the GIF is the only optional content.
   */
  has_gif?: boolean;
  post_id?: string;
  author_trader_id?: string;
  has_thesis?: boolean;
  has_attached_position?: boolean;
  is_held_position?: boolean;
  /** Post failures, and X sign-in failures on `x_sign_in` with `outcome: failed`. */
  failure_reason?: SocialPostFailureReason | SocialXSignInFailureReason;
  blocked_submit_reason?: SocialBlockedSubmitReason;
  traders_followed_count?: number;
  share_id?: string;
  order_id?: string;
  transaction_hash?: string;
  app_build?: string;
}
export const getSocialReactionType = (
  emoji: string,
): SocialReactionType | undefined =>
  SocialEvent.Reaction[emoji as keyof typeof SocialEvent.Reaction];
export const getSocialEventSource = (
  source: unknown,
): SocialEventSource | undefined =>
  typeof source === 'string' &&
  Object.values<string>(SocialEvent.Source).includes(source)
    ? (source as SocialEventSource)
    : undefined;
