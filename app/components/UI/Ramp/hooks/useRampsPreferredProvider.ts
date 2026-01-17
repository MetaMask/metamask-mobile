import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPreferredProvider } from '../../../../selectors/rampsController';
import type { Provider } from '@metamask/ramps-controller';

/**
 * Result returned by the useRampsPreferredProvider hook.
 */
export interface UseRampsPreferredProviderResult {
  /**
   * The user's preferred provider, or null if not set.
   */
  preferredProvider: Provider | null;
  /**
   * Set the user's preferred provider.
   */
  setPreferredProvider: (provider: Provider | null) => void;
}

/**
 * Hook to get and set the user's preferred provider from RampsController.
 * This hook assumes Engine is already initialized.
 *
 * @returns Preferred provider state and setter function.
 */
export function useRampsPreferredProvider(): UseRampsPreferredProviderResult {
  const preferredProvider = useSelector(selectPreferredProvider);

  const setPreferredProvider = useCallback(
    (provider: Provider | null) => {
      Engine.context.RampsController.setPreferredProvider(provider);
    },
    [],
  );

  return {
    preferredProvider,
    setPreferredProvider,
  };
}

export default useRampsPreferredProvider;
