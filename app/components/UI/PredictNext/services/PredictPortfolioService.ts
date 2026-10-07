import {
  BaseDataService,
  type DataServiceCacheUpdatedEvent,
  type DataServiceGranularCacheUpdatedEvent,
  type DataServiceInvalidateQueriesAction,
  type QueryKey,
} from '@metamask/base-data-service';
import {
  createServicePolicy,
  handleWhen,
  type CreateServicePolicyOptions,
  type ServicePolicy,
} from '@metamask/controller-utils';
import type { Messenger } from '@metamask/messenger';
import type { Json } from '@metamask/utils';
import {
  hashKey,
  partialMatchKey,
  type InvalidateOptions,
  type InvalidateQueryFilters,
} from '@tanstack/query-core';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { TraceName, TraceOperation } from '../../../../util/trace';
import type { VenuePortfolioAdapter } from '../adapters/types';
import { PredictError, PredictErrorCode } from '../errors';
import {
  portfolioQueries,
  type GetActivityResult,
  type GetBalanceResult,
  type GetPositionsResult,
  type PortfolioPageParams,
} from '../queries/portfolioQueries';
import type { PredictReadOptions, PredictVenueId } from '../types';
import { isRetryablePredictError } from './servicePolicy';
import { withPredictNextTrace } from './withPredictNextTrace';

export const PREDICT_PORTFOLIO_SERVICE_NAME =
  'PredictPortfolioService' as const;

/** Bound on remembered reads so a pathological caller cannot grow the
 * registry without limit; the real cardinality is the distinct page
 * parameters product code uses. */
const MAX_CACHED_READS = 32;

/** A cached read the service can refresh in place: the key it cached under
 * and a zero-argument re-read that refetches through the same wrapped query
 * function, so completing it republishes `cacheUpdated` for the entry. */
interface CachedRead {
  queryKey: QueryKey;
  refresh: () => Promise<unknown>;
}

/** Whether a cached read's key matches invalidation filters. Applies the
 * same key matching TanStack uses to select queries for invalidation:
 * keyless filters match everything, exact filters compare hashes, and
 * otherwise the cached key must extend the filter key. Filters other than
 * the key (type, staleness) still apply to the stale-marking pass; every
 * key-matching entry is refreshed regardless. */
const matchesReadFilters = (
  queryKey: QueryKey,
  filters?: InvalidateQueryFilters<QueryKey>,
): boolean => {
  const filterKey = filters?.queryKey;
  if (!filterKey) {
    return true;
  }
  if (filters.exact) {
    return hashKey(queryKey) === hashKey(filterKey);
  }
  return partialMatchKey(queryKey, filterKey);
};

export interface PredictPortfolioServiceGetBalanceAction {
  type: 'PredictPortfolioService:getBalance';
  handler: (
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ) => Promise<GetBalanceResult>;
}

export interface PredictPortfolioServiceGetPositionsAction {
  type: 'PredictPortfolioService:getPositions';
  handler: (
    venueId: PredictVenueId,
    params: PortfolioPageParams,
    cursor?: string,
    options?: PredictReadOptions,
  ) => Promise<GetPositionsResult>;
}

export interface PredictPortfolioServiceGetActivityAction {
  type: 'PredictPortfolioService:getActivity';
  handler: (
    venueId: PredictVenueId,
    params: PortfolioPageParams,
    cursor?: string,
    options?: PredictReadOptions,
  ) => Promise<GetActivityResult>;
}

export type PredictPortfolioServiceActions =
  | PredictPortfolioServiceGetBalanceAction
  | PredictPortfolioServiceGetPositionsAction
  | PredictPortfolioServiceGetActivityAction
  | DataServiceInvalidateQueriesAction<typeof PREDICT_PORTFOLIO_SERVICE_NAME>;

export type PredictPortfolioServiceEvents =
  | DataServiceCacheUpdatedEvent<typeof PREDICT_PORTFOLIO_SERVICE_NAME>
  | DataServiceGranularCacheUpdatedEvent<typeof PREDICT_PORTFOLIO_SERVICE_NAME>;

export type PredictPortfolioServiceMessenger = Messenger<
  typeof PREDICT_PORTFOLIO_SERVICE_NAME,
  PredictPortfolioServiceActions,
  PredictPortfolioServiceEvents
>;

export interface PredictPortfolioServiceOptions {
  messenger: PredictPortfolioServiceMessenger;
  portfolio: VenuePortfolioAdapter;
  venueId: PredictVenueId;
  policyOptions?: Pick<
    CreateServicePolicyOptions,
    'backoff' | 'circuitBreakDuration' | 'maxConsecutiveFailures'
  >;
}

