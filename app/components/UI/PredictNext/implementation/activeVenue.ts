import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';
import { selectPredictConfig } from '../selectors/predictConfig';
import type { PredictVenueControllerState } from './PredictVenueController';
import { getSelectableVenues, resolveActiveVenue } from './resolveActiveVenue';
import type { ActiveVenueResolution } from './types';

const selectPredictVenueControllerState = (
  state: RootState,
): PredictVenueControllerState | undefined =>
  state.engine?.backgroundState?.PredictVenueController;

/** The stored Venue Selection Preference, honored or not. */
export const selectVenueSelectionPreference = createSelector(
  selectPredictVenueControllerState,
  (venueState) => venueState?.venueSelectionPreference ?? null,
);

const selectSessionDefaultVenue = createSelector(
  selectPredictVenueControllerState,
  (venueState) => venueState?.sessionDefault ?? null,
);

/**
 * The Active Venue: the one resolver behind every public API, the root
 * Predict route and availability. See `docs/active-venue.md`.
 */
export const selectActiveVenue = createSelector(
  selectPredictConfig,
  selectVenueSelectionPreference,
  selectSessionDefaultVenue,
  (config, venueSelectionPreference, sessionDefault): ActiveVenueResolution =>
    resolveActiveVenue({ config, venueSelectionPreference, sessionDefault }),
);

/**
 * Venues a Venue Selection Preference may name right now; empty when there
 * is no choice to offer.
 */
export const selectSelectableVenues = createSelector(
  selectPredictConfig,
  getSelectableVenues,
);

/** Resolves the Active Venue. Callers below the switch use `useNextVenueId`. */
export const useActiveVenue = (): ActiveVenueResolution =>
  useSelector(selectActiveVenue);
