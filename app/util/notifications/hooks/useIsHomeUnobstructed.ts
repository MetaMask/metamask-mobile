import { useEffect, useState } from 'react';
import type { NavigationState, PartialState } from '@react-navigation/native';
import NavigationService from '../../../core/NavigationService';
import Routes from '../../../constants/navigation/Routes';

type RouteState = NavigationState | PartialState<NavigationState>;

const topRouteOf = (state: RouteState | undefined) =>
  state?.routes[state.index ?? state.routes.length - 1];

/**
 * True when the focused stack, and every stack under the focused tab, holds a
 * single screen: nothing has been pushed on top of the tab.
 */
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
 * Whether home is the focused screen with nothing presented over it.
 *
 * The check is structural, not a list of destinations, so a screen added after
 * onboarding blocks the prompt without a change here:
 * - the home stack (`HomeNav`) is the top of the root stack
 * - the home tabs are the top of the main stack, so no pushed screen sits above them
 * - the focused tab is not the trade tab (the tray hosted in the tab bar)
 * - nothing is pushed onto the focused tab's own stack
 */
export const isHomeUnobstructedState = (
  root: RouteState | undefined,
): boolean => {
  const homeNav = topRouteOf(root);
  if (homeNav?.name !== Routes.ONBOARDING.HOME_NAV) {
    return false;
  }

  const homeTabs = topRouteOf(homeNav.state);
  if (homeTabs?.name !== Routes.HOME_TABS) {
    return false;
  }

  const focusedTab = topRouteOf(homeTabs.state);
  if (!focusedTab || focusedTab.name === Routes.MODAL.TRADE_WALLET_ACTIONS) {
    return false;
  }

  return isUnstacked(focusedTab.state);
};

/**
 * Tracks whether home is unobstructed, re-evaluated on every navigation state
 * change. Only re-renders when that boolean changes.
 */
export const useIsHomeUnobstructed = (): boolean => {
  const [isUnobstructed, setIsUnobstructed] = useState(() =>
    isHomeUnobstructedState(NavigationService.navigation.getRootState()),
  );

  useEffect(() => {
    const { navigation } = NavigationService;
    // The state may have changed between the initial render and subscribing.
    setIsUnobstructed(isHomeUnobstructedState(navigation.getRootState()));
    return navigation.addListener('state', ({ data: { state } }) => {
      setIsUnobstructed(isHomeUnobstructedState(state));
    });
  }, []);

  return isUnobstructed;
};
