import { useSelector } from 'react-redux';

import { selectHasMoneyAccountPlusMembership } from '../selectors/subscriptionController';

/**
 * True for every Plus status except canceled.
 *
 * Those statuses use the MetaMask Orange label and open Pro Hub. Canceled,
 * and no subscription, stay on the join label and Benefits.
 */
export function useHasProMembership(): boolean {
  return useSelector(selectHasMoneyAccountPlusMembership);
}
