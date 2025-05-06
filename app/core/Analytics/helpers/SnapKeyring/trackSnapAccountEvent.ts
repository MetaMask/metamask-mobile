import { IMetaMetricsEvent, MetaMetrics } from '../..';
import Logger from '../../../../util/Logger';
import { MetricsEventBuilder } from '../../MetricsEventBuilder';

/**
 * Track a Snap account-related event.
 *
 * @param metricEvent - The name of the event to track.
 * @param snapId - The ID of the Snap.
 * @param snapName - The name of the Snap.
 */
export function trackSnapAccountEvent(
  metricEvent: IMetaMetricsEvent,
  snapId: string,
  snapName: string,
): void {
  try {
    const event = MetricsEventBuilder.createEventBuilder(metricEvent)
      .addProperties({
        account_type: 'Snap',
        snap_id: snapId,
        snap_name: snapName,
      })
      .build();

    MetaMetrics.getInstance().trackEvent(event);
  } catch (error) {
    Logger.error(
      error as Error,
      `Error tracking snap account event: ${JSON.stringify(metricEvent)}`,
    );
  }
}
