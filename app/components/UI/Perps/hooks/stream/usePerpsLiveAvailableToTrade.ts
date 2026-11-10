import { useEffect, useState } from 'react';
import type {
  PerpsAvailableToTrade,
  PerpsProviderType,
} from '@metamask/perps-controller';
import { usePerpsStream } from '../../providers/PerpsStreamManager';

export interface UsePerpsLiveAvailableToTradeOptions {
  /** Market to read, including any routing prefix (e.g. `BTC`, `xyz:TSLA`). */
  symbol?: string;
  /** Provider that lists the market; aggregated mode routes by it. */
  providerId?: PerpsProviderType;
  /** Throttle delay in milliseconds (default: 1000ms, as other order-form values). */
  throttleMs?: number;
}

/**
 * Live available to trade for one market, from the shared stream channel.
 *
 * @returns The latest venue value, or `undefined` while it is unknown (not
 * reported yet, cleared by an account or network change, or the stream
 * failed). Callers show a placeholder for `undefined`.
 */
export function usePerpsLiveAvailableToTrade({
  symbol,
  providerId,
  throttleMs = 1000,
}: UsePerpsLiveAvailableToTradeOptions): PerpsAvailableToTrade | undefined {
  const streamManager = usePerpsStream();
  const [availableToTrade, setAvailableToTrade] = useState<
    PerpsAvailableToTrade | undefined
  >(undefined);

  useEffect(() => {
    setAvailableToTrade(undefined);
    if (!symbol) {
      return undefined;
    }

    return streamManager.availableToTrade.subscribeToMarket({
      symbol,
      providerId,
      throttleMs,
      callback: setAvailableToTrade,
      onError: () => setAvailableToTrade(undefined),
    });
  }, [streamManager, symbol, providerId, throttleMs]);

  return availableToTrade;
}
