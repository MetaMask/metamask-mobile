import {
  CommonActions,
  StackActions,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';

// The navigation methods this helper needs (Pick avoids coupling to the caller's
// exact NavigationProp variant).
type ActivityRedirectNavigation = Pick<
  NavigationProp<ParamListBase>,
  'navigate' | 'getParent'
>;

/**
 * Redirects to Activity after a transaction, replacing the confirmation's flow
 * stack so "back" never lands on the consumed confirmation (which renders an
 * infinite loader). One `StackActions.replace` keeps it to a single clean
 * transition.
 *
 * Back destination depends on the flow's stack shape: send/staking replace the
 * whole flow stack (→ Wallet home); lending replaces only its own stack, whose
 * input screen survives in a sibling stack (→ input screen).
 *
 * @param navigation - The confirmation screen's navigation object.
 */
export function navigateToActivityAfterConfirmation(
  navigation: ActivityRedirectNavigation,
): void {
  const rootNavigation = navigation.getParent?.();

  // `replace` only resolves when Activity is a root-stack screen (Money-account
  // enabled — the case with the bug). Otherwise fall back to plain `navigate`.
  const rootState = rootNavigation?.getState();
  if (
    !rootNavigation ||
    !rootState?.routeNames.includes(Routes.TRANSACTIONS_VIEW)
  ) {
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
    return;
  }

  const currentRoute = rootState.routes?.[rootState.index];
  const previousRoute = rootState.routes?.[rootState.index - 1];

  // NFT details is a root-level route, so replacing Send alone leaves the
  // consumed NFT underneath Activity. Remove both routes from the stack.
  if (
    currentRoute?.name === Routes.SEND.DEFAULT &&
    previousRoute?.name === Routes.NFT_DETAILS
  ) {
    rootNavigation.dispatch(
      CommonActions.reset({
        ...rootState,
        index: rootState.index - 1,
        routes: [
          ...rootState.routes.slice(0, rootState.index - 1),
          {
            key: `${rootState.key}-${Routes.TRANSACTIONS_VIEW}`,
            name: Routes.TRANSACTIONS_VIEW,
          },
        ],
      }),
    );
    return;
  }

  rootNavigation.dispatch(StackActions.replace(Routes.TRANSACTIONS_VIEW));
}
