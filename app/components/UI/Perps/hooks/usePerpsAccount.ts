import { useSelector } from 'react-redux';
import type { AccountState } from '../controllers/types';
import { selectPerpsAccountState } from '../selectors/perpsController';

/**
 * Hook to get persisted account state from Redux
 * Returns null if no account state exists
 *
 * @deprecated Use usePerpsLiveAccount() instead for real-time data that updates immediately on account switch.
 * This hook provides cached Redux data that may be stale during account transitions.
 */
// TODO: Replace hook with selector in components.
export function usePerpsAccount(): AccountState | null {
  return useSelector(selectPerpsAccountState);
}
