import type { ReactNode } from 'react';

/**
 * Copy the component-view toast stub can paint. The real `toast()` renders
 * through `<Toaster />`, which view tests do not mount.
 */
export interface DesignSystemToastCopy {
  title?: ReactNode;
  description?: ReactNode;
}

export type DesignSystemToastListener = (
  toast: DesignSystemToastCopy | null,
) => void;

const listeners = new Set<DesignSystemToastListener>();

/** Called by the `toast()` stub in `app/util/test/testSetupView.js`. */
export function publishDesignSystemToast(
  toast: DesignSystemToastCopy | null,
): void {
  listeners.forEach((listener) => {
    listener(toast);
  });
}

/** Subscribe to toasts published by the component-view `toast()` stub. */
export function subscribeToDesignSystemToast(
  listener: DesignSystemToastListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Drop subscribers left behind when a view test ends. */
export function resetDesignSystemToastListeners(): void {
  listeners.clear();
}
