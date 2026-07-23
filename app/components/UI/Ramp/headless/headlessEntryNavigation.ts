import {
  findFocusedRoute,
  type NavigationState,
  type PartialState,
} from '@react-navigation/native';

import Routes from '../../../../constants/navigation/Routes';

interface NavigationNode {
  getParent?: () => NavigationNode | undefined;
  goBack?: () => void;
  pop?: () => void;
  setOptions?: (options: Record<string, unknown>) => void;
}

interface RootNavigationLike {
  getState?: () => NavigationState | PartialState<NavigationState> | undefined;
  goBack?: () => void;
}

/**
 * Pops the transparent HEADLESS_ENTRY modal via the ROOT navigation ref when
 * the headless Host is the currently focused screen. For callers that run
 * outside React with only the root ref (e.g. the external-browser deeplink
 * return), where the screen-relative `dismissHeadlessFlow` chain is not
 * reachable. HEADLESS_ENTRY is nested inside the main navigator, so the
 * focused leaf is resolved with the library's `findFocusedRoute`; a top-level
 * route-name check can never match it.
 *
 * Conservative on purpose: when the focused leaf is not HEADLESS_HOST (the
 * user navigated elsewhere, or the overlay is already gone), this is a no-op
 * so it can never pop an unrelated screen. And when `expectedSessionId` is
 * given while the focused Host carries a different `headlessSessionId`, this
 * is also a no-op: the overlay belongs to a NEWER session and popping it
 * would kill that live flow.
 *
 * `goBack()` on the root ref dispatches GO_BACK to the deepest focused
 * navigator and bubbles upward; with HEADLESS_HOST alone at the base of the
 * nested stack (the awaiting-external-return state this is used in), the
 * bubble pops HEADLESS_ENTRY itself — the same net effect as
 * `dismissHeadlessFlow`'s parent-walk from inside the Host.
 */
export const dismissHeadlessEntryFromRoot = (
  rootNavigation: RootNavigationLike | undefined,
  expectedSessionId?: string,
): boolean => {
  try {
    const state = rootNavigation?.getState?.();
    if (!state) {
      return false;
    }
    const focused = findFocusedRoute(state);
    if (focused?.name !== Routes.RAMP.HEADLESS_HOST) {
      return false;
    }
    if (expectedSessionId !== undefined) {
      const hostSessionId = (
        focused.params as { headlessSessionId?: string } | undefined
      )?.headlessSessionId;
      if (hostSessionId !== undefined && hostSessionId !== expectedSessionId) {
        return false;
      }
    }
    rootNavigation?.goBack?.();
    return true;
  } catch {
    return false;
  }
};

export const setHeadlessEntryCardTouchThrough = (
  navigation: NavigationNode | undefined,
  touchThrough: boolean,
): boolean => {
  const headlessEntryNavigation = navigation?.getParent?.()?.getParent?.();
  if (!headlessEntryNavigation?.setOptions) {
    return false;
  }

  headlessEntryNavigation.setOptions({
    cardStyle: {
      backgroundColor: 'transparent',
      pointerEvents: touchThrough ? 'none' : 'auto',
    },
  });
  return true;
};

export const dismissHeadlessFlow = (
  navigation: NavigationNode | undefined,
): boolean => {
  const parentNavigation = navigation?.getParent?.();
  const outerNavigation = parentNavigation?.getParent?.();
  const dismiss =
    outerNavigation?.goBack ??
    outerNavigation?.pop ??
    parentNavigation?.pop ??
    navigation?.goBack;

  if (!dismiss) {
    return false;
  }
  dismiss();
  return true;
};
