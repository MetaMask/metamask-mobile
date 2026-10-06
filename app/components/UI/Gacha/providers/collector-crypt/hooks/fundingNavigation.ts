import type { NavigationState, PartialState } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';

/** Only the foreground Gacha flow and its Quick Buy settings retain an intent. */
export const isGachaFundingRoute = (
  state: NavigationState | PartialState<NavigationState>,
): boolean => {
  const route = state.routes[state.index ?? 0];
  if (!route) return false;
  if (
    Object.values(Routes.GACHA).some((name) => name === route.name) ||
    route.name === Routes.BRIDGE.MODALS.ROOT
  ) {
    return true;
  }
  return route.state ? isGachaFundingRoute(route.state) : false;
};
