import type { Messenger } from '@metamask/messenger';
import type { DataServiceInvalidateQueriesAction } from '@metamask/base-data-service';
import type { Json } from '@metamask/utils';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { PredictError, PredictErrorCode } from '../errors';
import type { VenueFundingAdapter } from '../adapters/types';
import { clearAllSessionDepositTransfers } from '../funding';
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

/** The approved intent stays private even if a caller edits its quote. */
interface PinnedWithdrawPreview {
  generation: number;
  preview: PredictWithdrawPreview;
  dispatched: boolean;
}

// Match the adapter's decimal-string comparison without floating-point loss.
const isSameAmount = (left: string, right: string): boolean =>
  left.replace(/(\.\d*?)0+$/u, '$1').replace(/\.$/u, '') ===
  right.replace(/(\.\d*?)0+$/u, '$1').replace(/\.$/u, '');

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
 * A lock stops observations without detaching a dispatched Commit. An identity
 * change aborts only Commits that have not been sent, detaches shared calls,
 * and drops their eventual answers. Observation belongs to the surface:
 * {@link useWithdrawReceipt} polls only while the Withdraw sheet is mounted.
 * Nothing is persisted.
 *
 * **Identity.** {@link PredictFundingService.changeIdentity} forgets all
 * in-memory funding state. {@link PredictFundingService.stopObserving} keeps
 * the current identity's pinned intents and receipt transitions intact.
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
  /** Approved Withdrawal intents and their shared Commits, by Preview ID. */
  readonly #previews = new Map<string, PinnedWithdrawPreview>();
  readonly #committing = new Map<string, Promise<PredictWithdrawReceipt>>();
  /** The last status each Preview's receipt reported, so a balance read is
   * invalidated once per transition rather than once per poll. */
  readonly #statusByPreview = new Map<string, PredictWithdrawReceiptStatus>();
  /** Commits whose bearer token may still be resolving. Aborting one before
   * it is sent keeps the previous session's Commit from going out. */
  readonly #commitTransports = new Set<AbortController>();
  /** Receipt reads whose bearer token may still be resolving. An observation
   * can replay a stored submission, so it must not go out for the next
   * Predict User either. */
  readonly #observationTransports = new Set<AbortController>();
  /** Bumped on identity changes: older answers are not tracked and old
   * Previews cannot be committed. */
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

  /** Quotes one Withdrawal and pins the returned intent for approval. Each
   * call asks the backend for its destination and expiry again. */
  async requestWithdrawPreview(
    venueId: PredictVenueId,
    params: PredictWithdrawPreviewParams,
    options?: PredictReadOptions,
  ): Promise<PredictWithdrawPreview> {
    this.#assertVenue(venueId);
    const generation = this.#generation;
    try {
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
      this.#previews.set(preview.previewId, {
        generation,
        preview: { ...preview, destination: { ...preview.destination } },
        dispatched: false,
      });
      this.#evictPreviews(preview.previewId);
      return preview;
    } catch (error) {
      // An abandoned session is UNAUTHENTICATED even when the request
      // rejected, so an old failure never surfaces as the next person's.
      this.#assertNotAbandoned(generation);
      throw error;
    }
  }

  /** Commits one approved Preview. Every caller shares the mutation, but
   * cancelling one caller only stops that caller waiting for its answer. */
  commitWithdrawPreview(
    venueId: PredictVenueId,
    previewId: string,
    options?: PredictReadOptions,
  ): Promise<PredictWithdrawReceipt> {
    let pinned: PinnedWithdrawPreview;
    try {
      this.#assertVenue(venueId);
      pinned = this.#approvedPreview(previewId, this.#generation);
    } catch (error) {
      return Promise.reject(error);
    }
    const inFlight = this.#committing.get(previewId);
    if (inFlight) {
      return this.#waitForCommit(inFlight, options?.signal);
    }
    const transport = new AbortController();
    this.#commitTransports.add(transport);
    // Defer dispatch until the shared promise is registered. Even a caller
    // re-entering while the adapter starts joins this same Commit.
    const committed = Promise.resolve()
      .then(() => this.#commitWithdraw(previewId, pinned, transport, options))
      .finally(() => {
        this.#commitTransports.delete(transport);
        if (this.#committing.get(previewId) === committed) {
          this.#committing.delete(previewId);
        }
      });
    this.#committing.set(previewId, committed);
    return this.#waitForCommit(committed, options?.signal);
  }

  async #commitWithdraw(
    previewId: string,
    pinned: PinnedWithdrawPreview,
    transport: AbortController,
    options?: PredictReadOptions,
  ): Promise<PredictWithdrawReceipt> {
    this.#approvedPreview(previewId, pinned.generation);
    if (
      !pinned.dispatched &&
      Date.parse(pinned.preview.expiresAt) <= Date.now()
    ) {
      throw PredictError.from(PredictErrorCode.PREVIEW_EXPIRED, {
        metadata: {
          phase: 'commit',
          mutationRelay: 'not_relayed_this_invocation',
        },
      });
    }
    try {
      const receipt = await withPredictNextTrace(
        {
          method: 'commitWithdrawPreview',
          name: TraceName.PredictNextWithdrawCommit,
          op: TraceOperation.PredictDataFetch,
          tags: { venueId: this.#venueId },
          resultData: (result) => ({ status: result.status }),
        },
        () =>
          this.#funding.commitWithdraw(
            previewId,
            { ...options, signal: transport.signal },
            () => {
              pinned.dispatched = true;
              this.#commitTransports.delete(transport);
            },
          ),
      );
      this.#assertNotAbandoned(pinned.generation);
      this.#assertWithdrawIntent(receipt, pinned);
      this.#recordStatus(receipt);
      return receipt;
    } catch (error) {
      // An abandoned session cannot record even an already-sent Commit.
      this.#assertNotAbandoned(pinned.generation);
      throw error;
    }
  }

  #waitForCommit(
    committed: Promise<PredictWithdrawReceipt>,
    signal?: AbortSignal,
  ): Promise<PredictWithdrawReceipt> {
    if (!signal) {
      return committed;
    }
    return new Promise((resolve, reject) => {
      const abort = (): void => {
        const error = new Error('The request was aborted.');
        error.name = 'AbortError';
        signal.removeEventListener('abort', abort);
        reject(error);
      };
      committed.then(
        (receipt) => {
          signal.removeEventListener('abort', abort);
          resolve(receipt);
        },
        (error) => {
          signal.removeEventListener('abort', abort);
          reject(error);
        },
      );
      if (signal.aborted) {
        abort();
      } else {
        signal.addEventListener('abort', abort);
      }
    });
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
    const pinned = this.#previews.get(previewId);
    const transport = new AbortController();
    const abortForCaller = (): void => transport.abort();
    if (options?.signal?.aborted) {
      transport.abort();
    }
    options?.signal?.addEventListener('abort', abortForCaller);
    this.#observationTransports.add(transport);
    try {
      const receipt = await this.#funding.observeWithdraw(previewId, {
        ...options,
        signal: transport.signal,
      });
      // The fence stays after the answer, exactly as a Commit's does: a read
      // sent for one Predict User is never recorded against the next.
      this.#assertNotAbandoned(generation);
      if (transport.signal.aborted) {
        const error = new Error('The request was aborted.');
        error.name = 'AbortError';
        throw error;
      }
      if (pinned) {
        this.#assertWithdrawIntent(receipt, pinned);
      }
      this.#recordStatus(receipt);
      return receipt;
    } catch (error) {
      // An abandoned session is UNAUTHENTICATED even when the transport
      // rejected because it was aborted. A caller-only abort keeps its
      // AbortError so the surface can tell a local cancellation apart.
      this.#assertNotAbandoned(generation);
      throw error;
    } finally {
      this.#observationTransports.delete(transport);
      options?.signal?.removeEventListener('abort', abortForCaller);
    }
  }

  /** Engine reset replaces the wallet and therefore the Predict User. */
  clearState(): void {
    this.changeIdentity();
  }

  /** Stops observation on lock or background without forgetting this user. */
  stopObserving(): void {
    for (const transport of this.#observationTransports) {
      transport.abort();
    }
    this.#observationTransports.clear();
    for (const transport of this.#commitTransports) {
      transport.abort();
    }
    // A Commit aborted before dispatch never left the phone, so the next
    // confirm must start its own POST instead of joining that doomed promise.
    // A dispatched Commit stays joinable: it may already be at the venue.
    for (const previewId of this.#committing.keys()) {
      if (this.#previews.get(previewId)?.dispatched !== true) {
        this.#committing.delete(previewId);
      }
    }
  }

  /** Detaches the previous identity, leaving dispatched mutations alive until
   * they settle. Their answers cannot cross the generation fence. */
  changeIdentity(): void {
    this.#generation += 1;
    this.stopObserving();
    this.#previews.clear();
    this.#committing.clear();
    this.#statusByPreview.clear();
    this.#known.clear();
    this.#preparing.clear();
    clearAllSessionDepositTransfers(this.#venueId);
  }

  /** Runtime composition registers the subscriptions it owns around this
   * service, so destroying the service releases them too. */
  setLifecycleCleanup(cleanup: () => void): void {
    this.#cleanupLifecycle = cleanup;
  }

  destroy(): void {
    // Nothing may read a deposit or a Withdrawal once the service is gone: a
    // destroyed Engine must not read the previous person's receipt.
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

  #evictPreviews(newestPreviewId: string): void {
    for (const [previewId, pinned] of this.#previews) {
      if (pinned.generation !== this.#generation) {
        this.#previews.delete(previewId);
      }
    }
    for (const [previewId, pinned] of this.#previews) {
      if (this.#previews.size <= 50) {
        break;
      }
      const status = this.#statusByPreview.get(previewId);
      const settled =
        status === 'rejected' ||
        (status !== undefined && TERMINAL_WITHDRAW_STATUSES[status] === true);
      if (
        previewId !== newestPreviewId &&
        !this.#committing.has(previewId) &&
        (!pinned.dispatched || settled)
      ) {
        this.#previews.delete(previewId);
      }
    }
  }

  #approvedPreview(
    previewId: string,
    generation: number,
  ): PinnedWithdrawPreview {
    const pinned = this.#previews.get(previewId);
    if (
      !pinned ||
      pinned.generation !== this.#generation ||
      generation !== this.#generation
    ) {
      throw PredictError.from(PredictErrorCode.UNAUTHENTICATED, {
        metadata: {
          phase: 'commit',
          mutationRelay: 'not_relayed_this_invocation',
        },
      });
    }
    return pinned;
  }

  #assertWithdrawIntent(
    receipt: PredictWithdrawReceipt,
    { preview }: PinnedWithdrawPreview,
  ): void {
    const amountsMatch =
      preview.requestedAmount === undefined
        ? receipt.requestedAmount === undefined
        : receipt.requestedAmount !== undefined &&
          isSameAmount(preview.requestedAmount, receipt.requestedAmount);
    if (
      receipt.previewId !== preview.previewId ||
      receipt.mode !== preview.mode ||
      !amountsMatch ||
      receipt.destination.address !== preview.destination.address ||
      receipt.destination.network !== preview.destination.network ||
      receipt.destination.source !== preview.destination.source
    ) {
      throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
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