/** Owns cached, retryable account-scoped portfolio reads for one Venue. */
export class PredictPortfolioService extends BaseDataService<
  typeof PREDICT_PORTFOLIO_SERVICE_NAME,
  PredictPortfolioServiceMessenger
> {
  readonly #portfolio: VenuePortfolioAdapter;
  readonly #venueId: PredictVenueId;
  readonly #readPolicyOptions: Pick<
    CreateServicePolicyOptions,
    'backoff' | 'circuitBreakDuration' | 'maxConsecutiveFailures'
  >;
  readonly #balancePolicy: ServicePolicy;
  readonly #positionsPolicy: ServicePolicy;
  readonly #activityPolicy: ServicePolicy;
  /** Reads this service has cached, by query hash, for invalidation
   * refreshes. */
  readonly #cachedReads = new Map<string, CachedRead>();

  constructor({
    messenger,
    portfolio,
    venueId,
    policyOptions,
  }: PredictPortfolioServiceOptions) {
    super({
      name: PREDICT_PORTFOLIO_SERVICE_NAME,
      messenger,
      // Inert pass-through policy. Retries and circuit breaking live in the
      // per-read policies below so that Balance, Positions, and Activity can
      // load and retry independently: exhausting one read's retries must not
      // open the circuit for the others.
      policyOptions: {
        maxRetries: 0,
        maxConsecutiveFailures: Number.MAX_SAFE_INTEGER,
        retryFilterPolicy: handleWhen(isRetryablePredictError),
        isServiceFailure: isRetryablePredictError,
      },
    });
    this.#portfolio = portfolio;
    this.#venueId = venueId;
    this.#readPolicyOptions = policyOptions ?? {};
    this.#balancePolicy = this.#createReadPolicy();
    this.#positionsPolicy = this.#createReadPolicy();
    this.#activityPolicy = this.#createReadPolicy();

    messenger.registerActionHandler(
      'PredictPortfolioService:getBalance',
      this.getBalance.bind(this),
    );
    messenger.registerActionHandler(
      'PredictPortfolioService:getPositions',
      this.getPositions.bind(this),
    );
    messenger.registerActionHandler(
      'PredictPortfolioService:getActivity',
      this.getActivity.bind(this),
    );
  }

  #createReadPolicy(): ServicePolicy {
    return createServicePolicy({
      ...this.#readPolicyOptions,
      maxRetries: 2,
      retryFilterPolicy: handleWhen(isRetryablePredictError),
      isServiceFailure: isRetryablePredictError,
    });
  }

  async getBalance(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<GetBalanceResult> {
    this.#assertVenue(venueId);
    const descriptor = portfolioQueries.getBalance(venueId);
    // Remember the read so invalidateQueries can refresh its cache entry.
    this.#registerCachedRead(descriptor.queryKey, () =>
      this.getBalance(venueId),
    );
    // Account-scoped: trace timing and outcome only, never the amount.
    return withPredictNextTrace(
      {
        method: 'getBalance',
        name: TraceName.PredictNextGetBalance,
        op: TraceOperation.PredictDataFetch,
        tags: { venueId },
      },
      () =>
        this.fetchQuery({
          queryKey: descriptor.queryKey,
          staleTime: descriptor.staleTime,
          queryFn: ({ signal }) =>
            this.#balancePolicy.execute(
              () =>
                this.#portfolio.fetchBalance({
                  signal: options?.signal ?? signal,
                }) as Promise<Json & GetBalanceResult>,
            ),
        }),
    );
  }

  async getPositions(
    venueId: PredictVenueId,
    params: PortfolioPageParams,
    cursor?: string,
    options?: PredictReadOptions,
  ): Promise<GetPositionsResult> {
    this.#assertVenue(venueId);
    const descriptor = portfolioQueries.getPositions(venueId, params);
    // Remember the read so invalidateQueries can refresh its cache entry.
    this.#registerCachedRead(descriptor.queryKey, () =>
      this.getPositions(venueId, params),
    );
    // Account-scoped: trace timing and page shape only, never the amounts.
    return withPredictNextTrace(
      {
        method: 'getPositions',
        name: TraceName.PredictNextGetPositions,
        op: TraceOperation.PredictDataFetch,
        tags: { venueId },
        data: {
          hasCursor: Boolean(cursor),
          limit: params.limit ?? 0,
        },
        resultData: (result) => ({ positionCount: result.positions.length }),
      },
      () =>
        this.fetchInfiniteQuery(
          {
            queryKey: descriptor.queryKey,
            staleTime: descriptor.staleTime,
            initialPageParam: cursor as string | null,
            queryFn: async ({ pageParam, signal }) => {
              const page = await this.#positionsPolicy.execute(() =>
                this.#portfolio.fetchPositions(
                  { ...params, cursor: pageParam as string | undefined },
                  { signal: options?.signal ?? signal },
                ),
              );
              return {
                ...page,
                nextCursor: page.nextCursor || undefined,
              } as Json & GetPositionsResult;
            },
            getNextPageParam: (lastPage) => lastPage.nextCursor || null,
          },
          cursor,
        ),
    );
  }

  async getActivity(
    venueId: PredictVenueId,
    params: PortfolioPageParams,
    cursor?: string,
    options?: PredictReadOptions,
  ): Promise<GetActivityResult> {
    this.#assertVenue(venueId);
    const descriptor = portfolioQueries.getActivity(venueId, params);
    // Remember the read so invalidateQueries can refresh its cache entry.
    this.#registerCachedRead(descriptor.queryKey, () =>
      this.getActivity(venueId, params),
    );
    // Account-scoped: trace timing and page shape only, never the amounts.
    return withPredictNextTrace(
      {
        method: 'getActivity',
        name: TraceName.PredictNextGetActivity,
        op: TraceOperation.PredictDataFetch,
        tags: { venueId },
        data: {
          hasCursor: Boolean(cursor),
          limit: params.limit ?? 0,
        },
        resultData: (result) => ({ entryCount: result.activity.length }),
      },
      () =>
        this.fetchInfiniteQuery(
          {
            queryKey: descriptor.queryKey,
            staleTime: descriptor.staleTime,
            initialPageParam: cursor as string | null,
            queryFn: async ({ pageParam, signal }) => {
              const page = await this.#activityPolicy.execute(() =>
                this.#portfolio.fetchActivity(
                  { ...params, cursor: pageParam as string | undefined },
                  { signal: options?.signal ?? signal },
                ),
              );
              return {
                ...page,
                nextCursor: page.nextCursor || undefined,
              } as Json & GetActivityResult;
            },
            getNextPageParam: (lastPage) => lastPage.nextCursor || null,
          },
          cursor,
        ),
    );
  }

  /** Remembers a cached read for invalidation refreshes, evicting the
   * oldest read past the bound. */
  #registerCachedRead(
    queryKey: QueryKey,
    refresh: () => Promise<unknown>,
  ): void {
    const hash = hashKey(queryKey);
    if (
      !this.#cachedReads.has(hash) &&
      this.#cachedReads.size >= MAX_CACHED_READS
    ) {
      // Maps iterate in insertion order: evict the oldest read.
      const oldest = this.#cachedReads.keys().next();
      if (!oldest.done) {
        this.#cachedReads.delete(oldest.value);
      }
    }
    this.#cachedReads.set(hash, { queryKey, refresh });
  }

  /**
   * Refreshes the authoritative reads named by `filters` and republishes
   * them. The base implementation only marks entries stale: this cache is
   * never observed, so its refetch-on-invalidate is inert and the
   * `cacheUpdated` events a UI query client hydrates from would carry the
   * same pre-invalidation data forever. Marking stale first, then re-reading
   * every cached entry through its own query function, makes each completed
   * read publish fresh state with a newer `dataUpdatedAt` — the newer-data
   * property the UI cache's hydration applies.
   *
   * @param filters - Optional filter for selecting specific reads.
   * @param options - Additional optional options for query invalidations.
   * @returns Nothing.
   */
  async invalidateQueries(
    filters?: InvalidateQueryFilters<QueryKey>,
    options?: InvalidateOptions,
  ): Promise<void> {
    // Stale first: the refreshes below must not return cached data.
    await super.invalidateQueries(
      { ...filters, refetchType: 'none' },
      options,
    );
    // Re-read every cached entry matching the key filters. A failed refresh
    // keeps the prior cached data and must not fail the caller: the reads
    // stay stale only until their next fetch.
    await Promise.all(
      [...this.#cachedReads.values()]
        .filter((read) => matchesReadFilters(read.queryKey, filters))
        .map((read) =>
          read.refresh().catch((error) => {
            Logger.error(
              ensureError(error, 'PredictPortfolioService.invalidateQueries'),
              'PredictNext: failed to refresh a portfolio read on invalidation',
            );
          }),
        ),
    );
  }

  destroy(): void {
    this.#cachedReads.clear();
    super.destroy();
  }

  #assertVenue(venueId: PredictVenueId): void {
    if (venueId !== this.#venueId) {
      throw PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE);
    }
  }
}
