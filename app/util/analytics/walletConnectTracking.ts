import { analytics } from './analytics';
import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import type { IMetaMetricsEvent } from '../../core/Analytics/MetaMetrics.types';

/**
 * Fire-and-forget analytics helper for WalletConnect flows.
 * Never throws — a broken analytics call must not block connection handling.
 *
 * @param event - Catalog event to emit.
 * @param properties - Event properties. Must not include the raw pairing topic.
 */
export function trackWalletConnectEvent(
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
    // Intentionally swallowed: analytics must not block WalletConnect flows.
  }
}
