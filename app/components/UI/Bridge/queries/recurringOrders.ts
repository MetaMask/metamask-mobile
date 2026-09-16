import type { CaipChainId } from '@metamask/utils';
import type { RecurringOrderStatus } from '../api/recurringOrders.types';

interface RecurringOrdersListKeyParams {
  walletAddress: string;
  status: readonly RecurringOrderStatus[];
  chainId?: CaipChainId;
}

export const recurringOrdersKeys = {
  all: () => ['bridge', 'recurring-orders'] as const,
  lists: () => [...recurringOrdersKeys.all(), 'list'] as const,
  list: ({ walletAddress, status, chainId }: RecurringOrdersListKeyParams) =>
    [
      ...recurringOrdersKeys.lists(),
      walletAddress.toLowerCase(),
      [...status],
      chainId,
    ] as const,
};
