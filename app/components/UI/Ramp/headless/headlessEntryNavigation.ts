import Routes from '../../../../constants/navigation/Routes';

interface NavigationNode {
  getParent?: () => NavigationNode | undefined;
  goBack?: () => void;
  pop?: () => void;
  setOptions?: (options: Record<string, unknown>) => void;
}

interface NavRouteLike {
  name?: string;
  params?: { headlessSessionId?: string } & Record<string, unknown>;
  state?: NavStateLike;
}

interface NavStateLike {
  routes?: NavRouteLike[];
  index?: number;
}

interface RootNavigationLike {
  getState?: () => NavStateLike | undefined;
  goBack?: () => void;
}

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

/**
 * Walks a navigation state's FOCUSED route chain (following `index` through
 * nested navigator states) and returns the chain of routes from the top-level
 * focused route down to the deepest focused leaf.
 */
function getFocusedRouteChain(state: NavStateLike | undefined): NavRouteLike[] {
  const chain: NavRouteLike[] = [];
  let current: NavStateLike | undefined = state;
  while (current) {
    const routes = current.routes ?? [];
    if (routes.length === 0) {
      break;
    }
    const focusedIndex =
      typeof current.index === 'number' ? current.index : routes.length - 1;
    const focused = routes[focusedIndex];
    if (!focused) {
      break;
    }
    chain.push(focused);
    current = focused.state;
  }
  return chain;
}

/**
 * Pops the transparent HEADLESS_ENTRY modal via the ROOT navigation ref when
 * it is part of the currently FOCUSED route chain. Used by the
 * external-browser deeplink return (P2.M2), which runs outside React with
 * only the root ref — the screen-relative `dismissHeadlessFlow` chain is not
 * reachable there. HEADLESS_ENTRY is nested inside the main navigator, so
 * the focused chain must be walked; a top-level route-name check can never
 * match it.
 *
 * Conservative on purpose: when HEADLESS_ENTRY is not in the focused chain
 * (the user navigated elsewhere, or the overlay is already gone), this is a
 * no-op so it can never pop an unrelated screen. And when `expectedSessionId`
 * is given while the chain's HEADLESS_HOST carries a different
 * `headlessSessionId`, this is also a no-op: the overlay now belongs to a
 * NEWER session and popping it would kill that live flow.
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
    const chain = getFocusedRouteChain(rootNavigation?.getState?.());
    const containsHeadlessEntry = chain.some(
      (route) => route.name === Routes.RAMP.HEADLESS_ENTRY,
    );
    if (!containsHeadlessEntry) {
      return false;
    }
    if (expectedSessionId !== undefined) {
      const hostSessionId = chain.find(
        (route) => route.params?.headlessSessionId !== undefined,
      )?.params?.headlessSessionId;
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
