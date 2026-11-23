import { createContext, useContext, useMemo } from 'react';
import {
  getVenueEnvironment,
  useVenueCapabilities,
} from '../../../capabilities';
import type { PredictVenueCapabilitiesUnavailableReason } from '../../../capabilities/types';
import {
  resolvePredictDepositEnvironment,
  type PredictDepositEnvironment,
} from '../../../config/depositEnvironment';
import type { PredictVenueId } from '../../../types';

export type DepositEnvironmentResolution =
  | { status: 'loading' }
  | { status: 'ready'; environment: PredictDepositEnvironment }
  | {
      status: 'unavailable';
      reason: Exclude<PredictVenueCapabilitiesUnavailableReason, 'error'>;
    }
  | { status: 'unavailable'; reason: 'error'; retry: () => void };

const DepositEnvironmentContext = createContext<
  PredictDepositEnvironment | undefined
>(undefined);

/**
 * Overrides the Venue's deposit environment for the screen below it.
 * Component-view tests only: no production code renders it, so a running app
 * always uses the Venue catalog's `environment`.
 */
export const DepositEnvironmentOverride = DepositEnvironmentContext.Provider;

/** The Venue's deposit chain, USDC and transfer mode from its catalog. */
export const useDepositEnvironment = (
  venueId: PredictVenueId,
): DepositEnvironmentResolution => {
  const override = useContext(DepositEnvironmentContext);
  const capabilities = useVenueCapabilities(venueId);
  const venueEnvironment = getVenueEnvironment(capabilities);
  const capabilitiesStatus = capabilities.status;
  const unavailableReason =
    capabilities.status === 'unavailable' ? capabilities.reason : undefined;
  const retry =
    capabilities.status === 'unavailable' && capabilities.reason === 'error'
      ? capabilities.retry
      : undefined;

  return useMemo(() => {
    if (override) {
      return { status: 'ready', environment: override };
    }
    if (venueEnvironment) {
      return {
        status: 'ready',
        environment: resolvePredictDepositEnvironment(venueEnvironment),
      };
    }
    if (capabilitiesStatus === 'loading') {
      return { status: 'loading' };
    }
    if (unavailableReason === 'error' && retry) {
      return { status: 'unavailable', reason: 'error', retry };
    }
    return {
      status: 'unavailable',
      reason:
        unavailableReason && unavailableReason !== 'error'
          ? unavailableReason
          : 'invalid_catalog',
    };
  }, [
    override,
    venueEnvironment,
    capabilitiesStatus,
    unavailableReason,
    retry,
  ]);
};
