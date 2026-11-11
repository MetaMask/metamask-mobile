import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { ProLayoutPreferences } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { selectPerpsProOrderBookPosition } from '../selectors/perpsController';

export type PerpsProOrderBookPosition =
  ProLayoutPreferences['orderBookPosition'];

export interface UsePerpsProOrderBookPositionReturn {
  /** Side the order-book column is pinned to, from shared controller state. */
  orderBookPosition: PerpsProOrderBookPosition;
  /** Persist the chosen side on the shared PerpsController state. */
  setOrderBookPosition: (position: PerpsProOrderBookPosition) => void;
}

/**
 * Read and update the persisted Pro order-book column side.
 *
 * The side lives on `PerpsController.proLayoutPreferences.orderBookPosition`, so
 * the choice is global across markets and survives app restarts. Uses the
 * patch-style `setProLayoutPreferences` setter, passing only
 * `orderBookPosition`, so sibling preferences are left untouched.
 */
export const usePerpsProOrderBookPosition =
  (): UsePerpsProOrderBookPositionReturn => {
    const orderBookPosition = useSelector(selectPerpsProOrderBookPosition);

    const setOrderBookPosition = useCallback(
      (position: PerpsProOrderBookPosition) => {
        Engine.context.PerpsController.setProLayoutPreferences({
          orderBookPosition: position,
        });
      },
      [],
    );

    return { orderBookPosition, setOrderBookPosition };
  };
