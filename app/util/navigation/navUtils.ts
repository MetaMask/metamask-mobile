/* eslint-disable @typescript-eslint/ban-types */
import { useMemo } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';

type NavigationParams = object | undefined;

export type NavigationDetails<T extends NavigationParams = NavigationParams> =
  readonly [string, T];

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
