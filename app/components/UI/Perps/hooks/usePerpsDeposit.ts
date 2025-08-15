import { useSelector } from 'react-redux';
import { selectPerpsDepositState } from '../selectors/perpsController';

/**
 * Consolidated hook for deposit state
 */
// TODO: Replace hook with selector in components.
export function usePerpsDeposit() {
  return useSelector(selectPerpsDepositState);
}
