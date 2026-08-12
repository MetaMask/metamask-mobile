import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type {
  ProPositionsSideFilter,
  ProPositionsSortConfig,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import {
  selectPerpsProPositionsSideFilter,
  selectPerpsProPositionsSortConfig,
} from '../selectors/perpsController';

export interface UsePerpsProPositionsPreferencesReturn {
  /** Shared Positions/Orders side filter from persisted controller state. */
  sideFilter: ProPositionsSideFilter;
  /** Positions list sort config from persisted controller state. */
  sortConfig: ProPositionsSortConfig;
  /** Persist the side filter on shared PerpsController state. */
  setSideFilter: (sideFilter: ProPositionsSideFilter) => void;
  /** Persist the positions sort config on shared PerpsController state. */
  setSortConfig: (sortConfig: ProPositionsSortConfig) => void;
}

/**
 * Read and update persisted Pro Positions/Orders panel sort and side-filter
 * preferences.
 *
 * These live on `PerpsController.proLayoutPreferences` (`positionsSideFilter`,
 * `positionsSortConfig`), so the choice is global across markets and survives
 * app restarts. Uses the patch-style `setProLayoutPreferences` setter.
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

    const setSortConfig = useCallback((next: ProPositionsSortConfig) => {
      Engine.context.PerpsController.setProLayoutPreferences({
        positionsSortConfig: next,
      });
    }, []);

    return { sideFilter, sortConfig, setSideFilter, setSortConfig };
  };
