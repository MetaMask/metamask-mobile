import type { Messenger } from '@metamask/messenger';
import type { DataServiceInvalidateQueriesAction } from '@metamask/base-data-service';
import type { Json } from '@metamask/utils';
import { AppState as NativeAppState, type AppStateStatus } from 'react-native';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { TraceName, TraceOperation } from '../../../../util/trace';
import type { NetworkTier } from '../../../../util/deviceCapability/types';
import { PredictError, PredictErrorCode } from '../errors';
import type { VenueFundingAdapter } from '../adapters/types';
import { portfolioQueryFamilies } from '../queries/portfolioQueries';
import type {
  PredictReadOptions,
  PredictVenueId,
  PredictWithdrawDestination,
  PredictWithdrawPreview,
  PredictWithdrawPreviewParams,
  PredictWithdrawReceipt,
  PredictWithdrawReceiptStatus,
} from '../types';
import { withPredictNextTrace } from './withPredictNextTrace';

export const PREDICT_FUNDING_SERVICE_NAME = 'PredictFundingService' as const;

/** Receipt statuses the backend is still working through; they are observed
 * by reading the operation's receipt, never by committing again. */
const IN_PROGRESS_WITHDRAW_STATUSES: readonly PredictWithdrawReceiptStatus[] = [
  'pending',
  'processing',
];

/** Receipt statuses that end the Withdraw workflow with a known outcome, so
 * the balance reads must be refreshed. `rejected` ended before money moved. */
const TERMINAL_WITHDRAW_STATUSES: readonly PredictWithdrawReceiptStatus[] = [
  'settled',
  'failed',
  'returned',
];

/** Delays between receipt reads of an in-progress Withdrawal, in
 * milliseconds. Stripe payouts take minutes, so the last delay repeats and
 * the UI never implies a fast completion. */
export const WITHDRAW_OBSERVATION_DELAYS_MS: readonly number[] = [
  2_000, 4_000, 8_000, 15_000,
];

/** Each backoff step is doubled on a slow cellular connection, to spare the
 * radio. */
export const SLOW_CELLULAR_DELAY_MULTIPLIER = 2;

/** A surface showing one Withdrawal. The callback reads the network tier at
 * scheduling time, so a surface that re-renders after a tier change needs no
 * re-subscription. */
export interface PredictWithdrawObserver {
  onReceipt: (receipt: PredictWithdrawReceipt) => void;
  getNetworkTier?: () => NetworkTier | null;
}

interface Observation {
  readonly previewId: string;
  readonly observers: Set<PredictWithdrawObserver>;
  attempt: number;
  timer?: ReturnType<typeof setTimeout>;
  request?: AbortController;
  lastReceipt?: PredictWithdrawReceipt;
}

const isInProgressWithdraw = (receipt: PredictWithdrawReceipt): boolean =>
  IN_PROGRESS_WITHDRAW_STATUSES.includes(receipt.status);

const isTerminalWithdraw = (receipt: PredictWithdrawReceipt): boolean =>
  TERMINAL_WITHDRAW_STATUSES.includes(receipt.status);

export interface PredictFundingServiceRequestWithdrawPreviewAction {
  type: 'PredictFundingService:requestWithdrawPreview';
  handler: (
    venueId: PredictVenueId,
    params: PredictWithdrawPreviewParams,
    options?: PredictReadOptions,
  ) => Promise<PredictWithdrawPreview>;
}

export interface PredictFundingServiceCommitWithdrawPreviewAction {
  type: 'PredictFundingService:commitWithdrawPreview';
  handler: (
    venueId: PredictVenueId,
    previewId: string,
  ) => Promise<PredictWithdrawReceipt>;
}

export interface PredictFundingServiceObserveWithdrawAction {
  type: 'PredictFundingService:observeWithdraw';
  handler: (
    venueId: PredictVenueId,
    previewId: string,
  ) => Promise<PredictWithdrawReceipt>;
}

