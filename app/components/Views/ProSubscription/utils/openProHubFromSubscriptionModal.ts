import { CommonActions, type NavigationState } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

/**
 * Join MetaMask Orange is a full-screen modal. Replacing that route with
 * Pro Hub only dismisses the modal on iOS, so Continue never shows the hub.
 * Remove the modal and place Pro Hub on the card stack underneath it.
 *
 * @param state - App stack state while the subscription modal is open.
 * @returns A reset action whose top route is Pro Hub.
 */
export function openProHubFromSubscriptionModal(state: NavigationState) {
  const routes = [
    ...state.routes.filter(
      (route) => route.name !== Routes.PRO_SUBSCRIPTION.ROOT,
    ),
    { name: Routes.PRO_HUB.ROOT },
  ];

  return CommonActions.reset({
    ...state,
    routes,
    index: routes.length - 1,
  });
}
