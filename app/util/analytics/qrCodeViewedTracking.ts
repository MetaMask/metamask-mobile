import { MetaMetricsEvents } from '../../core/Analytics';
import { IMetaMetricsEvent, JsonMap } from './analytics.types';

/**
 * Properties for QR Code Viewed tracking.
 *
 * @property location - Entry point in kebab-case (e.g. address-list)
 * @property account_type - Account type from getAddressAccountType
 * @property chain_id_caip - Optional CAIP-2 chain ID when a specific chain is shown
 */
export interface QrCodeViewedProperties extends JsonMap {
  location: string;
  account_type: string;
  chain_id_caip?: string;
}

type QrCodeViewedEventFactory<TEvent> = (event: IMetaMetricsEvent) => {
  addProperties: (properties: QrCodeViewedProperties) => {
    build: () => TEvent;
  };
};

/**
 * Track QR Code Viewed with the mobile analytics schema.
 * Generic over the event type so callers using either MetricsEventBuilder
 * (ITrackingEvent) or AnalyticsEventBuilder (AnalyticsTrackingEvent) are
 * both accepted without a lossy union parameter.
 *
 * @param trackEvent - trackEvent function (MetaMetrics or useAnalytics)
 * @param createEventBuilder - createEventBuilder function (MetricsEventBuilder or AnalyticsEventBuilder)
 * @param properties - QR code view properties
 */
export const trackQrCodeViewed = <TEvent>(
  trackEvent: (event: TEvent) => void,
  createEventBuilder: QrCodeViewedEventFactory<TEvent>,
  properties: QrCodeViewedProperties,
): void => {
  const { location, account_type, chain_id_caip } = properties;

  trackEvent(
    createEventBuilder(MetaMetricsEvents.QR_CODE_VIEWED)
      .addProperties({
        location,
        account_type,
        ...(chain_id_caip !== undefined && { chain_id_caip }),
      })
      .build(),
  );
};
