import {
  BaseDataService,
  type DataServiceCacheUpdatedEvent,
  type DataServiceGranularCacheUpdatedEvent,
  type DataServiceInvalidateQueriesAction,
} from '@metamask/base-data-service';
import type { Messenger } from '@metamask/messenger';
import type { Json } from '@metamask/utils';
import {
  getRecurringOrders as fetchRecurringOrders,
  getRecurringSwaps as fetchRecurringSwaps,
  cancelRecurringOrder as cancelRecurringOrderRequest,
} from '../api/recurringOrders';
import type {
  GetRecurringOrdersResponse,
  GetRecurringSwapsResponse,
} from '../api/recurringOrders.types';
import {
  recurringOrdersQueries,
  type RecurringOrdersQueryParams,
  type RecurringSwapsQueryParams,
} from '../queries/recurringOrders';

export const RECURRING_ORDERS_DATA_SERVICE_NAME =
  'RecurringOrdersDataService' as const;

export interface RecurringOrdersDataServiceGetRecurringOrdersAction {
  type: 'RecurringOrdersDataService:getRecurringOrders';
  handler: (
    params: RecurringOrdersQueryParams,
    cursor?: string,
  ) => Promise<GetRecurringOrdersResponse>;
}

export interface RecurringOrdersDataServiceGetRecurringSwapsAction {
  type: 'RecurringOrdersDataService:getRecurringSwaps';
  handler: (
    orderId: string,
    params: RecurringSwapsQueryParams,
    cursor?: string,
  ) => Promise<GetRecurringSwapsResponse>;
}

export interface RecurringOrdersDataServiceCancelRecurringOrderAction {
  type: 'RecurringOrdersDataService:cancelRecurringOrder';
  handler: (orderId: string) => Promise<void>;
}

export type RecurringOrdersDataServiceActions =
  | RecurringOrdersDataServiceGetRecurringOrdersAction
  | RecurringOrdersDataServiceGetRecurringSwapsAction
  | RecurringOrdersDataServiceCancelRecurringOrderAction
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
      'RecurringOrdersDataService:getRecurringSwaps',
      this.getRecurringSwaps.bind(this),
    );
    messenger.registerActionHandler(
      'RecurringOrdersDataService:cancelRecurringOrder',
      this.cancelRecurringOrder.bind(this),
    );
  }

  async getRecurringOrders(
    params: RecurringOrdersQueryParams,
    cursor?: string,
  ): Promise<GetRecurringOrdersResponse> {
    const descriptor = recurringOrdersQueries.getRecurringOrders(params);

    return this.fetchInfiniteQuery(
      {
        queryKey: descriptor.queryKey,
        staleTime: descriptor.staleTime,
        initialPageParam: cursor as string | null,
        queryFn: ({ pageParam }) =>
          fetchRecurringOrders({
            ...params,
            cursor: pageParam as string | undefined,
          }) as Promise<Json & GetRecurringOrdersResponse>,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
      },
      cursor,
    );
  }

  async getRecurringSwaps(
    orderId: string,
    params: RecurringSwapsQueryParams,
    cursor?: string,
  ): Promise<GetRecurringSwapsResponse> {
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
            ...params,
            cursor: pageParam as string | undefined,
          }) as Promise<Json & GetRecurringSwapsResponse>,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
      },
      cursor,
    );
  }

  async cancelRecurringOrder(orderId: string): Promise<void> {
    await cancelRecurringOrderRequest(orderId);
  }
}
