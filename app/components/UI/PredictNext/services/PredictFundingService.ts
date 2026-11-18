import type { Messenger } from '@metamask/messenger';
import type { DataServiceInvalidateQueriesAction } from '@metamask/base-data-service';
import type { Json } from '@metamask/utils';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { PredictError, PredictErrorCode } from '../errors';
import type { VenueFundingAdapter } from '../adapters/types';
import {
  portfolioQueries,
  portfolioQueryFamilies,
} from '../queries/portfolioQueries';
import type {
  PredictDepositApproval,
  PredictDepositOperation,
  PredictDepositParams,
  PredictDepositStatus,
  PredictDepositTransferParams,
  PredictReadOptions,
  PredictVenueId,
  PredictWithdrawPreview,
  PredictWithdrawPreviewParams,
  PredictWithdrawReceipt,
  PredictWithdrawReceiptStatus,
} from '../types';
import { withPredictNextTrace } from './withPredictNextTrace';

export const PREDICT_FUNDING_SERVICE_NAME = 'PredictFundingService' as const;

/** Receipt statuses that end the Withdraw workflow with a known outcome, so
 * the balance reads must be refreshed. `rejected` ended before money moved. */
const TERMINAL_WITHDRAW_STATUSES: Partial<
  Record<PredictWithdrawReceiptStatus, true>
> = { settled: true, failed: true, returned: true };

/** Statuses after which a deposit needs nothing more from the app. Only
 * `failed` is final: see {@link stageOf}. */
const RESOLVED_DEPOSIT_STATUSES: readonly PredictDepositStatus[] = [
  'completed',
  'cancelled',
  'failed',
  'under_review',
];

const isResolved = (status: PredictDepositStatus): boolean =>
  RESOLVED_DEPOSIT_STATUSES.includes(status);

/**
 * Where a deposit is in its lifecycle. It flattens the backend's transition
 * table (va-mmcx-predict-api `docs/FUNDING.md`, "Stored statuses and
 * transitions"): the backend only moves a deposit to a later stage, with one
 * exception. Support can move it between `completed` and `under_review`
 * either way, so those two share a stage.
 *
 * A transfer that turns up after a cancel or an expiry moves `cancelled` on
 * to `processing`, `under_review`, `completed` or `failed`. A credited
 * transfer that fails or is returned moves `completed` to `under_review`.
 * Support moves `under_review` to `completed` (it got the funds credited) or
 * `failed` (it closed it without a credit).
 *
 * `processing` before an address (`requesting_address`) comes before
 * `awaiting_transfer`; `processing` after a transfer comes after it.
 */
const stageOf = (deposit: PredictDepositOperation): number => {
  switch (deposit.status) {
    case 'processing':
      return deposit.depositAddress === null ? 0 : 3;
    case 'awaiting_transfer':
      return 1;
    case 'cancelled':
      return 2;
    case 'completed':
    case 'under_review':
      return 4;
    case 'failed':
      return 5;
  }
};

/** What this process knows about one deposit. Never persisted. */
interface KnownDeposit {
  status: PredictDepositStatus;
  stage: number;
  /** The clock when the latest answer this service took arrived. */
  receivedAt: number;
}

/** When a call was sent, so its answer can be placed against others. */
interface CallTicket {
  generation: number;
  sentAt: number;
}

/**
 * Whether an answer can replace what the service knows. A later stage always
 * can and an earlier one never can. Within a stage, the same status confirms
 * what the service knows; another status (`completed` against
 * `under_review`) counts only from a call sent after the known answer
 * arrived, because a call sent before it may have been served before it.
 */
const isNewer = (
  answer: KnownDeposit,
  known: KnownDeposit,
  sentAt: number,
): boolean => {
  if (answer.stage !== known.stage) {
    return answer.stage > known.stage;
  }
  return answer.status === known.status || sentAt >= known.receivedAt;
};

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
  // Consumed action: a Deposit that completes, or a Withdrawal that leaves
  // or returns money, changed the Balance. The cache itself stays owned by
  // the portfolio service.
  | DataServiceInvalidateQueriesAction<'PredictPortfolioService'>;

