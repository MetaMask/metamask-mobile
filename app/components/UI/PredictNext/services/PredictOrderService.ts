import type { Messenger } from '@metamask/messenger';
import type { DataServiceInvalidateQueriesAction } from '@metamask/base-data-service';
import type { Json } from '@metamask/utils';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { PredictError, PredictErrorCode } from '../errors';
import type {
  PredictOrderApproval,
  PredictOrderReview,
  PredictOrderPreview,
  PredictOrderPreviewParams,
  PredictOrderReceipt,
  PredictOrderReceiptStatus,
  PredictUnresolvedOrder,
  PredictVenueId,
} from '../types';
import { portfolioQueryFamilies } from '../queries/portfolioQueries';
import type { VenueTradingAdapter } from '../adapters/types';
import { withPredictNextTrace } from './withPredictNextTrace';
import type {
  OrderDispatchJournal,
  OrderDispatchReference,
} from './internal/orderDispatchJournal';

export const PREDICT_ORDER_SERVICE_NAME = 'PredictOrderService' as const;

/** Receipt statuses in which the backend has accepted the Commit and is
 * still working; they are observed by reading the operation's receipt. */
const IN_PROGRESS_RECEIPT_STATUSES: readonly PredictOrderReceiptStatus[] = [
  'pending',
  'submitted',
];

/** Receipt statuses that end the Order workflow with a known outcome. */
const TERMINAL_RECEIPT_STATUSES: readonly PredictOrderReceiptStatus[] = [
  'filled',
  'partially_filled',
  'not_filled',
  'rejected',
  'needs_manual_review',
];

/** How many receipt reads observe one in-flight Commit before handing
 * control back to the caller. The backend's own Commit is fast, so this
 * stays small. */
const MAX_COMMIT_OBSERVATIONS = 3;

/** How long to wait between observation reads, in milliseconds. */
const COMMIT_OBSERVATION_DELAY_MS = 500;

/** Clock-skew/claim grace. A missing-operation GET must begin after the
 * backend preview expiry plus this interval; expiry alone proves nothing. */
export const MISSING_OPERATION_EXPIRY_GRACE_MS = 30_000;

/** Delays between the background observations of an unresolved operation,
 * in milliseconds. The last delay repeats. */
const BACKGROUND_OBSERVATION_DELAYS_MS: readonly number[] = [
  2_000, 5_000, 10_000, 20_000, 30_000,
];

/** How long to observe an unresolved operation in the background before
 * pausing. A local deadline never proves an order's financial outcome. */
const BACKGROUND_OBSERVATION_WINDOW_MS = 5 * 60_000;

/** Most background observations of one operation, even if the window is
 * never hit. One may sign a venue order scan while the backend reconciles. */
const MAX_BACKGROUND_OBSERVATIONS = 12;

/**
 * Where one Order Preview stands relative to the submission boundary.
 */
type OrderOperationState =
  /** Approvable and never handed to the transport: a pre-submit Preview,
   * cancelled by a context change. */
  | 'quoted'
  /** A context change cancelled it before dispatch; it is never committed. */
  | 'cancelled'
  /** A Commit was handed to the transport, so it may have reached the
   * backend: submitted or ambiguous, never cancellable. Only the same
   * Preview reference may be observed. */
  | 'dispatched'
  /** A receipt or a proven-unsent first invocation ended the workflow. */
  | 'resolved';

/** How an Order operation ended, as far as this process observed it. */
export type PredictOrderOutcome =
  | { status: 'settled'; receipt: PredictOrderReceipt }
  | { status: 'not_placed'; code: PredictErrorCode };

/** One resolved Order operation. It carries the backend operation
 * references and the canonical Receipt only: no identity, token or wallet. */
export interface PredictOrderResolution {
  venueId: PredictVenueId;
  /** The committed Order Preview: the backend's idempotency reference. */
  previewId: string;
  outcome: PredictOrderOutcome;
}

export type PredictOrderResolutionListener = (
  resolution: PredictOrderResolution,
) => void;

/** Process-local observation state for one Order Preview. Never persisted. */
interface OrderOperation {
  readonly previewId: string;
  /** Epoch milliseconds; the backend's expiry as the client reads it. */
  readonly expiresAt?: number;
  /** The context the Preview was quoted under. */
  readonly contextEpoch: number;
  reviewed: boolean;
  /** Once dispatched, later calls observe only unless the first invocation
   * was explicitly proven not relayed. Observation errors never reset it. */
  posted: boolean;
  state: OrderOperationState;
  /** When the first Commit was dispatched. */
  dispatchedAt?: number;
  /** A Receipt proved the operation exists. */
  receiptSeen: boolean;
  /** A Commit failed without a conclusive answer, so the operation may
   * exist even though no Receipt has said so. */
  ambiguous: boolean;
  backgroundObservations: number;
  backgroundTimer?: ReturnType<typeof setTimeout>;
  recoveryState?: 'unresolved' | 'manual_review';
  lastReceipt?: PredictOrderReceipt;
  manualReviewPruned?: boolean;
  /** Surfaces currently showing this operation to the Predict User. */
  readonly presenters: Set<PredictOrderResolutionListener>;
}

/** A Commit being observed, and the rejection that abandons it. */
interface InFlightCommit {
  promise: Promise<PredictOrderReceipt>;
  abandon: (error: PredictError) => void;
  suspend: () => void;
}

const isInProgressReceipt = (receipt: PredictOrderReceipt): boolean =>
  IN_PROGRESS_RECEIPT_STATUSES.includes(receipt.status);

const isTerminalReceipt = (receipt: PredictOrderReceipt): boolean =>
  TERMINAL_RECEIPT_STATUSES.includes(receipt.status);

/** Evidence applies only to the first mutation invocation, never an observe
 * failure or an earlier ambiguous submission. HTTP status alone is not proof. */
const isUnsentCommitFailure = (error: unknown): error is PredictError =>
  error instanceof PredictError &&
  error.metadata?.phase === 'commit' &&
  error.metadata?.mutationRelay === 'not_relayed_this_invocation';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface PredictOrderServiceRequestQuoteAction {
  type: 'PredictOrderService:requestQuote';
  handler: (
    venueId: PredictVenueId,
    params: PredictOrderPreviewParams,
    options?: { signal?: AbortSignal },
  ) => Promise<PredictOrderPreview>;
}

