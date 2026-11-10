import type { IMetaMetricsEvent } from '../../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import Logger from '../../../../util/Logger';
import { IRON_KYC_VENDOR } from '../vendors/iron';

/**
 * Builds and sends one KYC event. `buildProperties` runs inside the try,
 * because reading controller state is as likely to throw as the send itself
 * and these calls sit on the identity-verification path. Nothing here may
 * reach the caller.
 *
 * @param event - The event definition.
 * @param buildProperties - Produces the event properties.
 */
export const trackKycEvent = (
  event: IMetaMetricsEvent,
  buildProperties: () => Record<string, string>,
): void => {
  try {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(event)
        .addProperties(buildProperties())
        .build(),
    );
  } catch (error) {
    Logger.error(error as Error, {
      tags: { feature: IRON_KYC_VENDOR.loggerFeature, event: event.category },
    });
  }
};
