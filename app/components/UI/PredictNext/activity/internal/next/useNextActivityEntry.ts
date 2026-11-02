import { useMemo } from 'react';
import type { PredictActivityEntry, PredictVenueId } from '../../../types';
import { useNextActivity } from './useNextActivity';

export interface NextActivityEntryResult {
  entry: PredictActivityEntry | undefined;
  isLoading: boolean;
}

/**
 * Finds a canonical Activity entry by its id in the Venue's Activity pages.
 * The Activity list reads the same query, so an entry opened from the list is
 * already cached. The id is opaque and matched exactly.
 *
 * @param venueId - The Venue the entry belongs to, or `undefined` to skip.
 * @param id - The canonical entry id, or `undefined` to skip.
 * @returns The entry, and whether the lookup is still loading.
 */
export const useNextActivityEntry = (
  venueId: PredictVenueId | undefined,
  id: string | undefined,
): NextActivityEntryResult => {
  const isEnabled = venueId !== undefined && Boolean(id);
  const { data, isPending } = useNextActivity(venueId, isEnabled);

  const entry = useMemo(() => {
    if (!isEnabled || !data) {
      return undefined;
    }
    for (const page of data.pages) {
      const match = page.activity.find((candidate) => candidate.id === id);
      if (match) {
        return match;
      }
    }
    return undefined;
  }, [data, id, isEnabled]);

  return { entry, isLoading: isEnabled && isPending };
};