export interface PredictOrderServiceReviewPreviewAction {
  type: 'PredictOrderService:reviewPreview';
  handler: (
    venueId: PredictVenueId,
    previewId: string,
  ) => Promise<PredictOrderReview>;
}

export interface PredictOrderServiceCommitPreviewAction {
  type: 'PredictOrderService:commitPreview';
  handler: (
    venueId: PredictVenueId,
    previewId: string,
    approval?: PredictOrderApproval,
  ) => Promise<PredictOrderReceipt>;
}

export interface PredictOrderRecoveryItem {
  previewId: string;
  status: 'checking' | 'needs_manual_review';
}

export interface PredictOrderServiceGetRecoveryAction {
  type: 'PredictOrderService:getRecovery';
  handler: (venueId: PredictVenueId) => readonly PredictOrderRecoveryItem[];
}

export interface PredictOrderServiceRefreshRecoveryAction {
  type: 'PredictOrderService:refreshRecovery';
  handler: (venueId: PredictVenueId) => Promise<void>;
}

export type PredictOrderServiceActions =
  | PredictOrderServiceRequestQuoteAction
  | PredictOrderServiceReviewPreviewAction
  | PredictOrderServiceCommitPreviewAction
  | PredictOrderServiceGetRecoveryAction
  | PredictOrderServiceRefreshRecoveryAction
  // Consumed action: after a terminal receipt the Order workflow invalidates
  // the authoritative portfolio reads. The cache itself stays owned by the
  // portfolio service.
  | DataServiceInvalidateQueriesAction<'PredictPortfolioService'>;

/**
 * Published exactly once per Order operation, when this process first
 * observes its outcome. `presented` says whether an Order surface was
 * showing the operation at that moment; when none was, the completion
 * notification tells the Predict User instead.
 */
export interface PredictOrderServiceOrderResolvedEvent {
  type: 'PredictOrderService:orderResolved';
  payload: [PredictOrderResolution & { presented: boolean }];
}

export interface PredictOrderServiceRecoveryChangedEvent {
  type: 'PredictOrderService:recoveryChanged';
  payload: [
    {
      venueId: PredictVenueId;
      operations: readonly PredictOrderRecoveryItem[];
    },
  ];
}

export type PredictOrderServiceEvents =
  | PredictOrderServiceOrderResolvedEvent
  | PredictOrderServiceRecoveryChangedEvent;

export type PredictOrderServiceMessenger = Messenger<
  typeof PREDICT_ORDER_SERVICE_NAME,
  PredictOrderServiceActions,
  PredictOrderServiceEvents
>;

export interface PredictOrderServiceOptions {
  messenger: PredictOrderServiceMessenger;
  trading: VenueTradingAdapter;
  venueId: PredictVenueId;
  /** Runtime composition supplies durable wallet storage. */
  journal?: OrderDispatchJournal;
  /** Injectable observation delay for tests. */
  observationDelayMs?: number;
  /** Injectable background observation schedule for tests. */
  backgroundObservationDelaysMs?: readonly number[];
  /** Injectable background observation window for tests. */
  backgroundObservationWindowMs?: number;
  /** Injectable background observation cap for tests. */
  maxBackgroundObservations?: number;
}

/**
 * Owns the Order workflow for one Venue: server quotes, the Commit of an
 * approved Order Preview, and the process-local observation of every
 * operation until it resolves. Previews are never cached and never retried
 * here; a changed intent gets a fresh quote.
 *
 * **The submission boundary.** A Preview crosses it when its Commit is
 * handed to the transport, which happens synchronously with the approval
 * that calls {@link PredictOrderService.commitPreview}. Before that, a
 * context change ({@link PredictOrderService.cancelUncommittedPreviews})
 * cancels it and its Commit is refused locally. After that, the Commit may
 * have reached the backend: it is submitted or ambiguous, never cancelled.
 * The Commit is signed and POSTed once; afterwards the operation is only
 * read (GET by Preview reference), which never submits. Only explicit
 * not-relayed evidence from the first mutation attempt allows re-approval.
 * Expiry alone never resolves an earlier dispatch. Only a fresh missing
 * operation read after backend preview expiry and grace can prove it absent.
 *
 * **Observation.** Unresolved operations are observed with bounded work,
 * whether or not a screen still shows them. Exhausting the local window
 * pauses observation without asserting a financial outcome.
 *
 * **Identity.** Observation is bound to the Predict User who approved the
 * Preview. {@link PredictOrderService.abandonCommits} forgets every Preview,
 * so none of them is ever observed with the next person's bearer token.
 *
 * **Process lifetime.** Before mutation dispatch, a safe identity-scoped
 * reference is persisted. Relaunch merges it with owner-scoped server
 * discovery and only observes GETs. Credentials and approvals are never
 * restored. Legacy references without backend expiry remain unknown.
 */
export class PredictOrderService {
  readonly #messenger: PredictOrderServiceMessenger;
  readonly #trading: VenueTradingAdapter;
  readonly #venueId: PredictVenueId;
  readonly #observationDelayMs: number;
  readonly #backgroundObservationDelaysMs: readonly number[];
  readonly #backgroundObservationWindowMs: number;
  readonly #maxBackgroundObservations: number;
  readonly #operations = new Map<string, OrderOperation>();
  readonly #inFlightCommits = new Map<string, InFlightCommit>();
  readonly #inFlightQuotes = new Set<AbortController>();
  /** Includes POSTs detached from callers by lifecycle suspension. */
  readonly #commitTransports = new Set<AbortController>();
  /** Bumped when every Commit already underway is abandoned. */
  #commitGeneration = 0;
  /** Bumped when the context that Previews were quoted under changes. */
  #contextEpoch = 0;
  readonly #journal?: OrderDispatchJournal;
  #identityScope?: string;
  #sessionAvailable = false;
  #recoveryPromise?: Promise<void>;
  #recoveryAbort?: AbortController;
  #recoveryTimer?: ReturnType<typeof setTimeout>;
  #recoveryStartedAt = 0;
  #recoveryCalls = 0;
  #recoveryOffset = 0;
  #discoveryCursor?: string;
  #discoveryComplete = false;
  #recoveryActive = false;
  #destroyed = false;
  #resetsInProgress = 0;
  #cleanupLifecycle?: () => void;

