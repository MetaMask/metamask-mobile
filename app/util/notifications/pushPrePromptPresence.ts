import { useSyncExternalStore } from 'react';

/**
 * Whether the startup push pre-prompt is still unresolved or on screen.
 * Starts active so a splash cannot open before the pre-prompt has decided.
 * Session-only: this must not be persisted.
 */
let active = true;
const listeners = new Set<() => void>();

export function getPushPrePromptActive(): boolean {
  return active;
}

export function setPushPrePromptActive(next: boolean): void {
  if (active === next) {
    return;
  }
  active = next;
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePushPrePromptActive(): boolean {
  return useSyncExternalStore(subscribe, getPushPrePromptActive);
}
