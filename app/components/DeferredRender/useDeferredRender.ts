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
 * Once this hook has returned `true`, it keeps returning `true` for this
 * component's lifetime. `enabled` changing from `false` to `true` does not
 * drop back to `false` for a frame.
 *
 * @param options - `{ enabled: false }` renders on the first commit.
 * @returns Whether deferred content may render.
 */
export function useDeferredRender({
  enabled = true,
}: UseDeferredRenderOptions = {}): boolean {
  const isTransitionComplete = useScreenTransitionComplete();
  const [isReleased, setIsReleased] = useState(() => !enabled);

  if (!enabled && !isReleased) {
    setIsReleased(true);
  }

  useEffect(() => {
    if (isReleased || !enabled || !isTransitionComplete) {
      return undefined;
    }

    const frameId = requestAnimationFrame(() => {
      setIsReleased(true);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [enabled, isReleased, isTransitionComplete]);

  return isReleased || !enabled;
}
