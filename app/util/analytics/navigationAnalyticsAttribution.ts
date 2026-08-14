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
}

const NAVIGATION_ATTRIBUTION_MAPPINGS: Record<
  NavigationAnalyticsAttributionValue,
  readonly NavigationAttributionMapping[]
> = {
  [NavigationAnalyticsAttribution.HomepageBalanceBreakdown]: [
    {
      eventName: EVENT_NAME.MONEY_SURFACE_VIEWED,
      property: 'entry_point',
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

  const mapping = NAVIGATION_ATTRIBUTION_MAPPINGS[
    analyticsContext.attribution
  ]?.find(({ eventName }) => eventName === event.name);
  if (!mapping) {
    return event;
  }

  const consumptionKey = `${analyticsContext.id}:${event.name}`;
  if (consumedAttributions.has(consumptionKey)) {
    return event;
  }
  rememberConsumption(consumptionKey);

  if (event.properties[mapping.property] !== undefined) {
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
