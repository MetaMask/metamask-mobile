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

/** A Commit being observed, and the rejection that abandons it. */
interface InFlightCommit {
  promise: Promise<PredictOrderReceipt>;
  abandon: (error: PredictError) => void;
}

const isInProgressReceipt = (receipt: PredictOrderReceipt): boolean =>
  IN_PROGRESS_RECEIPT_STATUSES.includes(receipt.status);

const isTerminalReceipt = (receipt: PredictOrderReceipt): boolean =>
  TERMINAL_RECEIPT_STATUSES.includes(receipt.status);

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

export type PredictOrderServiceEvents = never;

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
}

/**
 * Owns the Order workflow for one Venue: server quotes and the Commit of an
 * approved Order Preview. Previews are never cached and never retried here —
 * a changed intent gets a fresh quote.
 *
 * A Commit is idempotent by Preview reference: repeated calls for one
 * operation coalesce into the single in-flight Commit, and an unfinished
 * operation is observed by committing the same Preview again, which never
 * places a second Order. After a terminal receipt the service invalidates
 * the authoritative Balance, Positions, Activity, and Summary reads. Nothing
 * is persisted: after a restart the outcome surfaces through those reads.
 */
export class PredictOrderService {
  readonly #messenger: PredictOrderServiceMessenger;
  readonly #trading: VenueTradingAdapter;
  readonly #venueId: PredictVenueId;
  readonly #observationDelayMs: number;
  readonly #inFlightCommits = new Map<string, InFlightCommit>();
  /** Bumped when every Commit already underway is abandoned. */
  #commitGeneration = 0;

  constructor({
    messenger,
    trading,
    venueId,
    observationDelayMs = COMMIT_OBSERVATION_DELAY_MS,
  }: PredictOrderServiceOptions) {
    this.#messenger = messenger;
    this.#trading = trading;
    this.#venueId = venueId;
    this.#observationDelayMs = observationDelayMs;

    messenger.registerActionHandler(
      'PredictOrderService:requestQuote',
      this.requestQuote.bind(this),
    );
    messenger.registerActionHandler(
      'PredictOrderService:commitPreview',
      this.commitPreview.bind(this),
    );
  }

  /** Requests a fresh server-authoritative quote for one intent. */
  async requestQuote(
    venueId: PredictVenueId,
    params: PredictOrderPreviewParams,
    options?: { signal?: AbortSignal },
  ): Promise<PredictOrderPreview> {
    this.#assertVenue(venueId);
    // Never cache or retry: the quote reflects liquidity at request time and
    // the result is bound to an expiring previewId.
    return withPredictNextTrace(
      {
        method: 'requestQuote',
        name: TraceName.PredictNextOrderPreview,
        op: TraceOperation.PredictDataFetch,
        tags: { venueId: this.#venueId },
        data: { side: params.side, action: params.action },
      },
      () =>
        this.#trading.previewOrder(params, {
          signal: options?.signal,
        }),
    );
  }

  /**
   * Commits an approved Order Preview and resolves with its canonical Order
   * Receipt. Repeated calls for one Preview coalesce into the single
   * in-flight Commit. While the backend reports `pending` or `submitted`,
   * the Commit is observed with a bounded number of re-POSTs; a
   * `reconciliation_required` receipt resolves so the caller can render it,
   * and an explicit later call re-POSTs to keep observing. A terminal
   * receipt also invalidates the authoritative portfolio reads.
   */
  async commitPreview(
    venueId: PredictVenueId,
    previewId: string,
  ): Promise<PredictOrderReceipt> {
    this.#assertVenue(venueId);
    const inFlight = this.#inFlightCommits.get(previewId);
    if (inFlight) {
      return inFlight.promise;
    }
    const generation = this.#commitGeneration;
    let abandon: (error: PredictError) => void = () => undefined;
    const abandonment = new Promise<never>((_resolve, reject) => {
      abandon = reject;
    });
    // Racing the abandonment is what makes the rejection immediate: a caller
    // must not wait out the observation delay after the reset.
    const commit = Promise.race([
      this.#commitAndObserve(previewId, generation),
      abandonment,
    ]);
    const tracked = commit.finally(() => {
      if (this.#inFlightCommits.get(previewId)?.promise === tracked) {
        this.#inFlightCommits.delete(previewId);
      }
    });
    this.#inFlightCommits.set(previewId, { promise: tracked, abandon });
    return tracked;
  }

  /**
   * Abandons every Commit underway and refuses to observe the ones already
   * underway. Called when the platform replaces the Predict User: the Preview
   * was approved by somebody else, so the service must neither re-POST it nor
   * refresh the portfolio reads its receipts describe.
   *
   * A Commit started after this returns is a new person's Commit and is
   * observed normally.
   */
  abandonCommits(): void {
    this.#commitGeneration += 1;
    const commits = [...this.#inFlightCommits.values()];
    this.#inFlightCommits.clear();
    commits.forEach((commit) =>
      commit.abandon(PredictError.from(PredictErrorCode.UNAUTHENTICATED)),
    );
  }

  async #commitAndObserve(
    previewId: string,
    generation: number,
  ): Promise<PredictOrderReceipt> {
    const receipt = await withPredictNextTrace(
      {
        method: 'commitPreview',
        name: TraceName.PredictNextOrderCommit,
        op: TraceOperation.PredictOrderSubmission,
        tags: { venueId: this.#venueId },
      },
      () => this.#observe(previewId, generation),
    );
    // Checked before refreshing: a receipt for an abandoned Commit describes
    // the previous Predict User, so it must not repopulate the cache the
    // reset just cleared.
    if (generation === this.#commitGeneration && isTerminalReceipt(receipt)) {
      this.#invalidatePortfolioReads();
    }
    return receipt;
  }

  /** Commits once, then observes an in-progress operation with bounded
   * re-POSTs. The Commit is idempotent by Preview reference, so each re-POST
   * observes the same operation instead of placing another Order. */
  async #observe(
    previewId: string,
    generation: number,
  ): Promise<PredictOrderReceipt> {
    let receipt = await this.#commitOnce(previewId, generation);
    let observations = 0;
    while (
      isInProgressReceipt(receipt) &&
      observations < MAX_COMMIT_OBSERVATIONS
    ) {
      await sleep(this.#observationDelayMs);
      receipt = await this.#commitOnce(previewId, generation);
      observations += 1;
    }
    return receipt;
  }

  /** One observation POST. The generation is checked before the request, so
   * an abandoned Commit is never sent again, and after the response, so a
   * receipt that arrives for it is not treated as the current person's. */
  async #commitOnce(
    previewId: string,
    generation: number,
  ): Promise<PredictOrderReceipt> {
    this.#assertNotAbandoned(generation);
    const receipt = await this.#trading.commitOrder(previewId);
    this.#assertNotAbandoned(generation);
    return receipt;
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
