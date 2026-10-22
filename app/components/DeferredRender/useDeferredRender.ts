import { useEffect, useState } from 'react';

import { useScreenTransitionComplete } from '../hooks/useScreenTransitionComplete';

/** Options for {@link useDeferredRender}. */
export interface UseDeferredRenderOptions {
  /**
   * When `false`, return `true` immediately and do not schedule a frame.
   * @default true
   */
  enabled?: boolean;
}

/**
 * Returns `true` after {@link useScreenTransitionComplete} and one
 * `requestAnimationFrame`. Cancels that frame on cleanup. Adds no timer
 * and does not use `InteractionManager`.
 *
 * @param options - `{ enabled: false }` renders on the first commit.
 * @returns Whether deferred content may render.
 */
export function useDeferredRender({
  enabled = true,
}: UseDeferredRenderOptions = {}): boolean {
  const isTransitionComplete = useScreenTransitionComplete();
  const [isFrameReady, setIsFrameReady] = useState(false);

  useEffect(() => {
    if (!enabled || !isTransitionComplete) {
      return undefined;
    }

    const frameId = requestAnimationFrame(() => {
      setIsFrameReady(true);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [enabled, isTransitionComplete]);

  if (!enabled) {
    return true;
  }

  return isFrameReady;
}
