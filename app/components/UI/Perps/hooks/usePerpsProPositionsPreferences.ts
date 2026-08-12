import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { ProPositionsSideFilter } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import {
  selectPerpsProPositionsSideFilter,
  selectPerpsProPositionsSortConfig,
} from '../selectors/perpsController';
import type { ProPositionSortConfig } from '../Views/PerpsProMarketView/utils/proPositionSort';

export interface UsePerpsProPositionsPreferencesReturn {
  /** Shared Positions/Orders side filter from persisted controller state. */
  sideFilter: ProPositionsSideFilter;
  /** Positions list sort config composed for UI from flat controller fields. */
  sortConfig: ProPositionSortConfig;
  /** Persist the side filter on shared PerpsController state. */
  setSideFilter: (sideFilter: ProPositionsSideFilter) => void;
  /** Persist the positions sort config on shared PerpsController state. */
  setSortConfig: (sortConfig: ProPositionSortConfig) => void;
}

/**
 * Read and update persisted Pro Positions/Orders panel sort and side-filter
 * preferences.
 *
 * These live as flat fields on `PerpsController.proLayoutPreferences`
 * (`positionsSideFilter`, `positionsSortField`, `positionsSortDirection`), so
 * the choice is global across markets and survives app restarts. Nested UI
 * sort config is mapped at this boundary.
 */
export const usePerpsProPositionsPreferences =
  (): UsePerpsProPositionsPreferencesReturn => {
    const sideFilter = useSelector(selectPerpsProPositionsSideFilter);
    const sortConfig = useSelector(selectPerpsProPositionsSortConfig);

    const setSideFilter = useCallback((next: ProPositionsSideFilter) => {
      Engine.context.PerpsController.setProLayoutPreferences({
        positionsSideFilter: next,
      });
    }, []);

    const setSortConfig = useCallback((next: ProPositionSortConfig) => {
      Engine.context.PerpsController.setProLayoutPreferences({
        positionsSortField: next.field,
        positionsSortDirection: next.direction,
      });
    }, []);

    return { sideFilter, sortConfig, setSideFilter, setSortConfig };
  };
