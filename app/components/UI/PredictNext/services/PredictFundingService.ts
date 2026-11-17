import type { Messenger } from '@metamask/messenger';
import type { DataServiceInvalidateQueriesAction } from '@metamask/base-data-service';
import type { Json } from '@metamask/utils';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { PredictError, PredictErrorCode } from '../errors';
import type { VenueFundingAdapter } from '../adapters/types';
import { portfolioQueryFamilies } from '../queries/portfolioQueries';
import type {
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
const TERMINAL_WITHDRAW_STATUSES: readonly PredictWithdrawReceiptStatus[] = [
  'settled',
  'failed',
  'returned',
];

export type PredictFundingServiceActions =
  // Consumed action: a Withdrawal that leaves or returns money changes the
  // authoritative balance reads. The cache stays owned by the portfolio
  // service.
  DataServiceInvalidateQueriesAction<'PredictPortfolioService'>;

/** A Withdrawal publishes nothing: its outcome is the receipt a subscribed
 * surface renders, and the balance reads it refreshes. */
export type PredictFundingServiceEvents = never;

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
 * Owns the Withdraw workflow for one Venue: the server quote, the Commit of
 * an approved quote, and the receipt read a surface polls. The phone supplies
 * no identity, destination, or idempotency key — the backend owns all three —
 * so a retry only ever references `previewId`, and repeated Commits converge
 * on one operation.
 *
 * **Observation belongs to the surface.** {@link useWithdrawReceipt} polls
 * this service only while the Withdraw sheet is mounted. Nothing is
 * persisted: a Withdrawal this process stops observing is reconciled the next
 * time the backend is asked about it.
 *
 * **Identity.** {@link PredictFundingService.abandon} forgets every receipt
 * transition this session saw, so one person's Withdrawal never populates the
 * next person's readings.
 */
export class PredictFundingService {
  readonly #messenger: PredictFundingServiceMessenger;
  readonly #funding: VenueFundingAdapter;
  readonly #venueId: PredictVenueId;
  /** The last status each Preview's receipt reported, so a balance read is
   * invalidated once per transition rather than once per poll. */
  readonly #statusByPreview = new Map<string, PredictWithdrawReceiptStatus>();
  /** Bumped when the Predict User is replaced; fences stale callbacks. */
  #generation = 0;
  #cleanupLifecycle?: () => void;

  constructor({ messenger, funding, venueId }: PredictFundingServiceOptions) {
    this.#messenger = messenger;
    this.#funding = funding;
    this.#venueId = venueId;
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
    // Nothing may read a Withdrawal once the service is gone: a destroyed
    // Engine must not read the previous person's receipt.
    this.abandon();
    this.#cleanupLifecycle?.();
    this.#cleanupLifecycle = undefined;
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
      TERMINAL_WITHDRAW_STATUSES.includes(receipt.status)
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
        'PredictNext: failed to refresh balance reads after a Withdrawal',
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
