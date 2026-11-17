import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectPredictAvailability } from '../availability/selectPredictAvailability';
import { useVenueCapabilities } from '../capabilities';
import { selectActiveVenue } from '../implementation/activeVenue';
import { selectPredictConfig } from '../selectors/predictConfig';
import type { PredictVenueId } from '../types';
import { resolvePredictFunding } from './resolvePredictFunding';

/**
 * Whether a PredictNext surface may offer Add funds for `venueId`:
 * `resolvePredictFunding('deposit')` is ready on the next implementation and
 * `venueId` is the Active Venue. That needs Predict available, the
 * `kalshiDepositsEnabled` rollout flag on, and the Venue's descriptor listing
 * `deposit`. When false, render no entry point; the legacy Polymarket Add
 * funds is never a fallback here.
 */
export const usePredictNextDepositAvailable = (
  venueId: PredictVenueId,
): boolean => {
  const available = useSelector(selectPredictAvailability);
  const activeVenue = useSelector(selectActiveVenue);
  const kalshiDepositsEnabled =
    useSelector(selectPredictConfig).kalshiDepositsEnabled === true;
  const capabilities = useVenueCapabilities(venueId);

  return useMemo(() => {
    if (activeVenue.status !== 'ready' || activeVenue.venue !== venueId) {
      return false;
    }
    const resolution = resolvePredictFunding('deposit', {
      available,
      activeVenue,
      getCapabilities: () => capabilities,
      kalshiDepositsEnabled,
    });
    return (
      resolution.status === 'ready' && resolution.implementation === 'next'
    );
  }, [activeVenue, available, capabilities, kalshiDepositsEnabled, venueId]);
};
