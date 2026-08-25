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
 * When metrics are off, queues via saveOnboardingEvent the same way
 * trackOnboarding does after opt-in.
 */
export function trackDeferredOnboardingEvent(
  event: IMetaMetricsEvent,
  properties: DeferredOnboardingEventProperties,
  saveOnboardingEvent?: (event: AnalyticsTrackingEvent) => void,
): void {
  const analyticsEvent = AnalyticsEventBuilder.createEventBuilder(event)
    .addProperties(properties)
    .build();

  if (!analytics.isEnabled() && saveOnboardingEvent) {
    saveOnboardingEvent(analyticsEvent);
    return;
  }

  analytics.trackEvent(analyticsEvent);
}
