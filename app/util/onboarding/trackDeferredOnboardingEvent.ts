import { analytics } from '../analytics/analytics';
import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from '../analytics/AnalyticsEventBuilder';
import type { IMetaMetricsEvent } from '../../core/Analytics/MetaMetrics.types';

export type DeferredOnboardingEventProperties = Record<
  string,
  string | boolean | number
>;

/**
 * Tracks an onboarding event immediately (no InteractionManager delay).
 * Used for stall and login-attempt signals that must leave the device even if
 * JS later hangs on a spinner.
 *
 * When metrics are off, queues via saveOnboardingEvent until opt-in.
 * If metrics are off and no saver is provided, the event is dropped.
 */
export function trackDeferredOnboardingEvent(
  event: IMetaMetricsEvent,
  properties: DeferredOnboardingEventProperties,
  saveOnboardingEvent?: (event: AnalyticsTrackingEvent) => void,
): void {
  const analyticsEvent = AnalyticsEventBuilder.createEventBuilder(event)
    .addProperties(properties)
    .build();

  if (!analytics.isEnabled()) {
    // Without a saver there is nowhere to queue the event until opt-in;
    // do not send telemetry while metrics are off.
    if (saveOnboardingEvent) {
      saveOnboardingEvent(analyticsEvent);
    }
    return;
  }

  analytics.trackEvent(analyticsEvent);
}
