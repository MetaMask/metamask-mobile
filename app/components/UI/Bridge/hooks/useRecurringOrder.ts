import { useQuery } from '@metamask/react-data-query';
import type {
  CaipAccountId,
  GetRecurringOrderResponse,
} from '../api/recurringOrders.types';
import { recurringOrdersQueries } from '../queries/recurringOrders';

const EMPTY_ACCOUNT_ADDRESS =
  'eip155:1:0x0000000000000000000000000000000000000000';

interface UseRecurringOrderParams {
  orderId?: string;
  accountAddress?: CaipAccountId;
  enabled?: boolean;
}

export function useRecurringOrder({
  orderId,
  accountAddress,
  enabled = true,
}: UseRecurringOrderParams) {
  const resolvedAccountAddress = accountAddress ?? EMPTY_ACCOUNT_ADDRESS;
  const descriptor = recurringOrdersQueries.getRecurringOrder(orderId ?? '', {
    accountAddress: resolvedAccountAddress,
  });
  const query = useQuery<GetRecurringOrderResponse>({
    queryKey: descriptor.queryKey,
    enabled: enabled && Boolean(orderId && accountAddress),
  });

  return {
    order: query.data?.order,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
