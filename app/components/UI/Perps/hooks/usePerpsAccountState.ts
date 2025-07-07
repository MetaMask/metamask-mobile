import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import type { AccountState } from '../controllers/types';

/**
 * Hook to get persisted account state from Redux
 * This is bootstrap/cached data, not live updates
 */
export function usePerpsAccountState(): AccountState | null {
  return useSelector((state: RootState) =>
    state.engine.backgroundState.PerpsController?.accountState || null
  );
}
