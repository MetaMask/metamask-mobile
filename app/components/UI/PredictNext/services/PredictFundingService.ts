import type { Messenger } from '@metamask/messenger';
import type { DataServiceInvalidateQueriesAction } from '@metamask/base-data-service';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Json } from '@metamask/utils';
import Logger from '../../../../util/Logger';
import type { NetworkTier } from '../../../../util/deviceCapability/types';
import { ensureError } from '../../../../util/errorUtils';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { PredictError, PredictErrorCode } from '../errors';
import { isUnsentCommitFailure } from '../errors/commitOutcome';
import type { VenueFundingAdapter } from '../adapters/types';
import {
  clearAllSessionDepositTransfers,
  matchDepositTransferForResume,
} from '../funding';
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
import { depositNextPollDelayMs } from './internal/depositPolling';
import type { DepositStatusJournal } from './internal/depositStatusJournal';
import { withPredictNextTrace } from './withPredictNextTrace';

export const PREDICT_FUNDING_SERVICE_NAME = 'PredictFundingService' as const;

/** Receipt statuses that end the Withdraw workflow with a known outcome, so
 * the balance reads must be refreshed. `rejected` ended before money moved. */
const TERMINAL_WITHDRAW_STATUSES: Partial<
  Record<PredictWithdrawReceiptStatus, true>
> = { settled: true, failed: true, returned: true };

/** What a Withdraw Commit resolved to. `not_placed` never left a Withdraw
 * behind, so the amount can be quoted again. `unknown` may already be at the
 * Venue: the caller keeps the Preview and must not submit it again. */
export type WithdrawCommitResolution =
  | { outcome: 'receipt'; receipt: PredictWithdrawReceipt }
  | { outcome: 'not_placed'; error: PredictError }
  | { outcome: 'unknown'; error: PredictError };

const asPredictError = (error: unknown): PredictError =>
  error instanceof PredictError
    ? error
    : PredictError.from(PredictErrorCode.UNKNOWN);

/** A deadline or a cancelled transport is not proof the Commit missed the
 * Venue. The name is the signal the platform gives us; status codes are not. */
const isLostCommitTransport = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === 'AbortError' || error.name === 'TimeoutError');

/** A receipt read that finds no Preview and no operation. This is read-side
 * absence, not the commit's own `outcome`: the backend stores the operation
 * before it calls the Venue, so no record means nothing was sent. Any other
 * read failure proves nothing. */
const isMissingWithdrawOperation = (error: unknown): boolean => {
  if (!(error instanceof PredictError)) {
    return false;
  }
  const bodyCode = error.metadata?.bodyCode;
  return bodyCode === 'preview_not_found' || bodyCode === 'operation_not_found';
};

const resolutionFromReadError = (
  recoveryError: unknown,
  priorError: PredictError,
): WithdrawCommitResolution => ({
  outcome: isMissingWithdrawOperation(recoveryError) ? 'not_placed' : 'unknown',
  error: recoveryError instanceof PredictError ? recoveryError : priorError,
});

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

const isOpenDepositStatus = (status: PredictDepositStatus): boolean =>
  status === 'awaiting_transfer' ||
  status === 'processing' ||
  status === 'under_review';

const isSignalAborted = (signal?: AbortSignal): boolean =>
  signal?.aborted === true;

const DEPOSIT_FOCUS_REFRESH_MIN_INTERVAL_MS = 5_000;

const selectPrimaryDepositStatus = (
  openDeposits: ReadonlyMap<string, PredictDepositOperation>,
  pendingTerminalNotices: ReadonlyMap<string, PredictDepositOperation>,
): PredictDepositOperation | null => {
  let latestActive: PredictDepositOperation | null = null;
  let latestUnderReview: PredictDepositOperation | null = null;
  for (const deposit of openDeposits.values()) {
    if (
      deposit.status === 'awaiting_transfer' ||
      deposit.status === 'processing'
    ) {
      latestActive = deposit;
    } else if (deposit.status === 'under_review') {
      latestUnderReview = deposit;
    }
  }
  const firstNotice = pendingTerminalNotices.values().next().value ?? null;
  return latestActive ?? latestUnderReview ?? firstNotice;
};

const depositStatusSignature = (
  deposit: PredictDepositOperation | null,
): string =>
  deposit
    ? [
        deposit.operationId,
        deposit.status,
        deposit.txHash ?? '',
        deposit.depositAddress ?? '',
        deposit.next?.kind ?? '',
      ].join('|')
    : 'none';

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

export interface PredictFundingServiceGetDepositStatusAction {
  type: 'PredictFundingService:getDepositStatus';
  handler: (venueId: PredictVenueId) => PredictDepositOperation | null;
}

