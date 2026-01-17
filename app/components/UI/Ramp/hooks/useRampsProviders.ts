import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectProviders,
  selectProvidersRequest,
} from '../../../../selectors/rampsController';
import {
  ExecuteRequestOptions,
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
  /**
   * Fetch providers for a given region.
   */
  fetchProviders: (
    region?: string,
    options?: ExecuteRequestOptions & {
      provider?: string | string[];
      crypto?: string | string[];
      fiat?: string | string[];
      payments?: string | string[];
    },
  ) => Promise<{ providers: Provider[] }>;
}

/**
 * Hook to get providers state from RampsController.
 * This hook assumes Engine is already initialized.
 *
 * @param region - Optional region code to use for request state. If not provided, uses userRegion from state.
 * @param filterOptions - Optional filter options for the request cache key.
 * @returns Providers state and fetch function.
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

  const regionToUse = useMemo(
    () => region ?? userRegion?.regionCode ?? '',
    [region, userRegion?.regionCode],
  );

  const requestSelector = useMemo(
    () => selectProvidersRequest(regionToUse, filterOptions),
    [regionToUse, filterOptions],
  );

  const { isFetching, error } = useSelector(
    requestSelector,
  ) as RequestSelectorResult<{ providers: Provider[] }>;

  const fetchProviders = useCallback(
    async (
      fetchRegion?: string,
      options?: ExecuteRequestOptions & {
        provider?: string | string[];
        crypto?: string | string[];
        fiat?: string | string[];
        payments?: string | string[];
      },
    ) => {
      return await Engine.context.RampsController.getProviders(
        fetchRegion,
        options,
      );
    },
    [],
  );

  return {
    providers,
    isLoading: isFetching,
    error,
    fetchProviders,
  };
}

export default useRampsProviders;
