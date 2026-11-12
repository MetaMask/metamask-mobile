import type { NavigationState, PartialState } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';

type RouteState = NavigationState | PartialState<NavigationState>;

// NavigationProvider's internal wrapper, not a user-facing destination.
const NAVIGATION_CHILDREN_ROUTE = 'NavigationChildren';
const topRouteOf = (
  state: RouteState | undefined,
): RouteState['routes'][number] | undefined =>
  state?.routes[state.index ?? state.routes.length - 1];

const appNavigatorState = (
  root: RouteState | undefined,
): RouteState | undefined => {
  const top = topRouteOf(root);
  return top?.name === NAVIGATION_CHILDREN_ROUTE ? top.state : root;
};

const isUnstacked = (state: RouteState | undefined): boolean => {
  let current = state;
  while (current) {
    if (current.routes.length > 1) {
      return false;
    }
    current = current.routes[0]?.state;
  }
  return true;
};

/**
 * HomeNav and its home tabs are focused, the selected tab is not the trade
 * trigger, and nothing is pushed onto the selected tab's stack. Kept structural
 * so new pushed destinations block home prompts without a destination list.
 */
export const isHomeUnobstructedState = (
  root: RouteState | undefined,
): boolean => {
  const homeNav = topRouteOf(appNavigatorState(root));
  if (homeNav?.name !== Routes.ONBOARDING.HOME_NAV) {
    return false;
  }
  const homeTabs = topRouteOf(homeNav.state);
  if (homeTabs?.name !== Routes.HOME_TABS) {
    return false;
  }
  const focusedTab = topRouteOf(homeTabs.state);
  return Boolean(
    focusedTab &&
      focusedTab.name !== Routes.MODAL.TRADE_WALLET_ACTIONS &&
      isUnstacked(focusedTab.state),
  );
};
