import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import type { OrderParams } from '../controllers/types';

/**
 * Hook to get pending orders from Redux
 * These are orders currently being processed (transient state)
 */
export function usePerpsPendingOrders(): OrderParams[] {
  return useSelector((state: RootState) =>
    state.engine.backgroundState.PerpsController?.pendingOrders || []
  );
}
