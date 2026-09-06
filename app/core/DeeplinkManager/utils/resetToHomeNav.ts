import Routes from '../../../constants/navigation/Routes';
import NavigationService from '../../NavigationService';

/**
 * The parts of a React Navigation route that the startup deeplink path sets
 * when it builds navigation state by hand.
 */
export interface NavigationRoute {
  name: string;
  params?: object;
  state?: NavigationBranchState;
}

export interface NavigationBranchState {
  index?: number;
  routes: NavigationRoute[];
}

/**
 * Builds the reset payload that mounts `mainNavigatorState` where the app's
 * screens live, under the navigators between it and the container.
 *
 * A startup deeplink cannot navigate: it runs before `HomeNav` is on screen,
 * so there is no mounted tree to navigate into and it has to name the
 * intervening navigators itself.
 *
 * This is the only place in production that spells that path out. A second
 * copy elsewhere would be the dangerous kind of stale: React Navigation drops
 * a level it does not recognise rather than throwing, so the deeplink would
 * quietly land on the wrong screen.
 */
export const buildHomeNavResetState = (
  mainNavigatorState: NavigationBranchState,
): { routes: NavigationRoute[] } => ({
  routes: [
    {
      name: Routes.ONBOARDING.HOME_NAV,
      state: mainNavigatorState,
    },
  ],
});

/**
 * Replaces the navigation state so the app's screens are `mainNavigatorState`,
 * with the deeplink target already focused rather than reached by navigating
 * to it after Wallet has rendered.
 */
export const resetToHomeNav = (
  mainNavigatorState: NavigationBranchState,
): void => {
  NavigationService.navigation.reset(
    buildHomeNavResetState(mainNavigatorState),
  );
};
