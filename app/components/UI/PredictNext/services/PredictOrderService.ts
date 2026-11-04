import type { Messenger } from '@metamask/messenger';
import type { DataServiceInvalidateQueriesAction } from '@metamask/base-data-service';
import type { Json } from '@metamask/utils';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { PredictError, PredictErrorCode } from '../errors';
import type {
  PredictOrderPreview,
  PredictOrderPreviewParams,
  PredictOrderReceipt,
  PredictOrderReceiptStatus,
  PredictVenueId,
} from '../types';
import { portfolioQueryFamilies } from '../queries/portfolioQueries';
import type { VenueTradingAdapter } from '../adapters/types';
import { withPredictNextTrace } from './withPredictNextTrace';

export const PREDICT_ORDER_SERVICE_NAME = 'PredictOrderService' as const;

/** Receipt statuses in which the backend has accepted the Commit and is
 * still working; they are observed by committing the same Preview again. */
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
];

/** How many re-POSTs observe one in-flight Commit before handing control
 * back to the caller. The backend's own Commit is fast, so this stays small. */
const MAX_COMMIT_OBSERVATIONS = 3;

/** How long to wait between observation re-POSTs, in milliseconds. */
const COMMIT_OBSERVATION_DELAY_MS = 500;

/** Delays between the background observations of an unresolved operation,
 * in milliseconds. The last delay repeats. */
const BACKGROUND_OBSERVATION_DELAYS_MS: readonly number[] = [
  2_000, 5_000, 10_000, 20_000, 30_000,
];

/** How long after its first dispatch an unresolved operation is observed in
 * the background. After that its outcome surfaces through the Balance,
 * Positions and Activity reads. */
const BACKGROUND_OBSERVATION_WINDOW_MS = 5 * 60_000;

/**
 * How long after a Preview's expiry the background waits before it re-POSTs
 * a Commit that never returned a Receipt. The backend looks up an existing
 * operation before it checks expiry, so a re-POST sent after expiry can only
 * observe an operation, never create one. The grace covers a first request
 * that the backend was still revalidating at the expiry instant, plus modest
 * clock skew.
 */
const AMBIGUOUS_COMMIT_GRACE_MS = 15_000;

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
   * Preview reference may be re-POSTed, which observes the operation. */
  | 'dispatched'
  /** A terminal Receipt, or a conclusive backend answer that no operation
   * exists, ended it. */
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
  readonly expiresAt: number;
  /** The context the Preview was quoted under. */
  readonly contextEpoch: number;
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
  /** Surfaces currently showing this operation to the Predict User. */
  readonly presenters: Set<PredictOrderResolutionListener>;
}

/** A Commit being observed, and the rejection that abandons it. */
interface InFlightCommit {
  promise: Promise<PredictOrderReceipt>;
  abandon: (error: PredictError) => void;
}

const isInProgressReceipt = (receipt: PredictOrderReceipt): boolean =>
  IN_PROGRESS_RECEIPT_STATUSES.includes(receipt.status);

const isTerminalReceipt = (receipt: PredictOrderReceipt): boolean =>
  TERMINAL_RECEIPT_STATUSES.includes(receipt.status);

/**
 * The Commit route's canonical failure codes. The backend documents every
 * one as a pre-operation failure: it revalidates before it creates the
 * operation, so nothing was submitted to the Venue.
 */
const PRE_OPERATION_COMMIT_CODES: ReadonlySet<string> = new Set([
  'preview_not_found',
  'preview_expired',
  'market_not_found',
  'market_not_tradeable',
  'balance_unavailable',
  'position_unavailable',
  'insufficient_balance',
  'insufficient_position',
  'venue_unavailable',
]);

/**
 * The Commit route answered with a canonical failure code. It looks the
 * Preview's operation up first, so for the same Predict User this proves no
 * operation exists for the Preview.
 */
const isCanonicalCommitFailure = (error: PredictError): boolean => {
  const { bodyCode } = error.metadata ?? {};
  return (
    typeof bodyCode === 'string' && PRE_OPERATION_COMMIT_CODES.has(bodyCode)
  );
};

