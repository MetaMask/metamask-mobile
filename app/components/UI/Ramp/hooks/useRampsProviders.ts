import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectProviders,
  selectProvidersRequest,
} from '../../../../selectors/rampsController';
import {
  RequestSelectorResult,
  type Provider,
} from '@metamask/ramps-controller';

/**
 * Result returned by the useRampsProviders hook.
 */
export interface UseRampsProvidersResult {
  /**
   * The list of providers available for the current region.
   */
  providers: Provider[];
  /**
   * Whether the providers request is currently loading.
   */
  isLoading: boolean;
  /**
   * The error message if the request failed, or null.
   */
  error: string | null;
}

/**
 * Hook to get providers state from RampsController.
 * This hook assumes Engine is already initialized.
 *
 * @param region - Optional region code to use for request state. If not provided, uses userRegion from state.
 * @param filterOptions - Optional filter options for the request cache key.
 * @returns Providers state.
 */
export function useRampsProviders(
  region?: string,
  filterOptions?: {
    provider?: string | string[];
    crypto?: string | string[];
    fiat?: string | string[];
    payments?: string | string[];
  },
): UseRampsProvidersResult {
  const providers = useSelector(selectProviders);
  const userRegion = useSelector(
    (state: Parameters<typeof selectProviders>[0]) =>
      state.engine.backgroundState.RampsController?.userRegion,
  );

  const regionCode = useMemo(
    () => region ?? userRegion?.regionCode ?? '',
    [region, userRegion?.regionCode],
  );

  const requestSelector = useMemo(
    () => selectProvidersRequest(regionCode, filterOptions),
    [regionCode, filterOptions],
  );

  const { isFetching, error } = useSelector(
    requestSelector,
  ) as RequestSelectorResult<{ providers: Provider[] }>;

  return {
    providers,
    isLoading: isFetching,
    error,
  };
}

export default useRampsProviders;
