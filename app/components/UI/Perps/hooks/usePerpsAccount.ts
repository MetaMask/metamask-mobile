import { useSelector } from 'react-redux';
import type { AccountState } from '../controllers/types';
import { selectPerpsAccountState } from '../selectors/perpsController';

/**
 * Hook to get persisted account state from Redux
 * Returns null if no account state exists
 */
// TODO: Replace hook with selector in components.
export function usePerpsAccount(): AccountState | null {
  return useSelector(selectPerpsAccountState);
}
