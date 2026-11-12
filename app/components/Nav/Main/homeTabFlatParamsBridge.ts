import { useEffect, useMemo, useRef } from 'react';
import type {
  NavigationProp,
  ParamListBase,
  Route,
  RouteProp,
} from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import type {
  BrowserTabHomeRouteParams,
  WalletTabHomeRouteParams,
} from './types/navigation';
interface NestedScreenHomeTabParams {
  screen: string;
  params?: object;
  initial?: boolean;
  merge?: boolean;
  path?: string;
  pop?: boolean;
}
interface NestedStateHomeTabParams {
  state: object | undefined;
  path?: string;
}
type NestedHomeTabParams = NestedScreenHomeTabParams | NestedStateHomeTabParams;
type HomeTabTargetChild =
  | typeof Routes.WALLET_VIEW
  | typeof Routes.BROWSER_VIEW;
interface HomeTabFlatParamsBridgeOptions {
  route: RouteProp<ParamListBase, string>;
  navigation: NavigationProp<ParamListBase>;
  targetChild: HomeTabTargetChild;
}
interface HomeTabFlatParamsBridgeResult {
  normalizedRoute: Route<string>;
  sourceRoute: Route<string>;
}
/**
 * Replaces consumed host params when the parent tab route is Wallet home.
 */
export const replaceWalletHomeParentParams = (
  navigation: NavigationProp<ParamListBase>,
): void => {
  const parentNavigation = navigation.getParent?.();
  const parentState = parentNavigation?.getState();
  const activeParentRoute = parentState?.routes[parentState.index];
  if (activeParentRoute?.name === Routes.WALLET.HOME) {
    parentNavigation?.replaceParams({
      screen: Routes.WALLET_VIEW,
      pop: true,
    });
  }
};
const isParamsObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isNestedScreenParams = (
  value: unknown,
): value is NestedScreenHomeTabParams =>
  isParamsObject(value) && typeof value.screen === 'string';
const isNestedStateParams = (
  value: unknown,
): value is NestedStateHomeTabParams =>
  isParamsObject(value) &&
  'state' in value &&
  (value.state === undefined || isParamsObject(value.state));
const isNestedHomeTabParams = (value: unknown): value is NestedHomeTabParams =>
  isNestedScreenParams(value) || isNestedStateParams(value);
const isEmptyHomeTabParams = (value: unknown): boolean =>
  value === undefined ||
  (isParamsObject(value) && Object.keys(value).length === 0);
const normalizeHomeTabParams = (
  params: unknown,
  targetChild: HomeTabTargetChild,
): object => {
  if (isNestedStateParams(params)) {
    return params;
  }
  if (isNestedScreenParams(params)) {
    if (params.screen !== targetChild || params.pop === true) {
      return params;
    }
    return { ...params, pop: true };
  }
  if (isEmptyHomeTabParams(params)) {
    return { screen: targetChild, pop: true };
  }
  return {
    screen: targetChild,
    params,
    pop: true,
  };
};
export const normalizeWalletTabHomeParams = (
  params: WalletTabHomeRouteParams,
): object => {
  if (
    isNestedScreenParams(params) &&
    params.screen === Routes.WALLET.TAB_STACK_FLOW &&
    isNestedHomeTabParams(params.params)
  ) {
    return normalizeHomeTabParams(params.params, Routes.WALLET_VIEW);
  }
  return normalizeHomeTabParams(params, Routes.WALLET_VIEW);
};
export const normalizeBrowserTabHomeParams = (
  params: BrowserTabHomeRouteParams,
): object => normalizeHomeTabParams(params, Routes.BROWSER_VIEW);
/**
 * Supplies normalized params to a retained child navigator during render and
 * persists the same object on its host route after the child consumes it.
 */
export const useHomeTabFlatParamsBridge = ({
  route,
  navigation,
  targetChild,
}: HomeTabFlatParamsBridgeOptions): HomeTabFlatParamsBridgeResult => {
  const sourceRouteRef = useRef<Route<string>>(route);
  const lastNormalizedParamsRef = useRef<unknown>(undefined);
  // The host route echoes normalized params after replaceParams. Retain the
  // initiating route so Browser asset defaults keep that request payload.
  if (route.params !== lastNormalizedParamsRef.current) {
    sourceRouteRef.current = route;
  }
  const normalizedParams = useMemo(
    () =>
      targetChild === Routes.WALLET_VIEW
        ? normalizeWalletTabHomeParams(route.params as WalletTabHomeRouteParams)
        : normalizeBrowserTabHomeParams(
            route.params as BrowserTabHomeRouteParams,
          ),
    [route.params, targetChild],
  );
  const normalizedRoute = useMemo(
    () =>
      route.params === normalizedParams
        ? route
        : { ...route, params: normalizedParams },
    [normalizedParams, route],
  );
  lastNormalizedParamsRef.current = normalizedParams;
  useEffect(() => {
    if (route.params !== normalizedParams) {
      navigation.replaceParams(normalizedParams);
    }
  }, [navigation, normalizedParams, route.params]);
  return {
    normalizedRoute,
    sourceRoute: sourceRouteRef.current,
  };
};
