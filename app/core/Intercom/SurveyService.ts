import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVersion } from 'react-native-device-info';
import IntercomService from './IntercomService';
import { getIntercomFeatureFlags, isIntercomConfigured } from './config';
import Logger from '../../util/Logger';
import I18n from '../../../locales/i18n';
import {
  SurveyContext,
  SurveyEligibility,
  SurveyCooldownState,
  IntercomUserMetadata,
  OrdersBucket,
  TradeSizeBucket,
  IntercomAnalyticsEvents,
} from './types';

// Storage keys
const STORAGE_KEYS = {
  SURVEY_CONSENT: '@intercom_survey_consent',
  COOLDOWN_STATE: '@intercom_survey_cooldown',
  ANONYMOUS_UUID: '@intercom_anonymous_uuid',
};

// Cooldown constants (from PRD)

const MAX_IMPRESSIONS_90_DAYS = 3; // cap 3 impressions per 90 days
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * SurveyService - Manages Surveys Mode functionality
 *
 * Implements the PRD requirements for Surveys Mode:
 * - Consent gating (no SDK init until user consents)
 * - Eligibility checks (orders threshold, cooldown, locale, cohort)
 * - Throttling/cooldown (14 days between impressions, 30 days after action)
 * - Non-PII bucketed metadata
 *
 * @see intercom/PRD.md for full requirements
 */
class SurveyService {
  private static instance: SurveyService;

  private constructor() {
    // Private constructor for singleton
    this.initializeAnonymousUUID();
  }

  /**
   * Get the singleton instance of SurveyService
   */
  static getInstance(): SurveyService {
    if (!SurveyService.instance) {
      SurveyService.instance = new SurveyService();
    }
    return SurveyService.instance;
  }

  /**
   * Initialize anonymous UUID from storage or generate new
   */
  private async initializeAnonymousUUID(): Promise<void> {
    try {
      const storedUUID = await AsyncStorage.getItem(
        STORAGE_KEYS.ANONYMOUS_UUID,
      );
      if (storedUUID) {
        IntercomService.setAnonymousUUID(storedUUID);
      } else {
        const newUUID = IntercomService.getAnonymousUUID();
        await AsyncStorage.setItem(STORAGE_KEYS.ANONYMOUS_UUID, newUUID);
      }
    } catch (error) {
      Logger.error(
        error as Error,
        'SurveyService: Failed to initialize anonymous UUID',
      );
    }
  }

  /**
   * Check if user is eligible for a survey
   */
  async checkEligibility(context: SurveyContext): Promise<SurveyEligibility> {
    const flags = await getIntercomFeatureFlags();
    const consent = await this.hasConsent();
    const cooldownState = await this.getCooldownState();

    const eligibility: SurveyEligibility = {
      hasConsent: consent,
      meetsOrderThreshold: context.ordersCompleted7d >= flags.min_orders_7d,
      isInCooldown: this.isInCooldown(cooldownState, flags),
      isLocaleSupported: this.isLocaleSupported(flags.locales),
      isInEligibleCohort: this.isInEligibleCohort(flags.cohorts),
    };

    return eligibility;
  }