export interface PredictFundingServiceAbandonObservationAction {
  type: 'PredictFundingService:abandonObservation';
  handler: () => void;
}

export type PredictFundingServiceActions =
  | PredictFundingServiceRequestWithdrawPreviewAction
  | PredictFundingServiceCommitWithdrawPreviewAction
  | PredictFundingServiceObserveWithdrawAction
  | PredictFundingServiceAbandonObservationAction
  // Consumed action: a Withdrawal that leaves or returns money changes the
  // authoritative balance reads. The cache stays owned by the portfolio
  // service.
  | DataServiceInvalidateQueriesAction<'PredictPortfolioService'>;

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
  /** Injectable AppState for tests. */
  AppState?: Pick<typeof NativeAppState, 'addEventListener' | 'currentState'>;
  /** Injectable observation schedule for tests. */
  observationDelaysMs?: readonly number[];
  /** Injectable slow-network multiplier for tests. */
  slowCellularMultiplier?: number;
}

/**
 * Owns the Withdraw workflow for one Venue: the server quote, the Commit of
 * an approved quote, and the process-local observation of the committed
 * operation. The phone supplies no identity, destination, or idempotency key
 * — the backend owns all three — so a retry only ever references
 * `previewId`, and repeated Commits converge on one operation.
 *
 * **Observation is a surface's, not the process's.** Receipt reads run only
 * while a surface is subscribed, pause while the app is not active or the
 * connection is known to be gone, and stop when the operation reaches a
 * terminal status or the backend asks for manual review. Nothing is
 * persisted: a Withdrawal this process stops observing is reconciled the
 * next time the backend is asked about it.
 *
 * **Identity.** {@link PredictFundingService.abandonObservation} forgets
 * every held Preview, so one person's receipt never populates the next
 * person's UI.
 */
export class PredictFundingService {
  readonly #messenger: PredictFundingServiceMessenger;
  readonly #funding: VenueFundingAdapter;
  readonly #venueId: PredictVenueId;
  readonly #appState: Pick<
    typeof NativeAppState,
    'addEventListener' | 'currentState'
  >;
  readonly #observationDelaysMs: readonly number[];
  readonly #slowCellularMultiplier: number;
  readonly #observations = new Map<string, Observation>();
  readonly #inFlightCommits = new Map<
    string,
    Promise<PredictWithdrawReceipt>
  >();
  /** Bumped when the Predict User is replaced; fences stale callbacks. */
  #generation = 0;
  #appStateActive: boolean;
  #removeAppStateListener?: () => void;
  #cleanupLifecycle?: () => void;
  #destroyed = false;

  constructor({
    messenger,
    funding,
    venueId,
    AppState = NativeAppState,
    observationDelaysMs = WITHDRAW_OBSERVATION_DELAYS_MS,
    slowCellularMultiplier = SLOW_CELLULAR_DELAY_MULTIPLIER,
  }: PredictFundingServiceOptions) {
    this.#messenger = messenger;
    this.#funding = funding;
    this.#venueId = venueId;
    this.#appState = AppState;
    this.#observationDelaysMs = observationDelaysMs;
    this.#slowCellularMultiplier = slowCellularMultiplier;
    this.#appStateActive = AppState.currentState === 'active';
    this.#removeAppStateListener = AppState.addEventListener(
      'change',
      this.#handleAppStateChange,
    ).remove;

    messenger.registerActionHandler(
      'PredictFundingService:requestWithdrawPreview',
      this.requestWithdrawPreview.bind(this),
    );
    messenger.registerActionHandler(
      'PredictFundingService:commitWithdrawPreview',
      this.commitWithdrawPreview.bind(this),
    );
    messenger.registerActionHandler(
      'PredictFundingService:observeWithdraw',
      this.observeWithdraw.bind(this),
    );
    messenger.registerActionHandler(
      'PredictFundingService:abandonObservation',
      this.abandonObservation.bind(this),
    );
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

