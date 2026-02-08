import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPerpsProvider } from '../selectors/perpsController';
import { selectPerpsMYXProviderEnabledFlag } from '../selectors/featureFlags';
import type {
  PerpsProviderType,
  PerpsActiveProviderMode,
  SwitchProviderResult,
} from '../controllers/types';

/**
 * Hook for managing perps provider selection
 *
 * Provides:
 * - Current active provider
 * - Available providers based on feature flags
 * - Method to switch between providers
 */
export function usePerpsProvider() {
  const activeProvider = useSelector(selectPerpsProvider);
  const isMYXProviderEnabled = useSelector(selectPerpsMYXProviderEnabledFlag);

  /**
   * Get list of available providers based on feature flags
   */
  const availableProviders = useMemo((): PerpsProviderType[] => {
    const providers: PerpsProviderType[] = ['hyperliquid'];

    if (isMYXProviderEnabled) {
      providers.push('myx');
    }

    return providers;
  }, [isMYXProviderEnabled]);

  /**
   * Switch to a different provider
   */
  const switchProvider = useCallback(
    async (
      providerId: PerpsActiveProviderMode,
    ): Promise<SwitchProviderResult> => {
      const controller = Engine.context.PerpsController;
      return controller.switchProvider(providerId);
    },
    [],
  );

  /**
   * Check if a specific provider is available
   */
  const isProviderAvailable = useCallback(
    (providerId: PerpsProviderType): boolean =>
      availableProviders.includes(providerId),
    [availableProviders],
  );

  /**
   * Check if the current provider is MYX
   */
  const isMYXProvider = useMemo(
    () => activeProvider === 'myx',
    [activeProvider],
  );

  /**
   * Check if the current provider is HyperLiquid
   */
  const isHyperLiquidProvider = useMemo(
    () => activeProvider === 'hyperliquid',
    [activeProvider],
  );

  /**
   * Check if multi-provider mode is enabled (more than one provider available)
   */
  const isMultiProviderEnabled = useMemo(
    () => availableProviders.length > 1,
    [availableProviders],
  );

  return {
    // Current state
    activeProvider,
    availableProviders,

    // Actions
    switchProvider,

    // Helpers
    isProviderAvailable,
    isMYXProvider,
    isHyperLiquidProvider,
    isMultiProviderEnabled,
  };
}
