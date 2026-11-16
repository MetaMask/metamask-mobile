import type { Messenger } from '@metamask/messenger';
import type { DataServiceInvalidateQueriesAction } from '@metamask/base-data-service';
import type { Json } from '@metamask/utils';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { PredictError, PredictErrorCode } from '../errors';
import type { VenueFundingAdapter } from '../adapters/types';
import { portfolioQueries } from '../queries/portfolioQueries';
import type {
  PredictDepositApproval,
  PredictDepositOperation,
  PredictDepositParams,
  PredictDepositStatus,
  PredictDepositTransferParams,
  PredictVenueId,
} from '../types';

export const PREDICT_FUNDING_SERVICE_NAME = 'PredictFundingService' as const;

/** Statuses after which a deposit needs nothing more from the app. A
 * `cancelled` deposit can still move to `under_review`, which resolves it
 * again. */
const RESOLVED_DEPOSIT_STATUSES: readonly PredictDepositStatus[] = [
  'completed',
  'cancelled',
  'failed',
  'under_review',
];

const isResolved = (status: PredictDepositStatus): boolean =>
  RESOLVED_DEPOSIT_STATUSES.includes(status);

export interface PredictFundingServicePrepareDepositAction {
  type: 'PredictFundingService:prepareDeposit';
  handler: (
    venueId: PredictVenueId,
    params: PredictDepositParams,
    approval?: PredictDepositApproval,
  ) => Promise<PredictDepositOperation>;
}

export interface PredictFundingServiceGetDepositAction {
  type: 'PredictFundingService:getDeposit';
  handler: (
    venueId: PredictVenueId,
    operationId: string,
  ) => Promise<PredictDepositOperation>;
}

export interface PredictFundingServiceListOpenDepositsAction {
  type: 'PredictFundingService:listOpenDeposits';
  handler: (venueId: PredictVenueId) => Promise<PredictDepositOperation[]>;
}

export interface PredictFundingServiceReportDepositTransferAction {
  type: 'PredictFundingService:reportDepositTransfer';
  handler: (
    venueId: PredictVenueId,
    operationId: string,
    params: PredictDepositTransferParams,
  ) => Promise<PredictDepositOperation>;
}

export interface PredictFundingServiceCancelDepositAction {
  type: 'PredictFundingService:cancelDeposit';
  handler: (
    venueId: PredictVenueId,
    operationId: string,
  ) => Promise<PredictDepositOperation>;
}

export type PredictFundingServiceActions =
  | PredictFundingServicePrepareDepositAction
  | PredictFundingServiceGetDepositAction
  | PredictFundingServiceListOpenDepositsAction
  | PredictFundingServiceReportDepositTransferAction
  | PredictFundingServiceCancelDepositAction
  // Consumed action: a completed deposit changed the Balance. The cache
  // itself stays owned by the portfolio service.
  | DataServiceInvalidateQueriesAction<'PredictPortfolioService'>;

/**
 * Published once when this process sees a deposit it watched while open
 * reach a status that needs nothing more from the app: `completed`,
 * `cancelled`, `failed` or `under_review`. A deposit first read already
 * resolved is not announced, so an old deposit never shows up as news.
 */
export interface PredictFundingServiceDepositResolvedEvent {
  type: 'PredictFundingService:depositResolved';
  payload: [{ venueId: PredictVenueId; deposit: PredictDepositOperation }];
}

export type PredictFundingServiceEvents =
  PredictFundingServiceDepositResolvedEvent;

export type PredictFundingServiceMessenger = Messenger<
  typeof PREDICT_FUNDING_SERVICE_NAME,
  PredictFundingServiceActions,
  PredictFundingServiceEvents
>;

export interface PredictFundingServiceOptions {
  messenger: PredictFundingServiceMessenger;
  funding: VenueFundingAdapter;
  venueId: PredictVenueId;
}

/**
 * Owns the deposit workflow for one Venue: starting and signing a deposit,
 * reading it, reporting its transfer and cancelling it. The backend's
 * deposit operation is the record; this service keeps only what it needs
 * in memory to announce each resolution once, and nothing about a deposit
 * is persisted on the phone.
 *
 * **One deposit per key.** Repeated `prepareDeposit` calls with one
 * `clientOperationId` share the call in flight. The backend also answers a
 * repeated key with the deposit it already created, so a retry after a
 * crash never asks the venue for a second address.
 *
 * **Identity.** {@link PredictFundingService.clearState} forgets every
 * deposit and detaches calls in flight, so nothing the previous person
 * started is announced for the next one.
 */
export class PredictFundingService {
  readonly #messenger: PredictFundingServiceMessenger;
  readonly #funding: VenueFundingAdapter;
  readonly #venueId: PredictVenueId;
  /** The last status this process saw per deposit. Never persisted. */
  readonly #statuses = new Map<string, PredictDepositStatus>();
  /** `prepareDeposit` calls in flight, by `clientOperationId`. */
  readonly #preparing = new Map<string, Promise<PredictDepositOperation>>();
  /** Bumped by `clearState`: answers to older calls are not tracked. */
  #generation = 0;

  constructor({ messenger, funding, venueId }: PredictFundingServiceOptions) {
    this.#messenger = messenger;
    this.#funding = funding;
    this.#venueId = venueId;

    messenger.registerActionHandler(
      'PredictFundingService:prepareDeposit',
      this.prepareDeposit.bind(this),
    );
    messenger.registerActionHandler(
      'PredictFundingService:getDeposit',
      this.getDeposit.bind(this),
    );
    messenger.registerActionHandler(
      'PredictFundingService:listOpenDeposits',
      this.listOpenDeposits.bind(this),
    );
    messenger.registerActionHandler(
      'PredictFundingService:reportDepositTransfer',
      this.reportDepositTransfer.bind(this),
    );
    messenger.registerActionHandler(
      'PredictFundingService:cancelDeposit',
      this.cancelDeposit.bind(this),
    );
  }

