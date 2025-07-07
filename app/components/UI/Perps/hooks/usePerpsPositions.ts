import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import type { Position } from '../controllers/types';

/**
 * Hook to get persisted positions from Redux
 * These are bootstrap/cached positions, not live updates
 */
export function usePerpsPositions(): Position[] {
  return useSelector((state: RootState) =>
    state.engine.backgroundState.PerpsController?.positions || []
  );
}