/**
 * The backend answered that this request created nothing: a canonical
 * Commit failure code, or a 401 from the auth guard that runs before the
 * Commit route. Everything else, including network failures, timeouts,
 * aborts, 5xx without a canonical code and unparseable responses, leaves the
 * operation ambiguous.
 */
const isPreOperationFailure = (error: unknown): error is PredictError =>
  error instanceof PredictError &&
  (error.metadata?.status === 401 || isCanonicalCommitFailure(error));

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

export interface PredictOrderServiceCommitPreviewAction {
  type: 'PredictOrderService:commitPreview';
  handler: (
    venueId: PredictVenueId,
    previewId: string,
  ) => Promise<PredictOrderReceipt>;
}

export type PredictOrderServiceActions =
  | PredictOrderServiceRequestQuoteAction
  | PredictOrderServiceCommitPreviewAction
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

export type PredictOrderServiceEvents = PredictOrderServiceOrderResolvedEvent;

export type PredictOrderServiceMessenger = Messenger<
  typeof PREDICT_ORDER_SERVICE_NAME,
  PredictOrderServiceActions,
  PredictOrderServiceEvents
>;

export interface PredictOrderServiceOptions {
  messenger: PredictOrderServiceMessenger;
  trading: VenueTradingAdapter;
  venueId: PredictVenueId;
  /** Injectable observation delay for tests. */
  observationDelayMs?: number;
  /** Injectable background observation schedule for tests. */
  backgroundObservationDelaysMs?: readonly number[];
  /** Injectable background observation window for tests. */
  backgroundObservationWindowMs?: number;
  /** Injectable post-expiry grace for tests. */
  ambiguousCommitGraceMs?: number;
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
 * Only the same Preview reference is ever re-POSTed, and the backend is
 * idempotent by that reference, so re-POSTs observe the one operation
 * instead of placing another. A canonical backend failure code proves no
 * operation exists, which puts a Preview with no ambiguous history back
 * before the boundary.
 *
 * **Observation.** An unresolved operation keeps being observed in the
 * background, whether or not a screen still shows it and whichever Venue is
 * active. When the Commit never returned a Receipt, the background waits
 * until the Preview has expired before it re-POSTs, so an automatic re-POST
 * can observe an operation but never create one. Only the Predict User's
 * explicit re-approval re-POSTs within the validity window.
 *
 * **Identity.** Observation is bound to the Predict User who approved the
 * Preview. {@link PredictOrderService.abandonCommits} forgets every Preview,
 * so none of them is ever re-POSTed with the next person's bearer token.
 *
 * **Process lifetime.** Nothing is persisted (ADR-0002). After process death
 * no operation is observed or notified again, and this process never
 * commits a Preview it did not quote. The outcome surfaces through the
 * Balance, Positions and Activity reads.
 */
export class PredictOrderService {
  readonly #messenger: PredictOrderServiceMessenger;
  readonly #trading: VenueTradingAdapter;
  readonly #venueId: PredictVenueId;
  readonly #observationDelayMs: number;
  readonly #backgroundObservationDelaysMs: readonly number[];
  readonly #backgroundObservationWindowMs: number;
  readonly #ambiguousCommitGraceMs: number;
  readonly #operations = new Map<string, OrderOperation>();
  readonly #inFlightCommits = new Map<string, InFlightCommit>();
  readonly #inFlightQuotes = new Set<AbortController>();
  /** Bumped when every Commit already underway is abandoned. */
  #commitGeneration = 0;
  /** Bumped when the context that Previews were quoted under changes. */
  #contextEpoch = 0;

