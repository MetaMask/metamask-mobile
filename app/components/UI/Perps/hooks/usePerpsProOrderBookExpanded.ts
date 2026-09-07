import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPerpsProOrderBookExpanded } from '../selectors/perpsController';

export interface UsePerpsProOrderBookExpandedReturn {
  /** Whether the order-book column is shown, from shared controller state. */
  isOrderBookExpanded: boolean;
  /** Persist whether the order-book column is shown. */
  setOrderBookExpanded: (isExpanded: boolean) => void;
}

/**
 * Read and update the persisted Pro order-book column visibility.
 *
 * Lives on `PerpsController.proLayoutPreferences.orderBookExpanded`, so the
 * choice is global across markets and survives app restarts. Uses the
 * patch-style `setProLayoutPreferences` setter, passing only
 * `orderBookExpanded`, so sibling preferences are left untouched.
 */
export const usePerpsProOrderBookExpanded =
  (): UsePerpsProOrderBookExpandedReturn => {
    const isOrderBookExpanded = useSelector(selectPerpsProOrderBookExpanded);

    const setOrderBookExpanded = useCallback((isExpanded: boolean) => {
      Engine.context.PerpsController.setProLayoutPreferences({
        orderBookExpanded: isExpanded,
      });
    }, []);

    return { isOrderBookExpanded, setOrderBookExpanded };
  };
