import { useSelector } from 'react-redux';

import { selectShouldLeaveBenefitsForProHub } from '../selectors/subscriptionController';

/**
 * True when Pro Subscription should replace Benefits with Pro Hub.
 *
 * Canceled is a hub membership but stays on Benefits so Renew can finish
 * checkout. Incomplete, incomplete-expired, and no subscription also stay.
 */
export function useShouldLeaveBenefitsForProHub(): boolean {
  return useSelector(selectShouldLeaveBenefitsForProHub);
}
