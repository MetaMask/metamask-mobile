import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectPredictAvailability } from '../availability/selectPredictAvailability';
import { useVenueCapabilities } from '../capabilities/useVenueCapabilities';
import { useActiveVenue } from '../implementation/activeVenue';
import { useNextVenueId } from '../implementation/NextVenueContext';
import { selectPredictConfig } from '../selectors/predictConfig';
import { resolvePredictFunding } from './resolvePredictFunding';
import type { PredictFundingResolution } from './types';

/**
 * Whether the Active Venue may offer its Withdraw flow. Both halves must
 * hold: the Venue catalog's `actions` list `withdraw` for this deployment, and
 * this client implements the flow for the
 * Venue's implementation. Anything else resolves unavailable, and the
 * surface renders no entry point at all.
 *
 * Call it inside the PredictNext branch, which is mounted per Venue by
 * `PredictImplementationSwitch`: the capabilities read and the Active Venue
 * are then the same Venue by construction.
 */
export const usePredictWithdrawAvailable = (): PredictFundingResolution => {
  const available = useSelector(selectPredictAvailability);
  const activeVenue = useActiveVenue();
  const venueId = useNextVenueId();
  const capabilities = useVenueCapabilities(venueId);
  const config = useSelector(selectPredictConfig);

  return useMemo(
    () =>
      resolvePredictFunding('withdraw', {
        available,
        activeVenue,
        // The branch's Venue and the Active Venue are the same inside
        // `PredictImplementationSwitch`, so these capabilities are the ones
        // `resolvePredictFunding` asks for by name.
        getCapabilities: () => capabilities,
        kalshiDepositsEnabled: config.kalshiDepositsEnabled === true,
      }),
    [activeVenue, available, capabilities, config.kalshiDepositsEnabled],
  );
};
