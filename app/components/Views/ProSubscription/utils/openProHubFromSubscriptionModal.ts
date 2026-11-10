import { CommonActions, type NavigationState } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

const PRO_HUB_ROUTE_NAMES = new Set<string>(Object.values(Routes.PRO_HUB));

/**
 * Join MetaMask Orange is a full-screen modal. Replacing that route with
 * Pro Hub only dismisses the modal on iOS, so Continue never shows the hub.
 * Remove the modal and any Pro Hub screens already underneath it, then place
 * one Pro Hub on the card stack. Checkout opened from Pro Hub must not leave
 * a second hub for Back to return to.
 *
 * @param state - App stack state while the subscription modal is open.
 * @returns A reset action whose top route is Pro Hub.
 */
export function openProHubFromSubscriptionModal(state: NavigationState) {
  const routes = [
    ...state.routes.filter(
      (route) =>
        route.name !== Routes.PRO_SUBSCRIPTION.ROOT &&
        !PRO_HUB_ROUTE_NAMES.has(route.name),
    ),
    { name: Routes.PRO_HUB.ROOT },
  ];

  return CommonActions.reset({
    ...state,
    routes,
    index: routes.length - 1,
  });
}
