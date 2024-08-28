"use strict";
exports.__esModule = true;
exports.USE_TERMS = exports.themeAppearanceLight = exports.REVIEW_SHOWN_TIME = exports.REVIEW_EVENT_COUNT = exports.WHATS_NEW_APP_VERSION_SEEN = exports.CURRENT_APP_VERSION = exports.LAST_APP_VERSION = exports.DEBUG = exports.ORIGINAL = exports.EXPLORED = exports.DENIED = exports.AGREED = exports.TRUE = exports.SEED_PHRASE_HINTS = exports.ENCRYPTION_LIB = exports.LANGUAGE = exports.PUSH_NOTIFICATIONS_PROMPT_TIME = exports.PUSH_NOTIFICATIONS_PROMPT_COUNT = exports.LAST_INCOMING_TX_BLOCK_INFO = exports.WALLETCONNECT_SESSIONS = exports.MIXPANEL_METAMETRICS_ID = exports.METAMETRICS_ID = exports.ANALYTICS_DATA_RECORDED = exports.METAMETRICS_DELETION_REGULATION_ID = exports.ANALYTICS_DATA_DELETION_DATE = exports.ANALYTICS_DATA_DELETION_TASK_ID = exports.METRICS_OPT_IN = exports.ONBOARDING_WIZARD = exports.PASSCODE_DISABLED = exports.PASSCODE_CHOICE = exports.BIOMETRY_CHOICE_DISABLED = exports.BIOMETRY_CHOICE = exports.EXISTING_USER = void 0;
var mm = 'MetaMask';
var prefix = "@".concat(mm, ":");
var USE_TERMS_VERSION = 'v1.0';
exports.EXISTING_USER = "".concat(prefix, "existingUser");
exports.BIOMETRY_CHOICE = "".concat(prefix, "biometryChoice");
exports.BIOMETRY_CHOICE_DISABLED = "".concat(prefix, "biometryChoiceDisabled");
exports.PASSCODE_CHOICE = "".concat(prefix, "passcodeChoice");
exports.PASSCODE_DISABLED = "".concat(prefix, "passcodeDisabled");
exports.ONBOARDING_WIZARD = "".concat(prefix, "onboardingWizard");
exports.METRICS_OPT_IN = "".concat(prefix, "metricsOptIn");
exports.ANALYTICS_DATA_DELETION_TASK_ID = "".concat(prefix, "analyticsDataDeletionTaskId");
exports.ANALYTICS_DATA_DELETION_DATE = "".concat(prefix, "analyticsDataDeletionDate");
exports.METAMETRICS_DELETION_REGULATION_ID = "".concat(prefix, "MetaMetricsDeletionRegulationId");
exports.ANALYTICS_DATA_RECORDED = "".concat(prefix, "analyticsDataRecorded");
exports.METAMETRICS_ID = "".concat(prefix, "MetaMetricsId");
/**
 * @deprecated, use {@link METAMETRICS_ID} instead
 * Keeping MIXPANEL_METAMETRICS_ID for backward compatibility
 *
 * TODO remove MIXPANEL_METAMETRICS_ID:
 * - add a migration
 * - remove the legacy id test from {@link MetaMetrics}.#getMetaMetricsId()
 * @see https://github.com/MetaMask/metamask-mobile/issues/8833
 */
exports.MIXPANEL_METAMETRICS_ID = "".concat(prefix, "MixpanelMetaMetricsId");
exports.WALLETCONNECT_SESSIONS = "".concat(prefix, "walletconnectSessions");
exports.LAST_INCOMING_TX_BLOCK_INFO = "".concat(prefix, "lastIncomingTxBlockInfo");
exports.PUSH_NOTIFICATIONS_PROMPT_COUNT = "".concat(prefix, "pushNotificationsPromptCount");
exports.PUSH_NOTIFICATIONS_PROMPT_TIME = "".concat(prefix, "pushNotificationsPromptTime");
exports.LANGUAGE = "".concat(prefix, "language");
exports.ENCRYPTION_LIB = "".concat(prefix, "encryptionLib");
exports.SEED_PHRASE_HINTS = 'seedphraseHints';
exports.TRUE = 'true';
exports.AGREED = 'agreed';
exports.DENIED = 'denied';
exports.EXPLORED = 'explored';
exports.ORIGINAL = 'original';
exports.DEBUG = "[".concat(mm, " DEBUG]:");
exports.LAST_APP_VERSION = "".concat(prefix, "LastAppVersion");
exports.CURRENT_APP_VERSION = "".concat(prefix, "CurrentAppVersion");
exports.WHATS_NEW_APP_VERSION_SEEN = "".concat(prefix, "WhatsNewAppVersionSeen");
exports.REVIEW_EVENT_COUNT = 'reviewEventCount';
exports.REVIEW_SHOWN_TIME = 'reviewShownTime';
exports.themeAppearanceLight = 'light';
exports.USE_TERMS = "".concat(prefix, "UserTermsAccepted").concat(USE_TERMS_VERSION);
