import { useSyncExternalStore } from 'react';
import type { PerpsMode } from '@metamask/perps-controller';

/**
 * Tiny module-level store for the Perps Lite ⇄ Pro mode-switch "flash" overlay
 * (TAT-3551).
 *
 * This is transient, throw-away UI state: a mode is flashed on top of the
 * current Perps screen for ~1s and then cleared. It never needs to live in the
 * global Redux store (no persistence, no cross-cutting reads), so a minimal
 * observable subscribed via {@link useSyncExternalStore} keeps the wiring
 * lightweight while still allowing any entry point — including the Trade menu,
 * which lives outside the Perps navigation stack — to trigger it.
 */
let currentMode: PerpsMode | null = null;
const listeners = new Set<() => void>();

const emit = (): void => {
  listeners.forEach((listener) => listener());
};

/** Flash the given destination mode on top of the current Perps screen. */
export const showPerpsModeFlash = (mode: PerpsMode): void => {
  currentMode = mode;
  emit();
};

/** Clear any visible flash. No-op when nothing is showing. */
export const hidePerpsModeFlash = (): void => {
  if (currentMode === null) {
    return;
  }
  currentMode = null;
  emit();
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): PerpsMode | null => currentMode;

/** Subscribe to the currently flashing mode (or `null` when nothing shows). */
export const usePerpsModeFlash = (): PerpsMode | null =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
