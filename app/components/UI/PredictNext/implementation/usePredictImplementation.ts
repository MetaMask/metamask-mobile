import { useMemo } from 'react';
import { useActiveVenue } from './activeVenue';
import type { PredictImplementationResolution } from './types';
import { resolveVenueImplementation } from './venueImplementations';

/** Resolves which implementation serves the Active Venue. */
export const usePredictImplementation = (): PredictImplementationResolution => {
  const activeVenue = useActiveVenue();

  return useMemo(() => resolveVenueImplementation(activeVenue), [activeVenue]);
};
