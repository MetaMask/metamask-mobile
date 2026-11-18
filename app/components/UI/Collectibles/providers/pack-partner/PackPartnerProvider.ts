import type { Draft } from '@reduxjs/toolkit';

import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { packPartnerQueryFamilies } from '../../services/data/packPartnerQueries';
import {
  PACK_PARTNER_ENVIRONMENT,
  PACK_PARTNER_TIMINGS,
  MAX_MULTIPACK_COUNT,
  type PackPartnerEnvironment,
} from './constants';
import type {
  PackPartnerApi,
  OpenPackResult,
  SubmittedTransaction,
} from '../../services/clients/PackPartnerApiClient';
import {
  createPackPartnerError,
  toPackPartnerError,
  toErrorState,
  type PackPartnerError,
} from './services/errors';
import {
  signPackPartnerBuy,
  signPackPartnerBuyback,
  type SignedSolanaTransaction,
  type SnapRequestFn,
} from './services/solanaSnap';
import type {
  PackPartnerBuybackOperation,
  PackPartnerCard,
  PackPartnerErrorCode,
  PackPartnerNftStandard,
  PackPartnerPackRef,
  PackPartnerSaleResult,
  PackPartnerPackOperation,
  PackPartnerPurchaseOptions,
  PackPartnerAccount,
} from './types';
import {
  cardFromOpenPack,
  cardFromPackStatus,
  isBuybackBelow,
} from './utils/cards';
import { patchOperation, type OperationPatch } from './utils/operations';
import { dedupe, mapWithConcurrency } from './utils/async';
import { getDefaultPackPartnerState, type PackPartnerState } from './state';

/** Key prefix of a `PackPartnerDataService` read family. */
type QueryFamily = readonly [string, ...string[]];

export interface PackPartnerProviderOptions {
  getState: () => PackPartnerState;
  updateState: (
    recipe: (state: Draft<PackPartnerState>) => void | PackPartnerState,
  ) => void;
  requestSnap: SnapRequestFn;
  /**
   * Uncached PackPartner client of the workflow: writes, settlement checks
   * and the fresh offer check before signing never go through a query cache.
   */
  api: PackPartnerApi;
  /**
   * Refreshes the `PackPartnerDataService` reads a terminal outcome changed.
   * Fire-and-forget: a failed refresh never fails a completed operation.
   */
  invalidateQueries?: (queryKey: QueryFamily) => Promise<void>;
  environment?: PackPartnerEnvironment;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/** Errors that are part of the normal product flow: not sent to Sentry. */
const EXPECTED_ERROR_CODES: readonly PackPartnerErrorCode[] = [
  'PACK_EXPIRED',
  // A confirmed refund: PackPartner could not deliver the pack.
  'PACK_FAILED',
  'BUYBACK_UNAVAILABLE',
  'OFFER_CHANGED',
  'MACHINE_UNAVAILABLE',
  'OPEN_PENDING',
  'SALE_PENDING',
];

/** Statuses `recoverOperations` resumes: the payment may already be sent. */
const RECOVERABLE_STATUSES: readonly PackPartnerPackOperation['status'][] = [
  'submitted',
  'paid',
];

/**
 * Default sleep.
 *
 * @param ms - Delay.
 * @returns A promise resolved after the delay.
 */
const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Error for a failure the caller can act on.
 *
 * @param code - Error code.
 * @param retryable - Whether retrying may succeed.
 * @returns The error.
 */
const packPartnerError = (
  code: PackPartnerErrorCode,
  retryable = false,
): PackPartnerError => createPackPartnerError({ code, retryable });

/**
 * Key of a run in a deduplication map.
 *
 * @param address - Account address.
 * @param id - Memo or mint.
 * @returns The key.
 */
const runKey = (address: string, id: string): string => `${address}:${id}`;

/** Outcome of one `openPack` call. */
type OpenAttempt = OpenPackResult | { status: 'unopenable' };

/**
 * Orchestrates PackPartner pack purchases, openings and buybacks for
 * Solana accounts, and keeps their operation journal so they can be resumed.
 * Public openings are not its concern: `PackPartnerDataService` reads them
 * and `usePackPartnerOpenings` polls them.
 * It never caches server reads: owned cards and offers are read through
 * `PackPartnerDataService`, whose families it refreshes after a terminal
 * outcome. State is keyed by Solana address so accounts never see each
 * other's operations.
 */
export class PackPartnerProvider {
  readonly #getState: PackPartnerProviderOptions['getState'];

  readonly #updateState: PackPartnerProviderOptions['updateState'];

  readonly #api: PackPartnerApi;

  readonly #invalidateQueries?: PackPartnerProviderOptions['invalidateQueries'];

  readonly #environment: PackPartnerEnvironment;

  readonly #now: () => number;

