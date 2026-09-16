import type { GetRecurringOrdersQuery } from '../api/recurringOrders.types';

export const RECURRING_ORDERS_STALE_TIME = 5 * 60 * 1000;
export const RECURRING_ORDERS_PAGE_LIMIT = 20;

export type RecurringOrdersQueryParams = Omit<
  GetRecurringOrdersQuery,
  'cursor'
>;

export const recurringOrdersQueries = {
  getRecurringOrders: ({
    walletAddress,
    status,
    chainId,
    limit,
  }: RecurringOrdersQueryParams) => {
    const params: RecurringOrdersQueryParams = {
      walletAddress: walletAddress.toLowerCase(),
      ...(status ? { status: [...status] } : {}),
      ...(chainId ? { chainId } : {}),
      ...(limit === undefined ? {} : { limit }),
    };

    return {
      queryKey: [
        'RecurringOrdersDataService:getRecurringOrders',
        params,
      ] as const,
      staleTime: RECURRING_ORDERS_STALE_TIME,
    };
  },
};
