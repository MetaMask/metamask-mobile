import { analytics } from '../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import type { IMetaMetricsEvent } from '../../Analytics/MetaMetrics.types';

/**
 * Fire-and-forget analytics helper for Mobile Wallet Protocol flows.
 * Never throws — a broken analytics call must not block connection handling.
 */
export function trackMwpEvent(
  event: IMetaMetricsEvent,
  properties: Record<string, unknown>,
): void {
  try {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(event)
        .addProperties(properties)
        .build(),
    );
  } catch {
    // Intentionally swallowed: analytics must not block MWP flows.
  }
}
