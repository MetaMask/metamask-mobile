import Routes from '../../../../constants/navigation/Routes';

interface NavigationNode {
  getParent?: () => NavigationNode | undefined;
  goBack?: () => void;
  pop?: () => void;
  setOptions?: (options: Record<string, unknown>) => void;
}

interface RootNavigationLike {
  getState?: () => { routes?: { name?: string }[]; index?: number } | undefined;
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
 * Pops the transparent HEADLESS_ENTRY modal from the ROOT navigator when it is
 * the focused top-level route. Used by the external-browser deeplink return
 * (P2.M2), which runs outside React with only the root navigation ref — the
 * screen-relative `dismissHeadlessFlow` chain is not reachable there.
 *
 * Conservative on purpose: when HEADLESS_ENTRY is not the focused root route
 * (the user has navigated elsewhere and the overlay is already gone, or was
 * never up), this is a no-op so it can never pop an unrelated screen.
 */
export const dismissHeadlessEntryFromRoot = (
  rootNavigation: RootNavigationLike | undefined,
): boolean => {
  try {
    const state = rootNavigation?.getState?.();
    const routes = state?.routes ?? [];
    const focusedIndex = state?.index ?? routes.length - 1;
    const focusedRoute = routes[focusedIndex];
    if (focusedRoute?.name !== Routes.RAMP.HEADLESS_ENTRY) {
      return false;
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
