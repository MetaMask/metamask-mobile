import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  selectProviders,
  selectProvidersLoading,
  selectProvidersError,
  selectSelectedProvider,
} from '../../../../selectors/rampsController';
import { type Provider } from '@metamask/ramps-controller';
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
 * @returns Providers state.
 */
export function useRampsProviders(): UseRampsProvidersResult {
  const providers = useSelector(selectProviders);
  const selectedProvider = useSelector(selectSelectedProvider);
  const isLoading = useSelector(selectProvidersLoading);
  const error = useSelector(selectProvidersError);

  const setSelectedProvider = useCallback((provider: Provider | null) => {
    Engine.context.RampsController.setSelectedProvider(provider?.id ?? null);
  }, []);

  return {
    providers,
    selectedProvider,
    setSelectedProvider,
    isLoading,
    error,
  };
}

export default useRampsProviders;
