import { useSyncExternalStore } from 'react';
import NavigationService from '../../core/NavigationService';
import Routes from '../../constants/navigation/Routes';
import { isHomeUnobstructedState } from './isHomeUnobstructedState';

const listeners = new Set<() => void>();
const pending = new Set<symbol>();
const emit = (): void => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = (): boolean => pending.size > 0;

/** Blocks low-priority home prompts through a tray-to-destination handoff. */
export const useIsHomeNavigationPending = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot);

interface HomeNavigationHandoff {
  run: (navigate: () => void | boolean | Promise<void>) => Promise<void>;
  cancel: () => void;
}

/**
 * Starts before the tray is dismissed. The destination callback must return
 * false when it intentionally does not navigate. Otherwise the guard ends
 * only after that callback settles AND its navigation state commits.
 */
export const beginHomeNavigationHandoff = (): HomeNavigationHandoff => {
  const token = Symbol('home-navigation');
  pending.add(token);
  emit();

  const release = (): void => {
    pending.delete(token);
    emit();
  };

  let unsubscribe: (() => void) | undefined;
  const cancel = (): void => {
    unsubscribe?.();
    release();
  };

  const run = async (
    navigate: () => void | boolean | Promise<void>,
  ): Promise<void> => {
    try {
      const navigation = NavigationService.navigation;
      let committed = false;
      let settled = false;
      // Subscribe after the tray pop, immediately before dispatching destination
      // navigation: the tray's own dismissal must not complete this handoff.
      unsubscribe = navigation.addListener('state', () => {
        const route = navigation.getCurrentRoute();
        const state = navigation.getRootState();
        if (
          !route ||
          !state ||
          route.name === Routes.MODAL.TRADE_WALLET_ACTIONS ||
          isHomeUnobstructedState(state)
        ) {
          return;
        }
        committed = true;
        if (settled) {
          cancel();
        }
      });
      const didNavigate = await navigate();
      settled = true;
      if (didNavigate === false || committed) {
        cancel();
      }
    } catch (error) {
      cancel();
      throw error;
    }
  };

  return { run, cancel };
};
