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
  currentRouteKeyRef.current = routeKey;
  const [supportState, setSupportState] = useState<ScaleSupportState>({
    routeKey: '',
    isSupported: false,
  });

  const checkScaleOrderSupport = useCallback(async () => {
    if (!enabled || !symbol || !providerId) {
      return false;
    }

    const controller = Engine.context
      .PerpsController as unknown as PerpsControllerWithOrderCapabilities;
    const getOrderCapabilities =
      controller.getOrderCapabilities?.bind(controller);

    if (!getOrderCapabilities) {
      return false;
    }

    try {
      const capabilities = await getOrderCapabilities({ symbol, providerId });
      return (
        currentRouteKeyRef.current === routeKey &&
        capabilities.status === 'ready' &&
        capabilities.supportedStrategies.includes('scale')
      );
    } catch {
      return false;
    }
  }, [enabled, providerId, routeKey, symbol]);

  useEffect(() => {
    let isCurrent = true;

    setSupportState({ routeKey, isSupported: false });

    if (!enabled || !symbol || !providerId) {
      return () => {
        isCurrent = false;
      };
    }

    checkScaleOrderSupport().then((isSupported) => {
      if (isCurrent) {
        setSupportState({ routeKey, isSupported });
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [checkScaleOrderSupport, enabled, providerId, routeKey, symbol]);

  const recheckScaleOrderSupport = useCallback(async () => {
    const isSupported = await checkScaleOrderSupport();
    if (currentRouteKeyRef.current === routeKey) {
      setSupportState({ routeKey, isSupported });
    }
    return isSupported;
  }, [checkScaleOrderSupport, routeKey]);

  return useMemo(
    () => ({
      supportsScaleOrders:
        enabled &&
        supportState.routeKey === routeKey &&
        supportState.isSupported,
      checkScaleOrderSupport: recheckScaleOrderSupport,
    }),
    [enabled, recheckScaleOrderSupport, routeKey, supportState],
  );
};
