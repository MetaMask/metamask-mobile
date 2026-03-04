import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  selectProviders,
  selectRampsOrders,
} from '../../../../selectors/rampsController';
import { type Provider } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import {
  determinePreferredProvider,
  completedOrdersFromFiatOrders,
  completedOrdersFromRampsOrders,
} from '../utils/determinePreferredProvider';
import { getOrders } from '../../../../reducers/fiatOrders';

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
 * @returns Providers state.
 */
export function useRampsProviders(): UseRampsProvidersResult {
  const {
    data: providers,
    selected: selectedProvider,
    isLoading,
    error,
  } = useSelector(selectProviders);

  const legacyOrders = useSelector(getOrders);
  const controllerOrders = useSelector(selectRampsOrders);

  const completedOrders = useMemo(
    () => [
      ...completedOrdersFromFiatOrders(legacyOrders),
      ...completedOrdersFromRampsOrders(controllerOrders),
    ],
    [legacyOrders, controllerOrders],
  );

  const setSelectedProvider = useCallback(
    (provider: Provider | null) =>
      Engine.context.RampsController.setSelectedProvider(provider?.id ?? null),
    [],
  );

  const hasRunWithEmptyOrdersRef = useRef(false);

  useEffect(() => {
    if (providers.length === 0) return;

    const hasOrders = completedOrders.length > 0;

    const shouldEvaluate =
      !selectedProvider || (hasRunWithEmptyOrdersRef.current && hasOrders);

    if (shouldEvaluate) {
      const preferred = determinePreferredProvider(completedOrders, providers);
      if (preferred) {
        setSelectedProvider(preferred);
      }
    }

    if (!hasOrders) {
      hasRunWithEmptyOrdersRef.current = true;
    }
  }, [providers, selectedProvider, setSelectedProvider, completedOrders]);

  return {
    providers,
    selectedProvider,
    setSelectedProvider,
    isLoading,
    error,
  };
}

export default useRampsProviders;
