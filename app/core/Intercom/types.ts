/**
 * Intercom SDK Integration Types
 *
 * This module defines types for the Intercom SDK integration,
 * supporting both Support Mode and Surveys Mode as defined in the PRD.
 *
 * @see intercom/PRD.md for full requirements
 */

/**
 * Configuration for initializing the Intercom SDK
 */
export interface IntercomConfig {
  /** Intercom App ID from workspace settings */
  appId: string;
  /** iOS API Key (starts with ios_sdk-) */
  iosApiKey: string;
  /** Android API Key (starts with android_sdk-) */
  androidApiKey: string;
}

/**
 * Survey eligibility state for a user
 */
export interface SurveyEligibility {
  /** Whether user has consented to in-app surveys */
  hasConsent: boolean;
  /** Whether user meets minimum orders threshold */
  meetsOrderThreshold: boolean;
  /** Whether user is currently in cooldown period */
  isInCooldown: boolean;
  /** Whether user's locale is supported for surveys */
  isLocaleSupported: boolean;
  /** Whether user is in an eligible rollout cohort */
  isInEligibleCohort: boolean;
}

/**
 * Cooldown state for survey throttling
 * Implements PRD requirements:
 * - max 1 impression per 14 days
 * - 30-day suppression after complete/dismiss
 * - cap 3 impressions per 90 days
 */
export interface SurveyCooldownState {
  /** Timestamp of last survey impression */
  lastImpressionDate: number | null;
  /** Timestamp of last survey action (complete or dismiss) */
  lastActionDate: number | null;
  /** Count of impressions in the last 90 days */
  impressionCount90Days: number;
  /** Timestamps of all impressions for 90-day tracking */
  impressionTimestamps: number[];
}

/**
 * Feature areas for contextual support routing
 */
export type FeatureArea =
  | 'perps'
  | 'settings'
  | 'swap'
  | 'bridge'
  | 'send'
  | 'receive'
  | 'wallet'
  | 'browser'
  | 'other';

/**
 * Bucketed order count for non-PII metadata
 */
export type OrdersBucket = '0' | '1' | '2-4' | '5+';

/**
 * Bucketed trade size for non-PII metadata
 */
export type TradeSizeBucket =
  | '0-99'
  | '100-499'
  | '500-1999'
  | '2000-9999'
  | '10000+';

/**
 * Non-PII user metadata sent to Intercom
 * All fields are bucketed or anonymized per PRD requirements
 */
export interface IntercomUserMetadata {
  /** App version (e.g., "7.65.0") */
  app_version: string;
  /** Platform identifier */
  platform: 'iOS' | 'Android';
  /** User's locale (e.g., "en", "es") */
  locale: string;
  /** Feature area for routing (Support Mode) */
  feature_area?: FeatureArea;
  /** Whether user is a Perps user (Surveys Mode) */
  perps_user?: boolean;
  /** Bucketed order count (Surveys Mode) */
  orders_completed_7d?: OrdersBucket;
  /** Bucketed trade size (Surveys Mode) */
  trade_size_usd_bucket?: TradeSizeBucket;
  /** Bucketed network (optional) */
  network_bucket?: string;
  /** Anonymous app-scoped UUID (rotated on opt-out) */
  anonymous_uuid?: string;
}

/**
 * Context for triggering a survey
 */
export interface SurveyContext {
  /** Survey ID from Intercom workspace */
  surveyId: string;
  /** Number of orders completed in last 7 days */
  ordersCompleted7d: number;
  /** Trade size in USD for bucketing */
  tradeSizeUsd: number;
  /** Network name for bucketing (optional) */
  network?: string;
}

/**
 * Context for opening support
 */
export interface SupportContext {
  /** Feature area where support was initiated */
  featureArea: FeatureArea;
  /** Additional bucketed metadata for routing */
  additionalMetadata?: Record<string, string | number | boolean>;
}

/**
 * Feature flags for Intercom functionality
 * Controlled via remote config
 */
export interface IntercomFeatureFlags {
  /** Enable surveys on mobile */
  surveys_enabled_mobile: boolean;
  /** Enable support on mobile */
  support_enabled_mobile: boolean;
  /** Emergency kill switch for all Intercom features */
  kill_switch: boolean;
  /** Minimum orders in 7 days to show survey */
  min_orders_7d: number;
  /** Days between survey impressions */
  cooldown_days: number;
  /** Days to suppress after complete/dismiss */
  suppress_after_action_days: number;
  /** Eligible cohort identifiers */
  cohorts: string[];
  /** Supported locales for surveys */
  locales: string[];
}

/**
 * Default feature flag values
 */
export const DEFAULT_INTERCOM_FLAGS: IntercomFeatureFlags = {
  surveys_enabled_mobile: false,
  support_enabled_mobile: true,
  kill_switch: false,
  min_orders_7d: 1,
  cooldown_days: 14,
  suppress_after_action_days: 30,
  cohorts: ['all'],
  locales: ['en'],
};

/**
 * Intercom event names for analytics
 */
export const IntercomAnalyticsEvents = {
  // Survey events
  SURVEY_VIEWED: 'intercom_survey.viewed',
  SURVEY_STARTED: 'intercom_survey.started',
  SURVEY_COMPLETED: 'intercom_survey.completed',
  SURVEY_DISMISSED: 'intercom_survey.dismissed',
  SURVEY_COOLDOWN_APPLIED: 'intercom_survey.cooldown_applied',
  SURVEY_OPT_IN: 'intercom_survey.opt_in',
  SURVEY_OPT_OUT: 'intercom_survey.opt_out',

  // Support events
  SUPPORT_OPENED: 'intercom_support.opened',
  SUPPORT_MESSAGE_SENT: 'intercom_support.message_sent',
  SUPPORT_MESSAGE_RECEIVED: 'intercom_support.message_received',
  SUPPORT_CLOSED: 'intercom_support.closed',
  SUPPORT_FALLBACK_USED: 'intercom_support.fallback_used',
  SUPPORT_ERROR: 'intercom_support.error',

  // SDK events
  SDK_INIT: 'intercom_sdk.init',
  SDK_ERROR: 'intercom_sdk.error',
} as const;

export type IntercomAnalyticsEvent =
  (typeof IntercomAnalyticsEvents)[keyof typeof IntercomAnalyticsEvents];
