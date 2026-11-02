import { useSyncExternalStore } from 'react';

import { type HomeSectionGapSelection } from './homeSectionGap';

let selection: HomeSectionGapSelection = 'production';

const listeners = new Set<() => void>();

/** Current between-section gap. Defaults to production (20px divider margin). */
export function getHomeSectionGapSelection(): HomeSectionGapSelection {
  return selection;
}

/**
 * Updates the between-section gap and notifies home-tab subscribers.
 *
 * @param next - Production or one of 8, 12, 16, 24.
 */
export function setHomeSectionGapSelection(
  next: HomeSectionGapSelection,
): void {
  if (next === selection) {
    return;
  }

  selection = next;
  listeners.forEach((listener) => {
    listener();
  });
}

/** Restores production. Tests call this so selections do not leak across files. */
export function resetHomeSectionGapSelection(): void {
  setHomeSectionGapSelection('production');
}

/**
 * Subscribes to between-section gap changes.
 *
 * @param listener - Called after the selection changes.
 * @returns Unsubscribe function.
 */
export function subscribeHomeSectionGap(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/** Home-tab hook for the between-section gap. Defaults to production outside the control. */
export function useHomeSectionGapSelection(): HomeSectionGapSelection {
  return useSyncExternalStore(
    subscribeHomeSectionGap,
    getHomeSectionGapSelection,
    getHomeSectionGapSelection,
  );
}
