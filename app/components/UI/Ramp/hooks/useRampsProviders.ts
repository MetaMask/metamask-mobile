import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectProviders,
  selectProvidersRequest,
  selectSelectedProvider,
} from '../../../../selectors/rampsController';
import { getOrders } from '../../../../reducers/fiatOrders';
import { determinePreferredProvider } from '../utils/determinePreferredProvider';
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
   * The user's selected provider, or null if not set.
   */
  selectedProvider: Provider | null;
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
  /**
   * Set the user's selected provider.
   */
  setSelectedProvider: (provider: Provider | null) => void;
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
  const selectedProvider = useSelector(selectSelectedProvider);
  const orders = useSelector(getOrders);
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

  const fetchProviders = useCallback(
    async (
      fetchRegion?: string,
      options?: ExecuteRequestOptions & {
        provider?: string | string[];
        crypto?: string | string[];
        fiat?: string | string[];
        payments?: string | string[];
      },
    ) =>
      await Engine.context.RampsController.getProviders(
        fetchRegion ?? regionCode,
        options,
      ),
    [regionCode],
  );

  const setSelectedProvider = useCallback((provider: Provider) => {
    if(provider?.id) {  
      Engine.context.RampsController.setSelectedProvider(provider.id);
    } else {
      throw new Error('Provider ID is required');
    }
  }, []);

  useEffect(() => {
    console.log('[useRampsProviders] useEffect:', {
      orders: orders.length,
      providers: providers.length,
      selectedProvider,
    });

    if (selectedProvider) {
      console.log('[useRampsProviders] Provider already set, skipping auto-selection');
      return;
    }

    if (providers.length === 0) {
      return;
    }

    const determinedProvider = determinePreferredProvider(orders, providers);

    console.log('[useRampsProviders] determinedProvider:', {
      determinedProvider,
    });

    if (determinedProvider) {
      setSelectedProvider(determinedProvider);
    }
  }, [orders, providers, setSelectedProvider, selectedProvider]);

  return {
    providers,
    selectedProvider,
    isLoading: isFetching,
    error,
    fetchProviders,
    setSelectedProvider,
  };
}

export default useRampsProviders;
