import { useCallback, useEffect, useRef, useState } from 'react';
import {
  InitializationState,
  type GetOrderCapabilitiesParams,
  type PerpsOrderCapabilities,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectPerpsInitializationState,
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import { selectPerpsMobileChaseEnabledFlag } from '../selectors/featureFlags';
import {
  PERPS_ORDER_CAPABILITIES_MAX_RETRIES,
  PERPS_ORDER_CAPABILITIES_RETRY_BASE_DELAY_MS,
} from '../constants/perpsConfig';

interface ChaseCapabilitiesController {
  getOrderCapabilities?: (
    params: GetOrderCapabilitiesParams,
  ) => Promise<PerpsOrderCapabilities>;
}

const supportsChase = (capabilities: PerpsOrderCapabilities): boolean =>
  capabilities.status === 'ready' &&
  capabilities.supportedStrategies.includes('chase');

const getCapabilities = async (
  controller: ChaseCapabilitiesController,
  params: GetOrderCapabilitiesParams,
): Promise<PerpsOrderCapabilities | undefined> => {
  try {
    return await controller.getOrderCapabilities?.(params);
  } catch {
    return undefined;
  }
};

const isTransientCapabilityFailure = (
  capabilities: PerpsOrderCapabilities | undefined,
): boolean =>
  capabilities === undefined ||
  (capabilities.status === 'unavailable' &&
    capabilities.reason === 'provider_unavailable');

const resolveChaseProviderId = async ({
  controller,
  symbol,
  providerId,
  isCurrentRequest,
}: {
  controller: ChaseCapabilitiesController;
  symbol: string;
  providerId: PerpsProviderType;
  isCurrentRequest: () => boolean;
}): Promise<PerpsProviderType | null> => {
  for (
    let retryCount = 0;
    retryCount <= PERPS_ORDER_CAPABILITIES_MAX_RETRIES;
    retryCount += 1
  ) {
    const capabilities = await getCapabilities(controller, {
      symbol,
      providerId,
    });
    const shouldRetry =
      isTransientCapabilityFailure(capabilities) &&
      retryCount < PERPS_ORDER_CAPABILITIES_MAX_RETRIES;
    if (shouldRetry) {
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          PERPS_ORDER_CAPABILITIES_RETRY_BASE_DELAY_MS * 2 ** retryCount,
        ),
      );
      if (!isCurrentRequest()) return null;
      continue;
    }

    if (capabilities?.status === 'ready' && supportsChase(capabilities)) {
      return capabilities.providerId;
    }
    return null;
  }

  return null;
};

export const usePerpsChaseEligibility = (
  symbol: string,
  marketProviderId?: PerpsProviderType,
) => {
  const isFlagEnabled = useSelector(selectPerpsMobileChaseEnabledFlag);
  const providerId = useSelector(selectPerpsProvider);
  const perpsNetwork = useSelector(selectPerpsNetwork);
  const initializationState = useSelector(selectPerpsInitializationState);
  const [isCapabilityEnabled, setIsCapabilityEnabled] = useState(false);
  const [resolvedProviderId, setResolvedProviderId] =
    useState<PerpsProviderType | null>(null);
  const [resolvedRouteKey, setResolvedRouteKey] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const isMounted = useRef(true);
  const concreteProviderId =
    marketProviderId ?? (providerId === 'aggregated' ? undefined : providerId);
  const routeKey = concreteProviderId
    ? `${symbol}:${concreteProviderId}:${perpsNetwork}:${initializationState}`
    : null;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      requestGeneration.current += 1;
    };
  }, []);

  const refreshCapability =
    useCallback(async (): Promise<PerpsProviderType | null> => {
      const generation = ++requestGeneration.current;
      const isCurrentRequest = () =>
        isMounted.current && generation === requestGeneration.current;
      const commit = (nextProviderId: PerpsProviderType | null) => {
        if (!isCurrentRequest()) return null;
        setResolvedProviderId(nextProviderId);
        setResolvedRouteKey(routeKey);
        setIsCapabilityEnabled(nextProviderId !== null);
        return nextProviderId;
      };
      if (!isFlagEnabled) {
        return commit(null);
      }

      if (initializationState !== InitializationState.Initialized) {
        if (initializationState === InitializationState.Failed) {
          return commit(null);
        }
        return null;
      }

      const controller = Engine.context
        .PerpsController as typeof Engine.context.PerpsController &
        ChaseCapabilitiesController;
      if (!controller.getOrderCapabilities) {
        return commit(null);
      }

      if (!concreteProviderId) {
        return commit(null);
      }

      const nextProviderId = await resolveChaseProviderId({
        controller,
        symbol,
        providerId: concreteProviderId,
        isCurrentRequest,
      });
      return commit(nextProviderId);
    }, [
      concreteProviderId,
      initializationState,
      isFlagEnabled,
      routeKey,
      symbol,
    ]);

  useEffect(() => {
    refreshCapability();
  }, [refreshCapability]);

  return {
    isFlagEnabled,
    isCapabilityPending:
      isFlagEnabled && routeKey !== null && resolvedRouteKey !== routeKey,
    isChaseEnabled:
      isFlagEnabled && isCapabilityEnabled && resolvedRouteKey === routeKey,
    resolvedProviderId:
      resolvedRouteKey === routeKey ? resolvedProviderId : null,
    refreshCapability,
  };
};
