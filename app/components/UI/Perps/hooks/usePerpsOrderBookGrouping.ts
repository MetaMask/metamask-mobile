import { useCallback } from 'react';
import Engine from '../../../../core/Engine';
import {
  selectOrderBookGrouping,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import { usePerpsSelector } from './usePerpsSelector';

/**
 * Hook for persisting order book price grouping per asset
 * The grouping preference is stored per market and per network (testnet/mainnet)
 *
 * @param symbol - Market symbol (e.g., 'BTC', 'ETH')
 * @param providerId - Venue whose grouping preference to read or save.
 * @returns Object with savedGrouping value and saveGrouping function
 */
export function usePerpsOrderBookGrouping(
  symbol: string,
  providerId?: PerpsProviderType,
): {
  savedGrouping: number | undefined;
  saveGrouping: (grouping: number) => void;
} {
  // Get saved grouping from controller state via selector
  const savedGrouping = usePerpsSelector((state) =>
    selectOrderBookGrouping(state, symbol, providerId),
  );

  // Save grouping to controller state
  const saveGrouping = useCallback(
    (grouping: number) => {
      Engine.context.PerpsController?.saveOrderBookGrouping(
        symbol,
        grouping,
        providerId,
      );
    },
    [symbol, providerId],
  );

  return {
    savedGrouping,
    saveGrouping,
  };
}