  readonly #sleep: (ms: number) => Promise<void>;

  readonly #requestSnap: SnapRequestFn;

  #walletGeneration = 0;

  readonly #paymentRuns = new Map<string, Promise<PackPartnerPackOperation>>();

  readonly #batchRuns = new Map<string, Promise<void>>();

  readonly #packRuns = new Map<string, Promise<PackPartnerCard>>();

  readonly #sales = new Map<string, Promise<PackPartnerSaleResult>>();

  readonly #saleChecks = new Map<
    string,
    Promise<PackPartnerSaleResult | undefined>
  >();

  /** Errors already logged, so a rethrown error is reported once. */
  readonly #reported = new WeakSet<PackPartnerError>();

  constructor({
    getState,
    updateState,
    requestSnap,
    api,
    invalidateQueries,
    environment = PACK_PARTNER_ENVIRONMENT,
    now = Date.now,
    sleep = defaultSleep,
  }: PackPartnerProviderOptions) {
    this.#getState = getState;
    this.#updateState = updateState;
    this.#requestSnap = requestSnap;
    this.#api = api;
    this.#invalidateQueries = invalidateQueries;
    this.#environment = environment;
    this.#now = now;
    this.#sleep = sleep;
  }

  /** Current provider state, owned by CollectiblesController. */
  get state(): PackPartnerState {
    return this.#getState();
  }

