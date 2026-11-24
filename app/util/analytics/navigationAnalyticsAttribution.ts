import type { Route } from '@react-navigation/native';
import { ACTIVITY_SCREEN_EVENTS } from '../../core/Analytics/events/activity/events';
import { CONFIRMATION_EVENTS } from '../../core/Analytics/events/confirmations/events';
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

/** Screen-view events that receive `previous_screen`. */
const SCREEN_VIEW_EVENT_NAMES: ReadonlySet<string> = new Set([
  EVENT_NAME.HOME_VIEWED,
  EVENT_NAME.POSITION_SCREEN_VIEWED,
  EVENT_NAME.PERPS_SCREEN_VIEWED,
  EVENT_NAME.RAMPS_SCREEN_VIEWED,
  EVENT_NAME.MONEY_SURFACE_VIEWED,
  EVENT_NAME.MONEY_HUB_SCREEN_VIEWED,
  EVENT_NAME.CARD_HOME_VIEWED,
  EVENT_NAME.EARN_MODULE_SURFACE_VIEWED,
  EVENT_NAME.PREDICT_HOME_VIEWED,
  EVENT_NAME.LOGIN_SCREEN_VIEWED,
  EVENT_NAME.WALLET_CREATION_ERROR_SCREEN_VIEWED,
  EVENT_NAME.VAULT_CORRUPTION_RESTORE_WALLET_SCREEN_VIEWED,
  EVENT_NAME.VAULT_CORRUPTION_WALLET_SUCCESSFULLY_RESTORED_SCREEN_VIEWED,
  EVENT_NAME.VAULT_CORRUPTION_WALLET_RESET_NEEDED_SCREEN_VIEWED,
  EVENT_NAME.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED,
  EVENT_NAME.SOCIAL_TRADER_PROFILE_SCREEN_VIEWED,
  EVENT_NAME.SOCIAL_FOLLOW_TRADING_TOKEN_SCREEN_VIEWED,
  EVENT_NAME.SOCIAL_TRADER_FEED_SCREEN_VIEWED,
  ACTIVITY_SCREEN_EVENTS.VIEWED.category,
  CONFIRMATION_EVENTS.SCREEN_VIEWED.category,
]);

/**
 * Focused route recorded from navigation container state.
 *
 * `name` is the value attached as `previous_screen`. `key` separates two
 * mounts of the same route.
 */
export interface FocusedRouteIdentity {
  /** Registered route name. */
  name: string;
  /** React Navigation key for this route instance. */
  key?: string;
}

interface FocusedNavigationRoute {
  name?: string;
  key?: string;
  state?: FocusedNavigationState;
}

interface FocusedNavigationState {
  index?: number;
  routes: FocusedNavigationRoute[];
}

/** Last focused route recorded from container state. */
let recordedRoute: FocusedRouteIdentity | undefined;
/** Route name focused before `recordedRoute`. */
let previousRouteName: string | undefined;
/** Screen that opened the route named by `previousRouteName`. */
let earlierRouteName: string | undefined;

const isSameFocusedRoute = (
  left: FocusedRouteIdentity,
  right: FocusedRouteIdentity,
): boolean => {
  if (left.key && right.key) {
    return left.key === right.key;
  }
  return left.name === right.name;
};

/**
 * Leaf of the focused route chain. The source screen is that child, which is
 * the same route deeplink performance treats as current.
 */
export const focusedRouteFromNavigationState = (
  state: FocusedNavigationState | undefined,
): FocusedRouteIdentity | undefined => {
  let current = state;
  let focused: FocusedRouteIdentity | undefined;
  while (current?.routes?.length) {
    const route = current.routes[current.index ?? current.routes.length - 1];
    if (!route?.name) {
      break;
    }
    focused = { name: route.name, key: route.key };
    current = route.state;
  }
  return focused;
};

/**
 * Records the focused route from a navigation commit.
 *
 * The first record keeps that route as the current screen. A later record
 * with a different identity stores the prior name as the previous screen.
 */
export const recordFocusedRoute = (
  route: FocusedRouteIdentity | undefined,
): void => {
  if (!route?.name) {
    return;
  }
  const nextRoute = { name: route.name, key: route.key };
  if (!recordedRoute) {
    recordedRoute = nextRoute;
    return;
  }
  if (isSameFocusedRoute(recordedRoute, nextRoute)) {
    return;
  }
  earlierRouteName = previousRouteName;
  previousRouteName = recordedRoute.name;
  recordedRoute = nextRoute;
};

/**
 * Previous screen for a screen-view event.
 *
 * Destination views emit before the new route is recorded, so a different
 * active route means the last recorded name is the screen just left.
 * A departure event describes that recorded route. Its previous screen is the
 * route that opened it, including after the destination has been recorded.
 */
export const resolvePreviousScreenName = (
  activeRoute: FocusedRouteIdentity | undefined,
  options?: { departure?: boolean },
): string | undefined => {
  if (!recordedRoute || !activeRoute?.name) {
    return undefined;
  }
  if (!isSameFocusedRoute(recordedRoute, activeRoute)) {
    return options?.departure ? previousRouteName : recordedRoute.name;
  }
  if (options?.departure) {
    return earlierRouteName;
  }
  return previousRouteName;
};

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

interface AttributableEvent {
  name: string;
  properties: Record<string, unknown>;
}

const cloneEvent = <T extends AttributableEvent>(event: T): T =>
  Object.create(
    Object.getPrototypeOf(event),
    Object.getOwnPropertyDescriptors(event),
  ) as T;

const isDepartureScreenEvent = (properties: Record<string, unknown>): boolean =>
  properties.interaction_type === 'session_summary';

const attachPreviousScreen = <T extends AttributableEvent>(
  event: T,
  route: Route<string> | undefined,
): T => {
  if (!SCREEN_VIEW_EVENT_NAMES.has(event.name)) {
    return event;
  }
  if (event.properties.previous_screen !== undefined) {
    return event;
  }

  const previousScreen = resolvePreviousScreenName(route, {
    departure: isDepartureScreenEvent(event.properties),
  });
  if (previousScreen === undefined) {
    return event;
  }

  const clonedEvent = cloneEvent(event);
  clonedEvent.properties = {
    ...event.properties,
    previous_screen: previousScreen,
  };
  return clonedEvent;
};

const attachDelegatedAttribution = <T extends AttributableEvent>(
  event: T,
  route: Route<string> | undefined,
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

  const clonedEvent = cloneEvent(event);
  clonedEvent.properties = {
    ...event.properties,
    [mapping.property]: analyticsContext.attribution,
  };
  return clonedEvent;
};

export const enrichWithNavigationAttribution = <T extends AttributableEvent>(
  event: T,
  route: Route<string> | undefined = getCurrentRoute(),
): T => attachDelegatedAttribution(attachPreviousScreen(event, route), route);

export const resetNavigationAnalyticsAttributionForTests = () => {
  consumedAttributions.clear();
  contextSequence = 0;
  recordedRoute = undefined;
  previousRouteName = undefined;
  earlierRouteName = undefined;
};
