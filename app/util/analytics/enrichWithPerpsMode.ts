import {
  getPerpsModeAnalyticsProperties,
  PERPS_MODE_ANALYTICS_PROPERTY,
} from '../../components/UI/Perps/utils/perpsModeAnalytics';
import { ASSET_VIEWED_PROPERTY } from '../../core/Analytics/trade-transaction-funnel/assetViewedAnalytics';

/** MetaMetrics Perps event names are prefixed with "Perp " (see MetaMetrics.events). */
const PERPS_EVENT_NAME_PREFIX = 'Perp ';

/** Companion funnel event emitted alongside Perp Screen Viewed. */
const ASSET_VIEWED_EVENT_NAME = 'Asset Viewed';

const cloneEventWithProperties = <
  T extends {
    properties: Record<string, unknown>;
  },
>(
  event: T,
  properties: Record<string, unknown>,
): T => {
  const clonedEvent = Object.create(
    Object.getPrototypeOf(event),
    Object.getOwnPropertyDescriptors(event),
  ) as T;

  clonedEvent.properties = properties;

  return clonedEvent;
};

const shouldAttachPerpsMode = (event: {
  name: string;
  properties: Record<string, unknown>;
}): boolean => {
  if (event.name.startsWith(PERPS_EVENT_NAME_PREFIX)) {
    return true;
  }

  // Mirrored Asset Viewed from usePerpsEventTracking is not "Perp "-prefixed,
  // but must still carry Lite/Pro mode for funnel segmentation.
  return (
    event.name === ASSET_VIEWED_EVENT_NAME &&
    event.properties[ASSET_VIEWED_PROPERTY.TRADE_TYPE] === 'Perps'
  );
};

/**
 * Attach Lite/Pro `perps_mode` to every Perps MetaMetrics event.
 *
 * Covers all `Perp *` events plus Perps companion `Asset Viewed` emissions.
 * Explicit caller `perps_mode` wins (mode toggle / selection emit the selected
 * next mode). Search intent keeps using `mode` (`PERPS_EVENT_PROPERTY.MODE`)
 * so existing dashboards stay compatible.
 */
export const enrichWithPerpsMode = <
  T extends {
    name: string;
    properties: Record<string, unknown>;
  },
>(
  event: T,
): T => {
  if (!shouldAttachPerpsMode(event)) {
    return event;
  }

  const modeProperties = getPerpsModeAnalyticsProperties();
  if (!(PERPS_MODE_ANALYTICS_PROPERTY in modeProperties)) {
    return event;
  }

  return cloneEventWithProperties(event, {
    ...modeProperties,
    ...event.properties,
  });
};
