import type {
  GetRecurringOrdersQuery,
  GetRecurringSwapsQuery,
} from '../api/recurringOrders.types';

export const RECURRING_ORDERS_STALE_TIME = 5 * 60 * 1000;
export const RECURRING_ORDERS_PAGE_LIMIT = 20;
export const RECURRING_SWAPS_PAGE_LIMIT = 20;
export const RECURRING_ORDERS_QUERY_KEY =
  'RecurringOrdersDataService:getRecurringOrders' as const;

export type RecurringOrdersQueryParams = Omit<
  GetRecurringOrdersQuery,
  'cursor'
>;
export type RecurringSwapsQueryParams = Omit<GetRecurringSwapsQuery, 'cursor'>;
export type RecurringOrdersQueryKey = readonly [
  typeof RECURRING_ORDERS_QUERY_KEY,
  RecurringOrdersQueryParams,
];

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
      queryKey: [RECURRING_ORDERS_QUERY_KEY, params] as const,
      staleTime: RECURRING_ORDERS_STALE_TIME,
    };
  },
  getRecurringSwaps: (
    orderId: string,
    { limit }: RecurringSwapsQueryParams,
  ) => {
    const params: RecurringSwapsQueryParams = {
      ...(limit === undefined ? {} : { limit }),
    };

    return {
      queryKey: [
        'RecurringOrdersDataService:getRecurringSwaps',
        orderId,
        params,
      ] as const,
      staleTime: RECURRING_ORDERS_STALE_TIME,
    };
  },
};
