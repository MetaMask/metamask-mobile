import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
 * Hook to get providers via React Query.
 *
 * The query fires when the region changes. Provider data is read from the
 * React Query cache (not controller state) so that region-switching with
 * cached data works correctly.
 *
 * @returns Providers state.
 */
export function useRampsProviders(): UseRampsProvidersResult {
  const { selected: selectedProvider } = useSelector(selectProviders);

  const userRegion = useSelector(selectUserRegion);
  const regionCode = userRegion?.regionCode ?? '';
  const queryClient = useQueryClient();

  // Invalidate all ramp queries when region changes so that stale cached
  // data from a previous region is not served. The queryFn will re-run,
  // hit the controller's internal executeRequest cache (fast), and
  // repopulate controller state.
  const prevRegionRef = useRef(regionCode);
  useEffect(() => {
    if (regionCode && prevRegionRef.current !== regionCode) {
      prevRegionRef.current = regionCode;
      queryClient.invalidateQueries({ queryKey: ['ramps'] });
    }
  }, [regionCode, queryClient]);

  const providersQuery = useQuery({
    ...rampsQueries.providers.options({ regionCode }),
    enabled: Boolean(regionCode),
  });

  // Keep a stable array reference for hook dependencies.
  const providers = useMemo(
    () => providersQuery.data ?? [],
    [providersQuery.data],
  );

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
        (
          Engine.context.RampsController as {
            setSelectedProvider: (
              providerOrId: Provider | string | null,
              options?: { autoSelected?: boolean },
            ) => void;
          }
        ).setSelectedProvider(result.provider, {
          autoSelected: result.autoSelected,
        });
      }
    }
  }, [providers, selectedProvider, completedOrders]);

  return {
    providers,
    selectedProvider,
    setSelectedProvider,
    isLoading: providersQuery.isLoading,
    error:
      providersQuery.error instanceof Error
        ? providersQuery.error.message
        : null,
  };
}

export default useRampsProviders;
