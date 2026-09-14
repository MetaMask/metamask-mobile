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
import type { VenuePortfolioAdapter } from '../adapters/types';
import { PredictError, PredictErrorCode } from '../errors';
import {
  portfolioQueries,
  type GetBalanceResult,
} from '../queries/portfolioQueries';
import type { PredictReadOptions, PredictVenueId } from '../types';
import { isRetryablePredictError } from './servicePolicy';
import { withPredictNextTrace } from './withPredictNextTrace';

export const PREDICT_PORTFOLIO_SERVICE_NAME =
  'PredictPortfolioService' as const;

export interface PredictPortfolioServiceGetBalanceAction {
  type: 'PredictPortfolioService:getBalance';
  handler: (
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ) => Promise<GetBalanceResult>;
}

export type PredictPortfolioServiceActions =
  | PredictPortfolioServiceGetBalanceAction
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

  constructor({
    messenger,
    portfolio,
    venueId,
    policyOptions,
  }: PredictPortfolioServiceOptions) {
    super({
      name: PREDICT_PORTFOLIO_SERVICE_NAME,
      messenger,
      policyOptions: {
        ...policyOptions,
        maxRetries: 2,
        retryFilterPolicy: handleWhen(isRetryablePredictError),
        isServiceFailure: isRetryablePredictError,
      },
    });
    this.#portfolio = portfolio;
    this.#venueId = venueId;

    messenger.registerActionHandler(
      'PredictPortfolioService:getBalance',
      this.getBalance.bind(this),
    );
  }

  async getBalance(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<GetBalanceResult> {
    this.#assertVenue(venueId);
    const descriptor = portfolioQueries.getBalance(venueId);
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
            this.#portfolio.fetchBalance({
              signal: options?.signal ?? signal,
            }) as Promise<Json & GetBalanceResult>,
        }),
    );
  }

  #assertVenue(venueId: PredictVenueId): void {
    if (venueId !== this.#venueId) {
      throw PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE);
    }
  }
}
