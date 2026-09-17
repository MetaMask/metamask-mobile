import { useSelector } from 'react-redux';
import { selectMoneyAccountPlusPricing } from '../../../../../../selectors/subscriptionController';
import type { MoneyAccountPlusPricingView } from '../utils/mapMoneyAccountPlusPricing';

export interface UseSubscriptionPricingResult {
  plusPricing: MoneyAccountPlusPricingView;
}

/**
 * Reads Money Account Plus pricing from persisted SubscriptionController
 * state. Fetch status is not tracked here; missing cache is unavailable
 * until Core hydrates `state.pricing`.
 *
 * @returns Mapped Plus pricing from controller state.
 */
export const useSubscriptionPricing = (): UseSubscriptionPricingResult => {
  const plusPricing = useSelector(selectMoneyAccountPlusPricing);

  return { plusPricing };
};
