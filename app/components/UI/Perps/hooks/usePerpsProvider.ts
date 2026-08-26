import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPerpsProvider } from '../selectors/perpsController';
import { selectPerpsMYXProviderEnabledFlag } from '../selectors/featureFlags';
import type {
  GetOrderCapabilitiesParams,
  PerpsActiveProviderMode,
  PerpsOrderCapabilities,
  SwitchProviderResult,
} from '@metamask/perps-controller';

interface OrderCapabilitiesState {
  requestKey?: string;
  capabilities: PerpsOrderCapabilities | null;
  isLoading: boolean;
}

const EMPTY_ORDER_CAPABILITIES_STATE: OrderCapabilitiesState = {
  capabilities: null,
  isLoading: false,
};

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

  const capabilityRequestKey = orderCapabilitiesParams?.symbol
    ? JSON.stringify([
        orderCapabilitiesParams.providerId,
        orderCapabilitiesParams.symbol,
      ])
    : undefined;
  const [orderCapabilitiesState, setOrderCapabilitiesState] =
    useState<OrderCapabilitiesState>(EMPTY_ORDER_CAPABILITIES_STATE);
  const isCurrentCapabilityRequest =
    capabilityRequestKey !== undefined &&
    orderCapabilitiesState.requestKey === capabilityRequestKey;
  const orderCapabilities = isCurrentCapabilityRequest
    ? orderCapabilitiesState.capabilities
    : null;
  const isLoadingOrderCapabilities =
    capabilityRequestKey !== undefined &&
    (!isCurrentCapabilityRequest || orderCapabilitiesState.isLoading);

  useEffect(() => {
    let isCurrent = true;
    const symbol = orderCapabilitiesParams?.symbol;
    const providerId = orderCapabilitiesParams?.providerId;

    if (!symbol) {
      setOrderCapabilitiesState(EMPTY_ORDER_CAPABILITIES_STATE);
      return () => {
        isCurrent = false;
      };
    }
    const requestKey = JSON.stringify([providerId, symbol]);
    setOrderCapabilitiesState({
      requestKey,
      capabilities: null,
      isLoading: true,
    });

    const loadCapabilities = async () => {
      try {
        const capabilities =
          await Engine.context.PerpsController.getOrderCapabilities({
            symbol,
            providerId,
          });
        if (isCurrent) {
          setOrderCapabilitiesState({
            requestKey,
            capabilities,
            isLoading: false,
          });
        }
      } catch {
        if (isCurrent) {
          setOrderCapabilitiesState({
            requestKey,
            capabilities: null,
            isLoading: false,
          });
        }
      }
    };

    loadCapabilities();

    return () => {
      isCurrent = false;
    };
  }, [orderCapabilitiesParams?.providerId, orderCapabilitiesParams?.symbol]);

  const supportsTwapOrders =
    orderCapabilities?.status === 'ready' &&
    orderCapabilities.supportedStrategies.includes('twap');

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
    isLoadingOrderCapabilities,
    orderCapabilities,
    supportsTwapOrders,
    isMultiProviderEnabled,
  };
}
