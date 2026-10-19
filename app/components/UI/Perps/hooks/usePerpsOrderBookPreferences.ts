import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { OrderBookPreferences } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { selectPerpsOrderBookPreferences } from '../selectors/perpsController';

export interface UsePerpsOrderBookPreferencesReturn {
  preferences: OrderBookPreferences;
  setOrderBookPreferences: (patch: Partial<OrderBookPreferences>) => void;
}

/**
 * Read and update persisted Pro order-book listed-by preferences.
 * Currency and metric are market-agnostic; group-by stays per-market.
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
