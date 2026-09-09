import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { ProOrdersSideFilter } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import {
  selectPerpsProOrdersSideFilter,
  selectPerpsProOrdersSortConfig,
} from '../selectors/perpsController';
import type { ProOrderSortConfig } from '../Views/PerpsProMarketView/utils/proOrderSort';

export interface UsePerpsProOrdersPreferencesReturn {
  /** Orders-only side filter from persisted controller state. */
  sideFilter: ProOrdersSideFilter;
  /** Orders list sort config composed for UI from flat controller fields. */
  sortConfig: ProOrderSortConfig;
  /** Persist the orders side filter on shared PerpsController state. */
  setSideFilter: (sideFilter: ProOrdersSideFilter) => void;
  /** Persist the orders sort config on shared PerpsController state. */
  setSortConfig: (sortConfig: ProOrderSortConfig) => void;
}

/**
 * Read and update persisted Pro Orders panel sort and side-filter
 * preferences.
 *
 * These live as flat fields on `PerpsController.proLayoutPreferences`
 * (`ordersSideFilter`, `ordersSortField`, `ordersSortDirection`), so the
 * choice is global across markets and survives app restarts independently of
 * Positions. Nested UI sort config is mapped at this boundary.
 */
export const usePerpsProOrdersPreferences =
  (): UsePerpsProOrdersPreferencesReturn => {
    const sideFilter = useSelector(selectPerpsProOrdersSideFilter);
    const sortConfig = useSelector(selectPerpsProOrdersSortConfig);

    const setSideFilter = useCallback((next: ProOrdersSideFilter) => {
      Engine.context.PerpsController.setProLayoutPreferences({
        ordersSideFilter: next,
      });
    }, []);

    const setSortConfig = useCallback((next: ProOrderSortConfig) => {
      Engine.context.PerpsController.setProLayoutPreferences({
        ordersSortField: next.field,
        ordersSortDirection: next.direction,
      });
    }, []);

    return { sideFilter, sortConfig, setSideFilter, setSortConfig };
  };
