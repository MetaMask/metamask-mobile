import type {
  AnalyticsEventProperties,
  AnalyticsUserTraits,
  AnalyticsTrackingEvent,
} from '@metamask/analytics-controller';

/**
 * Properties that may contain undefined values.
 * Accepted by AnalyticsEventBuilder.addProperties(), addSensitiveProperties(), and by filterUndefinedValues().
 *
 * Valid inputs:
 * - Objects with properties (already filtered or with undefined values)
 * - null or undefined (treated as empty object)
 */
export type AnalyticsUnfilteredProperties =
  | Record<string, unknown | undefined>
  | null
  | undefined;

/**
 * Analytics helper type defining the public API
 */
export interface AnalyticsHelper {
  /**
   * Track an event
   *
   * @param event - Analytics tracking event
   */
  trackEvent: (event: AnalyticsTrackingEvent) => void;

  /**
   * Track a screen view
   *
   * @param name - Screen name
   * @param properties - Screen data
   */
  trackView: (name: string, properties?: AnalyticsEventProperties) => void;

  /**
   * Set user info
   *
   * @param traits - User data
   */
  identify: (traits?: AnalyticsUserTraits) => void;

  /**
   * Opt in to analytics
   */
  optIn: () => void;

  /**
   * Opt out of analytics
   */
  optOut: () => void;

  /**
   * Get the analytics ID
   *
   * @returns Promise with the analytics ID
   */
  getAnalyticsId: () => Promise<string>;

  /**
   * Check if analytics is enabled
   *
   * @returns true if analytics is enabled, false otherwise
   */
  isEnabled: () => boolean;

  /**
   * Check if user opted in
   *
   * @returns Promise with true if opted in, false otherwise
   */
  isOptedIn: () => Promise<boolean>;

  /**
   * Generate analytics defaults
   *
   * @returns Promise with analytics defaults
   */
  generateDefaults: () => Promise<AnalyticsDefaults>;
}

/**
 * Analytics defaults type
 */
export interface AnalyticsDefaults {
  analyticsId: string;
  optedIn: boolean;
}
