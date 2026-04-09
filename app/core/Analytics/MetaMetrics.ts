import { GroupTraits, UserTraits } from '@segment/analytics-react-native';
import { IMetaMetrics, ITrackingEvent } from './MetaMetrics.types';
import { isE2E } from '../../util/test/utils';
import MetaMetricsTestUtils from './MetaMetricsTestUtils';
import { analytics } from '../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';

/**
 * MetaMetrics wrapper around AnalyticsController.
 *
 * This class provides backward compatibility with the IMetaMetrics interface
 * while delegating all analytics operations to AnalyticsController via the analytics.ts utility.
 *
 * @deprecated Use {@link analytics} from `app/util/analytics/analytics` instead. This class is maintained for backward compatibility only.
 *
 * ## Base tracking usage
 * ```
 * const metrics = MetaMetrics.getInstance();
 * metrics.trackEvent(event, { property: 'value' });
 * ```
 *
 * or using the new properties structure:
 * ```
 * const metrics = MetaMetrics.getInstance();
 * metrics.trackEvent(event, {
 *   properties: {property: 'value' },
 *   sensitiveProperties: {sensitiveProperty: 'sensitiveValue' }
 * );
 * ```
 *
 * ## Enabling MetaMetrics
 * Enable the metrics when user agrees (optin or settings).
 * ```
 * const metrics = MetaMetrics.getInstance();
 * await metrics.enable();
 *```
 *
 * ## Disabling MetaMetrics
 * Disable the metrics when user refuses (optout or settings).
 * ```
 * const metrics = MetaMetrics.getInstance();
 * await metrics.enable(false);
 * ```
 *
 * ## Identify user
 * By default all metrics are anonymous using a single hardcoded anonymous ID.
 * Until you identify the user, all events will be associated to this anonymous ID.
 * ```
 * const metrics = MetaMetrics.getInstance();
 * metrics.addTraitsToUser({ property: 'value' });
 * ```
 *
 * This will associate the user to a new generated unique ID and all future events will be associated to this user.
 *
 * ## Reset user
 * If you want to reset the user ID, you can call the reset method.
 * This will revert the user to the anonymous ID and generate a new unique ID.
 * ```
 * const metrics = MetaMetrics.getInstance();
 * metrics.reset();
 * ```
 * @remarks Use {@link analytics} from `app/util/analytics/analytics` for new code. Prefer {@link useMetrics} hook in your components.
 *
 * @see METAMETRICS_ANONYMOUS_ID
 */
class MetaMetrics implements IMetaMetrics {
  /**
   * Protected constructor to prevent direct instantiation
   *
   * Use {@link getInstance} instead
   *
   * @protected
   */
  protected constructor() {
    // No-op: MetaMetrics now delegates to analytics.ts utility
  }

  /**
   * Singleton instance of the MetaMetrics class
   *
   * The value is protected to prevent direct access
   * but allows to access it from a child class for testing
   * @protected
   */
  protected static instance: MetaMetrics | null;

  /**
   * Get an instance of the MetaMetrics system
   *
   * @example const metrics = MetaMetrics.getInstance();
   * @returns MetaMetrics instance
   */
  public static getInstance(): IMetaMetrics {
    if (!this.instance) {
      this.instance = new MetaMetrics();
    }
    return this.instance;
  }

  /**
   * Enable or disable MetaMetrics
   *
   * @param enable - Boolean indicating if MetaMetrics should be enabled or disabled
   * @deprecated Use {@link analytics.optIn} or {@link analytics.optOut} from `app/util/analytics/analytics` instead
   */
  enable = async (enable = true): Promise<void> => {
    if (enable) {
      await analytics.optIn();
    } else {
      await analytics.optOut();
    }
  };

  /**
   * Check if MetaMetrics is enabled
   *
   * @returns Boolean indicating if MetaMetrics is enabled or disabled
   * @deprecated Use {@link analytics.isEnabled} from `app/util/analytics/analytics` instead
   */
  isEnabled = (): boolean => analytics.isEnabled();

