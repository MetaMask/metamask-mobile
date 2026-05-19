import { Messenger } from '@metamask/messenger';
import type {
  UIMessenger,
  UIMessengerActions,
  UIMessengerEvents,
} from './ui-messenger';
import { captureException } from '@sentry/react-native';

/**
 * Helper type to derive a route messenger type from a capabilities object.
 */
export type RouteMessengerFromCapabilities<
  CapabilitiesType extends {
    actions?: UIMessengerActions['type'][];
    events?: UIMessengerEvents['type'][];
  },
> = RouteMessenger<
  CapabilitiesType extends { actions: (infer ActionTypes)[] }
    ? ActionTypes
    : never,
  CapabilitiesType extends { events: (infer EventTypes)[] } ? EventTypes : never
>;

/**
 * A messenger that represents a route.
 *
 * This type is intentionally generic (a bit unusual for messenger "instance"
 * types) because each route gets its own messenger (the "route messenger" isn't
 * a singleton as is the case for controllers and services).
 */
export type RouteMessenger<
  ActionTypes extends UIMessengerActions['type'] = UIMessengerActions['type'],
  EventTypes extends UIMessengerEvents['type'] = UIMessengerEvents['type'],
> = Messenger<
  `${string}Route`,
  Extract<UIMessengerActions, { type: ActionTypes }>,
  Extract<UIMessengerEvents, { type: EventTypes }>
>;

/**
 * Derive a route messenger namespace from a route path. Assumes the path is
 * already formatted as PascalCase (e.g. 'SomePath' rather than '/some/path').
 *
 * @example
 * ```typescript
 * getRouteMessengerNamespace('SomePath'); // 'SomePathRoute'
 * getRouteMessengerNamespace('AnotherExample'); // 'AnotherExampleRoute'
 * getRouteMessengerNamespace(''); // 'Route'
 * ```
 * @param path - The route path to derive the namespace from.
 * @returns A namespace string derived from the route path.
 */
export function getRouteMessengerNamespace(
  path: string = '',
): `${string}Route` {
  return `${path}Route`;
}

/**
 * Derive a messenger for a route from the UI messenger.
 *
 * This is used when defining routes (that is, each route gets its own
 * messenger).
 *
 * @param args - Arguments for this function.
 * @param args.path - The path of the route. This is used for debugging purposes
 * and to ensure that the route messenger's namespace is unique across routes.
 * @param args.uiMessenger - The parent UI messenger.
 * @param args.capabilities - Capabilities to delegate from the UI messenger.
 * @param args.capabilities.actions - Action types to delegate from the UI
 * messenger.
 * @param args.capabilities.events - Event types to delegate from the UI
 * messenger.
 * @returns A messenger with access to the specified actions and events.
 */
export function createRouteMessenger<
  ActionTypes extends UIMessengerActions['type'],
  EventTypes extends UIMessengerEvents['type'],
>({
  path,
  uiMessenger,
  capabilities: { actions = [], events = [] },
}: {
  path: string;
  uiMessenger: UIMessenger;
  capabilities: {
    actions?: ActionTypes[];
    events?: EventTypes[];
  };
}): RouteMessenger<ActionTypes, EventTypes> {
  const routeMessenger = new Messenger<
    `${string}Route`,
    UIMessengerActions,
    UIMessengerEvents
  >({
    namespace: getRouteMessengerNamespace(path),
    captureException,
  });

  if (actions.length === 0 && events.length === 0) {
    throw new Error('There are no actions or events to delegate.');
  }

  uiMessenger
    .delegate({
      messenger: routeMessenger,
      actions,
      events,
    })
    .catch((error) => {
      // Delegation should never fail, but if it does, we should at least
      // capture the error so that it can be investigated and fixed.
      captureException(error);
    });

  return routeMessenger;
}
