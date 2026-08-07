import { PERPS_EVENT_PROPERTY } from '@metamask/perps-controller';
import { getPerpsModeAnalyticsProperties } from '../../components/UI/Perps/utils/perpsAnalyticsAttribution';

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
 * Attach Lite/Pro `mode` to every Perps MetaMetrics event.
 *
 * Explicit caller `mode` wins (mode toggle / selection emit the selected next
 * mode). Search intent uses `search_mode` so it never collides with this field.
 */
export const enrichWithPerpsMode = <
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

  const modeProperties = getPerpsModeAnalyticsProperties();
  if (!(PERPS_EVENT_PROPERTY.MODE in modeProperties)) {
    return event;
  }

  return cloneEventWithProperties(event, {
    ...modeProperties,
    ...event.properties,
  });
};
