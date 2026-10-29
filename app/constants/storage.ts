const mm = 'MetaMask';
const prefix = `@${mm}:`;
const USE_TERMS_VERSION = 'v1.0';

export const EXISTING_USER = `${prefix}existingUser`;
export const MIGRATION_ERROR_HAPPENED = `${prefix}migrationErrorHappened`;
export const BIOMETRY_CHOICE_DISABLED = `${prefix}biometryChoiceDisabled`;

export const PASSCODE_DISABLED = `${prefix}passcodeDisabled`;

// Legacy MetaMetrics and new AnalyticsController related keys
export const PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME = `${prefix}previousAuthTypeBeforeRememberMe`;

export const ANALYTICS_DATA_DELETION_DATE = `${prefix}analyticsDataDeletionDate`;
export const METAMETRICS_DELETION_REGULATION_ID = `${prefix}MetaMetricsDeletionRegulationId`;
/**
 * @deprecated, use AnalyticsController state (optedIn) instead
 * Keeping METRICS_OPT_IN for backward compatibility
 * Migration done in {@link migration109}
 */
export const METRICS_OPT_IN = `${prefix}metricsOptIn`;
/**
 * @deprecated, use AnalyticsController state (optedIn) instead
 * Keeping METRICS_OPT_IN_SOCIAL_LOGIN for backward compatibility
 * Migration done in {@link migration108}
 */
export const METRICS_OPT_IN_SOCIAL_LOGIN = `${prefix}metricsOptInSocialLogin`;
/**
 * @deprecated, use {@link ANALYTICS_ID} instead
 * Keeping METAMETRICS_ID for backward compatibility
 * Migration done in {@link migration109}
 */
export const METAMETRICS_ID = `${prefix}MetaMetricsId`;
/**
 * @deprecated, use {@link METAMETRICS_ID} instead
 * Keeping MIXPANEL_METAMETRICS_ID for backward compatibility
 * Migration done in {@link migration109}
 * TODO remove MIXPANEL_METAMETRICS_ID:
 * - remove the legacy id test from {@link MetaMetrics}.#getMetaMetricsId()
 * @see https://github.com/MetaMask/metamask-mobile/issues/8833
 */
export const MIXPANEL_METAMETRICS_ID = `${prefix}MixpanelMetaMetricsId`;
export const ANALYTICS_ID = `${prefix}AnalyticsId`;

export const BRAZE_PUSH_REGISTRATION_STATE = `${prefix}brazePushRegistrationState`;

export const LANGUAGE = `${prefix}language`;

export const SEED_PHRASE_HINTS = 'seedphraseHints';

export const TRUE = 'true';

export const AGREED = 'agreed';
export const DENIED = 'denied';
export const EXPLORED = 'explored';

export const DEBUG = `[${mm} DEBUG]:`;

export const LAST_APP_VERSION = `${prefix}LastAppVersion`;
export const CURRENT_APP_VERSION = `${prefix}CurrentAppVersion`;

export const WHATS_NEW_APP_VERSION_SEEN = `${prefix}WhatsNewAppVersionSeen`;

export const REVIEW_EVENT_COUNT = 'reviewEventCount';

export const REVIEW_SHOWN_TIME = 'reviewShownTime';

export const USE_TERMS = `${prefix}UserTermsAccepted${USE_TERMS_VERSION}`;

export const PERPS_GTM_MODAL_SHOWN = `${prefix}perpsGTMModalShown`;

export const PERPS_MODE_SELECTION_COMPLETED = `${prefix}perpsModeSelectionCompleted`;

export const perpsCompetitionBannerDismissedKey = (campaignId: string) =>
  `${prefix}perpsCompetitionBannerDismissed:${campaignId}`;

export const PERPS_LAST_ACTION_AT = `${prefix}perpsLastActionAt`;

export const SOCIAL_LAST_TRADE_AT = `${prefix}socialLastTradeAt`;

export const SOCIAL_POST_TRADE_PROMPTS = `${prefix}socialPostTradePrompts`;

export const PERPS_AGGREGATE_FILLS = `${prefix}perpsAggregateFills`;

export const PERPS_ORDER_BOOK_SIZE_ON_CLICK = `${prefix}perpsOrderBookSizeOnClick`;

export const ROBINHOOD_SWAPS_BANNER_DISMISSED = `${prefix}robinhoodSwapsBannerDismissed`;

export const ROBINHOOD_EXPLORE_BANNER_DISMISSED = `${prefix}robinhoodExploreBannerDismissed`;

export const REWARDS_GTM_MODAL_SHOWN = `${prefix}rewardsGTMModalShown`;

export const SOCIAL_LEADERBOARD_ONBOARDING_SHOWN = `${prefix}socialLeaderboardOnboardingShown`;

export const SOCIAL_TERMS_ACCEPTED = `${prefix}socialTermsAccepted`;

export const SOCIAL_TAB_VISITED = `${prefix}socialTabVisited`;

export const SOCIAL_LEADERBOARD_SNAPSHOT_PREFIX = `${prefix}socialLeaderboardSnapshot:`;

export const RESUBSCRIBE_NOTIFICATIONS_EXPIRY = `${prefix}RESUBSCRIBE_NOTIFICATIONS_EXPIRY`;

export const HAS_USER_TURNED_OFF_ONCE_NOTIFICATIONS = `${prefix}HAS_USER_TURNED_OFF_ONCE_NOTIFICATIONS`;

export const PUSH_PRE_PROMPT_SHOWN = `${prefix}PUSH_PRE_PROMPT_SHOWN`;

export const OPTIN_META_METRICS_UI_SEEN = `${prefix}OptinMetaMetricsUISeen`;

/** Persisted while an OAuth round trip is in flight (Android process-death detection). */
export const OAUTH_IN_PROGRESS = `${prefix}oauthInProgress`;
