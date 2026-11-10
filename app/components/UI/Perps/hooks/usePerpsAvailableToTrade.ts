import { useEffect, useState } from 'react';
import type {
  PerpsAvailableToTrade,
  PerpsProviderType,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';

export interface UsePerpsAvailableToTradeParams {
  /** Market to read, including any routing prefix (e.g. `BTC`, `xyz:TSLA`). */
  symbol?: string;
  /** Provider that lists the market; aggregated mode routes by it. */
  providerId?: PerpsProviderType;
  /**
   * Subscribe only once Perps is connected: the controller returns a no-op
   * subscription while no provider is active.
   */
  enabled: boolean;
  /** Selected Perps account; a change starts a fresh stream. */
  accountAddress?: string;
  /** Selected Perps network; a change starts a fresh stream. */
  network?: string;
}

/**
 * Streams the venue's available to trade for one market from
 * `PerpsController.subscribeToAvailableToTrade`.
 *
 * @returns The latest value for `symbol`, or `undefined` while it is unknown
 * (not subscribed yet, no value received, the stream failed, or the provider
 * does not report it). Callers show a placeholder for `undefined`.
 */
export const usePerpsAvailableToTrade = ({
  symbol,
  providerId,
  enabled,
  accountAddress,
  network,
}: UsePerpsAvailableToTradeParams): PerpsAvailableToTrade | undefined => {
  const [availableToTrade, setAvailableToTrade] = useState<
    PerpsAvailableToTrade | undefined
  >(undefined);

  useEffect(() => {
    setAvailableToTrade(undefined);
    if (!enabled || !symbol) {
      return undefined;
    }

    return Engine.context.PerpsController.subscribeToAvailableToTrade({
      symbol,
      providerId,
      callback: (value) => {
        if (value.symbol === symbol) {
          setAvailableToTrade(value);
        }
      },
      onError: () => setAvailableToTrade(undefined),
    });
  }, [enabled, symbol, providerId, accountAddress, network]);

  return availableToTrade;
};
