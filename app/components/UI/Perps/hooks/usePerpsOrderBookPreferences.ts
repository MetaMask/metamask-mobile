import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { OrderBookPreferences } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { selectPerpsOrderBookPreferences } from '../selectors/perpsController';

export interface UsePerpsOrderBookPreferencesReturn {
  /** Market-agnostic listed-by preferences from shared controller state. */
  preferences: OrderBookPreferences;
  /** Persist a patch of listed-by preferences on the shared PerpsController. */
  setOrderBookPreferences: (patch: Partial<OrderBookPreferences>) => void;
}

/**
 * Read and update persisted Pro order-book listed-by preferences.
 *
 * Currency (USD vs base) and metric (total vs size) are market-agnostic.
 * Group-by remains per-market via `usePerpsOrderBookGrouping`.
 */
export const usePerpsOrderBookPreferences =
  (): UsePerpsOrderBookPreferencesReturn => {
    const preferences = useSelector(selectPerpsOrderBookPreferences);

    const setOrderBookPreferences = useCallback(
      (patch: Partial<OrderBookPreferences>) => {
        Engine.context.PerpsController.setOrderBookPreferences(patch);
      },
      [],
    );

    return { preferences, setOrderBookPreferences };
  };
