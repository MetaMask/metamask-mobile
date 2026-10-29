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
    POST_SUBMITTED: 'post_submitted',
    POST_FAILED: 'post_failed',
    GIF_PICKER_OPENED: 'gif_picker_opened',
    STEP_VIEWED: 'step_viewed',
    USERNAME_SHUFFLED: 'username_shuffled',
    USERNAME_CLAIMED: 'username_claimed',
    LINKED_ACCOUNT_SELECTED: 'linked_account_selected',
    PROFILE_EDITED: 'profile_edited',
    AVATAR_CHANGED: 'avatar_changed',
    STREAM_TOGGLED: 'stream_toggled',
  },
  Screen: {
    TRENDING: 'social_trending',
    FOLLOWING: 'social_following',
    LEADERBOARD: 'social_leaderboard',
    LIVE_TRADES: 'social_live_trades',
    MY_PROFILE: 'my_profile',
    MANAGE_PROFILE: 'manage_profile',
    PROFILE_ONBOARDING: 'profile_onboarding',
    POST_COMPOSER: 'post_composer',
    SHARE_POSITION_SHEET: 'share_position_sheet',
    POST_TRADE_SHARE_SHEET: 'post_trade_share_sheet',
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
export type SocialFilterValue =
  | EventValue<'StreamState'>
  | EventValue<'FeedSort'>
  | EventValue<'ProfileAsset'>;
export type SocialReactionType = EventValue<'Reaction'>;
export type SocialEventSource = EventValue<'Source'>;
export interface SocialScreenViewedProperties {
  screen_name: SocialScreenName;
  tab_name?: SocialTabName;
  source?: SocialEventSource;
  outcome?: Extract<EventValue<'Outcome'>, 'content' | 'empty' | 'error'>;
  step?: SocialOnboardingStep;
}
export interface SocialUIInteractionProperties {
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
  trade_type?: SocialTradeType;
  step?: SocialOnboardingStep;
  item_position?: number;
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
