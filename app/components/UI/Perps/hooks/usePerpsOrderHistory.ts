import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import type { OrderResult } from '../controllers/types';

/**
 * Hook to get persisted order history from Redux
 * These are completed orders, both successful and failed
 */
export function usePerpsOrderHistory(): OrderResult[] {
  return useSelector((state: RootState) =>
    state.engine.backgroundState.PerpsController?.orderHistory || []
  );
}
