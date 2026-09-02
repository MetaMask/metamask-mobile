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
      if (presented) {
        cancelled = true;
        unsubscribe();
      }
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

export interface DepositPrepSessionHandlers {
  onSuccess: () => void;
  onFailure: (error: unknown) => void;
}

export interface DepositPrepSession {
  /** Swap the confirmation guard; in-flight prep settles against the latest one. */
  attachGuard: (nextGuard: DepositConfirmationGuard) => void;
  /**
   * Start deposit prep if none is pending or in flight. Later calls keep the
   * first `run` and only refresh settlement handlers.
   */
  ensureScheduled: (
    run: () => Promise<unknown>,
    handlers: DepositPrepSessionHandlers,
  ) => void;
  /** Cancel a pending timeout, ignore in-flight settlement, and cancel the guard. */
  dispose: () => void;
}

/**
 * Owns the fire-and-forget deposit timeout so a second Add funds tap cannot
 * start another prep or let a stale settlement clear the latest guard.
 *
 * @returns Session that attaches guards, schedules one prep, and disposes on unmount.
 */
export function createDepositPrepSession(): DepositPrepSession {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  let disposed = false;
  let guard: DepositConfirmationGuard | null = null;
  let handlers: DepositPrepSessionHandlers | null = null;

  const attachGuard = (nextGuard: DepositConfirmationGuard) => {
    if (disposed) {
      nextGuard.cancel();
      return;
    }

    guard?.cancel();
    guard = nextGuard;
  };

  const ensureScheduled = (
    run: () => Promise<unknown>,
    nextHandlers: DepositPrepSessionHandlers,
  ) => {
    if (disposed) {
      return;
    }

    handlers = nextHandlers;

    if (timeoutId !== null || inFlight) {
      return;
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (disposed) {
        return;
      }

      inFlight = true;
      run()
        .then(() => {
          inFlight = false;
          if (disposed) {
            return;
          }
          guard?.cancel();
          guard = null;
          handlers?.onSuccess();
        })
        .catch((error: unknown) => {
          inFlight = false;
          if (disposed) {
            return;
          }
          guard?.onDepositFailed();
          guard = null;
          handlers?.onFailure(error);
        });
    }, 0);
  };

  const dispose = () => {
    disposed = true;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    inFlight = false;
    guard?.cancel();
    guard = null;
    handlers = null;
  };

  return { attachGuard, ensureScheduled, dispose };
}