/**
 * Published when this process sees a deposit it already knew reach a status
 * that needs nothing more from the app: `completed`, `cancelled`, `failed` or
 * `under_review`. Each such move is published once, including a later one
 * after support review (`under_review` to `completed`, say). A deposit first
 * read already resolved is not announced, so an old deposit never shows up
 * as news, and an answer older than what the service knows is never
 * announced again.
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
 * Owns the funding workflows for one Venue.
 *
 * **Deposits.** Starting and signing a deposit, reading it, reporting its
 * transfer and cancelling it. The backend's deposit operation is the record;
 * this service keeps only what it needs in memory to announce each
 * resolution once, and nothing about a deposit is persisted on the phone.
 *
 * **One deposit per key.** Repeated `prepareDeposit` calls with one
 * `clientOperationId` share the call in flight. The backend also answers a
 * repeated key with the deposit it already created, so a retry after a
 * crash never asks the venue for a second address.
 *
 * **Order.** Answers can arrive out of order: a read sent before a transfer
 * report can arrive after the report's answer. Arrival order says nothing
 * about which is newer, so the service keeps what it knows about each
 * deposit apart from the last answer. An answer at an earlier
 * {@link stageOf | stage} is older and is ignored. A move between
 * `completed` and `under_review`, which can go either way, counts only from
 * a call sent after the answer the service last took arrived. The caller
 * still gets every answer as the backend sent it.
 *
 * **Withdrawals.** The server quote, the Commit of an approved quote, and the
 * receipt read a surface polls. The phone supplies no identity, destination,
 * or idempotency key — the backend owns all three — so a retry only ever
 * references `previewId`, and repeated Commits converge on one operation.
 * Observation belongs to the surface: {@link useWithdrawReceipt} polls this
 * service only while the Withdraw sheet is mounted, and nothing is persisted.
 *
 * **Identity.** {@link PredictFundingService.clearState} forgets every
 * deposit and detaches calls in flight, and
 * {@link PredictFundingService.abandon} forgets every receipt transition
 * this session saw, so nothing the previous person started is announced or
 * read for the next one.
 */
export class PredictFundingService {
  readonly #messenger: PredictFundingServiceMessenger;
  readonly #funding: VenueFundingAdapter;
  readonly #venueId: PredictVenueId;
  /** What this process knows per deposit, by operation ID. */
  readonly #known = new Map<string, KnownDeposit>();
  /** Counts the answers that arrived. A call sent after an answer arrived
   * holds a count at least as high as that answer's. */
  #clock = 0;
  /** `prepareDeposit` calls in flight, by `clientOperationId`. */
  readonly #preparing = new Map<string, Promise<PredictDepositOperation>>();
  /** The last status each Preview's receipt reported, so a balance read is
   * invalidated once per transition rather than once per poll. */
  readonly #statusByPreview = new Map<string, PredictWithdrawReceiptStatus>();
  /** Bumped by `clearState` and `abandon`: answers to older calls are not
   * tracked, and a session that quoted a Preview cannot commit it. */
  #generation = 0;
  #cleanupLifecycle?: () => void;

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
    const ticket = this.#send();
    const prepared = this.#funding
      .prepareDeposit(
        { amount: params.amount, clientOperationId: key },
        approval,
      )
      .then((deposit) => this.#track(deposit, ticket))
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
    const ticket = this.#send();
    return this.#track(await this.#funding.getDeposit(operationId), ticket);
  }

