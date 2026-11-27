import { useMemo } from 'react';
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

export type DepositEnvironmentUnavailableReason =
  | Exclude<PredictVenueCapabilitiesUnavailableReason, 'error'>
  | 'missing_environment';

export type DepositEnvironmentResolution =
  | { status: 'loading' }
  | { status: 'ready'; environment: PredictDepositEnvironment }
  | {
      status: 'unavailable';
      reason: DepositEnvironmentUnavailableReason;
    }
  | { status: 'unavailable'; reason: 'error'; retry: () => void };

/** The Venue's deposit chain, USDC and transfer mode from its catalog. */
export const useDepositEnvironment = (
  venueId: PredictVenueId,
): DepositEnvironmentResolution => {
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
    const environment = resolvePredictDepositEnvironment(venueEnvironment);
    if (environment) {
      return { status: 'ready', environment };
    }
    if (capabilitiesStatus === 'loading') {
      return { status: 'loading' };
    }
    if (capabilitiesStatus === 'ready') {
      return { status: 'unavailable', reason: 'missing_environment' };
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
  }, [venueEnvironment, capabilitiesStatus, unavailableReason, retry]);
};
