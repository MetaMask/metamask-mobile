import type {
  GetRecurringOrderQuery,
  GetRecurringOrdersByAssetQuery,
  RecurringOrdersQueryParams,
  RecurringSwapsQueryParams,
} from '../api/recurringOrders.types';
export type {
  RecurringOrdersQueryParams,
  RecurringSwapsQueryParams,
} from '../api/recurringOrders.types';

export const RECURRING_ORDERS_STALE_TIME = 0;
export const RECURRING_ORDERS_PAGE_LIMIT = 20;
export const RECURRING_SWAPS_PAGE_LIMIT = 20;
export const RECURRING_ORDERS_QUERY_KEY =
  'RecurringOrdersDataService:getRecurringOrders' as const;
export const RECURRING_ORDER_QUERY_KEY =
  'RecurringOrdersDataService:getRecurringOrder' as const;
export const RECURRING_ORDERS_BY_ASSET_QUERY_KEY =
  'RecurringOrdersDataService:getRecurringOrdersByAsset' as const;

export type RecurringOrderQueryParams = Readonly<GetRecurringOrderQuery>;
export type RecurringOrdersByAssetQueryParams =
  Readonly<GetRecurringOrdersByAssetQuery>;
export type RecurringOrdersQueryKey = readonly [
  typeof RECURRING_ORDERS_QUERY_KEY,
  RecurringOrdersQueryParams,
];
export type RecurringOrdersByAssetQueryKey = readonly [
  typeof RECURRING_ORDERS_BY_ASSET_QUERY_KEY,
  RecurringOrdersByAssetQueryParams,
];

export const recurringOrdersQueries = {
  getRecurringOrder: (
    orderId: string,
    { accountAddress }: RecurringOrderQueryParams,
  ) => ({
    queryKey: [RECURRING_ORDER_QUERY_KEY, orderId, { accountAddress }] as const,
    staleTime: RECURRING_ORDERS_STALE_TIME,
  }),
  getRecurringOrders: ({
    walletAddress,
    orderStates,
    chainId,
    assetId,
    limit,
  }: RecurringOrdersQueryParams) => {
    const params = {
      walletAddress: walletAddress.toLowerCase(),
      ...(orderStates ? { orderStates: [...orderStates] } : {}),
      ...(chainId ? { chainId } : {}),
      ...(assetId ? { assetId } : {}),
      ...(limit === undefined ? {} : { limit }),
    };

    return {
      queryKey: [RECURRING_ORDERS_QUERY_KEY, params] as const,
      staleTime: RECURRING_ORDERS_STALE_TIME,
    };
  },
  getRecurringOrdersByAsset: ({
    walletAddress,
    assetId,
  }: RecurringOrdersByAssetQueryParams) => {
    const params: RecurringOrdersByAssetQueryParams = {
      walletAddress: walletAddress.toLowerCase(),
      assetId,
    };

    return {
      queryKey: [RECURRING_ORDERS_BY_ASSET_QUERY_KEY, params] as const,
      staleTime: RECURRING_ORDERS_STALE_TIME,
    };
  },
  getRecurringSwaps: (
    orderId: string,
    { accountAddress, limit }: RecurringSwapsQueryParams,
  ) => {
    const params = {
      accountAddress,
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
