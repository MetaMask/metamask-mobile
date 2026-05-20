import { createSelector } from 'reselect';
import type { RootState } from '../index';
import type { StartupSurfaceId } from '../../components/UI/Engagement/startupSurfaces/registry';

const selectEngagement = (state: RootState) => state.engagement;

export const selectStartupSurfaceStatuses = createSelector(
  selectEngagement,
  (engagement) => engagement.startupSurfaces.statuses,
);

export const selectCompletedStartupSurfaceIds = createSelector(
  selectEngagement,
  (engagement) => engagement.startupSurfaces.completed,
);

/**
 * Returns the active startup surface id, or null.
 */
export const selectActiveStartupSurfaceId = createSelector(
  selectEngagement,
  (engagement): StartupSurfaceId | null =>
    engagement.startupSurfaces.activeSurfaceId,
);

/**
 * Returns a selector factory that checks whether a specific surface is active.
 *
 * @example
 * const isPushPrePromptActive =
 *   makeSelectIsStartupSurfaceActive('push-pre-prompt');
 * const active = useSelector(isPushPrePromptActive);
 */
export const makeSelectIsStartupSurfaceActive = (id: StartupSurfaceId) =>
  createSelector(
    selectActiveStartupSurfaceId,
    (activeSurfaceId) => activeSurfaceId === id,
  );
