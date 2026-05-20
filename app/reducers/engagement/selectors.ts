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
 * Returns the sticky active startup surface id, or null.
 *
 * The value is maintained by the engagement reducer rather than being
 * derived here, so that the "once active, stay active until completed"
 * invariant is enforced even when eligibility hooks re-evaluate transiently
 * (e.g. the app backgrounds during an OS permission prompt).
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
 * const isPerpsActive = makeSelectIsStartupSurfaceActive('perps-gtm');
 * const active = useSelector(isPerpsActive);
 */
export const makeSelectIsStartupSurfaceActive = (id: StartupSurfaceId) =>
  createSelector(
    selectActiveStartupSurfaceId,
    (activeSurfaceId) => activeSurfaceId === id,
  );
