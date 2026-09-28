import {
  BaseDataService,
  type DataServiceCacheUpdatedEvent,
  type DataServiceGranularCacheUpdatedEvent,
  type DataServiceInvalidateQueriesAction,
} from '@metamask/base-data-service';
import type { Messenger } from '@metamask/messenger';
import type {
  StorageServiceGetItemAction,
  StorageServiceRemoveItemAction,
  StorageServiceSetItemAction,
} from '@metamask/storage-service';
import type { Json } from '@metamask/utils';
import { getLimitOrders as fetchLimitOrders } from '../api/limitOrders/getLimitOrders';
import type { GetLimitOrdersResponse } from '../api/limitOrders/getLimitOrders/types';
import {
  limitOrdersQueries,
  type LimitOrdersQueryParams,
} from '../queries/limitOrders';

export const LIMIT_ORDERS_DATA_SERVICE_NAME = 'LimitOrdersDataService' as const;

// A stale persisted cache is only useful for a limited time: past this age it
// is discarded on rehydration rather than shown while a fresh fetch is
// in flight.
const PERSISTED_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

export interface LimitOrdersDataServiceGetLimitOrdersAction {
  type: 'LimitOrdersDataService:getLimitOrders';
  handler: (
    params: LimitOrdersQueryParams,
    cursor?: string,
  ) => Promise<GetLimitOrdersResponse>;
}

export type LimitOrdersDataServiceActions =
  | LimitOrdersDataServiceGetLimitOrdersAction
  | DataServiceInvalidateQueriesAction<typeof LIMIT_ORDERS_DATA_SERVICE_NAME>
  // Allowed external actions: StorageService persists and rehydrates the
  // cache on this service's behalf (see `persistenceConfig` below).
  | StorageServiceGetItemAction
  | StorageServiceSetItemAction
  | StorageServiceRemoveItemAction;

export type LimitOrdersDataServiceEvents =
  | DataServiceCacheUpdatedEvent<typeof LIMIT_ORDERS_DATA_SERVICE_NAME>
  | DataServiceGranularCacheUpdatedEvent<typeof LIMIT_ORDERS_DATA_SERVICE_NAME>;

export type LimitOrdersDataServiceMessenger = Messenger<
  typeof LIMIT_ORDERS_DATA_SERVICE_NAME,
  LimitOrdersDataServiceActions,
  LimitOrdersDataServiceEvents
>;

interface LimitOrdersDataServiceOptions {
  messenger: LimitOrdersDataServiceMessenger;
}

export class LimitOrdersDataService extends BaseDataService<
  typeof LIMIT_ORDERS_DATA_SERVICE_NAME,
  LimitOrdersDataServiceMessenger
> {
  constructor({ messenger }: LimitOrdersDataServiceOptions) {
    super({
      name: LIMIT_ORDERS_DATA_SERVICE_NAME,
      messenger,
      // The history list must survive an app restart, so it's written to
      // disk (debounced) on every update and rehydrated by `init()`.
      persistenceConfig: { maxAge: PERSISTED_CACHE_MAX_AGE_MS },
    });

    messenger.registerActionHandler(
      'LimitOrdersDataService:getLimitOrders',
      this.getLimitOrders.bind(this),
    );
  }

  async getLimitOrders(
    params: LimitOrdersQueryParams,
    cursor?: string,
  ): Promise<GetLimitOrdersResponse> {
    const descriptor = limitOrdersQueries.getLimitOrders(params);

    return this.fetchInfiniteQuery(
      {
        queryKey: descriptor.queryKey,
        staleTime: descriptor.staleTime,
        initialPageParam: cursor as string | null,
        queryFn: ({ pageParam }) =>
          fetchLimitOrders({
            ...params,
            cursor: pageParam as string | undefined,
          }) as Promise<Json & GetLimitOrdersResponse>,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
      },
      cursor,
    );
  }
}