  /**
   * Add traits to the user and identify them
   *
   * @param userTraits list of traits to add to the user
   *
   * @remarks method can be called multiple times,
   * new traits are sent with the underlying identification call to Segment
   * and user traits are updated with the latest ones
   * @deprecated Use {@link analytics.identify} from `app/util/analytics/analytics` instead
   */
  addTraitsToUser = (userTraits: UserTraits): Promise<void> => {
    if (analytics.isEnabled()) {
      // UserTraits from Segment SDK is compatible with AnalyticsUserTraits
      analytics.identify(
        userTraits as unknown as import('@metamask/analytics-controller').AnalyticsUserTraits,
      );
    }
    return Promise.resolve();
  };

  /**
   * Add a user to a specific group
   *
   * @param groupId - Any unique string to associate user with
   * @param groupTraits - group relevant traits or properties (optional)
   * @deprecated This method is deprecated and never used in production. Kept for backward compatibility.
   */
  group = (_groupId: string, _groupTraits?: GroupTraits): Promise<void> =>
    // Deprecated method - no-op
    Promise.resolve();

  /**
   * Track an event
   *
   * The function allows to track non-anonymous and anonymous events:
   * - with properties and without properties,
   * - with a unique trackEvent function
   *
   * ## Regular non-anonymous events
   * Regular events are tracked with the user ID and can have properties set
   *
   * ## Anonymous events
   * Anonymous tracking track sends two events: one with the anonymous ID and one with the user ID
   * - The anonymous event includes sensitive properties so you can know **what** but not **who**
   * - The non-anonymous event has either no properties or not sensitive one so you can know **who** but not **what**
   *
   * @example prefer using the hook {@link useMetrics} in your components
   * const { trackEvent, createEventBuilder } = useMetrics();
   *
   * @example basic non-anonymous tracking with no properties:
   * trackEvent(createEventBuilder(MetaMetricsEvents.ONBOARDING_STARTED).build());
   *
   * @example track with non-anonymous properties:
   * trackEvent(createEventBuilder(MetaMetricsEvents.MY_EVENT)
   *  .addProperties({ normalProp: 'value' })
   *  .build());
   *
   * @example track an anonymous event with properties
   * trackEvent(createEventBuilder(MetaMetricsEvents.MY_EVENT)
   *  .addSensitiveProperties({ sensitiveProp: 'value' })
   *  .build());
   *
   * @example track an event with both anonymous and non-anonymous properties
   * trackEvent(createEventBuilder(MetaMetricsEvents.MY_EVENT)
   *  .addProperties({ normalProp: 'value' })
   *  .addSensitiveProperties({ sensitiveProp: 'value' })
   *  .build());
   *
   * @param event - Analytics event built with {@link MetricsEventBuilder}
   * @param saveDataRecording - param to skip saving the data recording flag (optional)
   * @deprecated Use {@link analytics.trackEvent} from `app/util/analytics/analytics` instead. Prefer using {@link useMetrics} hook in components.
   */
  trackEvent = (
    // New signature
    event: ITrackingEvent,
    saveDataRecording: boolean = true,
  ): void => {
    if (!analytics.isEnabled()) {
      return;
    }

    if (isE2E) {
      MetaMetricsTestUtils.getInstance().trackEvent(event);
      return;
    }

    // Convert ITrackingEvent to AnalyticsTrackingEvent format
    const analyticsEvent = AnalyticsEventBuilder.createEventBuilder(event)
      .setSaveDataRecording(saveDataRecording)
      .build();

    // Delegate to analytics utility
    analytics.trackEvent(analyticsEvent);
  };

  /**
   * Clear the internal state of the library for the current user and reset the user ID
   * @deprecated This method is deprecated and never used in production. Kept for backward compatibility.
   */
  reset = async (): Promise<void> => {
    // Deprecated method - no-op
    // Note: AnalyticsController handles user reset through its own methods
  };

  /**
   * Forces the Segment SDK to flush all events in the queue
   *
   * This will send all events to Segment without waiting for
   * the queue to be full or the timeout to be reached
   * @deprecated This method is deprecated and never used in production. Kept for backward compatibility.
   */
  flush = async (): Promise<void> => {
    // Deprecated method - no-op
    // Note: AnalyticsController handles event flushing through platform adapter
  };

  /**
   * Get the current MetaMetrics ID
   *
   * @returns the current MetaMetrics ID
   * @deprecated Use {@link analytics.getAnalyticsId} from `app/util/analytics/analytics` instead
   */
  getMetaMetricsId = async (): Promise<string> =>
    await analytics.getAnalyticsId();
}

export default MetaMetrics;
