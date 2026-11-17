import {
  BaseDataService,
  type DataServiceCacheUpdatedEvent,
  type DataServiceGranularCacheUpdatedEvent,
  type DataServiceInvalidateQueriesAction,
} from '@metamask/base-data-service';
import type { Messenger } from '@metamask/messenger';
import {
  KnownCaipNamespace,
  toCaipAccountId,
  type Json,
} from '@metamask/utils';
import {
  getRecurringOrders as fetchRecurringOrders,
  getRecurringOrdersByAsset as fetchRecurringOrdersByAsset,
  getRecurringSwaps as fetchRecurringSwaps,
} from '../api/recurringOrders';
import type {
  GetRecurringOrdersByAssetResponse,
  ListRecurringOrdersResponse,
  ListRecurringSwapsResponse,
  RecurringOrdersQueryParams,
  RecurringSwapsQueryParams,
} from '../api/recurringOrders.types';
import {
  recurringOrdersQueries,
  type RecurringOrdersByAssetQueryParams,
} from '../queries/recurringOrders';

export const RECURRING_ORDERS_DATA_SERVICE_NAME =
  'RecurringOrdersDataService' as const;

export interface RecurringOrdersDataServiceGetRecurringOrdersAction {
  type: 'RecurringOrdersDataService:getRecurringOrders';
  handler: (
    params: RecurringOrdersQueryParams,
    cursor?: string,
  ) => Promise<ListRecurringOrdersResponse>;
}

export interface RecurringOrdersDataServiceGetRecurringSwapsAction {
  type: 'RecurringOrdersDataService:getRecurringSwaps';
  handler: (
    orderId: string,
    params: RecurringSwapsQueryParams,
    cursor?: string,
  ) => Promise<ListRecurringSwapsResponse>;
}

export interface RecurringOrdersDataServiceGetRecurringOrdersByAssetAction {
  type: 'RecurringOrdersDataService:getRecurringOrdersByAsset';
  handler: (
    params: RecurringOrdersByAssetQueryParams,
  ) => Promise<GetRecurringOrdersByAssetResponse>;
}

export type RecurringOrdersDataServiceActions =
  | RecurringOrdersDataServiceGetRecurringOrdersAction
  | RecurringOrdersDataServiceGetRecurringOrdersByAssetAction
  | RecurringOrdersDataServiceGetRecurringSwapsAction
  | DataServiceInvalidateQueriesAction<
      typeof RECURRING_ORDERS_DATA_SERVICE_NAME
    >;

export type RecurringOrdersDataServiceEvents =
  | DataServiceCacheUpdatedEvent<typeof RECURRING_ORDERS_DATA_SERVICE_NAME>
  | DataServiceGranularCacheUpdatedEvent<
      typeof RECURRING_ORDERS_DATA_SERVICE_NAME
    >;

export type RecurringOrdersDataServiceMessenger = Messenger<
  typeof RECURRING_ORDERS_DATA_SERVICE_NAME,
  RecurringOrdersDataServiceActions,
  RecurringOrdersDataServiceEvents
>;

interface RecurringOrdersDataServiceOptions {
  messenger: RecurringOrdersDataServiceMessenger;
}

export class RecurringOrdersDataService extends BaseDataService<
  typeof RECURRING_ORDERS_DATA_SERVICE_NAME,
  RecurringOrdersDataServiceMessenger
> {
  constructor({ messenger }: RecurringOrdersDataServiceOptions) {
    super({
      name: RECURRING_ORDERS_DATA_SERVICE_NAME,
      messenger,
    });

    messenger.registerActionHandler(
      'RecurringOrdersDataService:getRecurringOrders',
      this.getRecurringOrders.bind(this),
    );
    messenger.registerActionHandler(
      'RecurringOrdersDataService:getRecurringOrdersByAsset',
      this.getRecurringOrdersByAsset.bind(this),
    );
    messenger.registerActionHandler(
      'RecurringOrdersDataService:getRecurringSwaps',
      this.getRecurringSwaps.bind(this),
    );
  }

  async getRecurringOrders(
    params: RecurringOrdersQueryParams,
    cursor?: string,
  ): Promise<ListRecurringOrdersResponse> {
    const descriptor = recurringOrdersQueries.getRecurringOrders(params);

    return this.fetchInfiniteQuery(
      {
        queryKey: descriptor.queryKey,
        staleTime: descriptor.staleTime,
        initialPageParam: cursor as string | null,
        queryFn: ({ pageParam }) =>
          fetchRecurringOrders({
            accountAddress: toCaipAccountId(
              KnownCaipNamespace.Eip155,
              '1',
              params.walletAddress,
            ),
            ...(params.orderStates ? { states: params.orderStates } : {}),
            ...(params.chainId ? { chainIds: [params.chainId] } : {}),
            ...(params.assetId ? { asset: params.assetId } : {}),
            ...(params.limit === undefined ? {} : { limit: params.limit }),
            ...(pageParam ? { after: pageParam as string } : {}),
          }) as Promise<Json & ListRecurringOrdersResponse>,
        getNextPageParam: (lastPage) =>
          lastPage.hasNextPage ? (lastPage.endCursor ?? null) : null,
      },
      cursor,
    );
  }

  async getRecurringOrdersByAsset(
    params: RecurringOrdersByAssetQueryParams,
  ): Promise<GetRecurringOrdersByAssetResponse> {
    const descriptor = recurringOrdersQueries.getRecurringOrdersByAsset(params);

    return this.fetchQuery({
      queryKey: descriptor.queryKey,
      staleTime: descriptor.staleTime,
      queryFn: () =>
        fetchRecurringOrdersByAsset(params) as Promise<
          Json & GetRecurringOrdersByAssetResponse
        >,
    });
  }

  async getRecurringSwaps(
    orderId: string,
    params: RecurringSwapsQueryParams,
    cursor?: string,
  ): Promise<ListRecurringSwapsResponse> {
    const descriptor = recurringOrdersQueries.getRecurringSwaps(
      orderId,
      params,
    );

    return this.fetchInfiniteQuery(
      {
        queryKey: descriptor.queryKey,
        staleTime: descriptor.staleTime,
        initialPageParam: cursor as string | null,
        queryFn: ({ pageParam }) =>
          fetchRecurringSwaps(orderId, {
            accountAddress: params.accountAddress,
            ...(params.limit === undefined ? {} : { limit: params.limit }),
            ...(pageParam ? { after: pageParam as string } : {}),
          }) as Promise<Json & ListRecurringSwapsResponse>,
        getNextPageParam: (lastPage) =>
          lastPage.hasNextPage ? (lastPage.endCursor ?? null) : null,
      },
      cursor,
    );
  }
}
