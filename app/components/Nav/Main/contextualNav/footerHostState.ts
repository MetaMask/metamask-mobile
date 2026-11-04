import { useSyncExternalStore } from 'react';

/**
 * The root footer host is mounted and owns the pill. Tab bars and pushed
 * screens skip their own copy so the same pill can animate across a push.
 */
let hostActive = false;
const listeners = new Set<() => void>();

const emit = (): void => {
  listeners.forEach((listener) => listener());
};

export const setFooterHostActive = (active: boolean): void => {
  if (hostActive === active) {
    return;
  }
  hostActive = active;
  emit();
};

export const getFooterHostActive = (): boolean => hostActive;

export const subscribeFooterHost = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useFooterHostActive = (): boolean =>
  useSyncExternalStore(
    subscribeFooterHost,
    getFooterHostActive,
    getFooterHostActive,
  );
