import { useEffect, useState } from 'react';
import {
  type PerpsAvailableToTrade,
  type SubscribeAvailableToTradeParams,
} from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';

export interface UsePerpsLiveAvailableToTradeOptions {
  /** Market the venue reports available to trade for, including any routing prefix. */
  symbol: string;
  /** When false, the hook stays idle and reports no value. */
  enabled?: boolean;
}

export interface UsePerpsLiveAvailableToTradeReturn {
  /**
   * Latest venue figure for the market. Null until the first update, and
   * again after the stream reports an error. Nothing is estimated locally.
   */
  availableToTrade: PerpsAvailableToTrade | null;
  /** True from subscribe until the first value or a terminal stream error. */
  isInitialLoading: boolean;
}

/**
 * USD the venue reports for one side. Parsing only: the figure is not derived
 * from account value, margin, or withdrawable balance.
 */
export const readAvailableToTradeUsd = (
  availableToTrade: PerpsAvailableToTrade | null | undefined,
  direction: 'long' | 'short',
): number | undefined => {
  const raw = availableToTrade?.[direction];
  if (raw == null || raw === '') {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * The larger of the venue's long and short USD figures, for when no order
 * direction is chosen yet. Undefined when neither side is known.
 */
export const readMaxAvailableToTradeUsd = (
  availableToTrade: PerpsAvailableToTrade | null | undefined,
): number | undefined => {
  const availableLong = readAvailableToTradeUsd(availableToTrade, 'long');
  const availableShort = readAvailableToTradeUsd(availableToTrade, 'short');
  if (availableLong === undefined && availableShort === undefined) {
    return undefined;
  }
  return Math.max(availableLong ?? 0, availableShort ?? 0);
};

/**
 * Subscribes to one market's available to trade via
 * `PerpsController.subscribeToAvailableToTrade`.
 *
 * The controller passes the venue's own long and short USD strings through.
 * Until one arrives, and when the provider cannot read it, the value stays
 * unknown.
 */
export function usePerpsLiveAvailableToTrade({
  symbol,
  enabled = true,
}: UsePerpsLiveAvailableToTradeOptions): UsePerpsLiveAvailableToTradeReturn {
  const [availableToTrade, setAvailableToTrade] =
    useState<PerpsAvailableToTrade | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(
    enabled && symbol.length > 0,
  );

  useEffect(() => {
    if (!enabled || symbol.length === 0) {
      setAvailableToTrade(null);
      setIsInitialLoading(false);
      return;
    }

    setAvailableToTrade(null);
    setIsInitialLoading(true);

    let active = true;
    let unsubscribe: (() => void) | undefined;
    const params: SubscribeAvailableToTradeParams = {
      symbol,
      callback: (update) => {
        if (!active || update.symbol !== symbol) {
          return;
        }
        setAvailableToTrade(update);
        setIsInitialLoading(false);
      },
      onError: (error) => {
        if (!active) {
          return;
        }
        DevLogger.log(
          'usePerpsLiveAvailableToTrade: Subscription error',
          error,
        );
        setAvailableToTrade(null);
        setIsInitialLoading(false);
      },
    };

    try {
      unsubscribe =
        Engine.context.PerpsController.subscribeToAvailableToTrade(params);
    } catch (error) {
      DevLogger.log('usePerpsLiveAvailableToTrade: Setup error', error);
      setAvailableToTrade(null);
      setIsInitialLoading(false);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [enabled, symbol]);

  return { availableToTrade, isInitialLoading };
}