  constructor({
    messenger,
    trading,
    venueId,
    observationDelayMs = COMMIT_OBSERVATION_DELAY_MS,
    backgroundObservationDelaysMs = BACKGROUND_OBSERVATION_DELAYS_MS,
    backgroundObservationWindowMs = BACKGROUND_OBSERVATION_WINDOW_MS,
    ambiguousCommitGraceMs = AMBIGUOUS_COMMIT_GRACE_MS,
  }: PredictOrderServiceOptions) {
    this.#messenger = messenger;
    this.#trading = trading;
    this.#venueId = venueId;
    this.#observationDelayMs = observationDelayMs;
    this.#backgroundObservationDelaysMs = backgroundObservationDelaysMs;
    this.#backgroundObservationWindowMs = backgroundObservationWindowMs;
    this.#ambiguousCommitGraceMs = ambiguousCommitGraceMs;

    messenger.registerActionHandler(
      'PredictOrderService:requestQuote',
      this.requestQuote.bind(this),
    );
    messenger.registerActionHandler(
      'PredictOrderService:commitPreview',
      this.commitPreview.bind(this),
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
    const generation = this.#commitGeneration;
    const contextEpoch = this.#contextEpoch;
    const controller = new AbortController();
    const abortForCaller = () => controller.abort();
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

  /**
   * Commits an approved Order Preview and resolves with its canonical Order
   * Receipt. Repeated calls for one Preview coalesce into the single
   * in-flight Commit. While the backend reports `pending` or `submitted`,
   * the Commit is observed with a bounded number of re-POSTs; a
   * `reconciliation_required` receipt resolves so the caller can render it.
   * Either way the operation keeps being observed in the background, and an
   * explicit later call re-POSTs straight away. A terminal receipt also
   * invalidates the authoritative portfolio reads.
   *
   * Deliberately not `async`: the cancellation check and the move across
   * the submission boundary run synchronously with the caller's approval,
   * so no context change can land between them.
   */
  commitPreview(
    venueId: PredictVenueId,
    previewId: string,
  ): Promise<PredictOrderReceipt> {
    if (venueId !== this.#venueId) {
      return Promise.reject(
        PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE),
      );
    }
    const inFlight = this.#inFlightCommits.get(previewId);
    if (inFlight) {
      return inFlight.promise;
    }
    const operation = this.#operations.get(previewId);
    if (!operation) {
      // Not quoted by the current Predict User in this process: after a
      // wallet reset or a relaunch nothing may re-POST it.
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
    return this.#dispatch(operation);
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
   * somebody else, so the service must neither re-POST them nor refresh the
   * portfolio reads their receipts describe, nor notify their outcome.
   *
   * A Preview quoted after this returns is a new person's Preview and is
   * observed normally.
   */
  abandonCommits(): void {
    this.#commitGeneration += 1;
    this.#abortInFlightQuotes();
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
  }

  #registerPreview(preview: PredictOrderPreview, contextEpoch: number): void {
    const now = Date.now();
    // Previews that never crossed the boundary are dead once expired.
    for (const [previewId, operation] of this.#operations) {
      if (
        (operation.state === 'quoted' || operation.state === 'cancelled') &&
        operation.expiresAt + this.#ambiguousCommitGraceMs < now
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
      state: 'quoted',
      receiptSeen: false,
      ambiguous: false,
      backgroundObservations: 0,
      presenters: new Set(),
    });
  }

  /** Crosses the submission boundary (if not already across) and commits
   * and observes the operation once. A caller's Commit observes with the
   * bounded loop; a background tick sends a single re-POST, because its
   * own schedule is the loop. */
  #dispatch(
    operation: OrderOperation,
    maxObservations = MAX_COMMIT_OBSERVATIONS,
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
        startedAt,
        transport.signal,
        maxObservations,
      ),
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
      abandon: (error) => {
        // A request still resolving its bearer token never goes out.
        transport.abort();
        rejectAbandoned(error);
      },
    });
    return tracked;
  }

  async #commitAndObserve(
    operation: OrderOperation,
    generation: number,
    startedAt: number,
    signal: AbortSignal,
    maxObservations: number,
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
        () => this.#observe(operation, generation, signal, maxObservations),
      );
    } catch (error) {
      if (generation === this.#commitGeneration) {
        this.#handleCommitFailure(operation, error, startedAt);
      }
      throw error;
    }
    // Checked before refreshing: a receipt for an abandoned Commit describes
    // the previous Predict User, so it must not repopulate the cache the
    // reset just cleared.
    if (generation === this.#commitGeneration && isTerminalReceipt(receipt)) {
      this.#invalidatePortfolioReads();
      this.#resolve(operation, { status: 'settled', receipt });
    }
    return receipt;
  }

  /** Commits once, then observes an in-progress operation with bounded
   * re-POSTs. The Commit is idempotent by Preview reference, so each re-POST
   * observes the same operation instead of placing another Order. */
  async #observe(
    operation: OrderOperation,
    generation: number,
    signal: AbortSignal,
    maxObservations: number,
  ): Promise<PredictOrderReceipt> {
    const receipt = await this.#commitOnce(operation, generation, signal);
    if (!isInProgressReceipt(receipt) || maxObservations <= 0) {
      return receipt;
    }
    await sleep(this.#observationDelayMs);
    return this.#observe(operation, generation, signal, maxObservations - 1);
  }

  /** One observation POST. The generation is checked before the request, so
   * an abandoned Commit is never sent again, and after the response, so a
   * receipt that arrives for it is not treated as the current person's. */
  async #commitOnce(
    operation: OrderOperation,
    generation: number,
    signal: AbortSignal,
  ): Promise<PredictOrderReceipt> {
    this.#assertNotAbandoned(generation);
    const receipt = await this.#trading.commitOrder(operation.previewId, {
      signal,
    });
    this.#assertNotAbandoned(generation);
    operation.receiptSeen = true;
    return receipt;
  }

  /** Decides what a failed Commit means for the operation. */
  #handleCommitFailure(
    operation: OrderOperation,
    error: unknown,
    startedAt: number,
  ): void {
    if (operation.state !== 'dispatched') {
      return;
    }
    if (!isPreOperationFailure(error)) {
      // The request may have reached the backend: keep observing.
      operation.ambiguous = true;
      return;
    }
    const mayStillLand = operation.receiptSeen || operation.ambiguous;
    const sentAfterGrace =
      startedAt >= operation.expiresAt + this.#ambiguousCommitGraceMs;
    // An earlier request may have created the operation. Only the Commit
    // route's own refusal, sent once the Preview has expired, proves it did
    // not: a Receipt already proves it did, and a 401 comes from the auth
    // guard (or a token the client could not get) before any lookup.
    const provesNoOperation =
      !operation.receiptSeen &&
      sentAfterGrace &&
      isCanonicalCommitFailure(error);
    if (mayStillLand && !provesNoOperation) {
      return;
    }
    const canReturnBeforeBoundary =
      !mayStillLand &&
      error.code !== PredictErrorCode.PREVIEW_EXPIRED &&
      operation.contextEpoch === this.#contextEpoch &&
      operation.presenters.size > 0;
    if (canReturnBeforeBoundary) {
      // Nothing was submitted, and the surface that showed the failure may
      // still re-approve the same Preview: it is pre-submit again.
      operation.state = 'quoted';
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
  }

  /** Keeps observing a dispatched, unresolved operation, bounded in time. */
  #scheduleBackgroundObservation(operation: OrderOperation): void {
    if (
      operation.state !== 'dispatched' ||
      operation.backgroundTimer !== undefined ||
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
    // With no Receipt, the operation may not exist yet: an automatic
    // re-POST inside the validity window could create it.
    const earliest = operation.receiptSeen
      ? now
      : operation.expiresAt + this.#ambiguousCommitGraceMs;
    operation.backgroundObservations += 1;
    operation.backgroundTimer = setTimeout(
      () => {
        operation.backgroundTimer = undefined;
        if (
          this.#operations.get(operation.previewId) !== operation ||
          this.#inFlightCommits.has(operation.previewId)
        ) {
          return;
        }
        // Failures are handled inside; the background has no caller.
        this.#dispatch(operation, 0).catch(() => undefined);
      },
      Math.max(delay, earliest - now),
    );
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

  #assertNotAbandoned(generation: number): void {
    if (generation !== this.#commitGeneration) {
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
    // destroyed Engine must not re-POST the previous person's Commit.
    this.abandonCommits();
    this.#messenger.unregisterActionHandler('PredictOrderService:requestQuote');
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
