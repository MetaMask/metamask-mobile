import {
  BaseDataService,
  type DataServiceCacheUpdatedEvent,
  type DataServiceGranularCacheUpdatedEvent,
  type DataServiceInvalidateQueriesAction,
} from '@metamask/base-data-service';
import {
  handleWhen,
  type CreateServicePolicyOptions,
} from '@metamask/controller-utils';
import type { Messenger } from '@metamask/messenger';
import type { Json } from '@metamask/utils';
import type { VenueMarketDataAdapter } from '../adapters/types';
import { PredictError, PredictErrorCode } from '../errors';
import {
  marketDataQueries,
  type EventListParams,
  type GetEventResult,
  type GetEventsResult,
  type GetVenueStatusResult,
} from '../queries/marketDataQueries';
import type {
  PredictEntityId,
  PredictReadOptions,
  PredictVenueId,
} from '../types';

export const PREDICT_MARKET_DATA_SERVICE_NAME =
  'PredictMarketDataService' as const;

export interface PredictMarketDataServiceGetVenueStatusAction {
  type: 'PredictMarketDataService:getVenueStatus';
  handler: (
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ) => Promise<GetVenueStatusResult>;
}

export interface PredictMarketDataServiceGetEventsAction {
  type: 'PredictMarketDataService:getEvents';
  handler: (
    venueId: PredictVenueId,
    params: EventListParams,
    cursor?: string,
  ) => Promise<GetEventsResult>;
}

export interface PredictMarketDataServiceGetEventAction {
  type: 'PredictMarketDataService:getEvent';
  handler: (
    venueId: PredictVenueId,
    eventId: PredictEntityId,
    options?: PredictReadOptions,
  ) => Promise<GetEventResult>;
}

export type PredictMarketDataServiceActions =
  | PredictMarketDataServiceGetVenueStatusAction
  | PredictMarketDataServiceGetEventsAction
  | PredictMarketDataServiceGetEventAction
  | DataServiceInvalidateQueriesAction<typeof PREDICT_MARKET_DATA_SERVICE_NAME>;

export type PredictMarketDataServiceEvents =
  | DataServiceCacheUpdatedEvent<typeof PREDICT_MARKET_DATA_SERVICE_NAME>
  | DataServiceGranularCacheUpdatedEvent<
      typeof PREDICT_MARKET_DATA_SERVICE_NAME
    >;

export type PredictMarketDataServiceMessenger = Messenger<
  typeof PREDICT_MARKET_DATA_SERVICE_NAME,
  PredictMarketDataServiceActions,
  PredictMarketDataServiceEvents
>;

const RETRYABLE_CODES = new Set([
  PredictErrorCode.NETWORK_ERROR,
  PredictErrorCode.RATE_LIMITED,
  PredictErrorCode.VENUE_UNAVAILABLE,
]);

export const isRetryablePredictError = (error: unknown): boolean =>
  error instanceof PredictError && RETRYABLE_CODES.has(error.code);

export interface PredictMarketDataServiceOptions {
  messenger: PredictMarketDataServiceMessenger;
  marketData: VenueMarketDataAdapter;
  venueId: PredictVenueId;
  policyOptions?: Pick<
    CreateServicePolicyOptions,
    'backoff' | 'circuitBreakDuration' | 'maxConsecutiveFailures'
  >;
}

export class PredictMarketDataService extends BaseDataService<
  typeof PREDICT_MARKET_DATA_SERVICE_NAME,
  PredictMarketDataServiceMessenger
> {
  readonly #marketData: VenueMarketDataAdapter;
  readonly #venueId: PredictVenueId;

  constructor({
    messenger,
    marketData,
    venueId,
    policyOptions,
  }: PredictMarketDataServiceOptions) {
    super({
      name: PREDICT_MARKET_DATA_SERVICE_NAME,
      messenger,
      policyOptions: {
        ...policyOptions,
        maxRetries: 2,
        retryFilterPolicy: handleWhen(isRetryablePredictError),
        isServiceFailure: isRetryablePredictError,
      },
    });
    this.#marketData = marketData;
    this.#venueId = venueId;

    messenger.registerActionHandler(
      'PredictMarketDataService:getVenueStatus',
      this.getVenueStatus.bind(this),
    );
    messenger.registerActionHandler(
      'PredictMarketDataService:getEvents',
      this.getEvents.bind(this),
    );
    messenger.registerActionHandler(
      'PredictMarketDataService:getEvent',
      this.getEvent.bind(this),
    );
  }

  getVenueStatus(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<GetVenueStatusResult> {
    this.#assertVenue(venueId);
    const descriptor = marketDataQueries.getVenueStatus(venueId);
    return this.fetchQuery({
      queryKey: descriptor.queryKey,
      staleTime: descriptor.staleTime,
      queryFn: ({ signal }) =>
        this.#marketData.fetchVenueStatus({
          signal: options?.signal ?? signal,
        }) as Promise<Json & GetVenueStatusResult>,
    });
  }

  getEvents(
    venueId: PredictVenueId,
    params: EventListParams,
    cursor?: string,
  ): Promise<GetEventsResult> {
    this.#assertVenue(venueId);
    const descriptor = marketDataQueries.getEvents(venueId, params);
    return this.fetchInfiniteQuery(
      {
        queryKey: descriptor.queryKey,
        staleTime: descriptor.staleTime,
        queryFn: ({ pageParam, signal }) =>
          this.#marketData.fetchEvents(
            { ...params, cursor: pageParam as string | undefined },
            { signal },
          ) as Promise<Json & GetEventsResult>,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
      cursor,
    );
  }

  getEvent(
    venueId: PredictVenueId,
    eventId: PredictEntityId,
    options?: PredictReadOptions,
  ): Promise<GetEventResult> {
    this.#assertVenue(venueId);
    const descriptor = marketDataQueries.getEvent(venueId, eventId);
    return this.fetchQuery({
      queryKey: descriptor.queryKey,
      staleTime: descriptor.staleTime,
      queryFn: ({ signal }) =>
        this.#marketData.fetchEvent(eventId, {
          signal: options?.signal ?? signal,
        }) as Promise<Json & GetEventResult>,
    });
  }

  #assertVenue(venueId: PredictVenueId): void {
    if (venueId !== this.#venueId) {
      throw PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE);
    }
  }
}
