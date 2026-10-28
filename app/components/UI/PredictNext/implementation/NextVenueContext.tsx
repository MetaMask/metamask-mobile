import React, { createContext, useContext, type ReactNode } from 'react';
import type { PredictVenueId } from '../types';

const NextVenueContext = createContext<PredictVenueId | undefined>(undefined);

export interface NextVenueProviderProps {
  venueId: PredictVenueId;
  children: ReactNode;
}

/**
 * Carries the resolved Active Venue into the PredictNext branch.
 * {@link PredictImplementationSwitch} mounts it once per Venue, so a Venue
 * change remounts everything below it.
 */
export const NextVenueProvider = ({
  venueId,
  children,
}: NextVenueProviderProps) => (
  <NextVenueContext.Provider value={venueId}>
    {children}
  </NextVenueContext.Provider>
);

/**
 * The Venue the PredictNext branch serves. Entry screens read it here;
 * screens deeper in the stack take `venueId` from their route params or
 * intent instead. Throws outside {@link NextVenueProvider}: there is no
 * default Venue to fall back to.
 */
export const useNextVenueId = (): PredictVenueId => {
  const venueId = useContext(NextVenueContext);
  if (venueId === undefined) {
    throw new Error('useNextVenueId must be used within a NextVenueProvider');
  }
  return venueId;
};
