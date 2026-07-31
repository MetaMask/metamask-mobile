import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPerpsProChartExpanded } from '../selectors/perpsController';

export interface UsePerpsProChartExpandedReturn {
  /** Whether the Pro inline chart is expanded, from shared controller state. */
  isChartExpanded: boolean;
  /** Persist the expanded/collapsed choice on the shared PerpsController state. */
  setChartExpanded: (expanded: boolean) => void;
}

/**
 * Read and update the persisted Pro chart expand/collapse preference.
 *
 * The flag lives on `PerpsController.proLayoutPreferences.chartExpanded`, so the
 * choice is global across markets and survives app restarts. Uses the
 * patch-style `setProLayoutPreferences` setter, passing only `chartExpanded`.
 */
export const usePerpsProChartExpanded = (): UsePerpsProChartExpandedReturn => {
  const isChartExpanded = useSelector(selectPerpsProChartExpanded);

  const setChartExpanded = useCallback((expanded: boolean) => {
    Engine.context.PerpsController.setProLayoutPreferences({
      chartExpanded: expanded,
    });
  }, []);

  return { isChartExpanded, setChartExpanded };
};
