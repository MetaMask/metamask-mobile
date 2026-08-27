import type { Route } from '@react-navigation/native';
import { EVENT_NAME } from '../../core/Analytics/MetaMetrics.events';
import NavigationService from '../../core/NavigationService';

export const NavigationAnalyticsAttribution = {
  HomepageBalanceBreakdown: 'homescreen_balance_breakdown',
} as const;

export type NavigationAnalyticsAttributionValue =
  (typeof NavigationAnalyticsAttribution)[keyof typeof NavigationAnalyticsAttribution];

export interface NavigationAnalyticsContext {
  id: string;
  attribution: NavigationAnalyticsAttributionValue;
}

export interface NavigationAnalyticsRouteParams {
  analyticsContext?: NavigationAnalyticsContext;
}

interface NavigationAttributionMapping {
  eventName: string;
  property: 'entry_point' | 'source';
  requiredProperties?: Readonly<Record<string, unknown>>;
}

const NAVIGATION_ATTRIBUTION_MAPPINGS: Record<
  NavigationAnalyticsAttributionValue,
  readonly NavigationAttributionMapping[]
> = {
  [NavigationAnalyticsAttribution.HomepageBalanceBreakdown]: [
    {
      eventName: EVENT_NAME.MONEY_SURFACE_VIEWED,
      property: 'entry_point',
      requiredProperties: {
        screen_name: 'money_home',
        surface_type: 'screen',
      },
    },
    {
      eventName: EVENT_NAME.PERPS_SCREEN_VIEWED,
      property: 'source',
    },
    {
      eventName: EVENT_NAME.POSITION_SCREEN_VIEWED,
      property: 'source',
    },
  ],
};

const MAX_CONSUMED_ATTRIBUTIONS = 500;
const consumedAttributions = new Set<string>();
let contextSequence = 0;

export const createNavigationAnalyticsContext = (
  attribution: NavigationAnalyticsAttributionValue,
): NavigationAnalyticsContext => ({
  id: `${attribution}-${Date.now()}-${contextSequence++}`,
  attribution,
});

const getCurrentRoute = (): Route<string> | undefined =>
  NavigationService.getCurrentRoute();

const rememberConsumption = (consumptionKey: string) => {
  consumedAttributions.add(consumptionKey);
  if (consumedAttributions.size > MAX_CONSUMED_ATTRIBUTIONS) {
    const oldestKey = consumedAttributions.values().next().value;
    if (oldestKey) {
      consumedAttributions.delete(oldestKey);
    }
  }
};

const getNavigationAnalyticsAttribution = (
  analyticsContext: NavigationAnalyticsContext,
  eventName: string,
): NavigationAttributionMapping | undefined =>
  NAVIGATION_ATTRIBUTION_MAPPINGS[analyticsContext.attribution]?.find(
    ({ eventName: mappedEventName }) => mappedEventName === eventName,
  );

const hasRequiredProperties = (
  mapping: NavigationAttributionMapping,
  properties: Record<string, unknown>,
): boolean =>
  !mapping.requiredProperties ||
  Object.entries(mapping.requiredProperties).every(
    ([property, value]) => properties[property] === value,
  );

/**
 * Consumes the attribution mapping for one navigation context and event.
 *
 * Callers that emit related events from the same property set can use the
 * returned value before building those events. Later emissions for the same
 * context and event return `undefined`.
 */
export const consumeNavigationAnalyticsAttribution = (
  analyticsContext: NavigationAnalyticsContext,
  eventName: string,
): NavigationAttributionMapping | undefined => {
  const mapping = getNavigationAnalyticsAttribution(
    analyticsContext,
    eventName,
  );
  if (!mapping) {
    return undefined;
  }

  const consumptionKey = `${analyticsContext.id}:${eventName}`;
  if (consumedAttributions.has(consumptionKey)) {
    return undefined;
  }

  rememberConsumption(consumptionKey);
  return mapping;
};

export const enrichWithNavigationAttribution = <
  T extends {
    name: string;
    properties: Record<string, unknown>;
  },
>(
  event: T,
  route: Route<string> | undefined = getCurrentRoute(),
): T => {
  const analyticsContext = (
    route?.params as NavigationAnalyticsRouteParams | undefined
  )?.analyticsContext;
  if (!analyticsContext) {
    return event;
  }

  const mapping = getNavigationAnalyticsAttribution(
    analyticsContext,
    event.name,
  );
  if (!mapping) {
    return event;
  }

  if (!hasRequiredProperties(mapping, event.properties)) {
    return event;
  }

  if (event.properties[mapping.property] !== undefined) {
    return event;
  }

  if (!consumeNavigationAnalyticsAttribution(analyticsContext, event.name)) {
    return event;
  }

  const clonedEvent = Object.create(
    Object.getPrototypeOf(event),
    Object.getOwnPropertyDescriptors(event),
  ) as T;
  clonedEvent.properties = {
    ...event.properties,
    [mapping.property]: analyticsContext.attribution,
  };
  return clonedEvent;
};

export const resetNavigationAnalyticsAttributionForTests = () => {
  consumedAttributions.clear();
  contextSequence = 0;
};
