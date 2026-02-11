/**
 * Intercom SDK Integration
 *
 * This module provides in-app support and surveys functionality via the Intercom SDK.
 *
 * Two modes are supported:
 * 1. Support Mode - In-app Messenger for customer support
 * 2. Surveys Mode - Event-triggered micro-surveys (e.g., post-trade CSAT)
 *
 * Privacy-first design:
 * - SDK only initialized on explicit user action (lazy init)
 * - Uses loginUnidentifiedUser() exclusively (no PII)
 * - All metadata is bucketed and non-PII
 * - Anonymous UUID is rotated on survey opt-out
 *
 * @see intercom/PRD.md for full requirements
 * @see intercom/IMPLEMENTATION_PLAN.md for implementation details
 */

// Core service
export { default as IntercomService } from './IntercomService';

// Mode-specific services
export { default as SupportService } from './SupportService';
export { default as SurveyService } from './SurveyService';

// Configuration
export {
  getIntercomConfig,
  isIntercomConfigured,
  getIntercomFeatureFlags,
  isIntercomEnabled,
} from './config';

// Types
export type {
  IntercomConfig,
  SurveyEligibility,
  SurveyCooldownState,
  FeatureArea,
  OrdersBucket,
  TradeSizeBucket,
  IntercomUserMetadata,
  SurveyContext,
  SupportContext,
  IntercomFeatureFlags,
  IntercomAnalyticsEvent,
} from './types';

export { DEFAULT_INTERCOM_FLAGS, IntercomAnalyticsEvents } from './types';
