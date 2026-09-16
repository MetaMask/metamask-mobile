import { TraceName, TraceOperation } from '../../../../util/trace';
import { PredictError, PredictErrorCode } from '../errors';
import type {
  PredictOrderPreview,
  PredictOrderPreviewParams,
  PredictVenueId,
} from '../types';
import type { VenueTradingAdapter } from '../adapters/types';
import { withPredictNextTrace } from './withPredictNextTrace';

/** How long the stub submission pretends to submit, in milliseconds. */
const STUB_SUBMIT_DELAY_MS = 2000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface PredictOrderPreviewServiceOptions {
  trading: VenueTradingAdapter;
  venueId: PredictVenueId;
  /** Injectable clock for tests. */
  now?: () => number;
  /** Injectable stub delay for tests. */
  submitDelayMs?: number;
}

/**
 * Owns the Order Preview workflow for one Venue: server quotes, expiry, and
 * (until the placement slice lands) the stubbed submission. Previews are
 * never cached and never retried here — a changed intent gets a fresh quote.
 */
export class PredictOrderPreviewService {
  readonly #trading: VenueTradingAdapter;
  readonly #venueId: PredictVenueId;
  readonly #now: () => number;
  readonly #submitDelayMs: number;

  constructor({
    trading,
    venueId,
    now = Date.now,
    submitDelayMs = STUB_SUBMIT_DELAY_MS,
  }: PredictOrderPreviewServiceOptions) {
    this.#trading = trading;
    this.#venueId = venueId;
    this.#now = now;
    this.#submitDelayMs = submitDelayMs;
  }

  /** Requests a fresh server-authoritative quote for one intent. */
  requestQuote(
    params: PredictOrderPreviewParams,
    options?: { signal?: AbortSignal },
  ): Promise<PredictOrderPreview> {
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

  /** A preview whose expiry has passed cannot be approved, only refreshed. */
  isExpired(preview: PredictOrderPreview, at?: number): boolean {
    return Date.parse(preview.expiresAt) <= (at ?? this.#now());
  }

  /**
   * TODO(PRED-1194): replace with real Order placement (prepare → confirm →
   * commit → reconcile). The stub only simulates the submitting phase so the
   * flow is end-to-end visible; it moves no funds and invalidates nothing.
   */
  async submitOrder(params: {
    venueId: PredictVenueId;
    previewId: string;
  }): Promise<{ previewId: string }> {
    if (params.venueId !== this.#venueId) {
      throw PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE);
    }
    await sleep(this.#submitDelayMs);
    return { previewId: params.previewId };
  }
}
