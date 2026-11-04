import { useSyncExternalStore } from 'react';

import Routes from '../../../../constants/navigation/Routes';

/**
 * True after the in-screen footer has mounted. The iOS 26 system tab bar
 * stays visible until then, so a missing pill never leaves Home with no bar.
 */
let footerMounted = false;
const mountedListeners = new Set<() => void>();

const emitMounted = (): void => {
  mountedListeners.forEach((listener) => listener());
};

export const setInScreenFooterMounted = (mounted: boolean): void => {
  if (footerMounted === mounted) {
    return;
  }
  footerMounted = mounted;
  emitMounted();
};

export const getInScreenFooterMounted = (): boolean => footerMounted;

export const useInScreenFooterMounted = (): boolean =>
  useSyncExternalStore(
    (listener) => {
      mountedListeners.add(listener);
      return () => {
        mountedListeners.delete(listener);
      };
    },
    getInScreenFooterMounted,
    getInScreenFooterMounted,
  );

/** Which default tab is selected. Native tabs do not pass route state to the overlay. */
let activeHomeTab = Routes.WALLET.HOME;
const tabListeners = new Set<() => void>();

const emitTab = (): void => {
  tabListeners.forEach((listener) => listener());
};

export const setActiveHomeTab = (routeName: string): void => {
  if (activeHomeTab === routeName) {
    return;
  }
  activeHomeTab = routeName;
  emitTab();
};

export const getActiveHomeTab = (): string => activeHomeTab;

export const useActiveHomeTab = (): string =>
  useSyncExternalStore(
    (listener) => {
      tabListeners.add(listener);
      return () => {
        tabListeners.delete(listener);
      };
    },
    getActiveHomeTab,
    getActiveHomeTab,
  );
