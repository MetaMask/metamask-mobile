import { useMemo } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';

type NavigationParams = object | undefined;

export type NavigationDetails<T extends NavigationParams = NavigationParams> =
  | readonly [string]
  | readonly [string, T];

export const createNavigationDetails =
  <T extends NavigationParams>(name: string, screen?: string) =>
  (params?: T) =>
    [name, screen ? { screen, params } : params] as const;

/**
 * Type-checking escape hatch for `navigation.navigate(...)`.
 *
 * ⚠️ USE SPARINGLY. This intentionally bypasses the strict `AppNavigationProp`
 * type checking — neither the route name nor the params are validated. Only use
 * it for the small number of call sites where the destination route name is a
 * runtime `string` that TypeScript cannot know at compile time, e.g.
 * `createNavigationDetails(...)` tuples whose route name is typed as `string`, a
 * route name read from live navigation state or modal/deeplink params, or a
 * cross-navigator jump into another feature's stack whose nested param list is
 * owned/typed elsewhere.
 *
 * For a normal, statically-known destination, DO NOT use this — call
 * `navigation.navigate('SomeRoute', params)` directly so the compiler can catch
 * typos and wrong params.
 *
 * The unsafe cast is centralized here (instead of inline `as never` at each
 * site) so every unchecked navigation is greppable via `navigateWithDetails`.
 */
export function navigateWithDetails(
  navigation: { navigate: (...args: never[]) => void },
  details: NavigationDetails,
): void {
  (navigation.navigate as unknown as (...args: NavigationDetails) => void)(
    ...details,
  );
}

type RouteParams<T extends object> = RouteProp<{ route: T }, 'route'>;
export const useParams = <
  T extends object | undefined,
  Strict extends boolean = false,
>(
  defaults?: Partial<T>,
) => {
  const route = useRoute<RouteParams<{ params: T }>>();
  const navParams = route.params;
  const params = useMemo(
    () => ({ ...defaults, ...navParams }),
    [defaults, navParams],
  );
  return params as Strict extends false ? T : Partial<T>;
};
