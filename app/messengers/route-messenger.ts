import { Messenger } from '@metamask/messenger';
import type { UIMessengerActions, UIMessengerEvents } from './ui-messenger';
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
 * Create a messenger for a route.
 *
 * This is used when defining routes (that is, each route gets its own
 * messenger). Delegation of actions and events is handled separately by the
 * caller (typically via `RouteWithMessenger`).
 *
 * @param args - Arguments for this function.
 * @param args.path - The path of the route. This is used for debugging purposes
 * and to ensure that the route messenger's namespace is unique across routes.
 * @returns A messenger for the route.
 */
export function createRouteMessenger<
  ActionTypes extends UIMessengerActions['type'],
  EventTypes extends UIMessengerEvents['type'],
>({ path }: { path: string }): RouteMessenger<ActionTypes, EventTypes> {
  return new Messenger<`${string}Route`, UIMessengerActions, UIMessengerEvents>(
    {
      namespace: getRouteMessengerNamespace(path),
      captureException,
    },
  );
}
