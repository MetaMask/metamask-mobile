/* eslint-disable @typescript-eslint/ban-types */
import { useCallback, useMemo } from 'react';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation as useNavigationNative,
  useRoute,
} from '@react-navigation/native';
import type { RootParamList } from '../../types/navigation.d';

/**
 * @deprecated Use direct navigation with RootParamList types instead.
 */
export type NavigationDetails<
  T extends object | undefined = object | undefined,
> = readonly [string, T];

/**
 * Navigate options for v7 compatibility
 */
interface NavigateOptions {
  name: string;
  params?: object;
  pop?: boolean;
}

/**
 * Custom useNavigation hook that returns a properly typed navigation object.
 * This is needed for React Navigation v7 where:
 * 1. useNavigation() requires explicit type parameters for navigate() to work
 * 2. navigate() no longer goes back to existing screens by default (requires pop: true)
 *
 * This hook wraps navigate() to add pop: true by default, restoring v6 behavior
 * where navigating to an existing screen goes back to it instead of pushing a new one.
 *
 * @example
 * ```typescript
 * const navigation = useNavigation();
 *
 * // These now go back to existing screens (v6 behavior):
 * navigation.navigate('WalletView');
 * navigation.navigate('Asset', { address: '0x...' });
 *
 * // To explicitly push a new screen (v7 behavior):
 * navigation.navigate({ name: 'Asset', params: { address: '0x...' }, pop: false });
 * ```
 */
export const useNavigation = <
  T extends ParamListBase = RootParamList,
>(): NavigationProp<T> => {
  const navigation = useNavigationNative<NavigationProp<T>>();

  const wrappedNavigate = useCallback(
    (nameOrOptions: string | NavigateOptions, params?: object) => {
      if (typeof nameOrOptions === 'string') {
        // String form: navigate('ScreenName', params)
        // Convert to object form with pop: true
        return (navigation.navigate as Function)({
          name: nameOrOptions,
          params,
          pop: true,
        });
      }
      // Object form: navigate({ name, params, pop })
      // Add pop: true if not explicitly set
      return (navigation.navigate as Function)({
        ...nameOrOptions,
        pop: nameOrOptions.pop ?? true,
      });
    },
    [navigation],
  );

  // Return navigation with wrapped navigate
  return useMemo(
    () =>
      ({
        ...navigation,
        navigate: wrappedNavigate,
      }) as unknown as NavigationProp<T>,
    [navigation, wrappedNavigate],
  );
};

/**
 * @deprecated Use direct navigation instead for full type safety with RootParamList:
 *
 * ```typescript
 * // Instead of:
 * const goToScreen = createNavigationDetails<MyParams>(Routes.SCREEN);
 * navigation.navigate(...goToScreen({ id: '123' }));
 *
 * // Use:
 * navigation.navigate(Routes.SCREEN, { id: '123' });
 * ```
 *
 * Direct navigation provides:
 * - Route name validation against RootParamList
 * - Params validation against RootParamList[RouteName]
 * - No type assertions needed
 *
 * For nested navigation:
 * ```typescript
 * navigation.navigate(Routes.MODAL.ROOT, {
 *   screen: Routes.MODAL.SCREEN,
 *   params: { id: '123' }
 * });
 * ```
 */
export function createNavigationDetails<
  T extends object | undefined = object | undefined,
>(name: string, screen?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (params?: T): [any, any] => {
    const result = screen ? { screen, params } : params;
    return [name, result];
  };
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