  /**
   * Attempt to trigger a survey (checks all eligibility)
   *
   * @returns true if survey was shown, false otherwise
   */
  async triggerSurvey(context: SurveyContext): Promise<boolean> {
    // Check if Intercom is configured
    if (!isIntercomConfigured()) {
      Logger.log('SurveyService: Intercom not configured');
      return false;
    }

    // Check feature flags
    const flags = await getIntercomFeatureFlags();
    if (flags.kill_switch || !flags.surveys_enabled_mobile) {
      Logger.log('SurveyService: Surveys disabled by feature flag');
      return false;
    }

    // Check all eligibility criteria
    const eligibility = await this.checkEligibility(context);

    if (!eligibility.hasConsent) {
      Logger.log('SurveyService: No consent for surveys');
      return false;
    }

    if (!eligibility.meetsOrderThreshold) {
      Logger.log('SurveyService: Does not meet order threshold');
      return false;
    }

    if (eligibility.isInCooldown) {
      Logger.log('SurveyService: In cooldown period');
      return false;
    }

    if (!eligibility.isLocaleSupported) {
      Logger.log('SurveyService: Locale not supported');
      return false;
    }

    if (!eligibility.isInEligibleCohort) {
      Logger.log('SurveyService: Not in eligible cohort');
      return false;
    }

    try {
      // Initialize Intercom if needed
      if (!IntercomService.isInitialized()) {
        await IntercomService.initialize();
      }

      // Update user with bucketed metadata
      const metadata = this.buildUserMetadata(context);
      await IntercomService.updateUserAttributes(metadata);

      // Present survey
      await IntercomService.presentSurvey(context.surveyId);

      // Record impression
      await this.recordImpression();

      this.trackEvent(IntercomAnalyticsEvents.SURVEY_VIEWED, {
        survey_id: context.surveyId,
      });

      return true;
    } catch (error) {
      Logger.error(error as Error, 'SurveyService: Failed to trigger survey');
      this.trackEvent(IntercomAnalyticsEvents.SDK_ERROR, {
        error_type: 'trigger_survey',
        survey_id: context.surveyId,
      });
      return false;
    }
  }

  /**
   * Build non-PII user metadata for surveys
   */
  private buildUserMetadata(context: SurveyContext): IntercomUserMetadata {
    const appVersion = getVersion();

    return {
      app_version: appVersion,
      platform: Platform.OS === 'ios' ? 'iOS' : 'Android',
      locale: this.getDeviceLocale(),
      perps_user: true,
      orders_completed_7d: this.bucketOrders(context.ordersCompleted7d),
      trade_size_usd_bucket: this.bucketTradeSize(context.tradeSizeUsd),
      network_bucket: context.network,
      anonymous_uuid: IntercomService.getAnonymousUUID(),
    };
  }

  /**
   * Record survey completion (applies 30-day suppression)
   */
  async recordCompletion(surveyId: string): Promise<void> {
    await this.recordAction();
    this.trackEvent(IntercomAnalyticsEvents.SURVEY_COMPLETED, {
      survey_id: surveyId,
    });
  }

  /**
   * Record survey dismissal (applies 30-day suppression)
   */
  async recordDismissal(surveyId: string): Promise<void> {
    await this.recordAction();
    this.trackEvent(IntercomAnalyticsEvents.SURVEY_DISMISSED, {
      survey_id: surveyId,
    });
  }

  // === Consent Management ===

  /**
   * Check if user has consented to surveys
   */
  async hasConsent(): Promise<boolean> {
    try {
      const consent = await AsyncStorage.getItem(STORAGE_KEYS.SURVEY_CONSENT);
      return consent === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Set survey consent
   */
  async setConsent(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SURVEY_CONSENT,
        enabled ? 'true' : 'false',
      );

      if (enabled) {
        this.trackEvent(IntercomAnalyticsEvents.SURVEY_OPT_IN);
      } else {
        this.trackEvent(IntercomAnalyticsEvents.SURVEY_OPT_OUT);
        // Rotate anonymous UUID on opt-out per PRD
        IntercomService.rotateAnonymousUUID();
        const newUUID = IntercomService.getAnonymousUUID();
        await AsyncStorage.setItem(STORAGE_KEYS.ANONYMOUS_UUID, newUUID);
      }

      Logger.log(`SurveyService: Consent set to ${enabled}`);
    } catch (error) {
      Logger.error(error as Error, 'SurveyService: Failed to set consent');
    }
  }

  // === Cooldown Management ===

