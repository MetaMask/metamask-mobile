import { useQuery } from '@tanstack/react-query';
import {
  getLimitOrder,
  type GetLimitOrderParams,
} from '../api/limitOrders/getLimitOrder';

/**
 * Query key of a single limit order. Fetched straight from the API rather than
 * through `LimitOrdersDataService`, so it is not prefixed with a data service
 * action.
 */
export const getLimitOrderQueryKey = ({
  orderId,
  accountAddress,
}: GetLimitOrderParams) =>
  [
    'bridge',
    'limitOrders',
    'getLimitOrder',
    { orderId, accountAddress },
  ] as const;

/**
 * Fetches a single limit order along with the fill attempts made against it,
 * which the orders list does not carry: the transaction hash, and the amounts
 * a fill actually moved.
 *
 * @param params - The order to fetch and the account that owns it.
 * @returns The order query.
 */
export function useLimitOrder({
  orderId,
  accountAddress,
}: GetLimitOrderParams) {
  return useQuery({
    queryKey: getLimitOrderQueryKey({ orderId, accountAddress }),
    queryFn: () => getLimitOrder({ orderId, accountAddress }),
    // The order keeps changing server side (fill attempts, state), so it is
    // fetched again every time it is shown rather than read from the cache.
    staleTime: 0,
  });
}