  constructor({
    messenger,
    trading,
    venueId,
    journal,
    observationDelayMs = COMMIT_OBSERVATION_DELAY_MS,
    backgroundObservationDelaysMs = BACKGROUND_OBSERVATION_DELAYS_MS,
    backgroundObservationWindowMs = BACKGROUND_OBSERVATION_WINDOW_MS,
    maxBackgroundObservations = MAX_BACKGROUND_OBSERVATIONS,
  }: PredictOrderServiceOptions) {
    this.#messenger = messenger;
    this.#trading = trading;
    this.#venueId = venueId;
    this.#journal = journal;
    this.#observationDelayMs = observationDelayMs;
    this.#backgroundObservationDelaysMs = backgroundObservationDelaysMs;
    this.#backgroundObservationWindowMs = backgroundObservationWindowMs;
    this.#maxBackgroundObservations = maxBackgroundObservations;

    messenger.registerActionHandler(
      'PredictOrderService:requestQuote',
      this.requestQuote.bind(this),
    );
    messenger.registerActionHandler(
      'PredictOrderService:reviewPreview',
      this.reviewPreview.bind(this),
    );
    messenger.registerActionHandler(
      'PredictOrderService:commitPreview',
      this.commitPreview.bind(this),
    );
    messenger.registerActionHandler(
      'PredictOrderService:getRecovery',
      this.getRecovery.bind(this),
    );
    messenger.registerActionHandler(
      'PredictOrderService:refreshRecovery',
      this.refreshRecovery.bind(this),
    );
  }

