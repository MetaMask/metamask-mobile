import { useSelector } from 'react-redux';

import { selectHasMoneyAccountPlusMembership } from '../selectors/subscriptionController';

/**
 * True when Plus is in a status Pro Hub can show.
 *
 * Those statuses use the MetaMask Orange label and open Pro Hub. Canceled,
 * incomplete, incomplete-expired, and no subscription stay on the join label
 * and Benefits.
 */
export function useHasProMembership(): boolean {
  return useSelector(selectHasMoneyAccountPlusMembership);
}
