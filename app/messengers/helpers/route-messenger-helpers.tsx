import React, { ComponentType, FunctionComponent } from 'react';
import { UIMessengerActions, UIMessengerEvents } from '../ui-messenger';
import { RouteWithMessenger } from '../route-with-messenger';
import {
  NavigationProp,
  EventMapBase,
  RouteProp,
  ParamListBase,
  NavigationState,
} from '@react-navigation/native';

/**
 * Validate that each element of a tuple is a member of the given union,
 * producing a type error for elements that aren't.
 */
export type ValidateElements<
  Elements extends readonly string[],
  AllowedElements extends string,
> = {
  [K in keyof Elements]: Elements[K] extends AllowedElements
    ? Elements[K]
    : AllowedElements;
};

/**
 * Helper function to define the allowed capabilities for a route messenger.
 * This is primarily a type-level helper to ensure that the allowed capabilities
 * are valid UI messenger capabilities and to get better type inference for the
 * allowed capabilities.
 *
 * @param capabilities - The capabilities to allow, which must be valid action
 * and event types for the `UIMessenger`.
 * @param capabilities.actions - The action types to allow, which must be
 * valid action types for the `UIMessenger`.
 * @param capabilities.events - The event types to allow, which must be valid
 * event types for the `UIMessenger`.
 * @returns The given capabilities, typed as the specific action and event types
 * that were allowed.
 */
export function defineAllowedRouteCapabilities<
  const ActionTypes extends string[],
  const EventTypes extends string[],
>(capabilities: {
  actions: ValidateElements<ActionTypes, UIMessengerActions['type']>;
  events: ValidateElements<EventTypes, UIMessengerEvents['type']>;
}): { actions: ActionTypes; events: EventTypes } {
  return capabilities as { actions: ActionTypes; events: EventTypes };
}

interface WithMessengerOptions {
  capabilities: {
    actions?: UIMessengerActions['type'][];
    events?: UIMessengerEvents['type'][];
  };
}

interface RouteProps<
  ParamList extends ParamListBase,
  RouteName extends keyof ParamList,
  NavigatorID extends string | undefined = undefined,
  State extends NavigationState = NavigationState<ParamList>,
  ScreenOptions extends {} = {},
  EventMap extends EventMapBase = {},
> {
  route: RouteProp<ParamList, RouteName>;
  navigation: NavigationProp<
    ParamList,
    RouteName,
    NavigatorID,
    State,
    ScreenOptions,
    EventMap
  >;
}

/**
 * Create a route object with a {@link RouteWithMessenger} element that provides
 * a route messenger with the specified capabilities.
 *
 * @param Component - The component to render for this route. This will be
 * wrapped in a {@link RouteWithMessenger} component that provides the route
 * messenger.
 * @param options - Options bag.
 * @param options.capabilities - Capabilities to delegate from the UI messenger
 * to the route messenger.
 */
export function withMessenger<
  ParamList extends ParamListBase,
  RouteName extends keyof ParamList,
  NavigatorID extends string | undefined = undefined,
  State extends NavigationState = NavigationState<ParamList>,
  ScreenOptions extends {} = {},
  EventMap extends EventMapBase = {},
>(
  Component: ComponentType<
    RouteProps<
      ParamList,
      RouteName,
      NavigatorID,
      State,
      ScreenOptions,
      EventMap
    >
  >,
  { capabilities }: WithMessengerOptions,
): FunctionComponent<
  RouteProps<ParamList, RouteName, NavigatorID, State, ScreenOptions, EventMap>
> {
  return function RouteWithMessengerElement(
    props: RouteProps<
      ParamList,
      RouteName,
      NavigatorID,
      State,
      ScreenOptions,
      EventMap
    >,
  ) {
    return (
      <RouteWithMessenger path={props.route.name} capabilities={capabilities}>
        <Component {...props} />
      </RouteWithMessenger>
    );
  };
}
