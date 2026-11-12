import React, { Fragment, type ReactNode } from 'react';
import { NextVenueProvider } from './NextVenueContext';
import { usePredictImplementation } from './usePredictImplementation';

export interface PredictImplementationSwitchProps {
  /** Unchanged legacy Polymarket code. */
  legacy: ReactNode;
  /**
   * Venue-generic PredictNext code, remounted for each resolved Venue. It
   * reads that Venue with `useNextVenueId`.
   */
  next: ReactNode;
  /** Shown while the Active Venue is still resolving. */
  resolving: ReactNode;
}

/**
 * Mounts only the active implementation. The branch is keyed by
 * implementation and Venue, so an Active Venue change remounts it.
 */
export const PredictImplementationSwitch = ({
  legacy,
  next,
  resolving,
}: PredictImplementationSwitchProps) => {
  const resolution = usePredictImplementation();

  if (resolution.status === 'resolving') {
    return <Fragment key="resolving">{resolving}</Fragment>;
  }
  if (resolution.implementation === 'legacy') {
    return <Fragment key="legacy">{legacy}</Fragment>;
  }
  return (
    <NextVenueProvider
      key={`next:${resolution.venueId}`}
      venueId={resolution.venueId}
    >
      {next}
    </NextVenueProvider>
  );
};