  /**
   * Commits a quoted Withdrawal by reference. Concurrent calls for the same
   * Preview share one request: the backend collapses them onto one
   * operation, and coalescing here keeps the phone from asking twice.
   */
  commitWithdrawPreview(
    venueId: PredictVenueId,
    previewId: string,
  ): Promise<PredictWithdrawReceipt> {
    this.#assertVenue(venueId);
    const existing = this.#inFlightCommits.get(previewId);
    if (existing) {
      return existing;
    }
    const generation = this.#generation;
    const commit = withPredictNextTrace(
      {
        method: 'commitWithdrawPreview',
        name: TraceName.PredictNextWithdrawCommit,
        op: TraceOperation.PredictDataFetch,
        tags: { venueId: this.#venueId },
        resultData: (receipt) => ({ status: receipt.status }),
      },
      () => this.#funding.commitWithdraw(previewId),
    )
      .then((receipt) => {
        this.#assertNotAbandoned(generation);
        // Recording invalidates the balance reads the receipt's status
        // implies, exactly as an observation transition does.
        this.#recordObservation(receipt);
        return receipt;
      })
      .finally(() => {
        this.#inFlightCommits.delete(previewId);
      });
    this.#inFlightCommits.set(previewId, commit);
    return commit;
  }

  /** Reads the canonical receipt. Never submits: an unresolved operation is
   * resolved by the backend's own venue reads. */
  async observeWithdraw(
    venueId: PredictVenueId,
    previewId: string,
  ): Promise<PredictWithdrawReceipt> {
    this.#assertVenue(venueId);
    const generation = this.#generation;
    const receipt = await this.#funding.observeWithdraw(previewId);
    this.#assertNotAbandoned(generation);
    this.#recordObservation(receipt);
    return receipt;
  }

  /**
   * Subscribes a surface to one Withdrawal. Observation starts on the next
   * backoff step and stops when the operation is terminal or under manual
   * review. Returns the unsubscription; the last surface leaving stops the
   * read loop but keeps the receipt for a later re-subscription.
   */
  followOperation(
    previewId: string,
    observer: PredictWithdrawObserver,
  ): () => void {
    const observation = this.#observationFor(previewId);
    observation.observers.add(observer);
    if (observation.lastReceipt) {
      observer.onReceipt(observation.lastReceipt);
    }
    this.#schedule(observation);
    return () => {
      observation.observers.delete(observer);
      if (observation.observers.size === 0) {
        this.#stopObservation(observation);
      }
    };
  }

  /**
   * Abandons every observed Withdrawal. Called when the platform replaces
   * the Predict User: the operations belong to somebody else, so the service
   * must neither read their receipts nor refresh the balance reads they
   * describe.
   */
  abandonObservation(): void {
    this.#generation += 1;
    for (const observation of this.#observations.values()) {
      this.#stopObservation(observation);
      observation.observers.clear();
    }
    this.#observations.clear();
    this.#inFlightCommits.clear();
  }

  /** The committed destination of an observed Withdrawal, for a surface that
   * mounted after the commit. */
  getDestination(previewId: string): PredictWithdrawDestination | undefined {
    return this.#observations.get(previewId)?.lastReceipt?.destination;
  }

  /** Runtime composition registers the subscriptions it owns around this
   * service, so destroying the service releases them too. */
  setLifecycleCleanup(cleanup: () => void): void {
    this.#cleanupLifecycle = cleanup;
  }

  destroy(): void {
    // Nothing may observe a Withdrawal once the service is gone: a destroyed
    // Engine must not read the previous person's receipt.
    this.abandonObservation();
    this.#destroyed = true;
    this.#removeAppStateListener?.();
    this.#removeAppStateListener = undefined;
    this.#cleanupLifecycle?.();
  }

  #handleAppStateChange = (state: AppStateStatus): void => {
    const active = state === 'active';
    if (active === this.#appStateActive) {
      return;
    }
    this.#appStateActive = active;
    for (const observation of this.#observations.values()) {
      if (active) {
        this.#schedule(observation);
      } else {
        this.#clearTimer(observation);
      }
    }
  };

