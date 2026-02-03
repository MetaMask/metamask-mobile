import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectProviders } from '../../../../selectors/rampsController';
import { type Provider } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { getOrders } from '../../../../reducers/fiatOrders';
import { determinePreferredProvider } from '../utils/determinePreferredProvider';

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
  const orders = useSelector(getOrders);

  const setSelectedProvider = useCallback(
    (provider: Provider | null) =>
      Engine.context.RampsController.setSelectedProvider(provider?.id ?? null),
    [],
  );

  useEffect(() => {
    if (isLoading || providers.length === 0 || selectedProvider !== null) {
      return;
    }
    const preferred = determinePreferredProvider(orders, providers);
    if (preferred) {
      setSelectedProvider(preferred);
    }
  }, [orders, providers, isLoading, selectedProvider, setSelectedProvider]);

  return {
    providers,
    selectedProvider,
    setSelectedProvider,
    isLoading,
    error,
  };
}

export default useRampsProviders;
