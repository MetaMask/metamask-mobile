import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPerpsProvider } from '../selectors/perpsController';
import { selectPerpsMYXProviderEnabledFlag } from '../selectors/featureFlags';
import type {
  GetOrderCapabilitiesParams,
  PerpsActiveProviderMode,
  SwitchProviderResult,
} from '@metamask/perps-controller';

/**
 * Hook for managing perps provider selection
 *
 * Provides:
 * - Current active provider
 * - Available providers based on feature flags
 * - Method to switch between providers
 */
export function usePerpsProvider(
  orderCapabilitiesParams?: GetOrderCapabilitiesParams,
) {
  const activeProvider = useSelector(selectPerpsProvider);
  const isMYXProviderEnabled = useSelector(selectPerpsMYXProviderEnabledFlag);

  /**
   * Get list of available providers based on feature flags
   */
  const availableProviders = useMemo((): PerpsActiveProviderMode[] => {
    const providers: PerpsActiveProviderMode[] = ['hyperliquid'];

    if (isMYXProviderEnabled) {
      providers.push('myx');
      providers.push('aggregated');
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
    (providerId: PerpsActiveProviderMode): boolean =>
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

  const [supportsTwapOrders, setSupportsTwapOrders] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const symbol = orderCapabilitiesParams?.symbol;
    const providerId = orderCapabilitiesParams?.providerId;

    setSupportsTwapOrders(false);
    if (!symbol) {
      return () => {
        isCurrent = false;
      };
    }

    const loadCapabilities = async () => {
      try {
        const capabilities =
          await Engine.context.PerpsController.getOrderCapabilities({
            symbol,
            providerId,
          });
        if (isCurrent) {
          setSupportsTwapOrders(
            capabilities.status === 'ready' &&
              capabilities.supportedStrategies.includes('twap'),
          );
        }
      } catch {
        if (isCurrent) {
          setSupportsTwapOrders(false);
        }
      }
    };

    loadCapabilities();

    return () => {
      isCurrent = false;
    };
  }, [orderCapabilitiesParams?.providerId, orderCapabilitiesParams?.symbol]);

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
    supportsTwapOrders,
    isMultiProviderEnabled,
  };
}
