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
import { TraceName, TraceOperation } from '../../../../util/trace';
import type { VenueMarketDataAdapter } from '../adapters/types';
import { PredictError, PredictErrorCode } from '../errors';
import {
  marketDataQueries,
  type FeedParams,
  type GetEventResult,
  type GetFeedResult,
  type GetMarketHistoryResult,
  type GetVenueStatusResult,
} from '../queries/marketDataQueries';
import type {
  PredictEntityId,
  PredictFeedId,
  PredictMarketHistoryRange,
  PredictReadOptions,
  PredictVenueId,
} from '../types';
import { withPredictNextTrace } from './withPredictNextTrace';

export const PREDICT_MARKET_DATA_SERVICE_NAME =
  'PredictMarketDataService' as const;

export interface PredictMarketDataServiceGetVenueStatusAction {
  type: 'PredictMarketDataService:getVenueStatus';
  handler: (
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ) => Promise<GetVenueStatusResult>;
}

export interface PredictMarketDataServiceGetFeedAction {
  type: 'PredictMarketDataService:getFeed';
  handler: (
    venueId: PredictVenueId,
    feedId: PredictFeedId,
    params: FeedParams,
    cursor?: string,
    options?: PredictReadOptions,
  ) => Promise<GetFeedResult>;
}

export interface PredictMarketDataServiceGetEventAction {
  type: 'PredictMarketDataService:getEvent';
  handler: (
    venueId: PredictVenueId,
    eventId: PredictEntityId,
    options?: PredictReadOptions,
  ) => Promise<GetEventResult>;
}

export interface PredictMarketDataServiceGetMarketHistoryAction {
  type: 'PredictMarketDataService:getMarketHistory';
  handler: (
    venueId: PredictVenueId,
    marketId: PredictEntityId,
    range: PredictMarketHistoryRange,
    options?: PredictReadOptions,
  ) => Promise<GetMarketHistoryResult>;
}

export type PredictMarketDataServiceActions =
  | PredictMarketDataServiceGetVenueStatusAction
  | PredictMarketDataServiceGetFeedAction
  | PredictMarketDataServiceGetEventAction
  | PredictMarketDataServiceGetMarketHistoryAction
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

/** Returns whether a Predict error is safe to retry. */
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

/** Owns cached, retryable public market-data reads for one Venue. */
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
      'PredictMarketDataService:getFeed',
      this.getFeed.bind(this),
    );
    messenger.registerActionHandler(
      'PredictMarketDataService:getEvent',
      this.getEvent.bind(this),
    );
    messenger.registerActionHandler(
      'PredictMarketDataService:getMarketHistory',
      this.getMarketHistory.bind(this),
    );
  }

  async getVenueStatus(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<GetVenueStatusResult> {
    this.#assertVenue(venueId);
    const descriptor = marketDataQueries.getVenueStatus(venueId);
    return withPredictNextTrace(
      {
        method: 'getVenueStatus',
        name: TraceName.PredictNextGetVenueStatus,
        op: TraceOperation.PredictDataFetch,
        tags: { venueId },
        resultData: (result) => ({ status: result.status }),
      },
      () =>
        this.fetchQuery({
          queryKey: descriptor.queryKey,
          staleTime: descriptor.staleTime,
          queryFn: ({ signal }) =>
            this.#marketData.fetchVenueStatus({
              signal: options?.signal ?? signal,
            }) as Promise<Json & GetVenueStatusResult>,
        }),
    );
  }

  async getFeed(
    venueId: PredictVenueId,
    feedId: PredictFeedId,
    params: FeedParams,
    cursor?: string,
    options?: PredictReadOptions,
  ): Promise<GetFeedResult> {
    this.#assertVenue(venueId);
    const descriptor = marketDataQueries.getFeed(venueId, feedId, params);
    return withPredictNextTrace(
      {
        method: 'getFeed',
        name: TraceName.PredictNextGetFeed,
        op: TraceOperation.PredictDataFetch,
        tags: { venueId, feedId },
        data: {
          hasCursor: Boolean(cursor),
          limit: params.limit ?? 0,
        },
        resultData: (result) => ({ eventCount: result.events.length }),
      },
      () =>
        this.fetchInfiniteQuery(
          {
            queryKey: descriptor.queryKey,
            staleTime: descriptor.staleTime,
            initialPageParam: cursor as string | null,
            queryFn: async ({ pageParam, signal }) => {
              const page = await this.#marketData.fetchFeed(
                feedId,
                { ...params, cursor: pageParam as string | undefined },
                { signal: options?.signal ?? signal },
              );
              return {
                ...page,
                nextCursor: page.nextCursor || undefined,
              } as Json & GetFeedResult;
            },
            getNextPageParam: (lastPage) => lastPage.nextCursor || null,
          },
          cursor,
        ),
    );
  }

  async getEvent(
    venueId: PredictVenueId,
    eventId: PredictEntityId,
    options?: PredictReadOptions,
  ): Promise<GetEventResult> {
    this.#assertVenue(venueId);
    const descriptor = marketDataQueries.getEvent(venueId, eventId);
    return withPredictNextTrace(
      {
        method: 'getEvent',
        name: TraceName.PredictNextGetEvent,
        op: TraceOperation.PredictDataFetch,
        tags: { venueId },
      },
      () =>
        this.fetchQuery({
          queryKey: descriptor.queryKey,
          staleTime: descriptor.staleTime,
          queryFn: ({ signal }) =>
            this.#marketData.fetchEvent(eventId, {
              signal: options?.signal ?? signal,
            }) as Promise<Json & GetEventResult>,
        }),
    );
  }

  async getMarketHistory(
    venueId: PredictVenueId,
    marketId: PredictEntityId,
    range: PredictMarketHistoryRange,
    options?: PredictReadOptions,
  ): Promise<GetMarketHistoryResult> {
    this.#assertVenue(venueId);
    const descriptor = marketDataQueries.getMarketHistory(
      venueId,
      marketId,
      range,
    );
    return withPredictNextTrace(
      {
        method: 'getMarketHistory',
        name: TraceName.PredictNextGetMarketHistory,
        op: TraceOperation.PredictDataFetch,
        tags: { venueId, range },
        resultData: (result) => ({ pointCount: result.points.length }),
      },
      () =>
        this.fetchQuery({
          queryKey: descriptor.queryKey,
          staleTime: descriptor.staleTime,
          queryFn: ({ signal }) =>
            this.#marketData.fetchMarketHistory(marketId, range, {
              signal: options?.signal ?? signal,
            }) as Promise<Json & GetMarketHistoryResult>,
        }),
    );
  }

  #assertVenue(venueId: PredictVenueId): void {
    if (venueId !== this.#venueId) {
      throw PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE);
    }
  }
}
