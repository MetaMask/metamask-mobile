import {
  LimitOrderState,
  type GetLimitOrdersQuery,
} from '../api/limitOrders/getLimitOrders/types';
import { LIMIT_ORDERS_STALE_TIME } from '../constants/limitOrders';

export type LimitOrdersQueryParams = Omit<GetLimitOrdersQuery, 'cursor'>;

export const limitOrdersQueries = {
  /**
   * Partial query key matching every open orders query, whichever wallet,
   * chain or page size it was made for, and none of the history ones.
   */
  openOrdersKey: () =>
    [
      'LimitOrdersDataService:getLimitOrders',
      { states: [LimitOrderState.Open] },
    ] as const,
  getLimitOrders: ({
    walletAddress,
    states,
    chainId,
    limit,
  }: LimitOrdersQueryParams) => {
    const params: LimitOrdersQueryParams = {
      walletAddress: walletAddress.toLowerCase(),
      ...(states ? { states: [...states] } : {}),
      ...(chainId ? { chainId } : {}),
      ...(limit === undefined ? {} : { limit }),
    };

    return {
      queryKey: ['LimitOrdersDataService:getLimitOrders', params] as const,
      staleTime: LIMIT_ORDERS_STALE_TIME,
    };
  },
};