  /**
   * Get current cooldown state
   */
  private async getCooldownState(): Promise<SurveyCooldownState> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COOLDOWN_STATE);
      if (data) {
        const state = JSON.parse(data) as SurveyCooldownState;
        // Clean up old impressions (older than 90 days)
        state.impressionTimestamps = (state.impressionTimestamps || []).filter(
          (ts) => Date.now() - ts < NINETY_DAYS_MS,
        );
        state.impressionCount90Days = state.impressionTimestamps.length;
        return state;
      }
      return {
        lastImpressionDate: null,
        lastActionDate: null,
        impressionCount90Days: 0,
        impressionTimestamps: [],
      };
    } catch {
      return {
        lastImpressionDate: null,
        lastActionDate: null,
        impressionCount90Days: 0,
        impressionTimestamps: [],
      };
    }
  }

  /**
   * Save cooldown state
   */
  private async saveCooldownState(state: SurveyCooldownState): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.COOLDOWN_STATE,
        JSON.stringify(state),
      );
    } catch (error) {
      Logger.error(
        error as Error,
        'SurveyService: Failed to save cooldown state',
      );
    }
  }

  /**
   * Check if user is in cooldown period
   */
  private isInCooldown(
    state: SurveyCooldownState,
    flags: { cooldown_days: number; suppress_after_action_days: number },
  ): boolean {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;

    // Check impression cooldown (14 days by default)
    if (state.lastImpressionDate) {
      const daysSinceImpression = (now - state.lastImpressionDate) / dayInMs;
      if (daysSinceImpression < flags.cooldown_days) {
        return true;
      }
    }

    // Check action suppression (30 days after complete/dismiss)
    if (state.lastActionDate) {
      const daysSinceAction = (now - state.lastActionDate) / dayInMs;
      if (daysSinceAction < flags.suppress_after_action_days) {
        return true;
      }
    }

    // Check 90-day impression cap
    if (state.impressionCount90Days >= MAX_IMPRESSIONS_90_DAYS) {
      return true;
    }

    return false;
  }

  /**
   * Record a survey impression
   */
  private async recordImpression(): Promise<void> {
    const state = await this.getCooldownState();
    const now = Date.now();

    state.lastImpressionDate = now;
    state.impressionTimestamps.push(now);
    state.impressionCount90Days = state.impressionTimestamps.length;

    await this.saveCooldownState(state);
    this.trackEvent(IntercomAnalyticsEvents.SURVEY_COOLDOWN_APPLIED);
  }

  /**
   * Record a survey action (complete or dismiss)
   */
  private async recordAction(): Promise<void> {
    const state = await this.getCooldownState();
    state.lastActionDate = Date.now();
    await this.saveCooldownState(state);
  }

  // === Utility Functions ===

  /**
   * Bucket order count per PRD
   */
  private bucketOrders(count: number): OrdersBucket {
    if (count === 0) return '0';
    if (count === 1) return '1';
    if (count <= 4) return '2-4';
    return '5+';
  }

  /**
   * Bucket trade size per PRD
   */
  private bucketTradeSize(usd: number): TradeSizeBucket {
    if (usd < 100) return '0-99';
    if (usd < 500) return '100-499';
    if (usd < 2000) return '500-1999';
    if (usd < 10000) return '2000-9999';
    return '10000+';
  }

  /**
   * Get device locale
   */
  private getDeviceLocale(): string {
    try {
      const locale = I18n.locale;
      return locale?.split('-')[0] ?? 'en';
    } catch {
      return 'en';
    }
  }

  /**
   * Check if user's locale is supported
   */
  private isLocaleSupported(supportedLocales: string[]): boolean {
    const deviceLocale = this.getDeviceLocale();
    return supportedLocales.some((locale) =>
      deviceLocale.toLowerCase().startsWith(locale.toLowerCase()),
    );
  }

  /**
   * Check if user is in an eligible cohort
   */
  private isInEligibleCohort(cohorts: string[]): boolean {
    // If 'all' is in cohorts, everyone is eligible
    if (cohorts.includes('all')) {
      return true;
    }

    // TODO: Implement cohort logic based on anonymous UUID
    // For now, check if user is in any specified cohort
    // This could use a hash of the anonymous UUID to determine cohort membership
    return true;
  }

  /**
   * Reset cooldown state (for testing/admin purposes)
   */
  async resetCooldown(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.COOLDOWN_STATE);
      Logger.log('SurveyService: Cooldown state reset');
    } catch (error) {
      Logger.error(error as Error, 'SurveyService: Failed to reset cooldown');
    }
  }

  /**
   * Track analytics event
   */
  private trackEvent(
    eventName: string,
    metadata?: Record<string, unknown>,
  ): void {
    // TODO: Integrate with MetaMetrics
    Logger.log(`SurveyService: Event ${eventName}`, metadata);
  }
}

export default SurveyService.getInstance();
