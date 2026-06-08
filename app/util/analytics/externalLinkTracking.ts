import { MetaMetricsEvents } from '../../core/Analytics';
import { IMetaMetricsEvent, JsonMap } from './analytics.types';

/**
 * Properties for External Link Clicked tracking.
 *
 * @property location - Screen or context in snake_case
 * @property text - Visible link or button label
 * @property url_domain - Full external URL
 */
export interface ExternalLinkClickedProperties extends JsonMap {
  location: string;
  text: string;
  url_domain: string;
}

/**
 * Track External Link Clicked with the mobile analytics schema.
 * Generic over the event type so callers using either MetricsEventBuilder
 * (ITrackingEvent) or AnalyticsEventBuilder (AnalyticsTrackingEvent) are
 * both accepted without a lossy union parameter.
 *
 * @param trackEvent - trackEvent function (MetaMetrics or useAnalytics)
 * @param createEventBuilder - createEventBuilder function (MetricsEventBuilder or AnalyticsEventBuilder)
 * @param properties - Link properties
 */
export const trackExternalLinkClicked = <TEvent>(
  trackEvent: (event: TEvent) => void,
  createEventBuilder: (event: IMetaMetricsEvent) => {
    addProperties: (properties: ExternalLinkClickedProperties) => {
      build: () => TEvent;
    };
  },
  properties: ExternalLinkClickedProperties,
): void => {
  trackEvent(
    createEventBuilder(MetaMetricsEvents.EXTERNAL_LINK_CLICKED)
      .addProperties(properties)
      .build(),
  );
};
