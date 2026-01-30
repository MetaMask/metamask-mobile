/* eslint-disable @typescript-eslint/ban-types */
import { useMemo } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';

// Re-export navigation types for convenience
export type {
  RootParamList,
  NavigatableRootParamList,
  RootNavigationProp,
} from './types';
// Import to ensure global declarations are included
import type { RootParamList } from './types';

/**
 * Type-safe navigation details tuple.
 * RouteName is validated against RootParamList keys.
 * Params are inferred from RootParamList[RouteName].
 */
export type NavigationDetails<
  RouteName extends keyof RootParamList = keyof RootParamList,
> = readonly [RouteName, RootParamList[RouteName]];

/**
 * Creates a type-safe navigation details factory.
 * Supports both single-level and nested navigation.
 *
 * @example Single-level navigation:
 * const navDetails = createNavigationDetails(Routes.ACCOUNT_SELECTOR);
 * navigation.navigate(...navDetails({ onSelectAccount }));
 *
 * @example Nested navigation:
 * const navDetails = createNavigationDetails<'CardModals', { regions: Region[] }>(
 *   Routes.CARD.MODALS.ID,
 *   Routes.CARD.MODALS.REGION_SELECTION,
 * );
 * navigation.navigate(...navDetails({ regions }));
 */
// Overload 1: Single-level navigation (no screen argument)
export function createNavigationDetails<RouteName extends keyof RootParamList>(
  name: RouteName,
): (params?: RootParamList[RouteName]) => NavigationDetails<RouteName>;

// Overload 2: Nested navigation (with screen argument)
export function createNavigationDetails<
  RouteName extends keyof RootParamList,
  InnerParams extends object = object,
>(
  name: RouteName,
  screen: string,
): (params?: InnerParams) => NavigationDetails<RouteName>;

// Implementation
export function createNavigationDetails<
  RouteName extends keyof RootParamList,
  InnerParams extends object = object,
>(name: RouteName, screen?: string) {
  return (
    params?: RootParamList[RouteName] | InnerParams,
  ): NavigationDetails<RouteName> => [
    name,
    (screen ? { screen, params } : params) as RootParamList[RouteName],
  ];
}

/**
 * Type-safe navigation using createNavigationDetails tuples.
 * Use this instead of navigation.navigate(...details) to avoid TS2345 errors.
 */
export const navigateToRoute = <RouteName extends keyof RootParamList>(
  navigation: {
    navigate: (screen: keyof RootParamList, params?: object) => void;
  },
  details: NavigationDetails<RouteName>,
) => {
  navigation.navigate(details[0], details[1] as object);
};

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
