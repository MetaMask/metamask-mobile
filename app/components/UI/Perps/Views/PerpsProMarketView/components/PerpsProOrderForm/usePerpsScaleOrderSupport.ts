import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../../../../core/Engine';

interface ScaleOrderCapabilities {
  status: string;
  supportedStrategies: readonly string[];
}

interface PerpsControllerWithOrderCapabilities {
  getOrderCapabilities?: (params: {
    symbol: string;
    providerId?: string;
  }) => ScaleOrderCapabilities | Promise<ScaleOrderCapabilities>;
}

interface UsePerpsScaleOrderSupportParams {
  enabled: boolean;
  symbol: string;
  providerId?: string;
}

interface ScaleSupportState {
  routeKey: string;
  status: 'pending' | 'supported' | 'unsupported';
  isSupported: boolean;
}

/**
 * Resolves Scale support for the currently selected provider route.
 *
 * Controller v12 does not expose strategy capabilities, so the optional
 * structural boundary deliberately fails closed until the temporary package is
 * replaced by registry controller v13.
 */
export const usePerpsScaleOrderSupport = ({
  enabled,
  symbol,
  providerId,
}: UsePerpsScaleOrderSupportParams) => {
  const routeKey = `${symbol}:${providerId ?? ''}`;
  const currentRouteKeyRef = useRef(routeKey);
  const requestIdRef = useRef(0);
  currentRouteKeyRef.current = routeKey;
  const [supportState, setSupportState] = useState<ScaleSupportState>({
    routeKey,
    status: enabled && symbol && providerId ? 'pending' : 'unsupported',
    isSupported: false,
  });

  const refreshScaleOrderSupport = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!enabled || !symbol || !providerId) {
      if (currentRouteKeyRef.current === routeKey) {
        setSupportState({
          routeKey,
          status: 'unsupported',
          isSupported: false,
        });
      }
      return false;
    }

    setSupportState((currentState) => ({
      routeKey,
      status: 'pending',
      isSupported: currentState.isSupported,
    }));

    const controller = Engine.context
      .PerpsController as unknown as PerpsControllerWithOrderCapabilities;
    const getOrderCapabilities =
      controller.getOrderCapabilities?.bind(controller);

    let isSupported = false;
    try {
      const capabilities = await getOrderCapabilities?.({ symbol, providerId });
      isSupported = Boolean(
        capabilities &&
          capabilities.status === 'ready' &&
          capabilities.supportedStrategies.includes('scale'),
      );
    } catch {
      isSupported = false;
    }

    if (
      currentRouteKeyRef.current !== routeKey ||
      requestIdRef.current !== requestId
    ) {
      return false;
    }

    setSupportState({
      routeKey,
      status: isSupported ? 'supported' : 'unsupported',
      isSupported,
    });
    return isSupported;
  }, [enabled, providerId, routeKey, symbol]);

  useEffect(() => {
    refreshScaleOrderSupport();

    return () => {
      requestIdRef.current += 1;
    };
  }, [refreshScaleOrderSupport]);

  return useMemo(
    () => ({
      supportsScaleOrders:
        Boolean(enabled && symbol && providerId) && supportState.isSupported,
      isScaleOrderSupportPending:
        Boolean(enabled && symbol && providerId) &&
        (supportState.routeKey !== routeKey ||
          supportState.status === 'pending'),
      checkScaleOrderSupport: refreshScaleOrderSupport,
    }),
    [
      enabled,
      providerId,
      refreshScaleOrderSupport,
      routeKey,
      supportState,
      symbol,
    ],
  );
};
