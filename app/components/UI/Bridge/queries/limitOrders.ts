import {
  LimitOrderState,
  type GetLimitOrdersQuery,
} from '../api/limitOrders/getLimitOrders/types';

export type LimitOrdersQueryParams = Omit<GetLimitOrdersQuery, 'cursor'>;

export const limitOrdersQueries = {
  /**
   * Partial query key matching every limit orders query, open and history
   * alike, whichever wallet, chain or page size it was made for.
   */
  allOrdersKey: () => ['LimitOrdersDataService:getLimitOrders'] as const,
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
    assetId,
    limit,
  }: LimitOrdersQueryParams) => {
    const params: LimitOrdersQueryParams = {
      walletAddress: walletAddress.toLowerCase(),
      ...(states ? { states: [...states] } : {}),
      ...(chainId ? { chainId } : {}),
      ...(assetId ? { assetId } : {}),
      ...(limit === undefined ? {} : { limit }),
    };

    return {
      queryKey: ['LimitOrdersDataService:getLimitOrders', params] as const,
      // Orders change server side (fills, expiries) without the client
      // knowing, so a list being shown again must come from the API rather
      // than from the data service cache.
      staleTime: 0,
    };
  },
};
