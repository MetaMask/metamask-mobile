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
 * Navigate using a `createNavigationDetails` tuple under strict
 * `AppNavigationProp` typing. Route names from those helpers are typed as
 * `string`, which is incompatible with strict `navigate` overloads — same
 * cast pattern used by Card Phase 4 call sites.
 */
export function navigateWithDetails(
  navigation: { navigate: (...args: never[]) => void },
  details: NavigationDetails,
): void {
  (navigation.navigate as unknown as (...args: NavigationDetails) => void)(
    ...details,
  );
}

/**
 * `navigation.reset` under strict `AppNavigationProp` requires route `name`
 * to be `keyof RootStackParamList`. Ramp helpers often build `{ name: string }`
 * entries (dynamic base routes, order-details callbacks) — cast once here.
 */
export function resetWithRoutes(
  navigation: {
    reset: (state: never) => void;
  },
  state: {
    index: number;
    routes: readonly { name: string; params?: object }[];
  },
): void {
  navigation.reset(state as never);
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
