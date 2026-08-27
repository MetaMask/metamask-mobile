import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  InitializationState,
  type GetOrderCapabilitiesParams,
  type PerpsActiveProviderMode,
  type PerpsOrderCapabilities,
  type SwitchProviderResult,
} from '@metamask/perps-controller';
import {
  selectPerpsInitializationState,
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import { selectPerpsMYXProviderEnabledFlag } from '../selectors/featureFlags';
import {
  PERPS_ORDER_CAPABILITIES_MAX_RETRIES,
  PERPS_ORDER_CAPABILITIES_RETRY_BASE_DELAY_MS,
} from '../constants/perpsConfig';

interface OrderCapabilitiesState {
  requestKey?: string;
  capabilities: PerpsOrderCapabilities | null;
  isLoading: boolean;
}

type ReadyOrderCapabilities = Extract<
  PerpsOrderCapabilities,
  { status: 'ready' }
>;
type SupportedOrderStrategy =
  ReadyOrderCapabilities['supportedStrategies'][number];
type OrderCapabilityProviderId = ReadyOrderCapabilities['providerId'];

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
  const perpsNetwork = useSelector(selectPerpsNetwork);
  const initializationState = useSelector(selectPerpsInitializationState);

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

  const capabilityRequestKey =
    orderCapabilitiesParams?.symbol &&
    initializationState === InitializationState.Initialized
      ? JSON.stringify([
          orderCapabilitiesParams.providerId,
          orderCapabilitiesParams.symbol,
          activeProvider,
          perpsNetwork,
          initializationState,
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
  const isAwaitingCapabilityInitialization =
    Boolean(orderCapabilitiesParams?.symbol) &&
    (initializationState === InitializationState.Uninitialized ||
      initializationState === InitializationState.Initializing);
  const isLoadingOrderCapabilities =
    isAwaitingCapabilityInitialization ||
    (capabilityRequestKey !== undefined &&
      (!isCurrentCapabilityRequest || orderCapabilitiesState.isLoading));

  useEffect(() => {
    let isCurrent = true;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;
    const symbol = orderCapabilitiesParams?.symbol;
    const providerId = orderCapabilitiesParams?.providerId;

    if (!symbol || initializationState !== InitializationState.Initialized) {
      setOrderCapabilitiesState(EMPTY_ORDER_CAPABILITIES_STATE);
      return () => {
        isCurrent = false;
      };
    }
    const requestKey = JSON.stringify([
      providerId,
      symbol,
      activeProvider,
      perpsNetwork,
      initializationState,
    ]);
    setOrderCapabilitiesState({
      requestKey,
      capabilities: null,
      isLoading: true,
    });

    const loadCapabilities = async (retryCount = 0) => {
      try {
        const capabilities =
          await Engine.context.PerpsController.getOrderCapabilities({
            symbol,
            providerId,
          });
        if (!isCurrent) {
          return;
        }

        if (
          capabilities.status === 'unavailable' &&
          capabilities.reason === 'provider_unavailable' &&
          retryCount < PERPS_ORDER_CAPABILITIES_MAX_RETRIES
        ) {
          retryTimeout = setTimeout(
            () => {
              retryTimeout = undefined;
              loadCapabilities(retryCount + 1);
            },
            PERPS_ORDER_CAPABILITIES_RETRY_BASE_DELAY_MS * 2 ** retryCount,
          );
          return;
        }

        setOrderCapabilitiesState({
          requestKey,
          capabilities,
          isLoading: false,
        });
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
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [
    activeProvider,
    initializationState,
    orderCapabilitiesParams?.providerId,
    orderCapabilitiesParams?.symbol,
    perpsNetwork,
  ]);

  const supportsTwapOrders =
    orderCapabilities?.status === 'ready' &&
    orderCapabilities.supportedStrategies.includes('twap');
  const supportsScaleOrders =
    orderCapabilities?.status === 'ready' &&
    orderCapabilities.supportedStrategies.includes('scale');
  const checkOrderCapability = useCallback(
    async (
      strategy: SupportedOrderStrategy,
      expectedProviderId?: OrderCapabilityProviderId,
    ): Promise<boolean> => {
      const symbol = orderCapabilitiesParams?.symbol;
      if (!symbol || initializationState !== InitializationState.Initialized) {
        return false;
      }

      try {
        const capabilities =
          await Engine.context.PerpsController.getOrderCapabilities({
            symbol,
            providerId: orderCapabilitiesParams?.providerId,
          });
        return (
          capabilities.status === 'ready' &&
          capabilities.supportedStrategies.includes(strategy) &&
          (!expectedProviderId ||
            capabilities.providerId === expectedProviderId)
        );
      } catch {
        return false;
      }
    },
    [
      initializationState,
      orderCapabilitiesParams?.providerId,
      orderCapabilitiesParams?.symbol,
    ],
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
    isLoadingOrderCapabilities,
    orderCapabilities,
    supportsTwapOrders,
    supportsScaleOrders,
    checkOrderCapability,
    isMultiProviderEnabled,
  };
}
