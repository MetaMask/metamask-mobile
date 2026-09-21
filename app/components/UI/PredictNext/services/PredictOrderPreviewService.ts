import type { Messenger } from '@metamask/messenger';

import { TraceName, TraceOperation } from '../../../../util/trace';
import { PredictError, PredictErrorCode } from '../errors';
import type {
  PredictOrderPreview,
  PredictOrderPreviewParams,
  PredictVenueId,
} from '../types';
import type { VenueTradingAdapter } from '../adapters/types';
import { withPredictNextTrace } from './withPredictNextTrace';

export const PREDICT_ORDER_PREVIEW_SERVICE_NAME =
  'PredictOrderPreviewService' as const;

/** How long the stub submission pretends to submit, in milliseconds. */
const STUB_SUBMIT_DELAY_MS = 2000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface PredictOrderPreviewServiceRequestQuoteAction {
  type: 'PredictOrderPreviewService:requestQuote';
  handler: (
    venueId: PredictVenueId,
    params: PredictOrderPreviewParams,
    options?: { signal?: AbortSignal },
  ) => Promise<PredictOrderPreview>;
}

export interface PredictOrderPreviewServiceSubmitOrderAction {
  type: 'PredictOrderPreviewService:submitOrder';
  handler: (
    venueId: PredictVenueId,
    previewId: string,
  ) => Promise<{ previewId: string }>;
}

export type PredictOrderPreviewServiceActions =
  | PredictOrderPreviewServiceRequestQuoteAction
  | PredictOrderPreviewServiceSubmitOrderAction;

export type PredictOrderPreviewServiceEvents = never;

export type PredictOrderPreviewServiceMessenger = Messenger<
  typeof PREDICT_ORDER_PREVIEW_SERVICE_NAME,
  PredictOrderPreviewServiceActions,
  PredictOrderPreviewServiceEvents
>;

export interface PredictOrderPreviewServiceOptions {
  messenger: PredictOrderPreviewServiceMessenger;
  trading: VenueTradingAdapter;
  venueId: PredictVenueId;
  /** Injectable stub delay for tests. */
  submitDelayMs?: number;
}

/**
 * Owns the Order Preview workflow for one Venue: server quotes and (until the
 * placement slice lands) the stubbed submission. Previews are never cached
 * and never retried here — a changed intent gets a fresh quote.
 */
export class PredictOrderPreviewService {
  readonly #messenger: PredictOrderPreviewServiceMessenger;
  readonly #trading: VenueTradingAdapter;
  readonly #venueId: PredictVenueId;
  readonly #submitDelayMs: number;

  constructor({
    messenger,
    trading,
    venueId,
    submitDelayMs = STUB_SUBMIT_DELAY_MS,
  }: PredictOrderPreviewServiceOptions) {
    this.#messenger = messenger;
    this.#trading = trading;
    this.#venueId = venueId;
    this.#submitDelayMs = submitDelayMs;

    messenger.registerActionHandler(
      'PredictOrderPreviewService:requestQuote',
      this.requestQuote.bind(this),
    );
    messenger.registerActionHandler(
      'PredictOrderPreviewService:submitOrder',
      this.submitOrder.bind(this),
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
        data: { side: params.side },
      },
      () =>
        this.#trading.previewOrder(params, {
          signal: options?.signal,
        }),
    );
  }

  /**
   * TODO(PRED-1194): replace with real Order placement (prepare → confirm →
   * commit → reconcile). The stub only simulates the submitting phase so the
   * flow is end-to-end visible; it moves no funds and invalidates nothing.
   */
  async submitOrder(
    venueId: PredictVenueId,
    previewId: string,
  ): Promise<{ previewId: string }> {
    this.#assertVenue(venueId);
    await sleep(this.#submitDelayMs);
    return { previewId };
  }

  destroy(): void {
    this.#messenger.unregisterActionHandler(
      'PredictOrderPreviewService:requestQuote',
    );
    this.#messenger.unregisterActionHandler(
      'PredictOrderPreviewService:submitOrder',
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