  /**
   * Starts a purchase: asks PackPartner for the payment transaction and
   * stores a `generated` operation. Nothing is signed yet.
   *
   * @param params - Parameters.
   * @param params.account - Selected Solana account.
   * @param params.pack - Pack to buy.
   * @param params.options - Options reviewed in the purchase sheet.
   * @returns The pack memo, used by `completePack`.
   */
  async generatePack({
    account,
    pack,
    options,
  }: {
    account: PackPartnerAccount;
    pack: PackPartnerPackRef;
    options?: PackPartnerPurchaseOptions;
  }): Promise<string> {
    const assertCurrent = this.#captureWallet();
    const quantity = options?.quantity ?? 1;
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_MULTIPACK_COUNT ||
      (options && typeof options.turbo !== 'boolean') ||
      !/^\d+$/u.test(pack.priceAmount) ||
      BigInt(pack.priceAmount) <= 0n
    ) {
      throw packPartnerError('INVALID_RESPONSE');
    }
    try {
      const params = {
        playerAddress: account.address,
        packType: pack.code,
        ...(options ? { turbo: options.turbo } : {}),
      };
      const batch =
        quantity === 1
          ? {
              transactions: [await this.#api.generatePack(params)],
              yoloId: undefined,
            }
          : await this.#api.generatePacks({
              ...params,
              count: quantity,
              turbo: options?.turbo ?? false,
            });
      assertCurrent();
      const generated = batch.transactions;
      const memos = generated.map(({ memo }) => memo);
      if (
        generated.length !== quantity ||
        new Set(memos).size !== quantity ||
        generated.some(
          ({ memo, transaction }) =>
            !memo ||
            !transaction ||
            this.state.operations[account.address]?.[memo],
        )
      ) {
        throw packPartnerError('INVALID_RESPONSE');
      }
      const now = this.#now();
      this.#updateState((state) => {
        state.operations[account.address] ??= {};
        generated.forEach(({ memo, transaction }) => {
          state.operations[account.address][memo] = {
            memo,
            transaction,
            packCode: pack.code,
            packName: pack.name,
            price: pack.price,
            priceAmount: pack.priceAmount,
            status: 'generated',
            createdAt: now,
            updatedAt: now,
            ...(options
              ? {
                  batchMemos: memos,
                  batchId: batch.yoloId ?? memos[0],
                  turbo: options.turbo,
                }
              : {}),
          };
        });
      });
      return memos[0];
    } catch (error) {
      assertCurrent();
      throw this.#report(error, 'generatePack');
    }
  }

  /** Runs payments and openings independently; animations never gate business processing. */
  completePacks({
    account,
    memo,
  }: {
    account: PackPartnerAccount;
    memo: string;
  }): Promise<void> {
    const operation = this.state.operations[account.address]?.[memo];
    if (!operation) return Promise.reject(packPartnerError('NOT_FOUND'));
    return dedupe(
      this.#batchRuns,
      runKey(account.address, operation.batchId ?? memo),
      () => this.#runBatch(account, operation.batchMemos ?? [memo]),
    );
  }

  async #runBatch(account: PackPartnerAccount, memos: string[]): Promise<void> {
    const assertCurrent = this.#captureWallet();
    const errors: unknown[] = [];
    // Separate opening lanes: even a slow webhook cannot hold up another payment.
    const openings: Promise<void>[] = Array.from({ length: 4 }, () =>
      Promise.resolve(),
    );
    let nextOpening = 0;
    let stopSigning = false;
    await mapWithConcurrency(memos, 4, async (memo) => {
      try {
        assertCurrent();
        const current = this.state.operations[account.address]?.[memo];
        if (stopSigning && current?.status === 'generated') return;
        await this.#payPack(account.address, memo, account.id);
        assertCurrent();
        const lane = nextOpening++ % openings.length;
        openings[lane] = openings[lane]
          .then(async () => {
            assertCurrent();
            await this.completePack({ account, memo });
          })
          .catch((error: unknown) => {
            errors.push(error);
          });
      } catch (error) {
        // Stop starting new signatures after a validation/rejection failure. Already
        // signed payments still settle and open, even when another pack failed.
        if (
          this.state.operations[account.address]?.[memo]?.status === 'generated'
        ) {
          stopSigning = true;
        }
        errors.push(error);
      }
    });
    await Promise.all(openings);
    if (errors.length) throw errors[0];
  }

  /** Records display progress without changing the purchase or opening lifecycle. */
  markPackRevealed({
    account,
    memo,
    completed = false,
  }: {
    account: PackPartnerAccount;
    memo: string;
    completed?: boolean;
  }): void {
    this.#updateState((state) => {
      const operation = state.operations[account.address]?.[memo];
      if (operation?.status === 'opened') {
        operation.revealed = true;
        if (completed) operation.revealCompleted = true;
      }
    });
  }

  /** Sells only the reviewed mint/amount pairs. A failure stops the remaining sales. */
  async sellCards({
    account,
    cards,
  }: {
    account: PackPartnerAccount;
    cards: {
      mint: string;
      expectedAmount: string;
      nftStandard?: PackPartnerNftStandard;
    }[];
  }): Promise<void> {
    const assertCurrent = this.#captureWallet();
    if (
      !cards.length ||
      cards.length > MAX_MULTIPACK_COUNT ||
      new Set(cards.map(({ mint }) => mint)).size !== cards.length ||
      cards.some(
        ({ expectedAmount }) =>
          !/^\d+$/u.test(expectedAmount) || BigInt(expectedAmount) <= 0n,
      )
    ) {
      throw packPartnerError('INVALID_RESPONSE');
    }
    for (const card of cards) {
      assertCurrent();
      if (
        this.state.sales[account.address]?.[card.mint]?.status === 'completed'
      )
        continue;
      await this.sellCard({ account, ...card });
    }
  }

  /**
   * Moves a purchase forward from wherever it stopped: sign, submit, open.
   * Every transition updates the shared state. Concurrent calls for a memo are shared.
   *
   * @param params - Parameters.
   * @param params.account - Account that owns the operation.
   * @param params.memo - Pack memo.
   * @returns The awarded card.
   */
  completePack({
    account,
    memo,
  }: {
    account: PackPartnerAccount;
    memo: string;
  }): Promise<PackPartnerCard> {
    return dedupe(this.#packRuns, runKey(account.address, memo), () =>
      this.#runPack(account.address, memo, account.id),
    );
  }

  /**
   * Removes an operation (reveal closed, expiry acknowledged). Operations whose
   * payment may be in flight (submitted, paid) are kept for recovery.
   *
   * @param params - Parameters.
   * @param params.account - Account that owns the operation.
   * @param params.memo - Pack memo.
   */
  dismissOperation({
    account,
    memo,
  }: {
    account: PackPartnerAccount;
    memo: string;
  }): void {
    this.#updateState((state) => {
      const operations = state.operations[account.address];
      const operation = operations?.[memo];
      if (!operation || RECOVERABLE_STATUSES.includes(operation.status)) {
        return;
      }
      const abandoned =
        operation.status === 'generated'
          ? (operation.batchMemos ?? [memo])
          : [memo];
      abandoned.forEach((item) => {
        if (item === memo || operations[item]?.status === 'generated')
          delete operations[item];
      });
      if (Object.keys(operations).length === 0) {
        delete state.operations[account.address];
      }
    });
  }

  /**
   * Resumes interrupted purchases whose payment may already be sent
   * (submitted, paid) and interrupted buybacks, and expires stale unsigned
   * purchases. Recovery reads PackPartner by memo only: it never signs,
   * never submits and never throws.
   *
   * @param params - Parameters.
   * @param params.address - Solana address whose operations are resumed.
   */
  async recoverOperations({ address }: { address: string }): Promise<void> {
    try {
      const operations = Object.values(this.state.operations[address] ?? {});
      operations
        .filter((operation) => this.#isStaleGenerated(address, operation))
        .forEach((operation) =>
          this.#transition(address, operation.memo, {
            status: 'expired',
            transaction: undefined,
          }),
        );
      const sales = Object.values(this.state.sales[address] ?? {});
      await Promise.allSettled([
        ...operations
          .filter((operation) =>
            RECOVERABLE_STATUSES.includes(operation.status),
          )
          .map((operation) =>
            dedupe(this.#packRuns, runKey(address, operation.memo), () =>
              this.#runPack(address, operation.memo),
            ),
          ),
        ...sales
          .filter(
            (sale) =>
              sale.status === 'pending' &&
              !this.#sales.has(runKey(address, sale.mint)),
          )
          .map((sale) => this.#resumeSale(address, sale)),
      ]);
    } catch (error) {
      this.#report(error, 'recoverOperations');
    }
  }

  /**
   * Checks the account's pending buybacks by memo, without signing or
   * submitting again, and without waiting on purchases. Never throws: a sale
   * whose outcome is still unknown simply stays pending.
   *
   * @param params - Parameters.
   * @param params.address - Solana address whose sales are checked.
   */
  async checkSales({ address }: { address: string }): Promise<void> {
    try {
      await Promise.allSettled(
        Object.values(this.state.sales[address] ?? {})
          .filter(
            (sale) =>
              sale.status === 'pending' &&
              !this.#sales.has(runKey(address, sale.mint)),
          )
          .map((sale) => this.#resumeSale(address, sale)),
      );
    } catch (error) {
      this.#report(error, 'checkSales');
    }
  }

  /**
   * Sells a card back to PackPartner at the current instant buyback offer.
   * Nothing is signed when the refund is below the amount the user confirmed:
   * the call fails with `OFFER_CHANGED` and the offer read is refreshed.
   * Concurrent calls for a mint are shared.
   *
   * @param params - Parameters.
   * @param params.account - Account that owns the card.
   * @param params.mint - Card mint.
   * @param params.expectedAmount - Refund shown to the user, USDC base units.
   * @param params.nftStandard - Standard of the card, a hint for the Snap's validation.
   * @returns The completed sale.
   */
  sellCard({
    account,
    mint,
    expectedAmount,
    nftStandard = 'unknown',
  }: {
    account: PackPartnerAccount;
    mint: string;
    expectedAmount: string;
    nftStandard?: PackPartnerNftStandard;
  }): Promise<PackPartnerSaleResult> {
    return dedupe(this.#sales, runKey(account.address, mint), () =>
      this.#runSale(account, mint, expectedAmount, nftStandard),
    );
  }

  /**
   * Resets the state (wallet reset).
   */
  clearState(): void {
    this.#walletGeneration += 1;
    this.#packRuns.clear();
    this.#paymentRuns.clear();
    this.#batchRuns.clear();
    this.#sales.clear();
    this.#saleChecks.clear();
    this.#updateState(() => getDefaultPackPartnerState());
  }

  /** Stops an asynchronous flow before it can use state from a reset wallet. */
  #captureWallet(): () => void {
    const generation = this.#walletGeneration;
    return () => {
      if (generation !== this.#walletGeneration) {
        throw packPartnerError('NOT_FOUND');
      }
    };
  }

  /**
   * Refreshes the reads a terminal outcome changed, without waiting.
   *
   * @param families - Query families to refresh.
   */
  #refreshReads(families: QueryFamily[]): void {
    const invalidate = this.#invalidateQueries;
    if (!invalidate) return;
    families.forEach((family) => {
      // Deferred so that even a synchronous failure never fails the outcome.
      Promise.resolve()
        .then(() => invalidate(family))
        .catch((error: unknown) => {
          Logger.error(
            toPackPartnerError(error),
            'Collectibles: failed to refresh PackPartner reads after an operation',
          );
        });
    });
  }

  // ---------------------------------------------------------------------------
  // Pack state machine

  async #runPack(
    address: string,
    memo: string,
    accountId?: string,
  ): Promise<PackPartnerCard> {
    const assertCurrent = this.#captureWallet();
    try {
      const operation = await this.#payPack(address, memo, accountId);
      assertCurrent();
      if (operation.status === 'submitted' || operation.status === 'paid') {
        return await this.#openPack(address, operation);
      }
      return this.#getTerminalResult(operation);
    } catch (error) {
      assertCurrent();
      const packError = this.#report(error, 'completePack');
      this.#setOperationError(address, memo, packError);
      throw packError;
    }
  }

  /**
   * Signs and submits a `generated` purchase. Recovery calls it without an
   * account id: it only resumes purchases that are already submitted.
   *
   * @param address - Account address.
   * @param memo - Pack memo.
   * @param accountId - InternalAccount id used by the Snap to sign.
   * @returns The operation after payment.
   */
  #payPack(
    address: string,
    memo: string,
    accountId?: string,
  ): Promise<PackPartnerPackOperation> {
    return dedupe(this.#paymentRuns, runKey(address, memo), async () => {
      const assertCurrent = this.#captureWallet();
      try {
        const operation = this.#requireOperation(address, memo);
        if (operation.status !== 'generated') {
          return operation;
        }
        if (!accountId) {
          throw packPartnerError('NOT_FOUND');
        }
        const signedTransaction = await this.#signPack(
          address,
          operation,
          accountId,
        );
        assertCurrent();
        return await this.#submitPack(address, memo, signedTransaction);
      } catch (error) {
        assertCurrent();
        const packError = this.#report(error, 'completePack');
        this.#setOperationError(address, memo, packError);
        throw packError;
      }
    });
  }

  /**
   * Signs the payment, then records the purchase as `submitted` before the
   * signed bytes are sent: a lost response does not prove that the payment
   * was never broadcast. The signed bytes stay in memory for the submission
   * only; recovery resolves the purchase by memo.
   *
   * @param address - Account address.
   * @param operation - Generated operation.
   * @param accountId - InternalAccount id used by the Snap to sign.
   * @returns The signed transaction to submit.
   */
  async #signPack(
    address: string,
    operation: PackPartnerPackOperation,
    accountId: string,
  ): Promise<string> {
    const assertCurrent = this.#captureWallet();
    const { memo, transaction } = operation;
    const age = this.#now() - operation.createdAt;
    if (!transaction || age > PACK_PARTNER_TIMINGS.GENERATED_TTL) {
      return this.#expire(address, memo);
    }
    const { signedTransaction } = await signPackPartnerBuy(this.#requestSnap, {
      accountId,
      transaction,
      amount: operation.priceAmount,
    });
    assertCurrent();
    this.#transition(address, memo, {
      status: 'submitted',
      transaction: undefined,
    });
    assertCurrent();
    return signedTransaction;
  }

  async #submitPack(
    address: string,
    memo: string,
    signedTransaction: string,
  ): Promise<PackPartnerPackOperation> {
    const assertCurrent = this.#captureWallet();
    let submission: SubmittedTransaction;
    try {
      submission = await this.#api.submitTransaction({ signedTransaction });
    } catch (error) {
      assertCurrent();
      return this.#recoverSubmit(address, memo, error);
    }
    assertCurrent();
    return submission.confirmationStatus === 'submitted'
      ? this.#requireOperation(address, memo)
      : this.#transition(address, memo, { status: 'paid' });
  }

  /**
   * After any failed submission, the payment may still have landed. Keep
   * the purchase submitted until its pack status resolves it, including 4xx.
   *
   * @param address - Account address.
   * @param memo - Pack memo.
   * @param submitError - Submission error.
   * @returns The paid operation.
   */
  async #recoverSubmit(
    address: string,
    memo: string,
    submitError: unknown,
  ): Promise<PackPartnerPackOperation> {
    const assertCurrent = this.#captureWallet();
    const status = await this.#api
      .getPackStatus({ memo })
      .catch(() => undefined);
    assertCurrent();
    if (status?.isPaid) {
      return this.#transition(address, memo, { status: 'paid' });
    }
    // An HTTP refusal alone does not prove that an upstream broadcast never
    // happened. Keep the memo and reconcile; never authorize a replacement.
    throw toPackPartnerError(submitError, 'SUBMIT_FAILED');
  }

  async #openPack(
    address: string,
    initial: PackPartnerPackOperation,
  ): Promise<PackPartnerCard> {
    const assertCurrent = this.#captureWallet();
    // PackPartner no longer opens the memo: only its pack status can tell
    // whether the card was delivered, refunded or never paid.
    if (this.#isPastOpenWindow(initial)) {
      return this.#resolveUnopenable(address, initial);
    }
    const { OPEN_POLL_ATTEMPTS, OPEN_POLL_INTERVAL } = PACK_PARTNER_TIMINGS;
    let operation = initial;
    for (let attempt = 1; attempt <= OPEN_POLL_ATTEMPTS; attempt++) {
      const result = await this.#requestOpen(operation.memo);
      assertCurrent();
      if (result.status === 'awarded') {
        if (
          operation.turbo &&
          result.rarity === 'common' &&
          !result.automaticSale
        ) {
          throw packPartnerError('OPEN_PENDING', true);
        }
        return this.#storeOpenedCard(
          address,
          operation,
          cardFromOpenPack(result, operation, this.#now()),
        );
      }
      if (result.status === 'unopenable') {
        return this.#resolveUnopenable(address, operation);
      }
      if (result.code === 'SEND_PENDING' && operation.status === 'submitted') {
        operation = this.#transition(address, operation.memo, {
          status: 'paid',
        });
      }
      if (attempt < OPEN_POLL_ATTEMPTS) {
        await this.#sleep(OPEN_POLL_INTERVAL);
        assertCurrent();
      }
    }
    return this.#resolveStillPending(address, operation);
  }

  /**
   * Polling exhausted. A delayed payment webhook cannot prove non-payment
   * while PackPartner can still open the pack.
   *
   * @param address - Account address.
   * @param operation - Operation being opened.
   * @returns Never; always throws.
   */
  async #resolveStillPending(
    address: string,
    operation: PackPartnerPackOperation,
  ): Promise<never> {
    const assertCurrent = this.#captureWallet();
    if (operation.status === 'submitted') {
      const status = await this.#api
        .getPackStatus({ memo: operation.memo })
        .catch(() => undefined);
      assertCurrent();
      if (status?.isPaid) {
        this.#transition(address, operation.memo, { status: 'paid' });
      }
    }
    throw packPartnerError('OPEN_PENDING', true);
  }

  async #requestOpen(memo: string): Promise<OpenAttempt> {
    try {
      return await this.#api.openPack({ memo });
    } catch (error) {
      const openError = toPackPartnerError(error);
      if (openError.code === 'NOT_FOUND') {
        return { status: 'unopenable' };
      }
      if (openError.code === 'OPEN_PENDING') {
        return { status: 'pending', code: 'WAITING_FOR_WEBHOOK' };
      }
      throw openError;
    }
  }

  /**
   * `openPack` answered 400, or the opening window has passed: the pack
   * status decides. A delivered pack is opened from it, a refunded one fails,
   * and a submitted one still unpaid after the opening window was never paid.
   * A paid pack waits for its refund.
   *
   * @param address - Account address.
   * @param operation - Operation being opened.
   * @returns The delivered card; otherwise throws.
   */
  async #resolveUnopenable(
    address: string,
    operation: PackPartnerPackOperation,
  ): Promise<PackPartnerCard> {
    const assertCurrent = this.#captureWallet();
    const { memo } = operation;
    const status = await this.#api.getPackStatus({ memo });
    assertCurrent();
    if (status.isDelivered && status.mint) {
      if (
        operation.turbo &&
        status.rarity === 'common' &&
        !status.automaticSale
      ) {
        throw packPartnerError('OPEN_PENDING', true);
      }
      return this.#storeOpenedCard(
        address,
        operation,
        cardFromPackStatus({
          mint: status.mint,
          status,
          operation,
          now: this.#now(),
        }),
      );
    }
    if (status.isRefunded) {
      this.#transition(address, memo, { status: 'failed' });
      throw packPartnerError('PACK_FAILED');
    }
    if (status.isPaid) {
      if (operation.status === 'submitted') {
        this.#transition(address, memo, { status: 'paid' });
      }
      throw packPartnerError('OPEN_PENDING', true);
    }
    // Only an unconfirmed payment can be proven unpaid. A purchase that
    // PackPartner confirmed on submission stays paid until its delivery or
    // refund, even when its payment webhook never arrived.
    if (operation.status === 'submitted' && this.#isPastOpenWindow(operation)) {
      return this.#expire(address, memo);
    }
    throw packPartnerError('OPEN_PENDING', true);
  }

  /**
   * Records the opening with its card as the operation's result, then
   * refreshes the owned-card read. The card itself is never stored as owned.
   *
   * @param address - Account address.
   * @param operation - Operation being opened.
   * @param card - Awarded card.
   * @returns The card.
   */
  #storeOpenedCard(
    address: string,
    operation: PackPartnerPackOperation,
    card: PackPartnerCard,
  ): PackPartnerCard {
    this.#transition(address, operation.memo, {
      status: 'opened',
      mint: card.mint,
      result: card,
      transaction: undefined,
    });
    this.#refreshReads(
      packPartnerQueryFamilies.opened(this.#environment, address),
    );
    return card;
  }

  #getTerminalResult(operation: PackPartnerPackOperation): PackPartnerCard {
    if (operation.status === 'expired') {
      throw packPartnerError('PACK_EXPIRED');
    }
    if (operation.status === 'failed') {
      throw packPartnerError('PACK_FAILED');
    }
    if (!operation.result) {
      throw packPartnerError('NOT_FOUND');
    }
    return operation.result;
  }

  #isStaleGenerated(
    address: string,
    operation: PackPartnerPackOperation,
  ): boolean {
    const key = runKey(address, operation.memo);
    return (
      operation.status === 'generated' &&
      !this.#packRuns.has(key) &&
      !this.#paymentRuns.has(key) &&
      this.#now() - operation.createdAt > PACK_PARTNER_TIMINGS.GENERATED_TTL
    );
  }

  #isPastOpenWindow(operation: PackPartnerPackOperation): boolean {
    return this.#now() - operation.createdAt > PACK_PARTNER_TIMINGS.OPEN_WINDOW;
  }

  #requireOperation(address: string, memo: string): PackPartnerPackOperation {
    const operation = this.state.operations[address]?.[memo];
    if (!operation) {
      throw packPartnerError('NOT_FOUND');
    }
    return operation;
  }

  /**
   * Persists a transition.
   *
   * @param address - Account address.
   * @param memo - Pack memo.
   * @param patch - Fields to change (undefined removes).
   * @returns The updated operation.
   */
  #transition(
    address: string,
    memo: string,
    patch: OperationPatch,
  ): PackPartnerPackOperation {
    const current = this.#requireOperation(address, memo);
    const next = patchOperation(current, patch, this.#now());
    this.#updateState((state) => {
      state.operations[address][memo] = next;
    });
    return next;
  }

  #expire(address: string, memo: string): never {
    this.#transition(address, memo, {
      status: 'expired',
      transaction: undefined,
    });
    throw packPartnerError('PACK_EXPIRED');
  }

  #setOperationError(
    address: string,
    memo: string,
    error: PackPartnerError,
  ): void {
    const current = this.state.operations[address]?.[memo];
    const errorState = toErrorState(error);
    if (!current || current.error?.code === errorState.code) {
      return;
    }
    this.#updateState((state) => {
      state.operations[address][memo].error = errorState;
    });
  }

  // ---------------------------------------------------------------------------
  // Sales

  async #runSale(
    account: PackPartnerAccount,
    mint: string,
    expectedAmount: string,
    nftStandard: PackPartnerNftStandard,
  ): Promise<PackPartnerSaleResult> {
    const assertCurrent = this.#captureWallet();
    try {
      const sale = this.state.sales[account.address]?.[mint];
      if (sale?.status === 'completed') {
        throw packPartnerError('NOT_FOUND');
      }
      if (sale?.status === 'pending') {
        const resumed = await this.#resumeSale(account.address, sale);
        assertCurrent();
        if (resumed) {
          return resumed;
        }
      }
      return await this.#startSale(account, mint, expectedAmount, nftStandard);
    } catch (error) {
      assertCurrent();
      throw this.#report(error, 'sellCard');
    }
  }

  /**
   * Resolves an interrupted buyback without signing or submitting again. A
   * sale never handed to PackPartner is discarded. Otherwise
   * `/buyback/check` decides: complete means sold, and a buyback that does
   * not exist never landed (PackPartner deletes those). Anything else
   * stays pending.
   *
   * @param address - Account address.
   * @param sale - Pending buyback.
   * @returns The completed sale, or undefined when a new sale can start.
   */
  #resumeSale(
    address: string,
    sale: PackPartnerBuybackOperation,
  ): Promise<PackPartnerSaleResult | undefined> {
    const assertCurrent = this.#captureWallet();
    return dedupe(this.#saleChecks, runKey(address, sale.mint), async () => {
      if (!sale.submissionAttempted) {
        this.#deleteSale(address, sale.mint);
        return undefined;
      }
      const check = await this.#api
        .checkBuyback({ memo: sale.memo })
        .catch(() => {
          throw createPackPartnerError({
            code: 'SALE_PENDING',
            retryable: true,
          });
        });
      assertCurrent();
      if (check.isComplete) {
        return this.#completeSale(address, sale, {
          amount: check.amount ?? sale.amount,
          signature: check.signature ?? sale.signature ?? '',
        });
      }
      if (!check.exists) {
        this.#deleteSale(address, sale.mint);
        return undefined;
      }
      throw packPartnerError('SALE_PENDING', true);
    });
  }

  async #startSale(
    account: PackPartnerAccount,
    mint: string,
    expectedAmount: string,
    nftStandard: PackPartnerNftStandard,
  ): Promise<PackPartnerSaleResult> {
    const assertCurrent = this.#captureWallet();
    const { address } = account;
    // Fresh check, never a cached offer: a sale signs only at or above the
    // amount the user confirmed.
    const offer = await this.#api.getBuybackAvailability({ mint });
    assertCurrent();
    if (!offer.available) {
      this.#refreshReads(
        packPartnerQueryFamilies.offerChanged(this.#environment, mint),
      );
      throw packPartnerError('BUYBACK_UNAVAILABLE');
    }
    if (isBuybackBelow(offer.amount, expectedAmount)) {
      this.#refreshReads(
        packPartnerQueryFamilies.offerChanged(this.#environment, mint),
      );
      throw packPartnerError('OFFER_CHANGED');
    }
    const buyback = await this.#api.createBuyback({
      playerAddress: address,
      mint,
    });
    assertCurrent();
    if (isBuybackBelow(buyback.amount, expectedAmount)) {
      // Show the refund PackPartner actually offers before any new attempt.
      this.#refreshReads(
        packPartnerQueryFamilies.offerChanged(this.#environment, mint),
      );
      throw packPartnerError('OFFER_CHANGED');
    }
    const now = this.#now();
    const pending: PackPartnerBuybackOperation = {
      mint,
      memo: buyback.memo,
      status: 'pending',
      amount: buyback.amount,
      submissionAttempted: false,
      createdAt: now,
      updatedAt: now,
    };
    this.#setSale(address, pending);
    let signed: SignedSolanaTransaction;
    try {
      signed = await signPackPartnerBuyback(this.#requestSnap, {
        accountId: account.id,
        transaction: buyback.transaction,
        amount: buyback.amount,
        assetAddress: mint,
        expectedStandard: nftStandard,
      });
    } catch (error) {
      assertCurrent();
      this.#deleteSale(address, mint);
      throw error;
    }
    assertCurrent();
    // Recorded before submission: a lost response does not prove the sale was
    // never broadcast. The signed bytes are never stored.
    const attempted: PackPartnerBuybackOperation = {
      ...pending,
      signature: signed.signature,
      submissionAttempted: true,
      updatedAt: this.#now(),
    };
    this.#setSale(address, attempted);
    assertCurrent();
    let submission: SubmittedTransaction;
    try {
      submission = await this.#api.submitTransaction({
        signedTransaction: signed.signedTransaction,
      });
    } catch {
      assertCurrent();
      return this.#recoverSale(address, attempted);
    }
    assertCurrent();
    const signature = submission.signature || signed.signature;
    if (submission.confirmationStatus === 'submitted') {
      const submitted = { ...attempted, signature };
      this.#setSale(address, submitted);
      return this.#recoverSale(address, submitted);
    }
    return this.#completeSale(address, attempted, {
      amount: buyback.amount,
      signature,
    });
  }

  /**
   * After a failed buyback submission: complete it if PackPartner saw it,
   * otherwise keep it pending until an authoritative check resolves it.
   *
   * @param address - Account address.
   * @param sale - Attempted buyback.
   * @returns The completed sale.
   */
  async #recoverSale(
    address: string,
    sale: PackPartnerBuybackOperation,
  ): Promise<PackPartnerSaleResult> {
    const assertCurrent = this.#captureWallet();
    const check = await this.#api
      .checkBuyback({ memo: sale.memo })
      .catch(() => undefined);
    assertCurrent();
    if (check?.isComplete) {
      return this.#completeSale(address, sale, {
        amount: check.amount ?? sale.amount,
        signature: check.signature ?? sale.signature ?? '',
      });
    }
    throw packPartnerError('SALE_PENDING', true);
  }

  /**
   * Records the completed buyback as a receipt, then refreshes the owned-card
   * and offer reads: PackPartner no longer lists the card.
   *
   * @param address - Account address.
   * @param sale - Buyback being completed.
   * @param outcome - Confirmed refund and signature.
   * @param outcome.amount - Refund, base units.
   * @param outcome.signature - Buyback transaction signature.
   * @returns The sale result.
   */
  #completeSale(
    address: string,
    sale: PackPartnerBuybackOperation,
    { amount, signature }: { amount: string; signature: string },
  ): PackPartnerSaleResult {
    this.#setSale(address, {
      ...sale,
      status: 'completed',
      amount,
      ...(signature ? { signature } : {}),
      updatedAt: this.#now(),
    });
    this.#refreshReads(
      packPartnerQueryFamilies.sold(this.#environment, address, sale.mint),
    );
    return { mint: sale.mint, amount, signature };
  }

  #setSale(address: string, sale: PackPartnerBuybackOperation): void {
    this.#updateState((state) => {
      state.sales[address] ??= {};
      state.sales[address][sale.mint] = sale;
    });
  }

  #deleteSale(address: string, mint: string): void {
    if (!this.state.sales[address]?.[mint]) return;
    this.#updateState((state) => {
      delete state.sales[address][mint];
      if (Object.keys(state.sales[address]).length === 0) {
        delete state.sales[address];
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Errors

  /**
   * Normalizes an error and logs it when it is unexpected, once per error.
   *
   * @param error - Anything thrown.
   * @param method - Public method name.
   * @returns The normalized error.
   */
  #report(error: unknown, method: string): PackPartnerError {
    const collectorError = toPackPartnerError(error);
    if (this.#reported.has(collectorError)) {
      return collectorError;
    }
    this.#reported.add(collectorError);
    if (
      collectorError.retryable ||
      EXPECTED_ERROR_CODES.includes(collectorError.code)
    ) {
      DevLogger.log('[PackPartnerProvider]', method, collectorError);
    } else {
      Logger.error(collectorError, {
        tags: { feature: 'PackPartner' },
        context: {
          name: 'PackPartnerProvider',
          data: { method, code: collectorError.code },
        },
      });
    }
    return collectorError;
  }
}