export interface PredictFundingServiceAcknowledgeDepositNoticeAction {
  type: 'PredictFundingService:acknowledgeDepositNotice';
  handler: (venueId: PredictVenueId, operationId: string) => void;
}

export interface PredictFundingServiceRefreshDepositStatusAction {
  type: 'PredictFundingService:refreshDepositStatus';
  handler: (venueId: PredictVenueId) => Promise<void>;
}

export type PredictFundingServiceActions =
  | PredictFundingServicePrepareDepositAction
  | PredictFundingServiceGetDepositAction
  | PredictFundingServiceListOpenDepositsAction
  | PredictFundingServiceReportDepositTransferAction
  | PredictFundingServiceCancelDepositAction
  | PredictFundingServiceGetDepositStatusAction
  | PredictFundingServiceAcknowledgeDepositNoticeAction
  | PredictFundingServiceRefreshDepositStatusAction
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

/** Published whenever the active deposit status line changes for a Venue. */
export interface PredictFundingServiceDepositStatusChangedEvent {
  type: 'PredictFundingService:depositStatusChanged';
  payload: [
    { venueId: PredictVenueId; deposit: PredictDepositOperation | null },
  ];
}

export type PredictFundingServiceEvents =
  | PredictFundingServiceDepositResolvedEvent
  | PredictFundingServiceDepositStatusChangedEvent;

export type PredictFundingServiceMessenger = Messenger<
  typeof PREDICT_FUNDING_SERVICE_NAME,
  PredictFundingServiceActions,
  PredictFundingServiceEvents
>;

export interface PredictFundingServiceOptions {
  messenger: PredictFundingServiceMessenger;
  funding: VenueFundingAdapter;
  venueId: PredictVenueId;
  /** Reads wallet transactions from `TransactionController` for deposit resume. */
  getTransactions?: () => readonly TransactionMeta[];
  /** Injectable clock in ms for polling-window checks. */
  now?: () => number;
  /** Persists unresolved deposit IDs and unacknowledged terminal notices by identity. */
  journal?: DepositStatusJournal;
  /** Resolves the canonical Predict profile ID scoping persisted deposit notices. */
  getIdentityScope?: () => Promise<string | undefined>;
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
  readonly #getTransactions: () => readonly TransactionMeta[];
  readonly #now: () => number;
  readonly #journal?: DepositStatusJournal;
  readonly #getIdentityScope?: () => Promise<string | undefined>;
  /** What this process knows per deposit, by operation ID. */
  readonly #known = new Map<string, KnownDeposit>();
  /** Currently open deposits (`awaiting_transfer`, `processing`, `under_review`). */
  readonly #openDeposits = new Map<string, PredictDepositOperation>();
  /** Unresolved operation IDs retained for cold-launch outcome reconciliation. */
  readonly #unresolved = new Map<string, PredictDepositStatus>();
  /** Unacknowledged `failed` or `cancelled` notices keyed by operation ID. */
  readonly #pendingTerminalNotices = new Map<string, PredictDepositOperation>();
  #lastPublishedStatusSignature = 'none';
  /** Counts the answers that arrived. A call sent after an answer arrived
   * holds a count at least as high as that answer's. */
  #clock = 0;
  /** `prepareDeposit` calls in flight, by `clientOperationId`. */
  readonly #preparing = new Map<string, Promise<PredictDepositOperation>>();
  /** `reportDepositTransfer` calls in flight, by `${operationId}:${txHash}`. */
  readonly #reporting = new Map<string, Promise<PredictDepositOperation>>();
  /** `cancelDeposit` calls in flight, by `operationId`. */
  readonly #cancelling = new Map<string, Promise<PredictDepositOperation>>();
  /** Transfer reports permanently refused by the backend (`DEPOSIT_TRANSFER_MISMATCH`). */
  readonly #refusedTransferReports = new Set<string>();
  /** Deposit adapter calls whose bearer token or fetch may still be pending. */
  readonly #depositTransports = new Set<AbortController>();
  /** Deposit polling & resume state. */
  #depositLifecycleEnabled = false;
  #pollingActive = false;
  #pendingResumeWhenOnline = false;
  #networkTier: NetworkTier | null = null;
  #pollTimer: ReturnType<typeof setTimeout> | undefined;
  #pollAttempt = 0;
  #pollStartedAt: number | null = null;
  #lastDepositReadAt = 0;
  #depositPollEpoch = 0;
  #resumeTransport: AbortController | null = null;
  #resumeInFlight: Promise<void> | null = null;
  #refreshInFlight: Promise<void> | null = null;
  #identityScope?: string;
  #journalLoadedGeneration: number | null = null;
  #journalLoadInFlight: Promise<void> | null = null;
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