  #observationFor(previewId: string): Observation {
    const existing = this.#observations.get(previewId);
    if (existing) {
      return existing;
    }
    const observation: Observation = {
      previewId,
      observers: new Set(),
      attempt: 0,
    };
    this.#observations.set(previewId, observation);
    return observation;
  }

  /** The receipt a Commit or an observation produced becomes the state every
   * subscribed surface renders, and a terminal one stops the loop. */
  #recordObservation(receipt: PredictWithdrawReceipt): void {
    const observation = this.#observationFor(receipt.previewId);
    const previous = observation.lastReceipt;
    observation.lastReceipt = receipt;
    if (!isInProgressWithdraw(receipt) || receipt.needsManualReview) {
      this.#clearTimer(observation);
    }
    // One invalidation per transition: entering `processing` means the
    // account balance moved, and a terminal status settles what is left.
    if (previous?.status !== receipt.status) {
      if (receipt.status === 'processing' || isTerminalWithdraw(receipt)) {
        this.#invalidateFundingReads();
      }
    }
    for (const observer of observation.observers) {
      observer.onReceipt(receipt);
    }
  }

  #schedule(observation: Observation): void {
    if (
      this.#destroyed ||
      observation.timer !== undefined ||
      observation.observers.size === 0
    ) {
      return;
    }
    const receipt = observation.lastReceipt;
    if (receipt && !isInProgressWithdraw(receipt)) {
      return;
    }
    if (receipt?.needsManualReview) {
      return;
    }
    if (!this.#appStateActive) {
      return;
    }
    observation.timer = setTimeout(() => {
      observation.timer = undefined;
      this.#poll(observation).catch(() => undefined);
    }, this.#delayFor(observation));
  }

  async #poll(observation: Observation): Promise<void> {
    if (this.#destroyed || observation.observers.size === 0) {
      return;
    }
    const tiers = [...observation.observers].map((observer) =>
      observer.getNetworkTier?.(),
    );
    // A connection that is known to be gone never carries a read; the timer
    // re-arms at the same step so a restored connection picks it up.
    if (tiers.includes('NONE') || !this.#appStateActive) {
      this.#schedule(observation);
      return;
    }
    const generation = this.#generation;
    const controller = new AbortController();
    observation.request = controller;
    let receipt: PredictWithdrawReceipt;
    try {
      receipt = await this.#funding.observeWithdraw(observation.previewId, {
        signal: controller.signal,
      });
    } catch (error) {
      if (this.#destroyed || generation !== this.#generation) {
        return;
      }
      // A failed read says nothing about the money: keep the last receipt on
      // screen and try again on the next step.
      Logger.log('PredictNext: the Withdrawal receipt read failed', error);
      observation.attempt += 1;
      this.#schedule(observation);
      return;
    } finally {
      if (observation.request === controller) {
        observation.request = undefined;
      }
    }
    if (this.#destroyed || generation !== this.#generation) {
      return;
    }
    observation.attempt += 1;
    this.#recordObservation(receipt);
    this.#schedule(observation);
  }

  /** Backoff step for this read, doubled on a slow cellular connection. */
  #delayFor(observation: Observation): number {
    const index = Math.min(
      observation.attempt,
      this.#observationDelaysMs.length - 1,
    );
    const base = this.#observationDelaysMs[index];
    const slow = [...observation.observers].some(
      (observer) => observer.getNetworkTier?.() === 'SLOW_CELLULAR',
    );
    return slow ? base * this.#slowCellularMultiplier : base;
  }

  #stopObservation(observation: Observation): void {
    this.#clearTimer(observation);
    observation.request?.abort();
    observation.request = undefined;
  }

  #clearTimer(observation: Observation): void {
    if (observation.timer !== undefined) {
      clearTimeout(observation.timer);
      observation.timer = undefined;
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
