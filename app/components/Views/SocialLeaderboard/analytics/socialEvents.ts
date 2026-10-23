/** Property keys shared by the governed Social V1 analytics contracts. */
export const SocialEventProperties = {
  INTERACTION_TYPE: 'interaction_type',
  SCREEN_NAME: 'screen_name',
  TAB_NAME: 'tab_name',
  SOURCE: 'source',
  OUTCOME: 'outcome',
  FILTER_NAME: 'filter_name',
  FILTER_VALUE: 'filter_value',
  PREVIOUS_FILTER_VALUE: 'previous_filter_value',
  REACTION_TYPE: 'reaction_type',
  TRADE_TYPE: 'trade_type',
  ASSET: 'asset',
  STEP: 'step',
  ITEM_POSITION: 'item_position',
} as const;

/** Bounded values accepted by Social Screen Viewed and Social UI Interaction. */
export const SocialEventValues = {
  INTERACTION_TYPE: {
    TAP: 'tap',
    BUTTON_CLICKED: 'button_clicked',
    SLIDE: 'slide',
    FILTER_APPLIED: 'filter_applied',
    SORT_APPLIED: 'sort_applied',
    REFRESH: 'refresh',
    SETTING_CHANGED: 'setting_changed',
    SHEET_DISPLAYED: 'sheet_displayed',
    SHEET_DISMISSED: 'sheet_dismissed',
    REACTION_ADDED: 'reaction_added',
    REACTION_REMOVED: 'reaction_removed',
    REACTION_PICKER_OPENED: 'reaction_picker_opened',
    COPY_TRADE_TAPPED: 'copy_trade_tapped',
    POST_REPORTED: 'post_reported',
    POST_HIDDEN: 'post_hidden',
    USER_BLOCKED: 'user_blocked',
    POST_SUBMITTED: 'post_submitted',
    POST_FAILED: 'post_failed',
    GIF_PICKER_OPENED: 'gif_picker_opened',
    STEP_VIEWED: 'step_viewed',
    USERNAME_SHUFFLED: 'username_shuffled',
    USERNAME_CLAIMED: 'username_claimed',
    LINKED_ACCOUNT_SELECTED: 'linked_account_selected',
    PROFILE_EDITED: 'profile_edited',
    AVATAR_CHANGED: 'avatar_changed',
    FOLLOW_TOGGLED: 'follow_toggled',
    STREAM_TOGGLED: 'stream_toggled',
  },
  SCREEN_NAME: {
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
  TAB_NAME: {
    TRENDING: 'trending',
    FOLLOWING: 'following',
    LEADERBOARD: 'leaderboard',
    LIVE_TRADES: 'live_trades',
  },
  SOURCE: {
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
  OUTCOME: {
    CONTENT: 'content',
    EMPTY: 'empty',
    ERROR: 'error',
    SUCCESS: 'success',
    FAILED: 'failed',
    DISMISSED: 'dismissed',
    CANCELLED: 'cancelled',
  },
  TRADE_TYPE: {
    PERPS: 'perps',
    SPOT: 'spot',
  },
  STREAM_STATE: {
    LIVE: 'live',
    PAUSED: 'paused',
  },
  FILTER_NAME: {
    STREAM_STATE: 'stream_state',
    FEED_SORT: 'feed_sort',
    SOCIAL_FILTERS: 'social_filters',
    PROFILE_ASSET_TYPE: 'profile_asset_type',
  },
  FEED_SORT: {
    MOST_RECENT: 'most_recent',
    POPULAR: 'popular',
  },
  PROFILE_ASSET_TYPE: {
    ALL: 'all',
    TOKENS: 'tokens',
    PERPS: 'perps',
  },
  REACTION_TYPE: {
    HEART: 'heart',
    FIRE: 'fire',
    THUMBS_UP: 'thumbs_up',
    LAUGH: 'laugh',
    EYES: 'eyes',
    SAD: 'sad',
    SURPRISED: 'surprised',
    EXCLAMATION: 'exclamation',
    GOAT: 'goat',
    ANGRY: 'angry',
    THUMBS_DOWN: 'thumbs_down',
    ROCKET: 'rocket',
    DIAMOND: 'diamond',
    CHART_UP: 'chart_up',
    SKULL: 'skull',
  },
  ONBOARDING_STEP: {
    INTRO: 'intro',
    USERNAME: 'username',
    X_IDENTITY: 'x_identity',
    AVATAR: 'avatar',
    ACCOUNT: 'account',
    READY: 'ready',
  },
} as const;

type ValueOf<T> = T[keyof T];

export type SocialInteractionType = ValueOf<
  (typeof SocialEventValues)['INTERACTION_TYPE']
>;
export type SocialScreenName = ValueOf<
  (typeof SocialEventValues)['SCREEN_NAME']
>;
export type SocialTabName = ValueOf<(typeof SocialEventValues)['TAB_NAME']>;
export type SocialEventOutcome = ValueOf<(typeof SocialEventValues)['OUTCOME']>;
export type SocialTradeType = ValueOf<(typeof SocialEventValues)['TRADE_TYPE']>;
export type SocialOnboardingStep = ValueOf<
  (typeof SocialEventValues)['ONBOARDING_STEP']
>;
export type SocialFilterName = ValueOf<
  (typeof SocialEventValues)['FILTER_NAME']
>;
export type SocialFilterValue =
  | ValueOf<(typeof SocialEventValues)['STREAM_STATE']>
  | ValueOf<(typeof SocialEventValues)['FEED_SORT']>
  | ValueOf<(typeof SocialEventValues)['PROFILE_ASSET_TYPE']>;
export type SocialReactionType = ValueOf<
  (typeof SocialEventValues)['REACTION_TYPE']
>;
export type SocialEventSource = ValueOf<(typeof SocialEventValues)['SOURCE']>;

export interface SocialScreenViewedProperties {
  screen_name: SocialScreenName;
  tab_name?: SocialTabName;
  source?: SocialEventSource;
  outcome?: Extract<SocialEventOutcome, 'content' | 'empty' | 'error'>;
  step?: SocialOnboardingStep;
}

export interface SocialUIInteractionProperties {
  interaction_type: SocialInteractionType;
  screen_name: SocialScreenName;
  tab_name?: SocialTabName;
  source?: SocialEventSource;
  outcome?: Extract<
    SocialEventOutcome,
    'success' | 'failed' | 'dismissed' | 'cancelled'
  >;
  filter_name?: SocialFilterName;
  filter_value?: SocialFilterValue;
  previous_filter_value?: SocialFilterValue;
  reaction_type?: SocialReactionType;
  trade_type?: SocialTradeType;
  step?: SocialOnboardingStep;
  item_position?: number;
}

const SOCIAL_REACTION_TYPE_BY_EMOJI = {
  '❤️': SocialEventValues.REACTION_TYPE.HEART,
  '🔥': SocialEventValues.REACTION_TYPE.FIRE,
  '👍': SocialEventValues.REACTION_TYPE.THUMBS_UP,
  '😂': SocialEventValues.REACTION_TYPE.LAUGH,
  '👀': SocialEventValues.REACTION_TYPE.EYES,
  '😢': SocialEventValues.REACTION_TYPE.SAD,
  '😮': SocialEventValues.REACTION_TYPE.SURPRISED,
  '❗': SocialEventValues.REACTION_TYPE.EXCLAMATION,
  '🐐': SocialEventValues.REACTION_TYPE.GOAT,
  '😡': SocialEventValues.REACTION_TYPE.ANGRY,
  '👎': SocialEventValues.REACTION_TYPE.THUMBS_DOWN,
  '🚀': SocialEventValues.REACTION_TYPE.ROCKET,
  '💎': SocialEventValues.REACTION_TYPE.DIAMOND,
  '📈': SocialEventValues.REACTION_TYPE.CHART_UP,
  '💀': SocialEventValues.REACTION_TYPE.SKULL,
} as const satisfies Record<string, SocialReactionType>;

/** Converts API emoji values to the bounded analytics reaction keys. */
export const getSocialReactionType = (
  emoji: string,
): SocialReactionType | undefined =>
  SOCIAL_REACTION_TYPE_BY_EMOJI[
    emoji as keyof typeof SOCIAL_REACTION_TYPE_BY_EMOJI
  ];

const SOCIAL_EVENT_SOURCE_SET = new Set<string>(
  Object.values(SocialEventValues.SOURCE),
);

/** Omits route origins that are outside the governed schema enum. */
export const getSocialEventSource = (
  source: unknown,
): SocialEventSource | undefined =>
  typeof source === 'string' && SOCIAL_EVENT_SOURCE_SET.has(source)
    ? (source as SocialEventSource)
    : undefined;
