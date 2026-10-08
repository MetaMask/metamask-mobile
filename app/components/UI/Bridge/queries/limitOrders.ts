import type { GetLimitOrdersQuery } from '../api/limitOrders/getLimitOrders/types';
import { LIMIT_ORDERS_STALE_TIME } from '../constants/limitOrders';

export type LimitOrdersQueryParams = Omit<GetLimitOrdersQuery, 'cursor'>;

export const limitOrdersQueries = {
  getLimitOrders: ({
    walletAddress,
    status,
    chainId,
    limit,
  }: LimitOrdersQueryParams) => {
    const params: LimitOrdersQueryParams = {
      walletAddress: walletAddress.toLowerCase(),
      ...(status ? { status: [...status] } : {}),
      ...(chainId ? { chainId } : {}),
      ...(limit === undefined ? {} : { limit }),
    };

    return {
      queryKey: ['LimitOrdersDataService:getLimitOrders', params] as const,
      staleTime: LIMIT_ORDERS_STALE_TIME,
    };
  },
};
