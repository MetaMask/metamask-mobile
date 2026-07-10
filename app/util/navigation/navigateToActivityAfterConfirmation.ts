import {
  StackActions,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';

// Only the navigation methods this helper needs. Using Pick avoids coupling to
// the caller's exact NavigationProp variant (hooks override `getState`, class
// props differ, etc.).
type ActivityRedirectNavigation = Pick<
  NavigationProp<ParamListBase>,
  'navigate' | 'getParent'
>;

/**
 * Redirects to the Activity screen after a transaction is submitted, dropping
 * the now-consumed confirmation from the back stack so "back" from Activity does
 * not land on the stale confirmation (whose approval was consumed via
 * `deleteAfterResult`, so revisiting it renders an infinite loader).
 *
 * The confirmation always lives in a nested stack that is a direct child of the
 * root navigator (the flow stack: Send, StakeScreens, EarnScreens…). Replacing
 * that whole stack with Activity, in one `StackActions.replace`, is a single
 * clean transition — no pop-then-push double animation, no half-finished pop
 * flashing on back. Native-stack can't cleanly remove a nested confirmation while
 * keeping its sibling build screen AND push a root-level Activity in one move, so
 * we replace the stack instead. What "back" lands on then depends on the flow's
 * shape:
 *
 * Same stack as the build screen (send, staking): the whole flow stack is
 * replaced, so "back" returns to Wallet home.
 *
 * Sole screen of its own root-sibling stack (lending): only the confirmation's
 * stack is replaced; its input screen lives in a sibling stack that survives, so
 * "back" returns to that input screen.
 *
 * Falls back to a plain `navigate` when the parent tree can't be resolved. See the
 * real-navigator integration tests in `navigateToActivityAfterConfirmation.test.tsx`.
 *
 * @param navigation - The confirmation screen's navigation object.
 */
export function navigateToActivityAfterConfirmation(
  navigation: ActivityRedirectNavigation,
): void {
  const rootNavigation = navigation.getParent?.();

  if (!rootNavigation) {
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
    return;
  }

  rootNavigation.dispatch(StackActions.replace(Routes.TRANSACTIONS_VIEW));
}