  /** Deposits that are not final yet, oldest first. */
  async listOpenDeposits(
    venueId: PredictVenueId,
  ): Promise<PredictDepositOperation[]> {
    this.#assertVenue(venueId);
    const ticket = this.#send();
    const deposits = await this.#funding.listOpenDeposits();
    return deposits.map((deposit) => this.#track(deposit, ticket));
  }

  async reportDepositTransfer(
    venueId: PredictVenueId,
    operationId: string,
    params: PredictDepositTransferParams,
  ): Promise<PredictDepositOperation> {
    this.#assertVenue(venueId);
    const ticket = this.#send();
    return this.#track(
      await this.#funding.reportDepositTransfer(operationId, {
        txHash: params.txHash,
        chainId: params.chainId,
      }),
      ticket,
    );
  }

  async cancelDeposit(
    venueId: PredictVenueId,
    operationId: string,
  ): Promise<PredictDepositOperation> {
    this.#assertVenue(venueId);
    const ticket = this.#send();
    return this.#track(await this.#funding.cancelDeposit(operationId), ticket);
  }

  /** Quotes one Withdrawal. Never cached: the quote carries the destination
   * the backend resolved and the expiry it set. */
  async requestWithdrawPreview(
    venueId: PredictVenueId,
    params: PredictWithdrawPreviewParams,
    options?: PredictReadOptions,
  ): Promise<PredictWithdrawPreview> {
    this.#assertVenue(venueId);
    const generation = this.#generation;
    const preview = await withPredictNextTrace(
      {
        method: 'requestWithdrawPreview',
        name: TraceName.PredictNextWithdrawPreview,
        op: TraceOperation.PredictDataFetch,
        tags: { venueId: this.#venueId },
        data: { mode: this.#modeOf(params) },
      },
      () => this.#funding.previewWithdraw(params, options),
    );
    this.#assertNotAbandoned(generation);
    return preview;
  }

  /** Commits a quoted Withdrawal by reference only. The sheet is the one
   * caller and fences a second tap, so there is nothing to coalesce. */
  async commitWithdrawPreview(
    venueId: PredictVenueId,
    previewId: string,
    options?: PredictReadOptions,
  ): Promise<PredictWithdrawReceipt> {
    this.#assertVenue(venueId);
    const generation = this.#generation;
    const receipt = await withPredictNextTrace(
      {
        method: 'commitWithdrawPreview',
        name: TraceName.PredictNextWithdrawCommit,
        op: TraceOperation.PredictDataFetch,
        tags: { venueId: this.#venueId },
        resultData: (result) => ({ status: result.status }),
      },
      () => this.#funding.commitWithdraw(previewId, options),
    );
    this.#assertNotAbandoned(generation);
    // Recording invalidates the balance reads the receipt's status implies,
    // exactly as an observation transition does.
    this.#recordStatus(receipt);
    return receipt;
  }

  /** Reads the canonical receipt. Never submits: an unresolved operation is
   * resolved by the backend's own venue reads. A surface calls this on its
   * backoff schedule while it is mounted. */
  async observeWithdraw(
    venueId: PredictVenueId,
    previewId: string,
    options?: PredictReadOptions,
  ): Promise<PredictWithdrawReceipt> {
    this.#assertVenue(venueId);
    const generation = this.#generation;
    const receipt = await this.#funding.observeWithdraw(previewId, options);
    this.#assertNotAbandoned(generation);
    this.#recordStatus(receipt);
    return receipt;
  }

  /**
   * Forgets every deposit this process saw and detaches calls in flight.
   * Engine `resetState` calls it when the wallet, and so the Predict User,
   * is replaced.
   */
  clearState(): void {
    this.#generation += 1;
    this.#known.clear();
    this.#preparing.clear();
  }

  /**
   * Abandons every Withdrawal this session knows about. Called when the
   * platform replaces the Predict User: the operations belong to somebody
   * else, so the service must neither read their receipts nor refresh the
   * balance reads they describe.
   */
  abandon(): void {
    this.#generation += 1;
    this.#statusByPreview.clear();
  }

  /** Runtime composition registers the subscriptions it owns around this
   * service, so destroying the service releases them too. */
  setLifecycleCleanup(cleanup: () => void): void {
    this.#cleanupLifecycle = cleanup;
  }

  destroy(): void {
    // Nothing may read a deposit or a Withdrawal once the service is gone: a
    // destroyed Engine must not read the previous person's receipt.
    this.abandon();
    this.clearState();
    this.#cleanupLifecycle?.();
    this.#cleanupLifecycle = undefined;
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

  #send(): CallTicket {
    return { generation: this.#generation, sentAt: this.#clock };
  }

  /** Records what an answer says about its deposit and announces a
   * resolution this process watched happen. Answers from before
   * `clearState`, and answers older than what the service knows, are
   * returned, not recorded. */
  #track(
    deposit: PredictDepositOperation,
    ticket: CallTicket,
  ): PredictDepositOperation {
    if (ticket.generation !== this.#generation) {
      return deposit;
    }
    this.#clock += 1;
    const answer: KnownDeposit = {
      status: deposit.status,
      stage: stageOf(deposit),
      receivedAt: this.#clock,
    };
    const known = this.#known.get(deposit.operationId);
    if (known !== undefined && !isNewer(answer, known, ticket.sentAt)) {
      return deposit;
    }
    this.#known.set(deposit.operationId, answer);
    if (
      known !== undefined &&
      known.status !== deposit.status &&
      isResolved(deposit.status)
    ) {
      this.#messenger.publish('PredictFundingService:depositResolved', {
        venueId: this.#venueId,
        deposit,
      });
      // A credit, or a credit going back to review, changes the Balance.
      if (deposit.status === 'completed' || known.status === 'completed') {
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

  /** The receipt a Commit or an observation produced becomes the state the
   * sheet renders, and a status transition invalidates the balance reads. */
  #recordStatus(receipt: PredictWithdrawReceipt): void {
    const previous = this.#statusByPreview.get(receipt.previewId);
    this.#statusByPreview.set(receipt.previewId, receipt.status);
    // One invalidation per transition: entering `processing` means the
    // account balance moved, and a terminal status settles what is left.
    if (previous === receipt.status) {
      return;
    }
    if (
      receipt.status === 'processing' ||
      TERMINAL_WITHDRAW_STATUSES[receipt.status] === true
    ) {
      this.#invalidateFundingReads();
    }
  }

  /** Fire-and-forget: a Withdrawal that enters or leaves `processing`
   * changed Balance and Summary. A failed invalidation must not fail the
   * committed Withdrawal; the reads stay stale only until their next fetch. */
  #invalidateFundingReads(): void {
    for (const family of portfolioQueryFamilies(this.#venueId)) {
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
        ensureError(error, 'PredictFundingService.invalidateFundingReads'),
        'PredictNext: failed to refresh balance reads after funding',
      );
    }
  }

  #modeOf(params: PredictWithdrawPreviewParams): 'fixed' | 'sweep_all' {
    return 'sweepAll' in params ? 'sweep_all' : 'fixed';
  }

  #assertVenue(venueId: PredictVenueId): void {
    if (venueId !== this.#venueId) {
      throw PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE, {
        metadata: { venueId },
      });
    }
  }

  #assertNotAbandoned(generation: number): void {
    if (generation !== this.#generation) {
      // The session that quoted the Preview is gone; the same code the
      // backend uses for a rejected token keeps this out of user copy.
      throw PredictError.from(PredictErrorCode.UNAUTHENTICATED);
    }
  }
}