  /**
   * Requests a fresh server-authoritative quote for one intent. A quote
   * still in flight when the context changes is aborted, and one that
   * returns after the change is refused: its Preview never becomes
   * approvable.
   */
  async requestQuote(
    venueId: PredictVenueId,
    params: PredictOrderPreviewParams,
    options?: { signal?: AbortSignal },
  ): Promise<PredictOrderPreview> {
    this.#assertVenue(venueId);
    if (this.#resetsInProgress > 0) {
      throw PredictError.from(PredictErrorCode.UNAUTHENTICATED);
    }
    const generation = this.#commitGeneration;
    const contextEpoch = this.#contextEpoch;
    const controller = new AbortController();
    const abortForCaller = (): void => controller.abort();
    if (options?.signal?.aborted) {
      controller.abort();
    }
    options?.signal?.addEventListener('abort', abortForCaller);
    this.#inFlightQuotes.add(controller);
    try {
      // Never cache or retry: the quote reflects liquidity at request time
      // and the result is bound to an expiring previewId.
      const preview = await withPredictNextTrace(
        {
          method: 'requestQuote',
          name: TraceName.PredictNextOrderPreview,
          op: TraceOperation.PredictDataFetch,
          tags: { venueId: this.#venueId },
          data: { side: params.side, action: params.action },
        },
        () =>
          this.#trading.previewOrder(params, {
            signal: controller.signal,
          }),
      );
      this.#assertQuoteContext(generation, contextEpoch);
      this.#registerPreview(preview, contextEpoch);
      return preview;
    } catch (error) {
      this.#assertQuoteContext(generation, contextEpoch);
      throw error;
    } finally {
      this.#inFlightQuotes.delete(controller);
      options?.signal?.removeEventListener('abort', abortForCaller);
    }
  }

  async reviewPreview(
    venueId: PredictVenueId,
    previewId: string,
  ): Promise<PredictOrderReview> {
    this.#assertVenue(venueId);
    const operation = this.#operations.get(previewId);
    const generation = this.#commitGeneration;
    const contextEpoch = this.#contextEpoch;
    if (
      this.#resetsInProgress > 0 ||
      operation?.state !== 'quoted' ||
      (operation.expiresAt !== undefined && operation.expiresAt <= Date.now())
    ) {
      throw PredictError.from(PredictErrorCode.PREVIEW_EXPIRED);
    }
    const review = await this.#trading.reviewOrder(previewId);
    this.#assertQuoteContext(generation, contextEpoch);
    operation.reviewed = true;
    return review;
  }

  /**
   * Commits an approved Order Preview and resolves with its canonical Order
   * Receipt. Repeated calls for one Preview coalesce into the single
   * in-flight Commit. While the backend reports `pending` or `submitted`,
   * the Commit is observed with a bounded number of receipt reads; a
   * `reconciliation_required` receipt resolves so the caller can render it.
   * Either way the operation keeps being observed in the background, and an
   * explicit later call observes straight away. A terminal receipt also
   * invalidates the authoritative portfolio reads.
   *
   * Deliberately not `async`: the cancellation check and the move across
   * the submission boundary run synchronously with the caller's approval,
   * so no context change can land between them.
   *
   * Only the actual approval event permits first dispatch. Omission means
   * observation of an already dispatched operation, never a reused approval.
   */
  commitPreview(
    venueId: PredictVenueId,
    previewId: string,
    approval?: PredictOrderApproval,
  ): Promise<PredictOrderReceipt> {
    if (venueId !== this.#venueId) {
      return Promise.reject(
        PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE),
      );
    }
    if (
      this.#resetsInProgress > 0 ||
      (this.#journal && !this.#sessionAvailable)
    ) {
      return Promise.reject(
        this.#operations.get(previewId)?.posted
          ? this.#suspendedCommitError()
          : PredictError.from(PredictErrorCode.UNAUTHENTICATED),
      );
    }
    const inFlight = this.#inFlightCommits.get(previewId);
    if (inFlight) {
      return inFlight.promise;
    }
    const operation = this.#operations.get(previewId);
    if (!operation) {
      // Not quoted or restored for the current authenticated Predict User.
      return Promise.reject(
        PredictError.from(PredictErrorCode.UNAUTHENTICATED),
      );
    }
    if (operation.state === 'cancelled') {
      // Never reached the backend, and the context it was quoted under is
      // gone: a fresh quote is the only next step.
      return Promise.reject(
        PredictError.from(PredictErrorCode.PREVIEW_EXPIRED),
      );
    }
    if (!operation.posted && !operation.reviewed) {
      return Promise.reject(
        PredictError.from(PredictErrorCode.VENUE_SIGNING_REFUSED),
      );
    }
    if (!operation.posted && approval?.kind !== 'user-approved') {
      return Promise.reject(
        PredictError.from(PredictErrorCode.INVALID_RESPONSE),
      );
    }
    return this.#dispatch(operation, MAX_COMMIT_OBSERVATIONS, approval);
  }

  /**
   * Cancels every Preview that has not crossed the submission boundary and
   * aborts the quotes in flight. Called when the context Previews were
   * quoted under changes, such as the Active Venue. Operations already
   * dispatched keep their original Venue, Preview and observation.
   */
  cancelUncommittedPreviews(): void {
    this.#contextEpoch += 1;
    this.#abortInFlightQuotes();
    this.#trading.invalidatePreviews();
    for (const operation of this.#operations.values()) {
      if (operation.state === 'quoted') {
        operation.state = 'cancelled';
      }
    }
  }

  /**
   * Registers a surface that shows one operation to the Predict User. The
   * listener receives the operation's resolution, and while any surface is
   * registered the resolution is published as `presented`, so the
   * completion notification does not repeat what the surface already shows.
   * Returns the unregistration.
   */
  presentOperation(
    previewId: string,
    listener: PredictOrderResolutionListener,
  ): () => void {
    const operation = this.#operations.get(previewId);
    if (!operation) {
      return () => undefined;
    }
    operation.presenters.add(listener);
    return () => {
      operation.presenters.delete(listener);
    };
  }

  /**
   * Abandons every Commit underway and forgets every Preview. Called when
   * the platform replaces the Predict User: the Previews were approved by
   * somebody else, so the service must neither observe them nor refresh the
   * portfolio reads their receipts describe, nor notify their outcome.
   *
   * A Preview quoted after this returns is a new person's Preview and is
   * observed normally.
   */
  abandonCommits(): void {
    this.#commitGeneration += 1;
    this.#trading.invalidatePreviews();
    this.#recoveryActive = false;
    this.#recoveryAbort?.abort();
    this.#recoveryAbort = undefined;
    this.#recoveryPromise = undefined;
    if (this.#recoveryTimer !== undefined) {
      clearTimeout(this.#recoveryTimer);
      this.#recoveryTimer = undefined;
    }
    this.#abortInFlightQuotes();
    for (const transport of this.#commitTransports) {
      transport.abort();
    }
    this.#commitTransports.clear();
    for (const operation of this.#operations.values()) {
      this.#clearBackgroundTimer(operation);
      operation.presenters.clear();
    }
    this.#operations.clear();
    const commits = [...this.#inFlightCommits.values()];
    this.#inFlightCommits.clear();
    commits.forEach((commit) =>
      commit.abandon(PredictError.from(PredictErrorCode.UNAUTHENTICATED)),
    );
    this.#publishRecovery();
  }

  /** Invalidates identity lookups started before a wallet reset. */
  getRecoveryGeneration(): number {
    return this.#commitGeneration;
  }

  /** Runtime lifecycle owns the authenticated canonical Predict User scope. */
  resumeRecovery(identityScope: string): Promise<void> {
    if (
      this.#destroyed ||
      this.#resetsInProgress > 0 ||
      !this.#journal ||
      !identityScope
    ) {
      return Promise.resolve();
    }
    if (this.#identityScope !== identityScope) {
      this.abandonCommits();
      this.#identityScope = identityScope;
      this.#discoveryCursor = undefined;
      this.#recoveryOffset = 0;
    }
    this.#sessionAvailable = true;
    if (this.#recoveryPromise) {
      return this.#recoveryPromise;
    }
    if (this.#recoveryActive) {
      return Promise.resolve();
    }
    this.#recoveryActive = true;
    this.#recoveryStartedAt = Date.now();
    this.#recoveryCalls = 0;
    this.#discoveryComplete = false;
    return this.#runRecovery();
  }

  /** Pause observation, never a mutation that may already have landed.
   * Identity replacement and wallet reset use abandonCommits instead. */
  suspendRecovery(): void {
    this.#sessionAvailable = false;
    this.#recoveryActive = false;
    this.#recoveryAbort?.abort();
    this.#recoveryAbort = undefined;
    this.#recoveryPromise = undefined;
    if (this.#recoveryTimer !== undefined) {
      clearTimeout(this.#recoveryTimer);
      this.#recoveryTimer = undefined;
    }
    this.cancelUncommittedPreviews();
    for (const [previewId, operation] of this.#operations) {
      this.#clearBackgroundTimer(operation);
      const commit = this.#inFlightCommits.get(previewId);
      if (operation.posted) {
        operation.ambiguous ||= operation.state === 'dispatched';
        commit?.suspend();
      } else {
        commit?.abandon(PredictError.from(PredictErrorCode.UNAUTHENTICATED));
        this.#operations.delete(previewId);
      }
    }
    this.#inFlightCommits.clear();
    this.#publishRecovery();
  }

  #suspendedCommitError(): PredictError {
    return PredictError.from(PredictErrorCode.ORDER_OUTCOME_UNKNOWN, {
      metadata: {
        phase: 'commit',
        mutationRelay: 'unknown',
        causeCode: PredictErrorCode.UNAUTHENTICATED,
      },
    });
  }

  async reset(): Promise<void> {
    this.#resetsInProgress += 1;
    this.#sessionAvailable = false;
    this.abandonCommits();
    try {
      await this.#journal?.clear();
    } finally {
      // Also fence lifecycle callbacks and reads that completed during reset.
      this.#sessionAvailable = false;
      this.abandonCommits();
      this.#identityScope = undefined;
      this.#discoveryCursor = undefined;
      this.#resetsInProgress -= 1;
    }
  }

  setLifecycleCleanup(cleanup: () => void): void {
    this.#cleanupLifecycle = cleanup;
  }

  getRecovery(venueId: PredictVenueId): readonly PredictOrderRecoveryItem[] {
    this.#assertVenue(venueId);
    return [...this.#operations.values()]
      .filter((operation) => operation.recoveryState !== undefined)
      .map((operation) => ({
        previewId: operation.previewId,
        status:
          operation.recoveryState === 'manual_review'
            ? ('needs_manual_review' as const)
            : ('checking' as const),
      }));
  }

  /** Explicit refresh is observation-only, including after a local budget pause. */
  refreshRecovery(venueId: PredictVenueId): Promise<void> {
    this.#assertVenue(venueId);
    if (this.#recoveryPromise) {
      return this.#recoveryPromise;
    }
    if (!this.#identityScope || !this.#sessionAvailable) {
      return Promise.reject(
        PredictError.from(PredictErrorCode.UNAUTHENTICATED),
      );
    }
    if (this.#recoveryTimer !== undefined) {
      clearTimeout(this.#recoveryTimer);
      this.#recoveryTimer = undefined;
    }
    this.#recoveryActive = false;
    return this.resumeRecovery(this.#identityScope);
  }

  #publishRecovery(): void {
    this.#messenger.publish('PredictOrderService:recoveryChanged', {
      venueId: this.#venueId,
      operations: this.getRecovery(this.#venueId),
    });
  }

  #hasRecoveryBudget(): boolean {
    return (
      this.#recoveryActive &&
      this.#recoveryCalls < this.#maxBackgroundObservations &&
      Date.now() - this.#recoveryStartedAt < this.#backgroundObservationWindowMs
    );
  }

  #restoreReference(reference: OrderDispatchReference): OrderOperation {
    const existing = this.#operations.get(reference.previewId);
    if (existing) {
      return existing;
    }
    const operation: OrderOperation = {
      previewId: reference.previewId,
      expiresAt: reference.expiresAt,
      contextEpoch: this.#contextEpoch,
      reviewed: false,
      posted: true,
      // Persisted markers never prove an outcome or authorize submission.
      state: 'dispatched',
      dispatchedAt: reference.dispatchedAt,
      receiptSeen: false,
      ambiguous: true,
      backgroundObservations: 0,
      recoveryState: 'unresolved',
      presenters: new Set(),
    };
    this.#operations.set(operation.previewId, operation);
    return operation;
  }

  /** A settled operation must not be resurrected by delayed discovery. */
  #isSettled(previewId: string): boolean {
    const operation = this.#operations.get(previewId);
    return (
      operation?.state === 'resolved' ||
      (operation?.lastReceipt !== undefined &&
        isTerminalReceipt(operation.lastReceipt))
    );
  }

  /** Adopt server evidence; terminal review is surfaced before pruning. */
  async #adoptDiscoveredEntry(
    journal: OrderDispatchJournal,
    identityScope: string,
    generation: number,
    entry: PredictUnresolvedOrder,
    reference: OrderDispatchReference,
    signal: AbortSignal,
  ): Promise<void> {
    await journal.put(reference);
    this.#assertNotAbandoned(generation, signal);
    const after = this.#operations.get(entry.previewId);
    if (
      after?.state === 'resolved' ||
      (after?.lastReceipt && isTerminalReceipt(after.lastReceipt))
    ) {
      if (after.lastReceipt?.status === 'needs_manual_review') {
        after.recoveryState = 'manual_review';
        this.#publishRecovery();
        await this.#pruneManualReview(after, identityScope);
      } else {
        await journal.remove(identityScope, this.#venueId, entry.previewId);
      }
      this.#assertNotAbandoned(generation, signal);
      return;
    }
    const operation = this.#restoreReference(reference);
    operation.lastReceipt = entry.receipt;
    operation.receiptSeen = true;
    if (entry.receipt.status === 'needs_manual_review') {
      operation.state = 'resolved';
      operation.recoveryState = 'manual_review';
      this.#publishRecovery();
      await this.#pruneManualReview(operation, identityScope);
      this.#assertNotAbandoned(generation, signal);
    }
  }

  /** One discovery page: adopt the venue's unresolved orders into the journal
   * and into local state. Returns false when the round must stop because the
   * session is gone; a discovery failure otherwise never drops local
   * dispatches, whose references are still observed below. */
  async #mergeDiscoveryPage(
    identityScope: string,
    generation: number,
    references: readonly OrderDispatchReference[],
    signal: AbortSignal,
  ): Promise<boolean> {
    const journal = this.#journal;
    // One page per round leaves budget for existing journal entries even
    // when the account has many pages of server operations.
    if (!journal || this.#discoveryComplete || !this.#hasRecoveryBudget()) {
      return true;
    }
    this.#recoveryCalls += 1;
    try {
      const page = await this.#trading.listUnresolvedOrders(
        { cursor: this.#discoveryCursor, limit: 25 },
        { signal },
      );
      this.#assertNotAbandoned(generation, signal);
      const known = new Map(
        references.map((reference) => [reference.previewId, reference]),
      );
      for (const entry of page.operations) {
        if (!this.#isSettled(entry.previewId)) {
          await this.#adoptDiscoveredEntry(
            journal,
            identityScope,
            generation,
            entry,
            {
              identityScope,
              venueId: this.#venueId,
              previewId: entry.previewId,
              dispatchedAt: Date.parse(entry.submittedAt ?? entry.createdAt),
              expiresAt: known.get(entry.previewId)?.expiresAt,
              recoveryState:
                entry.receipt.status === 'needs_manual_review'
                  ? 'manual_review'
                  : 'unresolved',
            },
            signal,
          );
        }
      }
      this.#discoveryCursor = page.nextCursor;
      this.#discoveryComplete = !page.nextCursor;
      this.#publishRecovery();
      return true;
    } catch (error) {
      this.#assertNotAbandoned(generation, signal);
      if (
        error instanceof PredictError &&
        [
          PredictErrorCode.RATE_LIMITED,
          PredictErrorCode.UNAUTHENTICATED,
        ].includes(error.code)
      ) {
        this.#recoveryActive = false;
        return false;
      }
      return true;
    }
  }

  /** Observes one candidate. Returns false when the session is gone, so no
   * further call in this round can succeed. */
  async #dispatchRecoveryCandidate(
    operation: OrderOperation,
    generation: number,
    signal: AbortSignal,
  ): Promise<boolean> {
    this.#recoveryCalls += 1;
    try {
      await this.#dispatch(operation, 0);
    } catch (error) {
      this.#assertNotAbandoned(generation, signal);
      const cause =
        error instanceof PredictError ? error.metadata?.causeCode : undefined;
      if (
        cause === PredictErrorCode.RATE_LIMITED ||
        cause === PredictErrorCode.UNAUTHENTICATED
      ) {
        this.#recoveryActive = false;
        return false;
      }
    }
    this.#assertNotAbandoned(generation, signal);
    return true;
  }

  /** Re-observes the dispatched, unresolved operations, round-robin from the
   * last one attempted and bounded by the recovery budget. */
  async #dispatchRecoveryCandidates(generation: number, signal: AbortSignal): Promise<void> {
    const candidates = [...this.#operations.values()].filter(
      (operation) =>
        operation.state === 'dispatched' &&
        operation.posted &&
        operation.recoveryState !== 'manual_review',
    );
    if (candidates.length === 0) {
      return;
    }
    const start = this.#recoveryOffset % candidates.length;
    for (
      let step = 0;
      step < candidates.length && this.#hasRecoveryBudget();
      step += 1
    ) {
      const index = (start + step) % candidates.length;
      const operation = candidates[index];
      if (this.#inFlightCommits.has(operation.previewId)) {
        continue;
      }
      this.#recoveryOffset = index + 1;
      if (!(await this.#dispatchRecoveryCandidate(operation, generation, signal))) {
        return;
      }
    }
  }

  #runRecovery(): Promise<void> {
    const generation = this.#commitGeneration;
    const identityScope = this.#identityScope;
    const abort = new AbortController();
    this.#recoveryAbort = abort;
    const work = async (): Promise<void> => {
      if (!identityScope || !this.#journal) {
        return;
      }
      const references = await this.#journal.list(identityScope, this.#venueId);
      this.#assertNotAbandoned(generation, abort.signal);
      references.forEach((reference) => this.#restoreReference(reference));
      this.#publishRecovery();
      if (
        !(await this.#mergeDiscoveryPage(
          identityScope,
          generation,
          references,
          abort.signal,
        ))
      ) {
        return;
      }
      await this.#dispatchRecoveryCandidates(generation, abort.signal);
    };
    const tracked = work()
      .catch((error) => {
        if (generation === this.#commitGeneration && !abort.signal.aborted) {
          this.#recoveryActive = false;
          Logger.error(
            ensureError(error, 'PredictOrderService.recovery'),
            'PredictNext: Order recovery paused',
          );
        }
      })
      .finally(() => {
        if (this.#recoveryPromise === tracked) {
          this.#recoveryPromise = undefined;
          this.#scheduleRecoveryTick();
        }
      });
    this.#recoveryPromise = tracked;
    return tracked;
  }

  #scheduleRecoveryTick(): void {
    if (!this.#hasRecoveryBudget()) {
      this.#recoveryActive = false;
      return;
    }
    if (
      this.#recoveryPromise ||
      this.#recoveryTimer !== undefined ||
      !this.#identityScope
    ) {
      return;
    }
    if (
      this.#discoveryComplete &&
      ![...this.#operations.values()].some(
        (operation) => operation.state === 'dispatched' && operation.posted,
      )
    ) {
      this.#recoveryActive = false;
      return;
    }
    const delays = this.#backgroundObservationDelaysMs;
    const delay =
      delays[Math.min(this.#recoveryCalls, delays.length - 1)] ??
      COMMIT_OBSERVATION_DELAY_MS;
    this.#recoveryTimer = setTimeout(() => {
      this.#recoveryTimer = undefined;
      if (this.#hasRecoveryBudget()) {
        this.#runRecovery().catch(() => undefined);
      } else {
        this.#recoveryActive = false;
      }
    }, delay);
  }

  async #finishJournal(
    operation: OrderOperation,
    receipt: PredictOrderReceipt,
  ): Promise<void> {
    if (!this.#journal || !this.#identityScope) {
      return;
    }
    if (receipt.status === 'needs_manual_review') {
      operation.recoveryState = 'manual_review';
      this.#publishRecovery();
      await this.#pruneManualReview(operation, this.#identityScope);
    } else {
      await this.#journal.remove(
        this.#identityScope,
        this.#venueId,
        operation.previewId,
      );
      operation.recoveryState = undefined;
    }
  }

  /** Server-confirmed terminal review stays queryable for this identity's
   * process lifetime, but is removed from disk after recoveryChanged.
   * Discovery can surface it again after restart, without any approval. */
  async #pruneManualReview(
    operation: OrderOperation,
    identityScope: string,
  ): Promise<void> {
    await this.#journal?.remove(identityScope, this.#venueId, operation.previewId);
    if (!operation.manualReviewPruned) {
      operation.manualReviewPruned = true;
      Logger.log('PredictNext: pruned terminal order review', {
        previewId: operation.previewId,
        reason: 'server_confirmed_needs_manual_review_surfaced',
      });
    }
  }

  #registerPreview(preview: PredictOrderPreview, contextEpoch: number): void {
    const now = Date.now();
    // Previews that never crossed the boundary are dead once expired.
    for (const [previewId, operation] of this.#operations) {
      if (
        (operation.state === 'quoted' || operation.state === 'cancelled') &&
        operation.expiresAt !== undefined &&
        operation.expiresAt < now
      ) {
        this.#operations.delete(previewId);
      }
    }
    if (this.#operations.has(preview.previewId)) {
      return;
    }
    const expiresAt = Date.parse(preview.expiresAt);
    this.#operations.set(preview.previewId, {
      previewId: preview.previewId,
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : now,
      contextEpoch,
      reviewed: false,
      state: 'quoted',
      receiptSeen: false,
      ambiguous: false,
      posted: false,
      backgroundObservations: 0,
      presenters: new Set(),
    });
  }

  /** Crosses the submission boundary (if not already across) and commits
   * and observes the operation once. A caller's Commit observes with the
   * bounded loop; a background tick sends a single read, because its
   * own schedule is the loop. */
  #dispatch(
    operation: OrderOperation,
    maxObservations = MAX_COMMIT_OBSERVATIONS,
    approval?: PredictOrderApproval,
  ): Promise<PredictOrderReceipt> {
    const { previewId } = operation;
    const generation = this.#commitGeneration;
    const startedAt = Date.now();
    this.#clearBackgroundTimer(operation);
    if (operation.state === 'quoted') {
      operation.state = 'dispatched';
      operation.dispatchedAt = startedAt;
    }
    const transport = new AbortController();
    if (!operation.posted) {
      this.#commitTransports.add(transport);
    }
    const observation = operation.posted ? transport : new AbortController();
    let rejectAbandoned: (error: PredictError) => void = () => undefined;
    const abandonment = new Promise<never>((_resolve, reject) => {
      rejectAbandoned = reject;
    });
    // Racing the abandonment is what makes the rejection immediate: a caller
    // must not wait out the observation delay after the reset.
    const commit = Promise.race([
      this.#commitAndObserve(
        operation,
        generation,
        transport.signal,
        observation.signal,
        maxObservations,
        approval,
      ).finally(() => this.#commitTransports.delete(transport)),
      abandonment,
    ]);
    const tracked = commit.finally(() => {
      if (this.#inFlightCommits.get(previewId)?.promise === tracked) {
        this.#inFlightCommits.delete(previewId);
        if (generation === this.#commitGeneration) {
          this.#scheduleBackgroundObservation(operation);
        }
      }
    });
    this.#inFlightCommits.set(previewId, {
      promise: tracked,
      suspend: () => {
        // Fence observation, but do not abort the dispatched POST.
        observation.abort();
        rejectAbandoned(this.#suspendedCommitError());
      },
      abandon: (error) => {
        // A request still resolving its bearer token never goes out.
        transport.abort();
        observation.abort();
        rejectAbandoned(error);
      },
    });
    return tracked;
  }

  async #commitAndObserve(
    operation: OrderOperation,
    generation: number,
    signal: AbortSignal,
    observationSignal: AbortSignal,
    maxObservations: number,
    approval?: PredictOrderApproval,
  ): Promise<PredictOrderReceipt> {
    let receipt: PredictOrderReceipt;
    try {
      receipt = await withPredictNextTrace(
        {
          method: 'commitPreview',
          name: TraceName.PredictNextOrderCommit,
          op: TraceOperation.PredictOrderSubmission,
          tags: { venueId: this.#venueId },
        },
        () =>
          this.#observe(
            operation,
            generation,
            signal,
            observationSignal,
            maxObservations,
            approval,
          ),
      );
    } catch (error) {
      if (generation === this.#commitGeneration && !observationSignal.aborted) {
        const unsent = isUnsentCommitFailure(error) && !operation.ambiguous;
        await this.#handleCommitFailure(operation, error, generation);
        this.#assertNotAbandoned(generation, observationSignal);
        if (!unsent && operation.state !== 'resolved') {
          throw PredictError.from(PredictErrorCode.ORDER_OUTCOME_UNKNOWN, {
            metadata:
              error instanceof PredictError
                ? { ...error.metadata, causeCode: error.code }
                : undefined,
          });
        }
      }
      throw error;
    }
    // Checked before refreshing: a receipt for an abandoned Commit describes
    // the previous Predict User, so it must not repopulate the cache the
    // reset just cleared.
    if (
      generation === this.#commitGeneration &&
      !observationSignal.aborted &&
      isTerminalReceipt(receipt)
    ) {
      await this.#finishJournal(operation, receipt);
      this.#assertNotAbandoned(generation, observationSignal);
      this.#invalidatePortfolioReads();
      this.#resolve(operation, { status: 'settled', receipt });
    }
    return receipt;
  }

  /** Commits once, then observes an in-progress operation with bounded
   * receipt reads. Only the first call signs the intent the user
   * confirmed; observing never submits and never needs his confirmation. */
  async #observe(
    operation: OrderOperation,
    generation: number,
    signal: AbortSignal,
    observationSignal: AbortSignal,
    maxObservations: number,
    approval?: PredictOrderApproval,
  ): Promise<PredictOrderReceipt> {
    const receipt = await this.#commitOnce(
      operation,
      generation,
      signal,
      observationSignal,
      approval,
    );
    if (!isInProgressReceipt(receipt) || maxObservations <= 0) {
      return receipt;
    }
    await sleep(this.#observationDelayMs);
    return this.#observe(operation, generation, signal, observationSignal, maxObservations - 1);
  }

  /** Journals the dispatch before the Commit leaves, so a crash mid-request
   * still leaves a recoverable reference. Without an authenticated session
   * the Commit must not be sent at all; an unwritable journal refuses it. */
  async #journalDispatch(
    journal: OrderDispatchJournal,
    operation: OrderOperation,
    generation: number,
    signal: AbortSignal,
  ): Promise<void> {
    const identityScope = this.#identityScope;
    if (!identityScope || !this.#sessionAvailable) {
      throw PredictError.from(PredictErrorCode.UNAUTHENTICATED, {
        metadata: {
          phase: 'commit',
          mutationRelay: 'not_relayed_this_invocation',
        },
      });
    }
    try {
      await journal.put({
        identityScope,
        venueId: this.#venueId,
        previewId: operation.previewId,
        dispatchedAt: operation.dispatchedAt ?? Date.now(),
        expiresAt: operation.expiresAt,
        recoveryState: 'unresolved',
      });
    } catch {
      throw PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE, {
        metadata: {
          phase: 'commit',
          mutationRelay: 'not_relayed_this_invocation',
        },
      });
    }
    this.#assertNotAbandoned(generation, signal);
    operation.recoveryState = 'unresolved';
    if (!this.#recoveryActive) {
      this.#recoveryActive = true;
      this.#recoveryStartedAt = Date.now();
      this.#recoveryCalls = 0;
    }
    this.#publishRecovery();
  }

  /** The signed Commit the first time, a receipt read afterwards. The
   * generation is checked before the request, so an abandoned Commit is
   * never sent again, and after the response, so a receipt that arrives for
   * it is not treated as the current person's. */
  async #commitOnce(
    operation: OrderOperation,
    generation: number,
    signal: AbortSignal,
    observationSignal: AbortSignal,
    approval?: PredictOrderApproval,
  ): Promise<PredictOrderReceipt> {
    this.#assertNotAbandoned(generation, observationSignal);
    let receipt: PredictOrderReceipt;
    if (operation.posted) {
      const observedAt = Date.now();
      try {
        receipt = await this.#trading.observeOrder(operation.previewId, {
          signal: observationSignal,
        });
      } catch (error) {
        this.#assertNotAbandoned(generation, observationSignal);
        if (
          error instanceof PredictError &&
          error.metadata?.phase === 'observe' &&
          error.metadata?.bodyCode === 'operation_not_found' &&
          !operation.receiptSeen &&
          operation.expiresAt !== undefined &&
          observedAt > operation.expiresAt + MISSING_OPERATION_EXPIRY_GRACE_MS
        ) {
          if (this.#journal && this.#identityScope) {
            await this.#journal.remove(
              this.#identityScope,
              this.#venueId,
              operation.previewId,
            );
            this.#assertNotAbandoned(generation, observationSignal);
          }
          operation.recoveryState = undefined;
          this.#resolve(operation, {
            status: 'not_placed',
            code: PredictErrorCode.PREVIEW_EXPIRED,
          });
          throw PredictError.from(PredictErrorCode.PREVIEW_EXPIRED);
        }
        // Even not-relayed mutation metadata cannot resolve an observation.
        operation.ambiguous = true;
        throw error;
      }
    } else {
      if (approval?.kind !== 'user-approved') {
        throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
      }
      const journal = this.#journal;
      if (journal) {
        await this.#journalDispatch(journal, operation, generation, observationSignal);
      }
      operation.posted = true;
      receipt = await this.#trading.commitOrder(operation.previewId, approval, {
        signal,
      });
    }
    this.#assertNotAbandoned(generation, observationSignal);
    operation.lastReceipt = receipt;
    operation.receiptSeen = true;
    return receipt;
  }

  /** Decides what a failed Commit means for the operation. */
  async #handleCommitFailure(
    operation: OrderOperation,
    error: unknown,
    generation: number,
  ): Promise<void> {
    if (operation.state !== 'dispatched') {
      return;
    }
    if (operation.ambiguous || !isUnsentCommitFailure(error)) {
      operation.ambiguous = true;
      return;
    }
    if (this.#journal && this.#identityScope) {
      await this.#journal.remove(
        this.#identityScope,
        this.#venueId,
        operation.previewId,
      );
      this.#assertNotAbandoned(generation);
      operation.recoveryState = undefined;
      this.#publishRecovery();
    }
    const canReturnBeforeBoundary =
      error.code !== PredictErrorCode.PREVIEW_EXPIRED &&
      error.code !== PredictErrorCode.ORDER_PREVIEW_MISMATCH &&
      operation.contextEpoch === this.#contextEpoch &&
      operation.presenters.size > 0;
    if (canReturnBeforeBoundary) {
      // Nothing was submitted, and the surface that showed the failure may
      // still re-approve the same Preview: it is pre-submit again, and the
      // re-approval signs a fresh Commit.
      operation.state = 'quoted';
      operation.posted = false;
      return;
    }
    this.#resolve(operation, { status: 'not_placed', code: error.code });
  }

  /** Ends an operation and tells its presenters and the app, exactly once. */
  #resolve(operation: OrderOperation, outcome: PredictOrderOutcome): void {
    if (operation.state === 'resolved') {
      return;
    }
    operation.state = 'resolved';
    this.#clearBackgroundTimer(operation);
    const resolution: PredictOrderResolution = {
      venueId: this.#venueId,
      previewId: operation.previewId,
      outcome,
    };
    const presented = operation.presenters.size > 0;
    for (const presenter of operation.presenters) {
      try {
        presenter(resolution);
      } catch (error) {
        Logger.error(
          ensureError(error, 'PredictOrderService.resolve'),
          'PredictNext: an Order presenter failed',
        );
      }
    }
    this.#messenger.publish('PredictOrderService:orderResolved', {
      ...resolution,
      presented,
    });
    this.#publishRecovery();
  }

  /** Keeps observing a dispatched, unresolved operation, bounded in time and
   * in the number of calls. */
  #scheduleBackgroundObservation(operation: OrderOperation): void {
    if (this.#journal) {
      this.#scheduleRecoveryTick();
      return;
    }
    if (
      operation.state !== 'dispatched' ||
      operation.backgroundTimer !== undefined ||
      operation.backgroundObservations >= this.#maxBackgroundObservations ||
      this.#operations.get(operation.previewId) !== operation
    ) {
      return;
    }
    const now = Date.now();
    const dispatchedAt = operation.dispatchedAt ?? now;
    if (now - dispatchedAt >= this.#backgroundObservationWindowMs) {
      return;
    }
    const delays = this.#backgroundObservationDelaysMs;
    const delay =
      delays[Math.min(operation.backgroundObservations, delays.length - 1)] ??
      COMMIT_OBSERVATION_DELAY_MS;
    operation.backgroundObservations += 1;
    const observe = (): void => {
      operation.backgroundTimer = undefined;
      if (
        this.#operations.get(operation.previewId) !== operation ||
        this.#inFlightCommits.has(operation.previewId)
      ) {
        return;
      }
      // Failures are handled inside; the background has no caller.
      this.#dispatch(operation, 0).catch(() => undefined);
    };
    operation.backgroundTimer = setTimeout(observe, delay);
  }

  #clearBackgroundTimer(operation: OrderOperation): void {
    if (operation.backgroundTimer !== undefined) {
      clearTimeout(operation.backgroundTimer);
      operation.backgroundTimer = undefined;
    }
  }

  #abortInFlightQuotes(): void {
    const quotes = [...this.#inFlightQuotes];
    this.#inFlightQuotes.clear();
    quotes.forEach((quote) => quote.abort());
  }

  /** A quote requested under a context that has since changed is refused. */
  #assertQuoteContext(generation: number, contextEpoch: number): void {
    this.#assertNotAbandoned(generation);
    if (contextEpoch !== this.#contextEpoch) {
      throw PredictError.from(PredictErrorCode.PREVIEW_EXPIRED);
    }
  }

  #assertNotAbandoned(generation: number, signal?: AbortSignal): void {
    if (generation !== this.#commitGeneration || signal?.aborted) {
      // The session that approved the Preview is gone; the same code the
      // backend uses for a rejected token keeps this out of user copy.
      throw PredictError.from(PredictErrorCode.UNAUTHENTICATED);
    }
  }

  /** Fire-and-forget: a terminal receipt changed Balance, Positions,
   * Activity, or the Summary. A failed invalidation must not fail the
   * committed Order; the reads stay stale only until their next fetch. */
  #invalidatePortfolioReads(): void {
    for (const family of portfolioQueryFamilies(this.#venueId)) {
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
        ensureError(error, 'PredictOrderService.invalidatePortfolioReads'),
        'PredictNext: failed to refresh portfolio reads after an Order',
      );
    }
  }

  destroy(): void {
    // Nothing may observe or refresh a Commit once the service is gone: a
    // destroyed Engine must not observe the previous person's Commit.
    this.abandonCommits();
    this.#destroyed = true;
    this.#cleanupLifecycle?.();
    this.#messenger.unregisterActionHandler('PredictOrderService:getRecovery');
    this.#messenger.unregisterActionHandler(
      'PredictOrderService:refreshRecovery',
    );
    this.#messenger.unregisterActionHandler('PredictOrderService:requestQuote');
    this.#messenger.unregisterActionHandler(
      'PredictOrderService:reviewPreview',
    );
    this.#messenger.unregisterActionHandler(
      'PredictOrderService:commitPreview',
    );
  }

  #assertVenue(venueId: PredictVenueId): void {
    if (venueId !== this.#venueId) {
      throw PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE);
    }
  }
}

/** A preview whose expiry has passed cannot be approved, only refreshed. */
export const isPreviewExpired = (
  preview: PredictOrderPreview,
  at: number = Date.now(),
): boolean => Date.parse(preview.expiresAt) <= at;
