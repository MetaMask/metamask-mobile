import Routes from '../../../../constants/navigation/Routes';

const CONFIRMATION_ROUTE_NAMES: ReadonlySet<string> = new Set([
  Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
  Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER,
]);

export interface NestedNavigationState {
  index: number;
  routes: { name: string; state?: NestedNavigationState }[];
}

export interface DepositConfirmationNavigation {
  getState: () => NestedNavigationState | undefined;
  goBack: () => void;
  addListener: (event: 'state', callback: () => void) => () => void;
}

export interface DepositConfirmationGuard {
  /**
   * Dismiss confirmation if it is focused, or once it appears if navigation
   * was deferred. No-ops when the user already left confirmation.
   */
  onDepositFailed: () => void;
  /** Stop watching navigation. Call on success or unmount. */
  cancel: () => void;
}

/**
 * Returns the focused leaf route name from a (possibly nested) navigation state.
 *
 * @param state - React Navigation state, including nested stack state.
 * @returns The focused route name, or undefined when state is empty.
 */
export function getFocusedRouteName(
  state: NestedNavigationState | undefined,
): string | undefined {
  if (!state?.routes?.length) {
    return undefined;
  }

  const route = state.routes[state.index];
  if (route.state) {
    return getFocusedRouteName(route.state) ?? route.name;
  }

  return route.name;
}

/**
 * Whether the redesigned confirmation screen is the focused route.
 *
 * @param navigation - Navigation object exposing `getState`.
 * @returns True when a confirmation route is focused.
 */
export function isRedesignedConfirmationFocused(
  navigation: Pick<DepositConfirmationNavigation, 'getState'>,
): boolean {
  const focused = getFocusedRouteName(navigation.getState());
  return focused !== undefined && CONFIRMATION_ROUTE_NAMES.has(focused);
}

/**
 * Guards `goBack` after fire-and-forget deposit prep so we only dismiss the
 * confirmation we opened — not Perps, and not a confirmation the user already
 * closed. If `useConfirmNavigation` deferred the push, we wait until it
 * appears and then dismiss it.
 *
 * @param navigation - Navigation object with state, goBack, and state listener.
 * @returns Guard with `onDepositFailed` and `cancel`.
 */
export function createDepositConfirmationGuard(
  navigation: DepositConfirmationNavigation,
): DepositConfirmationGuard {
  let cancelled = false;
  let presented = isRedesignedConfirmationFocused(navigation);
  let dismissWhenShown = false;

  const unsubscribe = navigation.addListener('state', () => {
    if (cancelled) {
      return;
    }

    const focused = isRedesignedConfirmationFocused(navigation);
    if (!focused) {
      return;
    }

    presented = true;
    if (dismissWhenShown) {
      cancelled = true;
      unsubscribe();
      navigation.goBack();
    }
  });

  return {
    onDepositFailed: () => {
      if (cancelled) {
        return;
      }

      if (isRedesignedConfirmationFocused(navigation)) {
        cancelled = true;
        unsubscribe();
        navigation.goBack();
        return;
      }

      if (presented) {
        cancelled = true;
        unsubscribe();
        return;
      }

      dismissWhenShown = true;
    },
    cancel: () => {
      if (cancelled) {
        return;
      }
      cancelled = true;
      unsubscribe();
    },
  };
}
