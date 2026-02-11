import { Platform, Linking, Clipboard } from 'react-native';
import IntercomService from './IntercomService';
import { getIntercomFeatureFlags, isIntercomConfigured } from './config';
import Logger from '../../util/Logger';
import I18n from '../../../locales/i18n';
import {
  SupportContext,
  IntercomUserMetadata,
  IntercomAnalyticsEvents,
} from './types';
import { getVersion } from 'react-native-device-info';

// Fallback URLs
const HELP_CENTER_URL = 'https://support.metamask.io';
const SUPPORT_REQUEST_URL = 'https://support.metamask.io/hc/en-us/requests/new';

/**
 * SupportService - Manages Support Mode functionality
 *
 * Implements the PRD requirements for Support Mode:
 * - In-app support entry points (Settings, contextual Help)
 * - Lazy SDK initialization on explicit user action
 * - Graceful fallback to Help Centre browser if SDK unavailable
 * - Non-PII metadata for routing
 *
 * @see intercom/PRD.md for full requirements
 */
class SupportService {
  private static instance: SupportService;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance of SupportService
   */
  static getInstance(): SupportService {
    if (!SupportService.instance) {
      SupportService.instance = new SupportService();
    }
    return SupportService.instance;
  }

  /**
   * Open support - initializes Intercom if needed, falls back to browser
   *
   * This is the main entry point for Support Mode. It:
   * 1. Checks feature flags and kill switch
   * 2. Initializes Intercom SDK if not already done
   * 3. Updates user context with non-PII metadata
   * 4. Opens the Intercom Messenger
   * 5. Falls back to browser if any step fails
   *
   * @param context - Support context with feature area and metadata
   */
  async openSupport(context: SupportContext): Promise<void> {
    try {
      // Check if Intercom is configured
      if (!isIntercomConfigured()) {
        //Logger.warn('SupportService: Intercom not configured, using fallback');
        await this.openFallbackSupport();
        this.trackEvent(IntercomAnalyticsEvents.SUPPORT_FALLBACK_USED, {
          reason: 'not_configured',
        });
        return;
      }

      // Check feature flags
      const flags = await getIntercomFeatureFlags();
      if (flags.kill_switch || !flags.support_enabled_mobile) {
        Logger.log('SupportService: Support disabled by feature flag');
        await this.openFallbackSupport();
        this.trackEvent(IntercomAnalyticsEvents.SUPPORT_FALLBACK_USED, {
          reason: 'feature_disabled',
        });
        return;
      }

      // Initialize if not already done
      if (!IntercomService.isInitialized()) {
        await IntercomService.initialize();
      }

      // Build user metadata (non-PII only)
      const metadata = this.buildUserMetadata(context);
      await IntercomService.updateUserAttributes(metadata);

      // Open Messenger
      await IntercomService.presentMessenger();

      this.trackEvent(IntercomAnalyticsEvents.SUPPORT_OPENED, {
        feature_area: context.featureArea,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      Logger.error(error as Error, 'SupportService: Failed to open Intercom');
      this.trackEvent(IntercomAnalyticsEvents.SUPPORT_ERROR, {
        error_message: errorMessage,
        feature_area: context.featureArea,
      });

      // Fallback to browser
      await this.openFallbackSupport();
      this.trackEvent(IntercomAnalyticsEvents.SUPPORT_FALLBACK_USED, {
        reason: 'sdk_error',
        error_message: errorMessage,
      });
    }
  }

  /**
   * Build non-PII user metadata for routing
   */
  private buildUserMetadata(context: SupportContext): IntercomUserMetadata {
    // Get app version from package.json
    const appVersion = getVersion();

    // Get device locale
    const locale = this.getDeviceLocale();

    return {
      app_version: appVersion,
      platform: Platform.OS === 'ios' ? 'iOS' : 'Android',
      locale,
      feature_area: context.featureArea,
      anonymous_uuid: IntercomService.getAnonymousUUID(),
      ...context.additionalMetadata,
    };
  }

  /**
   * Get device locale (language code only, no region for privacy)
   */
  private getDeviceLocale(): string {
    try {
      const locale = I18n.locale;
      // Return only language code (e.g., "en" from "en-US")
      return locale?.split('-')[0] ?? 'en';
    } catch {
      return 'en';
    }
  }

  /**
   * Fallback: Open Help Center in browser
   */
  async openFallbackSupport(): Promise<void> {
    try {
      const canOpen = await Linking.canOpenURL(HELP_CENTER_URL);
      if (canOpen) {
        await Linking.openURL(HELP_CENTER_URL);
        Logger.log('SupportService: Opened Help Center in browser');
      } else {
        // Last resort: copy URL to clipboard
        await this.copyUrlToClipboard();
      }
    } catch (error) {
      Logger.error(error as Error, 'SupportService: Fallback failed');
      // Last resort: copy URL to clipboard
      await this.copyUrlToClipboard();
    }
  }

  /**
   * Copy support URL to clipboard as last resort
   */
  private async copyUrlToClipboard(): Promise<void> {
    try {
      Clipboard.setString(SUPPORT_REQUEST_URL);
      Logger.log('SupportService: Support URL copied to clipboard');
      // TODO: Show toast notification to user
    } catch (error) {
      Logger.error(
        error as Error,
        'SupportService: Failed to copy URL to clipboard',
      );
    }
  }

  /**
   * Check if support is available
   */
  async isSupportAvailable(): Promise<boolean> {
    if (!isIntercomConfigured()) {
      return false;
    }

    const flags = await getIntercomFeatureFlags();
    return flags.support_enabled_mobile && !flags.kill_switch;
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<number> {
    if (!IntercomService.isInitialized()) {
      return 0;
    }
    return IntercomService.getUnreadCount();
  }

  /**
   * Track analytics event
   */
  private trackEvent(
    eventName: string,
    metadata?: Record<string, unknown>,
  ): void {
    // TODO: Integrate with MetaMetrics
    Logger.log(`SupportService: Event ${eventName}`, metadata);
  }
}

export default SupportService.getInstance();
