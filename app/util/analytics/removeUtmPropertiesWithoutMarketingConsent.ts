import type { AnalyticsEventProperties } from '@metamask/analytics-controller';
import { UTM_PARAMETERS } from './utmParameters';

/**
 * Strips marketing UTM fields when the user has not granted marketing consent.
 */
export function removeUtmPropertiesWithoutMarketingConsent<
  TProperties extends AnalyticsEventProperties | undefined,
>(
  properties: TProperties,
  dataCollectionForMarketing: boolean | null,
): TProperties {
  if (!properties || dataCollectionForMarketing === true) {
    return properties;
  }

  const sanitized = { ...properties };

  for (const utmParam of UTM_PARAMETERS) {
    delete sanitized[utmParam];
  }

  delete sanitized.attribution_id;

  return sanitized as TProperties;
}
