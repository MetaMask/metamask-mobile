import { useCallback, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import type {
  PerpsProviderType,
  SwitchProviderResult,
  ToggleTestnetResult,
} from '../controllers/types';

/**
 * Hook for network and provider configuration
 * Provides methods for switching networks and providers
 */
export function usePerpsNetworkConfig() {
  const toggleTestnet = useCallback(async (): Promise<ToggleTestnetResult> => {
    const controller = Engine.context.PerpsController;
    return controller.toggleTestnet();
  }, []);

  const getCurrentNetwork = useCallback((): 'mainnet' | 'testnet' => {
    const controller = Engine.context.PerpsController;
    return controller.getCurrentNetwork();
  }, []);

  const switchProvider = useCallback(
    async (providerId: PerpsProviderType): Promise<SwitchProviderResult> => {
      const controller = Engine.context.PerpsController;
      return controller.switchProvider(providerId);
    },
    [],
  );

  const disconnect = useCallback(async (): Promise<void> => {
    const controller = Engine.context.PerpsController;
    return controller.disconnect();
  }, []);

  return useMemo(
    () => ({
      toggleTestnet,
      getCurrentNetwork,
      switchProvider,
      disconnect,
    }),
    [toggleTestnet, getCurrentNetwork, switchProvider, disconnect],
  );
}
