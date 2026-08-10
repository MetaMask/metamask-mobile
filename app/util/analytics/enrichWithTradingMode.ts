import {
  getTradingModeAnalyticsProperties,
  TRADING_MODE_ANALYTICS_PROPERTY,
} from '../../components/UI/Perps/utils/perpsAnalyticsAttribution';

/** MetaMetrics Perps event names are prefixed with "Perp " (see MetaMetrics.events). */
const PERPS_EVENT_NAME_PREFIX = 'Perp ';

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

/**
 * Attach Lite/Pro `trading_mode` to every Perps MetaMetrics event.
 *
 * Explicit caller `trading_mode` wins (mode toggle / selection emit the selected
 * next mode). Search intent keeps using `mode` (`PERPS_EVENT_PROPERTY.MODE`)
 * so existing dashboards stay compatible.
 */
export const enrichWithTradingMode = <
  T extends {
    name: string;
    properties: Record<string, unknown>;
  },
>(
  event: T,
): T => {
  if (!event.name.startsWith(PERPS_EVENT_NAME_PREFIX)) {
    return event;
  }

  const modeProperties = getTradingModeAnalyticsProperties();
  if (!(TRADING_MODE_ANALYTICS_PROPERTY in modeProperties)) {
    return event;
  }

  return cloneEventWithProperties(event, {
    ...modeProperties,
    ...event.properties,
  });
};
