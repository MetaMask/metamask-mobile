import { MetaMetricsEvents } from '../../core/Analytics';
import { IMetaMetricsEvent, JsonMap } from './analytics.types';

/**
 * Properties for External Link Clicked tracking.
 *
 * @property location - Screen or context in snake_case
 * @property text - Visible link or button label
 * @property url_domain - Full external URL (non–block-explorer links)
 */
export interface ExternalLinkClickedProperties extends JsonMap {
  location: string;
  text: string;
  url_domain: string;
}

/**
 * Input for block explorer External Link Clicked tracking.
 * `url_domain` is sent as the URL hostname only.
 *
 * @property location - Screen or context in snake_case
 * @property text - Visible link or button label
 * @property url - Full block explorer URL used to derive hostname
 */
export interface BlockExplorerLinkClickedProperties extends JsonMap {
  location: string;
  text: string;
  url: string;
}

type ExternalLinkEventFactory<TEvent> = (event: IMetaMetricsEvent) => {
  addProperties: (properties: ExternalLinkClickedProperties) => {
    build: () => TEvent;
  };
};

/**
 * Extract hostname from an external URL for block explorer analytics.
 *
 * @param url - Full URL string
 * @returns URL hostname, or the original string if parsing fails
 */
export const getExternalLinkHostname = (url: string): string => {
  if (!url) {
    return url;
  }

  const normalizedUrl = /^[a-z][a-z0-9+.-]*:\/\//i.test(url)
    ? url
    : `https://${url}`;

  try {
    return new URL(normalizedUrl).hostname;
  } catch {
    const match = url.match(/^(?:https?:\/\/)?([^/?#:]+)/i);
    return match?.[1] ?? url;
  }
};

const emitExternalLinkClicked = <TEvent>(
  trackEvent: (event: TEvent) => void,
  createEventBuilder: ExternalLinkEventFactory<TEvent>,
  properties: ExternalLinkClickedProperties,
): void => {
  trackEvent(
    createEventBuilder(MetaMetricsEvents.EXTERNAL_LINK_CLICKED)
      .addProperties(properties)
      .build(),
  );
};

/**
 * Track External Link Clicked with the mobile analytics schema.
 *
 * @param trackEvent - trackEvent function from useAnalytics
 * @param createEventBuilder - createEventBuilder function from AnalyticsEventBuilder
 * @param properties - Link properties
 */
export const trackExternalLinkClicked = <TEvent>(
  trackEvent: (event: TEvent) => void,
  createEventBuilder: ExternalLinkEventFactory<TEvent>,
  properties: ExternalLinkClickedProperties,
): void => {
  emitExternalLinkClicked(trackEvent, createEventBuilder, properties);
};

/**
 * Track External Link Clicked for block explorer taps.
 * Sends `url_domain` as the URL hostname (not the full path).
 *
 * @param trackEvent - trackEvent function from useAnalytics
 * @param createEventBuilder - createEventBuilder function from AnalyticsEventBuilder
 * @param properties - Block explorer link properties
 */
export const trackBlockExplorerLinkClicked = <TEvent>(
  trackEvent: (event: TEvent) => void,
  createEventBuilder: ExternalLinkEventFactory<TEvent>,
  properties: BlockExplorerLinkClickedProperties,
): void => {
  const { location, text, url } = properties;
  emitExternalLinkClicked(trackEvent, createEventBuilder, {
    location,
    text,
    url_domain: getExternalLinkHostname(url),
  });
};
