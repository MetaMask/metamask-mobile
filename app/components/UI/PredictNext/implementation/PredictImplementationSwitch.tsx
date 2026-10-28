import React, { Fragment, type ReactNode } from 'react';
import { NextVenueProvider } from './NextVenueContext';
import type { PredictConfiguredVenue } from './types';
import { usePredictImplementation } from './usePredictImplementation';
import { resolveVenueImplementation } from './venueImplementations';

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
  /**
   * Serves this Venue instead of the Active Venue. Only the root router's
   * route-level Polymarket pinning and the legacy market-list route, which
   * resolves its own lane, use it; PRED-1379 removes it.
   */
  pinnedVenue?: PredictConfiguredVenue;
}

/**
 * Mounts only the active implementation. The branch is keyed by
 * implementation and Venue, so an Active Venue change remounts it.
 */
export const PredictImplementationSwitch = ({
  legacy,
  next,
  resolving,
  pinnedVenue,
}: PredictImplementationSwitchProps) => {
  const activeImplementation = usePredictImplementation();
  const resolution = pinnedVenue
    ? resolveVenueImplementation({ status: 'ready', venue: pinnedVenue })
    : activeImplementation;

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
