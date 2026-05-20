import { useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { surfaceCompleted } from '../../../../reducers/engagement';
import type { StartupSurfaceId } from './registry';

export type CompleteSurfaceReason =
  | 'dismiss'
  | 'engage'
  | 'decline'
  | 'unmount'
  | 'ineligible'
  | 'complete';

/**
 * Returns a stable, fire-once callback that marks a startup surface as
 * complete. The guard ref ensures the coordinator advances exactly once
 * regardless of how many code paths (button press, navigation, unmount)
 * call the callback.
 */
export const useCompleteStartupSurface = (surfaceId: StartupSurfaceId) => {
  const dispatch = useDispatch();
  const hasCompleted = useRef(false);

  return useCallback(
    (reason: CompleteSurfaceReason = 'complete') => {
      if (hasCompleted.current) {
        return;
      }
      hasCompleted.current = true;
      dispatch(surfaceCompleted({ id: surfaceId, reason }));
    },
    [dispatch, surfaceId],
  );
};
