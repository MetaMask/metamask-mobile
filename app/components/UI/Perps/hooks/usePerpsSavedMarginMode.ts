import { useCallback } from 'react';
import {
  selectMarginMode,
  type MarginMode,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { usePerpsSelector } from './usePerpsSelector';

/**
 * Last margin mode the trader picked for a market.
 * Stored per market, venue, and network. Unset markets stay Isolated.
 *
 * @param symbol - Market symbol (e.g. 'BTC', 'ETH')
 * @param providerId - Venue the mode was saved for. Defaults to the live venue.
 * @returns The saved mode and a function that persists the next pick.
 */
export function usePerpsSavedMarginMode(
  symbol: string,
  providerId?: PerpsProviderType,
): {
  savedMarginMode: MarginMode | undefined;
  saveMarginMode: (marginMode: MarginMode) => void;
} {
  const savedMarginMode = usePerpsSelector((state) =>
    selectMarginMode(state, symbol, providerId),
  );

  const saveMarginMode = useCallback(
    (marginMode: MarginMode) => {
      Engine.context.PerpsController?.saveMarginMode?.(
        symbol,
        marginMode,
        providerId,
      );
    },
    [providerId, symbol],
  );

  return { savedMarginMode, saveMarginMode };
}
