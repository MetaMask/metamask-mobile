import { useMemo } from 'react';
import { getVenueEnvironment, useVenueCapabilities } from '../../capabilities';
import type { PredictVenueCapabilitiesUnavailableReason } from '../../capabilities/types';
import type { PredictVenueId } from '../../types';
import {
  resolveKalshiPayoutDestinationMode,
  type KalshiPayoutDestinationMode,
} from './kalshiPayoutDestination';

type Resolution =
  | { status: 'loading' }
  | { status: 'ready'; mode: KalshiPayoutDestinationMode }
  | {
      status: 'unavailable';
      reason:
        | Exclude<PredictVenueCapabilitiesUnavailableReason, 'error'>
        | 'missing_environment';
    }
  | { status: 'unavailable'; reason: 'error'; retry: () => void };

export const useKalshiPayoutDestinationMode = (
  venueId: PredictVenueId,
): Resolution => {
  const capabilities = useVenueCapabilities(venueId);
  const environment = getVenueEnvironment(capabilities);
  const status = capabilities.status;
  const reason =
    capabilities.status === 'unavailable' ? capabilities.reason : undefined;
  const retry =
    capabilities.status === 'unavailable' && capabilities.reason === 'error'
      ? capabilities.retry
      : undefined;
  return useMemo(() => {
    const mode = resolveKalshiPayoutDestinationMode(environment);
    if (mode) return { status: 'ready', mode };
    if (status === 'loading') return { status: 'loading' };
    if (status === 'ready')
      return { status: 'unavailable', reason: 'missing_environment' };
    if (reason === 'error' && retry)
      return { status: 'unavailable', reason: 'error', retry };
    return {
      status: 'unavailable',
      reason: reason && reason !== 'error' ? reason : 'invalid_catalog',
    };
  }, [environment, status, reason, retry]);
};
