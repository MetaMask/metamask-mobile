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
/**
 * @param options.enableSideEffects - When true, runs region-change invalidation and provider auto-selection.
 * Should only be true in RampsBootstrap to avoid duplicate side effects from multiple consumers.
 */
export function useRampsProviders(options?: {
  enableSideEffects?: boolean;
}): UseRampsProvidersResult {
  const enableSideEffects = options?.enableSideEffects ?? false;
  const {
    data: providersStateData,
    selected: selectedProvider,
    isLoading: providersStateIsLoading,
    error: providersStateError,
  } = useSelector(selectProviders);

  const userRegion = useSelector(selectUserRegion);
  const regionCode = userRegion?.regionCode ?? '';
  const queryClient = useQueryClient();

  // Mark all ramp queries as stale when region changes so that switching
  // back to a previously visited region triggers a fresh fetch instead of
  // serving cached data. refetchType: 'none' avoids a duplicate fetch —
  // the query-key change already causes React Query to fetch for the new
  // region; without 'none', invalidateQueries would trigger a second fetch
  // on the same active query.
  const prevRegionRef = useRef(regionCode);
  useEffect(() => {
    if (
      enableSideEffects &&
      regionCode &&
      prevRegionRef.current !== regionCode
    ) {
      prevRegionRef.current = regionCode;
      queryClient.invalidateQueries({
        queryKey: ['ramps'],
        refetchType: 'none',
      });
    }
  }, [enableSideEffects, regionCode, queryClient]);

  const providersQuery = useQuery({
    ...rampsQueries.providers.options({ regionCode }),
    enabled: Boolean(regionCode),
  });

  // Keep a stable array reference for hook dependencies.
  // React Query is authoritative when present; fallback to controller state
  // keeps initial renders and test mocks resilient.
  const providers = useMemo(
    () => providersQuery?.data ?? providersStateData ?? [],
    [providersQuery?.data, providersStateData],
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
    (provider: Provider | null, setOptions?: { autoSelected?: boolean }) =>
      Engine.context.RampsController.setSelectedProvider(
        provider?.id ?? null,
        setOptions,
      ),
    [],
  );

  useEffect(() => {
    if (
      enableSideEffects &&
      providers &&
      providers.length > 0 &&
      !selectedProvider
    ) {
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
  }, [enableSideEffects, providers, selectedProvider, completedOrders]);

  return {
    providers,
    selectedProvider,
    setSelectedProvider,
    isLoading: providersQuery?.isLoading ?? providersStateIsLoading,
    error:
      providersQuery?.error instanceof Error
        ? providersQuery.error.message
        : providersStateError,
  };
}

export default useRampsProviders;
