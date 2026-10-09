import { useSelector } from 'react-redux';
import { PRODUCT_TYPES } from '@metamask/subscription-controller';
import { selectTrialedSubscriptionProducts } from '../../../../selectors/subscriptionController';

/**
 * Whether Money Account Plus is in the user's trialed products.
 *
 * `selectTrialedSubscriptionProducts` is the subscription-controller list of
 * products this user has trialed. Cashback stays locked while Plus is on
 * that list.
 *
 * @returns True when Money Account Plus has been trialed.
 */
export function useIsMoneyAccountPlusTrialing(): boolean {
  const trialedProducts = useSelector(selectTrialedSubscriptionProducts);

  return trialedProducts.includes(PRODUCT_TYPES.MONEY_ACCOUNT_PLUS);
}