  /**
   * Starts a deposit and signs the venue's address request with the device
   * key. Signing needs the explicit user approval; without it nothing is
   * sent. Answers the deposit, usually with its Funding Plan.
   */
  prepareDeposit(
    venueId: PredictVenueId,
    params: PredictDepositParams,
    approval?: PredictDepositApproval,
  ): Promise<PredictDepositOperation> {
    try {
      this.#assertVenue(venueId);
    } catch (error) {
      return Promise.reject(error);
    }
    if (approval?.kind !== 'user-approved') {
      return Promise.reject(
        PredictError.from(PredictErrorCode.VENUE_SIGNING_REFUSED, {
          metadata: {
            phase: 'commit',
            mutationRelay: 'not_relayed_this_invocation',
          },
        }),
      );
    }
    const key = params.clientOperationId;
    const inFlight = this.#preparing.get(key);
    if (inFlight) {
      return inFlight;
    }
    const generation = this.#generation;
    const prepared = this.#funding
      .prepareDeposit(
        { amount: params.amount, clientOperationId: key },
        approval,
      )
      .then((deposit) => this.#track(deposit, generation))
      .finally(() => {
        if (this.#preparing.get(key) === prepared) {
          this.#preparing.delete(key);
        }
      });
    this.#preparing.set(key, prepared);
    return prepared;
  }

  async getDeposit(
    venueId: PredictVenueId,
    operationId: string,
  ): Promise<PredictDepositOperation> {
    this.#assertVenue(venueId);
    const generation = this.#generation;
    return this.#track(await this.#funding.getDeposit(operationId), generation);
  }

  /** Deposits that are not final yet, oldest first. */
  async listOpenDeposits(
    venueId: PredictVenueId,
  ): Promise<PredictDepositOperation[]> {
    this.#assertVenue(venueId);
    const generation = this.#generation;
    const deposits = await this.#funding.listOpenDeposits();
    return deposits.map((deposit) => this.#track(deposit, generation));
  }

  async reportDepositTransfer(
    venueId: PredictVenueId,
    operationId: string,
    params: PredictDepositTransferParams,
  ): Promise<PredictDepositOperation> {
    this.#assertVenue(venueId);
    const generation = this.#generation;
    return this.#track(
      await this.#funding.reportDepositTransfer(operationId, {
        txHash: params.txHash,
        chainId: params.chainId,
      }),
      generation,
    );
  }

  async cancelDeposit(
    venueId: PredictVenueId,
    operationId: string,
  ): Promise<PredictDepositOperation> {
    this.#assertVenue(venueId);
    const generation = this.#generation;
    return this.#track(
      await this.#funding.cancelDeposit(operationId),
      generation,
    );
  }

  /**
   * Forgets every deposit this process saw and detaches calls in flight.
   * Engine `resetState` calls it when the wallet, and so the Predict User,
   * is replaced.
   */
  clearState(): void {
    this.#generation += 1;
    this.#statuses.clear();
    this.#preparing.clear();
  }

  destroy(): void {
    this.clearState();
    this.#messenger.unregisterActionHandler(
      'PredictFundingService:prepareDeposit',
    );
    this.#messenger.unregisterActionHandler('PredictFundingService:getDeposit');
    this.#messenger.unregisterActionHandler(
      'PredictFundingService:listOpenDeposits',
    );
    this.#messenger.unregisterActionHandler(
      'PredictFundingService:reportDepositTransfer',
    );
    this.#messenger.unregisterActionHandler(
      'PredictFundingService:cancelDeposit',
    );
  }

  /** Records the status and announces a resolution this process watched
   * happen. Answers from before `clearState` are returned, not recorded. */
  #track(
    deposit: PredictDepositOperation,
    generation: number,
  ): PredictDepositOperation {
    if (generation !== this.#generation) {
      return deposit;
    }
    const previous = this.#statuses.get(deposit.operationId);
    this.#statuses.set(deposit.operationId, deposit.status);
    if (
      previous !== undefined &&
      previous !== deposit.status &&
      isResolved(deposit.status) &&
      // `cancelled` to `under_review` resolves again: a transfer turned up.
      (!isResolved(previous) || previous === 'cancelled')
    ) {
      this.#messenger.publish('PredictFundingService:depositResolved', {
        venueId: this.#venueId,
        deposit,
      });
      if (deposit.status === 'completed') {
        this.#invalidateBalanceReads();
      }
    }
    return deposit;
  }

  /** Fire-and-forget: a credited deposit changed the Balance and the
   * Summary. A failed invalidation must not fail the deposit read. */
  #invalidateBalanceReads(): void {
    for (const family of [
      portfolioQueries.getBalance(this.#venueId).family,
      portfolioQueries.getPortfolioSummary(this.#venueId).family,
    ] as [string, ...Json[]][]) {
      // #invalidateFamily contains its own errors; this catch only marks the
      // fire-and-forget call as handled.
      this.#invalidateFamily(family).catch(() => undefined);
    }
  }

  async #invalidateFamily(family: [string, ...Json[]]): Promise<void> {
    try {
      await this.#messenger.call('PredictPortfolioService:invalidateQueries', {
        queryKey: family,
      });
    } catch (error) {
      Logger.error(
        ensureError(error, 'PredictFundingService.invalidateBalanceReads'),
        'PredictNext: failed to refresh the Balance after a deposit',
      );
    }
  }

  #assertVenue(venueId: PredictVenueId): void {
    if (venueId !== this.#venueId) {
      throw PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE);
    }
  }
}
