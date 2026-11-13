import type { RootState } from '../../../../reducers';
import { selectActiveVenue } from './activeVenue';
import type { ActiveVenueResolution } from './types';

const venueOf = (resolution: ActiveVenueResolution): string | null =>
  resolution.status === 'ready' ? resolution.venue : null;

export interface ActiveVenueChangeSource {
  getState: () => RootState;
  subscribe: (listener: () => void) => () => void;
}

/**
 * Calls `onChange` each time the Active Venue `selectActiveVenue` resolves
 * changes, whatever changed it: the picker, a rollout or kill-switch flag,
 * or the end of resolution. It runs from the store, not from a screen, so a
 * change is seen whether or not a Predict screen is mounted. Returns the
 * unsubscription.
 */
export const subscribeToActiveVenueChanges = (
  { getState, subscribe }: ActiveVenueChangeSource,
  onChange: () => void,
): (() => void) => {
  let previous = venueOf(selectActiveVenue(getState()));
  return subscribe(() => {
    const next = venueOf(selectActiveVenue(getState()));
    if (next !== previous) {
      previous = next;
      onChange();
    }
  });
};
