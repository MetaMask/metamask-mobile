import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { strings } from '../../../../../locales/i18n';
import {
  selectProviders,
  selectUserRegion,
} from '../../../../selectors/rampsController';
import { type Provider } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { parseUserFacingError } from '../utils/parseUserFacingError';
import { rampsQueries } from '../queries';
import {
  useProviderPickerOptions,
  usePreviouslyUsedProviderIds,
} from './useProviderPickerOptions';
import {
  isBuyScreenOwningProviderPick,
  recordUserProviderPick,
} from './providerPickCoordination';

const EMPTY_PROVIDERS: Provider[] = [];

/**
 * Result returned by the useRampsProviders hook.
 */
export interface UseRampsProvidersResult {
  /**
   * The list of providers available for the current region.
   */
  providers: Provider[];
  /**
   * The controller's copy of the provider list, which the pick reads. It can
   * arrive after the React Query copy in `providers`.
   */
  controllerProviders: Provider[];
  /**
   * Ids of the region's providers the user has completed a buy with, most
   * recent first. Stable while the list is unchanged.
   */
  previouslyUsedProviderIds: string[];
  /**
   * The currently selected provider, or null if none selected.
   */
  selectedProvider: Provider | null;
  /**
   * Sets the selected provider by ID.
   * @param provider - The provider to select, or null to clear selection.
   * @param options - Optional settings forwarded to the controller.
   * @param options.autoSelected - When true the selection is treated as a system guess rather than an explicit user choice.
   * @param options.userSelected - When true the provider is recorded as the user's own pick, which later picks return to.
   */
  setSelectedProvider: (
    provider: Provider | null,
    options?: { autoSelected?: boolean; userSelected?: boolean },
  ) => void;
  /**
   * Selects the provider for the asset (user pick, ahead-of-history flag
   * list, most recent completed buy, then API ranking) and returns its id, or
   * null when none offers it.
   */
  selectProviderForAsset: (
    assetId: string,
    options?: { excludeProviderIds?: string[] },
  ) => string | null;
  /**
   * Switches providers.selected to the first provider that serves the given
   * CAIP-19 asset, when the currently selected provider does not.
   * No-op when providers are not loaded, the current provider already serves
   * the asset, or no alternative does. Returns true if a switch was made.
   *
   * Delegates to RampsController:setSelectedProviderForAsset (MetaMask/core#9759).
   */
  setSelectedProviderForAsset: (
    assetId: string,
    options?: { autoSelected?: boolean },
  ) => boolean;
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
  const providersState = useSelector(selectProviders);
  const {
    data: providersStateData,
    selected: selectedProvider,
    isLoading: providersStateIsLoading,
    error: providersStateError,
  } = providersState;

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
    () => providersQuery?.data?.providers ?? providersStateData ?? [],
    [providersQuery?.data?.providers, providersStateData],
  );
  const pickerOptions = useProviderPickerOptions(providers);
  // A string, so the pick below re-runs when the list of previously used
  // providers changes and not on every order status poll.
  const previouslyUsedKey = usePreviouslyUsedProviderIds(providers).join(',');
  const previouslyUsedProviderIds = useMemo(
    () => (previouslyUsedKey ? previouslyUsedKey.split(',') : []),
    [previouslyUsedKey],
  );

  const setSelectedProvider = useCallback(
    (
      provider: Provider | null,
      setOptions?: { autoSelected?: boolean; userSelected?: boolean },
    ) => {
      if (provider && setOptions?.userSelected) {
        recordUserProviderPick(provider.id);
      }
      Engine.context.RampsController.setSelectedProvider(
        provider?.id ?? null,
        setOptions,
      );
    },
    [],
  );

  const setSelectedProviderForAsset = useCallback(
    (assetId: string, setOptions?: { autoSelected?: boolean }): boolean =>
      Engine.context.RampsController.setSelectedProviderForAsset(
        assetId,
        setOptions,
      ),
    [],
  );

  const selectProviderForAsset = useCallback(
    (
      assetId: string,
      selectOptions?: { excludeProviderIds?: string[] },
    ): string | null =>
      Engine.context.RampsController.selectProviderForAsset(assetId, {
        ...pickerOptions,
        ...selectOptions,
      }),
    [pickerOptions],
  );

  const hasSelectedProvider = Boolean(selectedProvider);

  // Picks when the controller's provider list loads, when the selection is
  // cleared and when order history changes (order sync can finish after
  // start-up). Reads the controller directly because Redux lags behind it.
  // Leaves a selection alone unless the app made it, and leaves the pick to
  // the Buy screen while it is mounted.
  useEffect(() => {
    if (!enableSideEffects || isBuyScreenOwningProviderPick()) {
      return;
    }
    const controller = Engine.context.RampsController;
    const {
      providers: { selected },
      providerAutoSelected,
      tokens,
    } = controller.state;
    if (selected && !providerAutoSelected) {
      return;
    }
    controller.selectProviderForAsset(
      tokens.selected?.assetId ?? null,
      pickerOptions,
    );
  }, [
    enableSideEffects,
    // The picker reads the controller's list, which can arrive after the
    // React Query copy in `providers`.
    providersStateData,
    providers,
    previouslyUsedKey,
    hasSelectedProvider,
    pickerOptions,
  ]);

  let error: string | null = null;

  if (providersQuery?.error != null) {
    error = parseUserFacingError(
      providersQuery.error,
      strings('fiat_on_ramp.payment_error'),
    );
  } else if (providersStateError) {
    error = parseUserFacingError(
      providersState,
      strings('fiat_on_ramp.payment_error'),
    );
  }

  return {
    providers,
    controllerProviders: providersStateData ?? EMPTY_PROVIDERS,
    previouslyUsedProviderIds,
    selectedProvider,
    setSelectedProvider,
    setSelectedProviderForAsset,
    selectProviderForAsset,
    isLoading: providersQuery?.isLoading ?? providersStateIsLoading,
    error,
  };
}

export default useRampsProviders;
