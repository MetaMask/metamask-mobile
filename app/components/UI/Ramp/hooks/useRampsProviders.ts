import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import {
  selectProviders,
  selectUserRegion,
  selectRampsOrdersForSelectedAccountGroup,
} from '../../../../selectors/rampsController';
import { type Provider } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import {
  determinePreferredProvider,
  completedOrdersFromFiatOrders,
  completedOrdersFromRampsOrders,
} from '../utils/determinePreferredProvider';
import { getOrders } from '../../../../reducers/fiatOrders';
import { rampsQueries } from '../queries';

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
   * Sets the selected provider by ID.
   * @param provider - The provider to select, or null to clear selection.
   * @param options - Optional settings forwarded to the controller.
   * @param options.autoSelected - When true the selection is treated as a system guess rather than an explicit user choice.
   */
  setSelectedProvider: (
    provider: Provider | null,
    options?: { autoSelected?: boolean },
  ) => void;
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
 * Uses react-query with a 15min staleTime and refetchOnMount so that
 * providers (including supportedCryptoCurrencies) are refreshed when
 * stale data is detected on mount.
 *
 * @returns Providers state.
 */
export function useRampsProviders(): UseRampsProvidersResult {
  const {
    data: providers,
    selected: selectedProvider,
    isLoading,
    error,
  } = useSelector(selectProviders);

  const userRegion = useSelector(selectUserRegion);
  const regionCode = userRegion?.regionCode ?? '';

  useQuery({
    ...rampsQueries.providers.options({ regionCode }),
    enabled: Boolean(regionCode),
  });

  const legacyOrders = useSelector(getOrders);
  const controllerOrders = useSelector(
    selectRampsOrdersForSelectedAccountGroup,
  );

  const completedOrders = useMemo(
    () => [
      ...completedOrdersFromFiatOrders(legacyOrders),
      ...completedOrdersFromRampsOrders(controllerOrders),
    ],
    [legacyOrders, controllerOrders],
  );

  const setSelectedProvider = useCallback(
    (provider: Provider | null, options?: { autoSelected?: boolean }) =>
      Engine.context.RampsController.setSelectedProvider(
        provider?.id ?? null,
        options,
      ),
    [],
  );

  useEffect(() => {
    if (providers && providers.length > 0 && !selectedProvider) {
      const result = determinePreferredProvider(completedOrders, providers);
      if (result) {
        Engine.context.RampsController.setSelectedProvider(result.provider.id, {
          autoSelected: result.autoSelected,
        });
      }
    }
  }, [providers, selectedProvider, completedOrders]);

  return {
    providers,
    selectedProvider,
    setSelectedProvider,
    isLoading,
    error,
  };
}

export default useRampsProviders;
