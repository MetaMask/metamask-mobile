import { useCallback, useRef } from 'react';
import { useStartupSurface, type CompleteSurfaceReason } from './context';
import type { StartupSurfaceId } from './state';

/**
 * Returns a stable, once-only completion callback for the given surface.
 *
 * The guard ref ensures the coordinator advances exactly once regardless of
 * how many code paths (button press, navigation, unmount) trigger completion.
 * Ownership lives in the Engagement layer so feature-owned surfaces do not
 * need to reach into the coordinator context directly.
 */
export const useCompleteSurface = (surfaceId: StartupSurfaceId) => {
  const { completeSurface } = useStartupSurface();
  const hasCompleted = useRef(false);

  return useCallback(
    (reason: CompleteSurfaceReason = 'complete') => {
      if (hasCompleted.current) {
        return;
      }

      hasCompleted.current = true;
      completeSurface(surfaceId, reason);
    },
    [completeSurface, surfaceId],
  );
};
