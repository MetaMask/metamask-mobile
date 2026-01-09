/* eslint-disable @typescript-eslint/ban-types */
import { useMemo } from 'react';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation as useNavigationNative,
  useRoute,
} from '@react-navigation/native';

type NavigationParams = object | undefined;

export type NavigationDetails<T extends NavigationParams = NavigationParams> =
  readonly [string, T];

/**
 * Custom useNavigation hook that returns a properly typed navigation object.
 * This is needed for React Navigation v7 where useNavigation() requires
 * explicit type parameters for navigate() to work.
 */
export const useNavigation = <
  T extends ParamListBase = ParamListBase,
>(): NavigationProp<T> => useNavigationNative<NavigationProp<T>>();

export const createNavigationDetails =
  <T extends NavigationParams>(name: string, screen?: string) =>
  (params?: T) =>
    [name, screen ? { screen, params } : params] as const;

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
