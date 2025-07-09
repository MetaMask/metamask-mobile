import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';
import type { OrderParams } from '../controllers/types';

const selectPerpsPendingOrders = createSelector(
  (state: RootState) => state.engine.backgroundState.PerpsController?.pendingOrders,
  (pendingOrders): OrderParams[] => pendingOrders || []
);

/**
 * Hook to get pending orders from Redux
 */
export function usePerpsPendingOrders(): OrderParams[] {
  return useSelector(selectPerpsPendingOrders);
}
