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

/**
 * Shows the Activity view after a transaction while KEEPING the originating flow
 * in the back stack, so "back" from Activity returns to the flow's input screen
 * (e.g. Swaps' BridgeView, Stake's amount screen) instead of the wallet.
 *
 * `TRANSACTIONS_VIEW` is pushed on the navigator that owns it (a parent of the
 * flow's sub-stack), so the flow sub-stack stays mounted beneath it.
 *
 * For flows whose confirmation is a *separate* screen stacked on top of the
 * input within the same sub-stack (e.g. Stake: `STAKE` → `STAKE_CONFIRMATION`),
 * pass `returnToFlowInput: true` to pop the confirmation off first — so "back"
 * lands on the input and never re-mounts the confirmation, which re-initializes
 * into an infinite spinner (`confirm-component` renders `<Loader/>` when there is
 * no `approvalRequest`). For combined input+confirm flows (e.g. Swaps' single
 * `BridgeView`) omit it: the current screen is already the input.
 *
 * NOTE: because the flow screen stays mounted, callers that need a *fresh* input
 * on return must reset the flow's own state (e.g. Swaps dispatches
 * `resetBridgeTokenInputs`); this helper is navigation-only.
 */
export function showActivityKeepingFlow(
  navigation: NavigationLike,
  options: { returnToFlowInput?: boolean } = {},
): void {
  if (options.returnToFlowInput) {
    navigation.dispatch(StackActions.popToTop());
  }
  navigation.navigate(Routes.TRANSACTIONS_VIEW);
}

/**
 * Post-confirmation navigation for the *shared* redesigned confirmation
 * (`confirm-component`), which serves both the in-app Send flow and
 * dapp-triggered confirmations that reuse the same screen.
 *
 * When the confirmation belongs to the in-app Send flow — detected by its
 * navigator owning the Send input screens (`Routes.SEND.RECIPIENT`) — we keep
 * the flow and pop back to the Send input, so "back" from Activity returns to
 * Send. Otherwise the confirmation was reached directly (e.g. from a dapp) with
 * no safe input beneath it, so we remove it and land on the wallet (never
 * re-mounting the confirmation, which re-initializes into an infinite spinner).
 */
export function showActivityAfterConfirmation(
  navigation: NavigationLike,
): void {
  const isInAppSendFlow = navigation
    .getState?.()
    ?.routeNames?.includes(Routes.SEND.RECIPIENT);

  if (isInAppSendFlow) {
    showActivityKeepingFlow(navigation, { returnToFlowInput: true });
    return;
  }

  replaceWithTransactionsView(navigation);
}
