import {
  StackActions,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';

/**
 * Minimal navigation surface this helper needs. `getState`/`getParent` are
 * optional (and loosely typed) so it accepts the hook, class-prop, and
 * NavigationService variants — some of which type `getState()` as returning
 * `undefined`. Missing methods just fall through to the plain-navigate fallback.
 */
interface NavigationLike {
  navigate: NavigationProp<ParamListBase>['navigate'];
  dispatch: NavigationProp<ParamListBase>['dispatch'];
  getState?: () => { type?: string; routeNames?: string[] } | undefined;
  getParent?: () => NavigationLike | undefined;
}

/**
 * Navigates to the Activity/Transactions view after a transaction is submitted
 * from a confirmation flow, replacing the flow screen instead of pushing on top
 * of it — so "back" from Activity goes to the wallet, not back into the completed
 * (and now unusable) flow.
 *
 * The navigator that owns `TRANSACTIONS_VIEW` differs by flow (a parent navigator
 * for the stake/earn stacks; the same navigator for the redesigned
 * confirmations), so we walk up to the nearest stack navigator that has it
 * registered and replace its current route there. Falls back to a plain navigate
 * if none is found.
 */
export function replaceWithTransactionsView(navigation: NavigationLike): void {
  let current: NavigationLike | undefined = navigation;

  while (current) {
    const state = current.getState?.();

    if (
      state?.type === 'stack' &&
      state.routeNames?.includes(Routes.TRANSACTIONS_VIEW)
    ) {
      current.dispatch(StackActions.replace(Routes.TRANSACTIONS_VIEW));
      return;
    }

    current = current.getParent?.();
  }

  // No stack navigator owns TRANSACTIONS_VIEW in this tree — fall back so we at
  // least land on Activity rather than doing nothing.
  navigation.navigate(Routes.TRANSACTIONS_VIEW);
}
