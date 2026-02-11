import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import Intercom, {
  Visibility,
  IntercomContent,
  IntercomEvents,
} from '@intercom/intercom-react-native';
import { v4 as uuidv4 } from 'uuid';
import Logger from '../../util/Logger';
import {
  IntercomConfig,
  IntercomUserMetadata,
  IntercomAnalyticsEvents,
} from './types';
import { getIntercomConfig } from './config';

/**
 * IntercomService - Core wrapper for Intercom SDK
 *
 * This service implements the privacy-first approach required by the PRD:
 * - Manual/lazy initialization (SDK only loads on explicit user action)
 * - Uses loginUnidentifiedUser() exclusively (no PII)
 * - Hides default launcher (custom entry points only)
 * - Provides fallback handling for SDK failures
 *
 * @see intercom/PRD.md for full requirements
 */
class IntercomService {
  private static instance: IntercomService;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private anonymousUUID: string | null = null;
  private eventListenerCleanup: (() => void) | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance of IntercomService
   */
  static getInstance(): IntercomService {
    if (!IntercomService.instance) {
      IntercomService.instance = new IntercomService();
    }
    return IntercomService.instance;
  }

  /**
   * Check if Intercom SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initialize Intercom SDK (lazy, on-demand)
   *
   * CRITICAL: Uses loginUnidentifiedUser() - NEVER identified login
   * This ensures no PII (email, userId, name, phone) is sent to Intercom.
   *
   * @param config - Optional config override (uses env vars if not provided)
   */
  async initialize(config?: IntercomConfig): Promise<void> {
    if (this.initialized) {
      Logger.log('IntercomService: Already initialized');
      return;
    }

    // Prevent multiple simultaneous initialization attempts
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize(config);

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Internal initialization logic
   */
  private async _doInitialize(config?: IntercomConfig): Promise<void> {
    try {
      const intercomConfig = config ?? getIntercomConfig();

      const apiKey = Platform.select({
        ios: intercomConfig.iosApiKey,
        android: intercomConfig.androidApiKey,
      });

      if (!apiKey) {
        throw new Error('Intercom API key not found for platform');
      }

      if (!intercomConfig.appId) {
        throw new Error('Intercom App ID not configured');
      }

      // Hide in-app messages until we're ready
      await Intercom.setInAppMessageVisibility(Visibility.GONE);

      // Initialize SDK
      await Intercom.initialize(apiKey, intercomConfig.appId);

      // CRITICAL: Use unidentified user only - no PII
      // This is required by the PRD for privacy compliance
      await Intercom.loginUnidentifiedUser();

      // Hide the default launcher - we use custom entry points
      await Intercom.setLauncherVisibility(Visibility.GONE);

      // Setup event listeners
      this.setupEventListeners();

      this.initialized = true;

      Logger.log('IntercomService: Initialized successfully');
      this.trackEvent(IntercomAnalyticsEvents.SDK_INIT);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      Logger.error(error as Error, 'IntercomService: Initialization failed');
      this.trackEvent(IntercomAnalyticsEvents.SDK_ERROR, {
        error_type: 'initialization',
        error_message: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Setup native event listeners for Intercom events
   */
  private setupEventListeners(): void {
    try {
      const cleanupIntercom = Intercom.bootstrapEventListeners();
      const eventEmitter = new NativeEventEmitter(
        NativeModules.IntercomEventEmitter,
      );

      const hideListener = eventEmitter.addListener(
        IntercomEvents.IntercomWindowDidHide,
        () => {
          this.trackEvent(IntercomAnalyticsEvents.SUPPORT_CLOSED);
        },
      );

      const unreadListener = eventEmitter.addListener(
        IntercomEvents.IntercomUnreadCountDidChange,
        (response: { count: number }) => {
          if (response.count > 0) {
            this.trackEvent(IntercomAnalyticsEvents.SUPPORT_MESSAGE_RECEIVED);
          }
        },
      );

      this.eventListenerCleanup = () => {
        hideListener.remove();
        unreadListener.remove();
        cleanupIntercom();
      };
    } catch (error) {
      Logger.error(
        error as Error,
        'IntercomService: Failed to setup event listeners',
      );
    }
  }

  /**
   * Shutdown Intercom and clear session
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // Cleanup event listeners
      if (this.eventListenerCleanup) {
        this.eventListenerCleanup();
        this.eventListenerCleanup = null;
      }

      await Intercom.logout();
      this.initialized = false;
      Logger.log('IntercomService: Shutdown complete');
    } catch (error) {
      Logger.error(error as Error, 'IntercomService: Shutdown failed');
    }
  }

  /**
   * Update user attributes with non-PII, bucketed metadata only
   *
   * IMPORTANT: Only send bucketed, non-PII data as defined in the PRD:
   * - app_version, platform, locale
   * - feature_area bucket
   * - perps_user (bool), orders_completed_7d bucket, trade_size_usd_bucket
   * - anonymous_uuid (rotated on opt-out)
   *
   * DO NOT send: wallet address, email, phone, IP, device ad ID
   */
  async updateUserAttributes(metadata: IntercomUserMetadata): Promise<void> {
    if (!this.initialized) {
      Logger.error(
        new Error('IntercomService: Cannot update user - not initialized'),
      );
      return;
    }

    try {
      await Intercom.updateUser({
        customAttributes: {
          ...metadata,
          anonymous_uuid: metadata.anonymous_uuid ?? this.getAnonymousUUID(),
        },
      });
    } catch (error) {
      Logger.error(
        error as Error,
        'IntercomService: Failed to update user attributes',
      );
    }
  }

  /**
   * Present Intercom Messenger (Support Mode)
   */
  async presentMessenger(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Intercom not initialized');
    }

    try {
      await Intercom.present();
      this.trackEvent(IntercomAnalyticsEvents.SUPPORT_OPENED);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.trackEvent(IntercomAnalyticsEvents.SUPPORT_ERROR, {
        error_type: 'present_messenger',
        error_message: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Present a specific survey (Surveys Mode)
   *
   * @param surveyId - The survey ID from Intercom workspace
   */
  async presentSurvey(surveyId: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Intercom not initialized');
    }

    try {
      const surveyContent = IntercomContent.surveyWithSurveyId(surveyId);
      await Intercom.presentContent(surveyContent);
      this.trackEvent(IntercomAnalyticsEvents.SURVEY_VIEWED, {
        survey_id: surveyId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.trackEvent(IntercomAnalyticsEvents.SDK_ERROR, {
        error_type: 'present_survey',
        survey_id: surveyId,
        error_message: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Log an event to Intercom
   */
  async logEvent(
    eventName: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await Intercom.logEvent(eventName, metadata);
    } catch (error) {
      Logger.error(
        error as Error,
        `IntercomService: Failed to log event ${eventName}`,
      );
    }
  }

  /**
   * Get unread conversation count
   */
  async getUnreadCount(): Promise<number> {
    if (!this.initialized) {
      return 0;
    }

    try {
      return await Intercom.getUnreadConversationCount();
    } catch (error) {
      Logger.error(
        error as Error,
        'IntercomService: Failed to get unread count',
      );
      return 0;
    }
  }

  /**
   * Hide any visible Intercom UI
   */
  async hide(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await Intercom.hideIntercom();
    } catch (error) {
      Logger.error(error as Error, 'IntercomService: Failed to hide Intercom');
    }
  }

  /**
   * Track analytics event (internal tracking)
   * This is for MetaMetrics integration - not Intercom's logEvent
   */
  private trackEvent(
    eventName: string,
    metadata?: Record<string, unknown>,
  ): void {
    // TODO: Integrate with MetaMetrics when available
    // For now, just log
    Logger.log(`IntercomService: Event ${eventName}`, metadata);

    // Also log to Intercom if initialized
    if (this.initialized && eventName.startsWith('intercom_')) {
      this.logEvent(eventName, metadata).catch(() => {
        // Silently ignore logging failures
      });
    }
  }

  /**
   * Get or create anonymous UUID (rotated on opt-out)
   */
  getAnonymousUUID(): string {
    if (!this.anonymousUUID) {
      this.anonymousUUID = this.generateUUID();
    }
    return this.anonymousUUID;
  }

  /**
   * Rotate anonymous UUID (called on survey opt-out)
   * This is required by the PRD to prevent re-identification
   */
  rotateAnonymousUUID(): void {
    this.anonymousUUID = this.generateUUID();
    Logger.log('IntercomService: Anonymous UUID rotated');
  }

  /**
   * Set the anonymous UUID (for persistence restore)
   */
  setAnonymousUUID(uuid: string): void {
    this.anonymousUUID = uuid;
  }

  /**
   * Generate a new UUID v4
   */
  private generateUUID(): string {
    return uuidv4();
  }
}

export default IntercomService.getInstance();
