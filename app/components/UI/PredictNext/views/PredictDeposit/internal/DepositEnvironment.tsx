import { createContext, useContext, useMemo } from 'react';
import { useVenueCapabilities } from '../../../capabilities';
import {
  resolvePredictDepositEnvironment,
  type PredictDepositEnvironment,
} from '../../../config/depositEnvironment';
import type { PredictVenueId } from '../../../types';

export type DepositEnvironmentResolution =
  | { status: 'loading' }
  | { status: 'ready'; environment: PredictDepositEnvironment }
  | { status: 'unavailable' };

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

  return useMemo(() => {
    if (override) {
      return { status: 'ready', environment: override };
    }
    if (capabilities.status === 'ready') {
      return {
        status: 'ready',
        environment: resolvePredictDepositEnvironment(
          capabilities.descriptor.environment,
        ),
      };
    }
    if (capabilities.status === 'loading') {
      return { status: 'loading' };
    }
    return { status: 'unavailable' };
  }, [override, capabilities]);
};
