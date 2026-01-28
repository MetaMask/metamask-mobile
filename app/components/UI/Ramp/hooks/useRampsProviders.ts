import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectProviders,
  selectProvidersRequest,
  selectSelectedProvider,
  selectUserRegion,
} from '../../../../selectors/rampsController';
import {
  RequestSelectorResult,
  type Provider,
} from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

/**
 * Result returned by the useRampsProviders hook.
 */
export interface UseRampsProvidersResult {
  /**
   * The list of providers available for the current region.
   */
  providers: Provider[];
  /**
   * The currently selected provider, or null if none selected.
   */
  selectedProvider: Provider | null;
  /**
   * Sets the selected provider.
   * @param provider - The provider to select, or null to clear selection.
   */
  setSelectedProvider: (provider: Provider | null) => void;
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
  const selectedProvider = useSelector(selectSelectedProvider);
  const userRegion = useSelector(selectUserRegion);

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

  const setSelectedProvider = useCallback((provider: Provider | null) => {
    (
      Engine.context.RampsController.setSelectedProvider as (
        providerId: string | null,
      ) => void
    )(provider?.id ?? null);
  }, []);

  return {
    providers,
    selectedProvider,
    setSelectedProvider,
    isLoading: isFetching,
    error,
  };
}

export default useRampsProviders;
