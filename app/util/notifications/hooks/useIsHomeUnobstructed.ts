import { useEffect, useState } from 'react';
import {
  useNavigation,
  type NavigationState,
  type PartialState,
} from '@react-navigation/native';
import { NAVIGATION_CHILDREN_ROUTE } from '../../../components/Nav/NavigationProvider/constants';
import Routes from '../../../constants/navigation/Routes';

type RouteState = NavigationState | PartialState<NavigationState>;

const topRouteOf = (state: RouteState | undefined) =>
  state?.routes[state.index ?? state.routes.length - 1];

/**
 * The navigator the app actually renders. When the root is the
 * NavigationChildren wrapper, that navigator is its nested state.
 */
const appNavigatorState = (
  root: RouteState | undefined,
): RouteState | undefined => {
  const top = topRouteOf(root);
  if (top?.name === NAVIGATION_CHILDREN_ROUTE) {
    return top.state;
  }
  return root;
};

/** A stack (and every stack nested inside its only route) has a single route. */
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
 * - the home stack (`HomeNav`) is the top of the app navigator
 * - the home tabs are the top of the main stack, so no pushed screen sits above them
 * - the focused tab is not the trade tab (the tray hosted in the tab bar)
 * - nothing is pushed onto the focused tab's own stack
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
  const navigation = useNavigation();
  const [isUnobstructed, setIsUnobstructed] = useState(() =>
    isHomeUnobstructedState(navigation.getRootState()),
  );

  useEffect(() => {
    const apply = () => {
      setIsUnobstructed(isHomeUnobstructedState(navigation.getRootState()));
    };
    // The state may have changed between the initial render and subscribing.
    apply();
    // The event's state drops the innermost route, so the listener reads the
    // hydrated root instead.
    return navigation.addListener('state', apply);
  }, [navigation]);

  return isUnobstructed;
};