  constructor({
    messenger,
    funding,
    venueId,
    getTransactions = () => [],
    now = Date.now,
    journal,
    getIdentityScope,
  }: PredictFundingServiceOptions) {
    this.#messenger = messenger;
    this.#funding = funding;
    this.#venueId = venueId;
    this.#getTransactions = getTransactions;
    this.#now = now;
    this.#journal = journal;
    this.#getIdentityScope = getIdentityScope;

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
    messenger.registerActionHandler(
      'PredictFundingService:getDepositStatus',
      this.getDepositStatus.bind(this),
    );
    messenger.registerActionHandler(
      'PredictFundingService:acknowledgeDepositNotice',
      this.acknowledgeDepositNotice.bind(this),
    );
    messenger.registerActionHandler(
      'PredictFundingService:refreshDepositStatus',
      this.refreshDepositStatus.bind(this),
    );
  }

  /**
   * Starts a deposit and signs the venue's address request with the device
   * key. Signing needs the explicit user approval; without it nothing is
   * sent. Answers the deposit, usually with its Funding Plan.
   */
  async prepareDeposit(
    venueId: PredictVenueId,
    params: PredictDepositParams,
    approval?: PredictDepositApproval,
    options?: PredictReadOptions,
  ): Promise<PredictDepositOperation> {
    this.#assertVenue(venueId);
    if (approval?.kind !== 'user-approved') {
      throw PredictError.from(PredictErrorCode.VENUE_SIGNING_REFUSED, {
        metadata: {
          phase: 'commit',
          requestSent: false,
        },
      });
    }
    const key = params.clientOperationId;
    const inFlight = this.#preparing.get(key);
    if (inFlight) {
      return await inFlight;
    }
    const ticket = this.#send();
    const prepared = this.#withDepositTransport(
      options?.signal,
      async (signal) =>
        this.#funding.prepareDeposit(
          { amount: params.amount, clientOperationId: key },
          approval,
          { signal },
        ),
    )
      .then((deposit) => this.#track(deposit, ticket))
      .finally(() => {
        if (this.#preparing.get(key) === prepared) {
          this.#preparing.delete(key);
        }
      });
    this.#preparing.set(key, prepared);
    return await prepared;
  }

  async getDeposit(
    venueId: PredictVenueId,
    operationId: string,
    options?: PredictReadOptions,
  ): Promise<PredictDepositOperation> {
    this.#assertVenue(venueId);
    const ticket = this.#send();
    const deposit = await this.#withDepositTransport(
      options?.signal,
      async (signal) => this.#funding.getDeposit(operationId, { signal }),
    );
    return this.#track(deposit, ticket);
  }

  /** Deposits that are not final yet, oldest first. */
  async listOpenDeposits(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<PredictDepositOperation[]> {
    this.#assertVenue(venueId);
    const ticket = this.#send();
    const deposits = await this.#withDepositTransport(
      options?.signal,
      async (signal) => this.#funding.listOpenDeposits({ signal }),
    );
    return deposits.map((deposit) => this.#track(deposit, ticket));
  }

  async reportDepositTransfer(
    venueId: PredictVenueId,
    operationId: string,
    params: PredictDepositTransferParams,
    options?: PredictReadOptions,
  ): Promise<PredictDepositOperation> {
    this.#assertVenue(venueId);
    const key = `${operationId}:${params.txHash.toLowerCase()}`;
    const inFlight = this.#reporting.get(key);
    if (inFlight) {
      return await inFlight;
    }
    const ticket = this.#send();
    const reported = this.#withDepositTransport(
      options?.signal,
      async (signal) =>
        this.#funding.reportDepositTransfer(
          operationId,
          {
            txHash: params.txHash,
            chainId: params.chainId,
          },
          { signal },
        ),
    )
      .then((deposit) => this.#track(deposit, ticket))
      .finally(() => {
        if (this.#reporting.get(key) === reported) {
          this.#reporting.delete(key);
        }
      });
    this.#reporting.set(key, reported);
    return await reported;
  }

  async cancelDeposit(
    venueId: PredictVenueId,
    operationId: string,
    options?: PredictReadOptions,
  ): Promise<PredictDepositOperation> {
    this.#assertVenue(venueId);
    const inFlight = this.#cancelling.get(operationId);
    if (inFlight) {
      return await inFlight;
    }
    const ticket = this.#send();
    const cancelled = this.#withDepositTransport(
      options?.signal,
      async (signal) => this.#funding.cancelDeposit(operationId, { signal }),
    )
      .then((deposit) => this.#track(deposit, ticket))
      .finally(() => {
        if (this.#cancelling.get(operationId) === cancelled) {
          this.#cancelling.delete(operationId);
        }
      });
    this.#cancelling.set(operationId, cancelled);
    return await cancelled;
  }

  /** Current deposit to render in the status line for `venueId`, or `null`. */
  getDepositStatus(venueId: PredictVenueId): PredictDepositOperation | null {
    this.#assertVenue(venueId);
    return selectPrimaryDepositStatus(
      this.#openDeposits,
      this.#pendingTerminalNotices,
    );
  }

  /** Marks a one-time `failed` or `cancelled` status notice as shown so it is
   * not displayed again on another surface or visit. */
  acknowledgeDepositNotice(venueId: PredictVenueId, operationId: string): void {
    this.#assertVenue(venueId);
    if (this.#pendingTerminalNotices.delete(operationId)) {
      this.#persistJournal();
      this.#publishDepositStatusIfChanged();
    }
  }

  /**
   * Cheap focus refresh for open deposits, catching outcomes after the
   * fast-poll cap without waiting for the next slow follow-up tick.
   */
  async refreshDepositStatus(venueId: PredictVenueId): Promise<void> {
    this.#assertVenue(venueId);
    if (
      !this.#depositLifecycleEnabled ||
      this.#isOffline() ||
      this.#openDeposits.size === 0 ||
      this.#resumeInFlight
    ) {
      return;
    }
    if (
      this.#pollingActive &&
      this.#now() - this.#lastDepositReadAt <
        DEPOSIT_FOCUS_REFRESH_MIN_INTERVAL_MS
    ) {
      return;
    }
    if (this.#refreshInFlight) {
      return await this.#refreshInFlight;
    }
    const generation = this.#generation;
    const epoch = this.#depositPollEpoch;
    const signal = this.#resumeTransport?.signal;
    const refresh = this.#refreshOpenDeposits(
      generation,
      epoch,
      signal,
    ).finally(() => {
      if (this.#refreshInFlight === refresh) {
        this.#refreshInFlight = null;
      }
    });
    this.#refreshInFlight = refresh;
    await refresh;
  }

  /**
   * Resumes open Kalshi deposits on start, unlock, or foreground.
   *
   * Fetches `listOpenDeposits` and reconciles any retained unresolved IDs.
   * For each `awaiting_transfer` deposit, matches tagged `TransactionController`
   * transactions: reports `submitted`/`confirmed` hashes, cancels
   * `rejected`/`failed` transfers, and leaves pending or absent transfers alone
   * for the user to continue or cancel. Polls open deposits with exponential
   * backoff (2s to 30s) up to 10 min, then slower 5-min follow-up up to 60 min,
   * respecting network capability.
   */
  async resumeDeposits(): Promise<void> {
    this.#depositLifecycleEnabled = true;
    if (this.#networkTier === 'NONE') {
      this.#pendingResumeWhenOnline = true;
      this.#clearPollTimer();
      return;
    }
    this.#pendingResumeWhenOnline = false;
    if (this.#resumeInFlight) {
      return await this.#resumeInFlight;
    }
    const generation = this.#generation;
    this.#depositPollEpoch += 1;
    const epoch = this.#depositPollEpoch;
    this.#resumeTransport?.abort();
    const resumeTransport = new AbortController();
    this.#resumeTransport = resumeTransport;
    this.#clearPollTimer();
    this.#pollAttempt = 0;
    this.#pollStartedAt = this.#now();
    this.#pollingActive = true;
    const pass = this.#runResumePass(
      generation,
      epoch,
      resumeTransport.signal,
    ).finally(() => {
      if (this.#resumeInFlight === pass) {
        this.#resumeInFlight = null;
      }
    });
    this.#resumeInFlight = pass;
    await pass;
  }

  /** Stops deposit polling timers and aborts in-flight resume transports on
   * lock, background, or Venue deactivation without erasing session state. */
  stopDepositPolling(): void {
    this.#depositLifecycleEnabled = false;
    this.#pollingActive = false;
    this.#pendingResumeWhenOnline = false;
    this.#depositPollEpoch += 1;
    this.#clearPollTimer();
    this.#resumeTransport?.abort();
    this.#resumeTransport = null;
    this.#resumeInFlight = null;
    this.#refreshInFlight = null;
  }

  /** Updates the device's network capability tier for deposit polling. Stops
   * polling while offline (`NONE`) and backs off on `SLOW_CELLULAR`. */
  setDepositNetworkTier(tier: NetworkTier | null): void {
    const previous = this.#networkTier;
    this.#networkTier = tier;
    if (tier === 'NONE') {
      this.#clearPollTimer();
      return;
    }
    if (previous === 'NONE') {
      if (this.#depositLifecycleEnabled && this.#pendingResumeWhenOnline) {
        this.resumeDeposits().catch(() => undefined);
      } else if (
        this.#depositLifecycleEnabled &&
        this.#pollingActive &&
        this.#openDeposits.size > 0
      ) {
        this.#pollAttempt = 0;
        this.#scheduleNextPoll(
          this.#generation,
          this.#depositPollEpoch,
          this.#resumeTransport?.signal,
        );
      }
      return;
    }
    if (tier !== previous && this.#pollTimer !== undefined) {
      this.#scheduleNextPoll(
        this.#generation,
        this.#depositPollEpoch,
        this.#resumeTransport?.signal,
      );
    }
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
          requestSent: false,
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

  /** Commits one approved Withdraw Preview. A Commit that provably changed
   * nothing (never sent, or `outcome: not_placed` from the API) is
   * `not_placed`. Any other failure may be at the Venue, so it is resolved by
   * reading the same operation. An unauthenticated Commit stays `unknown`
   * without that read: the caller asks {@link reconcileWithdrawObservation}
   * when the person checks again, and this method never sends a second POST. */
  async reconcileWithdrawCommit(
    venueId: PredictVenueId,
    previewId: string,
  ): Promise<WithdrawCommitResolution> {
    try {
      return {
        outcome: 'receipt',
        receipt: await this.commitWithdrawPreview(venueId, previewId),
      };
    } catch (error) {
      const predictError = asPredictError(error);
      if (isLostCommitTransport(error)) {
        return this.#readWithdrawResolution(venueId, previewId, predictError);
      }
      // A replaced session may have dispatched this Preview earlier: what
      // this call proves says nothing about that one.
      if (predictError.code === PredictErrorCode.UNAUTHENTICATED) {
        return { outcome: 'unknown', error: predictError };
      }
      if (isUnsentCommitFailure(error)) {
        return { outcome: 'not_placed', error: predictError };
      }
      // No guarantee: the Commit may be at the Venue. Read it to find out.
      return this.#readWithdrawResolution(venueId, previewId, predictError);
    }
  }

  /** Reads one Withdraw whose Commit reply was lost. Never submits. */
  reconcileWithdrawObservation(
    venueId: PredictVenueId,
    previewId: string,
    priorError: PredictError,
  ): Promise<WithdrawCommitResolution> {
    return this.#readWithdrawResolution(venueId, previewId, priorError);
  }

  async #readWithdrawResolution(
    venueId: PredictVenueId,
    previewId: string,
    priorError: PredictError,
  ): Promise<WithdrawCommitResolution> {
    try {
      return {
        outcome: 'receipt',
        receipt: await this.observeWithdraw(venueId, previewId),
      };
    } catch (recoveryError) {
      return resolutionFromReadError(recoveryError, priorError);
    }
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
    void this.#journal?.clear().catch(() => undefined);
  }

  /** Stops observation on lock or background without forgetting this user. */
  stopObserving(): void {
    this.stopDepositPolling();
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
    for (const transport of this.#depositTransports) {
      transport.abort();
    }
    this.#depositTransports.clear();
    this.#previews.clear();
    this.#committing.clear();
    this.#statusByPreview.clear();
    this.#known.clear();
    this.#openDeposits.clear();
    this.#unresolved.clear();
    this.#pendingTerminalNotices.clear();
    this.#preparing.clear();
    this.#reporting.clear();
    this.#cancelling.clear();
    this.#refusedTransferReports.clear();
    this.#pollAttempt = 0;
    this.#pollStartedAt = null;
    this.#lastDepositReadAt = 0;
    this.#resumeInFlight = null;
    this.#refreshInFlight = null;
    this.#identityScope = undefined;
    this.#journalLoadedGeneration = null;
    this.#journalLoadInFlight = null;
    clearAllSessionDepositTransfers(this.#venueId);
    this.#publishDepositStatusIfChanged();
  }

  /** Runtime composition registers the subscriptions it owns around this
   * service, so destroying the service releases them too. */
  setLifecycleCleanup(cleanup: () => void): void {
    this.#cleanupLifecycle = cleanup;
  }

  destroy(): void {
    // Nothing may read a deposit or a Withdrawal once the service is gone: a
    // destroyed Engine must not read the previous person's receipt.
    this.changeIdentity();
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
    this.#messenger.unregisterActionHandler(
      'PredictFundingService:getDepositStatus',
    );
    this.#messenger.unregisterActionHandler(
      'PredictFundingService:acknowledgeDepositNotice',
    );
    this.#messenger.unregisterActionHandler(
      'PredictFundingService:refreshDepositStatus',
    );
  }

  #send(): CallTicket {
    return { generation: this.#generation, sentAt: this.#clock };
  }

  async #withDepositTransport<Result>(
    signal: AbortSignal | undefined,
    run: (transportSignal: AbortSignal) => Promise<Result>,
  ): Promise<Result> {
    const transport = new AbortController();
    const abortFromCaller = (): void => transport.abort();
    if (signal?.aborted) {
      transport.abort();
    }
    signal?.addEventListener('abort', abortFromCaller);
    this.#depositTransports.add(transport);
    try {
      return await run(transport.signal);
    } finally {
      this.#depositTransports.delete(transport);
      signal?.removeEventListener('abort', abortFromCaller);
    }
  }

  async #ensureJournalLoaded(generation: number): Promise<void> {
    if (
      !this.#journal ||
      !this.#getIdentityScope ||
      this.#journalLoadedGeneration === generation
    ) {
      return;
    }
    if (this.#journalLoadInFlight) {
      await this.#journalLoadInFlight;
      return;
    }
    const load = (async () => {
      const scope = await this.#getIdentityScope?.().catch(() => undefined);
      if (generation !== this.#generation) {
        return;
      }
      if (!scope) {
        this.#journalLoadedGeneration = generation;
        return;
      }
      this.#identityScope = scope;
      const snapshot = await this.#journal
        ?.load(scope, this.#venueId)
        .catch(() => ({ unresolved: [], notices: [] }));
      if (generation !== this.#generation || !snapshot) {
        return;
      }
      let statusChanged = false;
      for (const entry of snapshot.unresolved) {
        if (!this.#unresolved.has(entry.operationId)) {
          this.#unresolved.set(entry.operationId, entry.lastStatus);
        }
        if (!this.#known.has(entry.operationId)) {
          this.#known.set(entry.operationId, {
            status: entry.lastStatus,
            stage: entry.lastStatus === 'under_review' ? 4 : 1,
            receivedAt: 0,
          });
        }
      }
      for (const notice of snapshot.notices) {
        if (
          !this.#pendingTerminalNotices.has(notice.operationId) &&
          !this.#openDeposits.has(notice.operationId)
        ) {
          this.#pendingTerminalNotices.set(notice.operationId, notice);
          statusChanged = true;
        }
      }
      this.#journalLoadedGeneration = generation;
      if (statusChanged) {
        this.#publishDepositStatusIfChanged();
      }
    })().finally(() => {
      if (this.#journalLoadInFlight === load) {
        this.#journalLoadInFlight = null;
      }
    });
    this.#journalLoadInFlight = load;
    await load;
  }

  #persistJournal(): void {
    const journal = this.#journal;
    if (!journal) {
      return;
    }
    const generation = this.#generation;
    const write = (scope: string): void => {
      if (generation !== this.#generation) {
        return;
      }
      void journal
        .save(scope, this.#venueId, {
          unresolved: Array.from(
            this.#unresolved,
            ([operationId, lastStatus]) => ({ operationId, lastStatus }),
          ),
          notices: Array.from(this.#pendingTerminalNotices.values()),
        })
        .catch(() => undefined);
    };
    if (this.#identityScope) {
      write(this.#identityScope);
      return;
    }
    if (this.#getIdentityScope) {
      void this.#getIdentityScope()
        .then((scope) => {
          if (scope && generation === this.#generation) {
            this.#identityScope = scope;
            write(scope);
          }
        })
        .catch(() => undefined);
    }
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

    let journalDirty = false;
    if (isOpenDepositStatus(deposit.status)) {
      this.#openDeposits.set(deposit.operationId, deposit);
      if (this.#unresolved.get(deposit.operationId) !== deposit.status) {
        this.#unresolved.set(deposit.operationId, deposit.status);
        journalDirty = true;
      }
      if (this.#pendingTerminalNotices.delete(deposit.operationId)) {
        journalDirty = true;
      }
    } else {
      this.#openDeposits.delete(deposit.operationId);
      if (this.#unresolved.delete(deposit.operationId)) {
        journalDirty = true;
      }
      if (
        known !== undefined &&
        known.status !== deposit.status &&
        (deposit.status === 'failed' || deposit.status === 'cancelled')
      ) {
        this.#pendingTerminalNotices.set(deposit.operationId, deposit);
        journalDirty = true;
      }
    }

    if (journalDirty) {
      this.#persistJournal();
    }

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

    this.#publishDepositStatusIfChanged();

    if (
      this.#depositLifecycleEnabled &&
      isOpenDepositStatus(deposit.status) &&
      !this.#pollingActive &&
      this.#networkTier !== 'NONE'
    ) {
      this.#startDepositPolling();
    }

    return deposit;
  }

  #publishDepositStatusIfChanged(): void {
    const deposit = selectPrimaryDepositStatus(
      this.#openDeposits,
      this.#pendingTerminalNotices,
    );
    const signature = depositStatusSignature(deposit);
    if (signature === this.#lastPublishedStatusSignature) {
      return;
    }
    this.#lastPublishedStatusSignature = signature;
    this.#messenger.publish('PredictFundingService:depositStatusChanged', {
      venueId: this.#venueId,
      deposit,
    });
  }

  #clearPollTimer(): void {
    if (this.#pollTimer !== undefined) {
      clearTimeout(this.#pollTimer);
      this.#pollTimer = undefined;
    }
  }

  #startDepositPolling(): void {
    this.#clearPollTimer();
    this.#pollAttempt = 0;
    this.#pollStartedAt = this.#now();
    this.#pollingActive = true;
    this.#scheduleNextPoll(
      this.#generation,
      this.#depositPollEpoch,
      this.#resumeTransport?.signal,
    );
  }

  #isResumePassStale(
    generation: number,
    epoch: number,
    signal: AbortSignal | undefined,
  ): boolean {
    return (
      generation !== this.#generation ||
      epoch !== this.#depositPollEpoch ||
      !this.#pollingActive ||
      signal?.aborted === true
    );
  }

  async #runResumePass(
    generation: number,
    epoch: number,
    signal: AbortSignal,
  ): Promise<void> {
    await this.#ensureJournalLoaded(generation);
    if (this.#isResumePassStale(generation, epoch, signal)) {
      return;
    }
    const idsToReconcile = new Set<string>([
      ...this.#openDeposits.keys(),
      ...this.#unresolved.keys(),
    ]);
    let open: PredictDepositOperation[];
    try {
      open = await this.listOpenDeposits(this.#venueId, { signal });
      this.#lastDepositReadAt = this.#now();
    } catch (error) {
      if (!this.#isResumePassStale(generation, epoch, signal)) {
        this.#pollingActive = false;
        Logger.error(
          ensureError(error, 'PredictFundingService.resumeDeposits'),
          'PredictNext: failed to list open deposits on resume',
        );
      }
      return;
    }
    if (this.#isResumePassStale(generation, epoch, signal)) {
      return;
    }
    const openIds = new Set<string>(open.map((deposit) => deposit.operationId));
    for (const previousId of idsToReconcile) {
      if (!openIds.has(previousId)) {
        if (this.#isResumePassStale(generation, epoch, signal)) {
          return;
        }
        try {
          await this.getDeposit(this.#venueId, previousId, { signal });
          this.#lastDepositReadAt = this.#now();
        } catch (error) {
          if (
            error instanceof PredictError &&
            error.code === PredictErrorCode.DEPOSIT_NOT_FOUND
          ) {
            if (this.#unresolved.delete(previousId)) {
              this.#persistJournal();
            }
          } else if (!this.#isResumePassStale(generation, epoch, signal)) {
            Logger.error(
              ensureError(
                error,
                'PredictFundingService.reconcileClosedDeposit',
              ),
              'PredictNext: failed to read resolved deposit on resume',
            );
          }
        }
      }
    }
    for (const deposit of open) {
      if (this.#isResumePassStale(generation, epoch, signal)) {
        return;
      }
      if (deposit.status === 'awaiting_transfer') {
        await this.#reconcileAwaitingTransfer(deposit, generation, signal);
      }
    }
    if (this.#isResumePassStale(generation, epoch, signal)) {
      return;
    }
    if (this.#openDeposits.size > 0) {
      this.#scheduleNextPoll(generation, epoch, signal);
    } else {
      this.#pollingActive = false;
    }
  }

  async #refreshOpenDeposits(
    generation: number,
    epoch: number,
    signal: AbortSignal | undefined,
  ): Promise<void> {
    const openIds = [...this.#openDeposits.keys()];
    for (const operationId of openIds) {
      if (
        generation !== this.#generation ||
        epoch !== this.#depositPollEpoch ||
        !this.#depositLifecycleEnabled ||
        this.#isOffline() ||
        signal?.aborted === true
      ) {
        return;
      }
      try {
        const latest = await this.getDeposit(this.#venueId, operationId, {
          signal,
        });
        this.#lastDepositReadAt = this.#now();
        if (
          generation === this.#generation &&
          epoch === this.#depositPollEpoch &&
          latest.status === 'awaiting_transfer'
        ) {
          await this.#reconcileAwaitingTransfer(latest, generation, signal);
        }
      } catch (error) {
        if (
          generation === this.#generation &&
          epoch === this.#depositPollEpoch &&
          !isSignalAborted(signal)
        ) {
          Logger.error(
            ensureError(error, 'PredictFundingService.refreshDepositStatus'),
            'PredictNext: failed to refresh open deposit status',
          );
        }
      }
    }
    if (
      generation === this.#generation &&
      epoch === this.#depositPollEpoch &&
      this.#openDeposits.size === 0
    ) {
      this.#pollingActive = false;
      this.#clearPollTimer();
    }
  }

  async #reconcileAwaitingTransfer(
    deposit: PredictDepositOperation,
    generation: number,
    signal?: AbortSignal,
  ): Promise<void> {
    const match = matchDepositTransferForResume({
      transactions: this.#getTransactions(),
      deposit,
    });
    if (generation !== this.#generation || isSignalAborted(signal)) {
      return;
    }
    if (match.kind === 'report') {
      const reportKey = `${deposit.operationId}:${match.txHash.toLowerCase()}`;
      if (this.#refusedTransferReports.has(reportKey)) {
        return;
      }
      try {
        await this.reportDepositTransfer(
          this.#venueId,
          deposit.operationId,
          {
            txHash: match.txHash,
            chainId: match.chainId,
          },
          { signal },
        );
      } catch (error) {
        if (
          error instanceof PredictError &&
          error.code === PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH
        ) {
          this.#refusedTransferReports.add(reportKey);
        }
        if (!isSignalAborted(signal) && generation === this.#generation) {
          Logger.error(
            ensureError(error, 'PredictFundingService.reportResumedTransfer'),
            'PredictNext: failed to report matched deposit transfer on resume',
          );
        }
      }
      return;
    }
    if (match.kind === 'cancel') {
      try {
        await this.cancelDeposit(this.#venueId, deposit.operationId, {
          signal,
        });
      } catch (error) {
        if (!isSignalAborted(signal) && generation === this.#generation) {
          Logger.error(
            ensureError(error, 'PredictFundingService.cancelFailedTransfer'),
            'PredictNext: failed to cancel deposit after failed/rejected transfer',
          );
        }
      }
    }
  }

  #isOffline(): boolean {
    return this.#networkTier === 'NONE';
  }

  async #pollOpenDeposits(
    generation: number,
    epoch: number,
    signal: AbortSignal | undefined,
  ): Promise<void> {
    if (
      this.#isResumePassStale(generation, epoch, signal) ||
      this.#isOffline()
    ) {
      return;
    }
    const elapsed =
      this.#pollStartedAt === null ? 0 : this.#now() - this.#pollStartedAt;
    if (
      depositNextPollDelayMs(this.#pollAttempt, elapsed, this.#networkTier) ===
      null
    ) {
      this.#pollingActive = false;
      this.#clearPollTimer();
      return;
    }
    const openIds = [...this.#openDeposits.keys()];
    if (openIds.length === 0) {
      this.#pollingActive = false;
      return;
    }
    for (const operationId of openIds) {
      if (
        this.#isResumePassStale(generation, epoch, signal) ||
        this.#isOffline()
      ) {
        return;
      }
      try {
        const latest = await this.getDeposit(this.#venueId, operationId, {
          signal,
        });
        this.#lastDepositReadAt = this.#now();
        if (
          !this.#isResumePassStale(generation, epoch, signal) &&
          latest.status === 'awaiting_transfer'
        ) {
          await this.#reconcileAwaitingTransfer(latest, generation, signal);
        }
      } catch (error) {
        if (
          !this.#isResumePassStale(generation, epoch, signal) &&
          signal?.aborted !== true
        ) {
          Logger.error(
            ensureError(error, 'PredictFundingService.pollOpenDeposits'),
            'PredictNext: failed to poll open deposit',
          );
        }
      }
    }
    if (this.#isResumePassStale(generation, epoch, signal)) {
      return;
    }
    this.#pollAttempt += 1;
    if (this.#openDeposits.size > 0) {
      this.#scheduleNextPoll(generation, epoch, signal);
    } else {
      this.#pollingActive = false;
    }
  }

  #scheduleNextPoll(
    generation: number,
    epoch: number,
    signal: AbortSignal | undefined,
  ): void {
    this.#clearPollTimer();
    if (
      this.#isResumePassStale(generation, epoch, signal) ||
      this.#openDeposits.size === 0 ||
      this.#networkTier === 'NONE'
    ) {
      return;
    }
    const elapsed =
      this.#pollStartedAt === null ? 0 : this.#now() - this.#pollStartedAt;
    const delay = depositNextPollDelayMs(
      this.#pollAttempt,
      elapsed,
      this.#networkTier,
    );
    if (delay === null) {
      this.#pollingActive = false;
      return;
    }
    this.#pollTimer = setTimeout(() => {
      this.#pollTimer = undefined;
      this.#pollOpenDeposits(generation, epoch, signal).catch(() => undefined);
    }, delay);
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
          requestSent: false,
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
