import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';
import type { Position } from '../controllers/types';

const selectPerpsPositions = createSelector(
  (state: RootState) => state.engine.backgroundState.PerpsController?.positions,
  (positions): Position[] => positions || [],
);

/**
 * Hook to get persisted positions from Redux
 */
export function usePerpsPositions(): Position[] {
  return useSelector(selectPerpsPositions);
}
