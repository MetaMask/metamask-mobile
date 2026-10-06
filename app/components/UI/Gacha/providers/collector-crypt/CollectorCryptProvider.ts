import type { Draft } from '@reduxjs/toolkit';

import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { COLLECTOR_CRYPT_TIMINGS } from './constants';
import {
  createCollectorCryptApi,
  type CollectorCryptApi,
  type OpenPackResult,
  type SubmittedTransaction,
} from './services/collectorCryptApi';
import {
  createCollectorCryptError,
  toCollectorCryptError,
  toErrorState,
  type CollectorCryptError,
} from './services/errors';
import {
  createSolanaNftApi,
  type SolanaNftApi,
} from '../../services/solanaNftApi';
import {
  signSolanaTransactionSilently,
  type SignedSolanaTransaction,
  type SnapRequestFn,
} from './services/solanaSnap';
import type {
  CollectorCryptBuyback,
  CollectorCryptCard,
  CollectorCryptErrorCode,
  CollectorCryptPack,
  CollectorCryptPackRef,
  CollectorCryptSale,
  CollectorCryptSaleResult,
  PackOperation,
  SolanaAccountRef,
} from './types';
import {
  buybackFromAvailability,
  cardFromOpenPack,
  cardFromPackStatus,
  getVisibleCards,
  isBuybackBelow,
  isBuybackStale,
  isCollectorCryptItemRef,
  mergeAwardedCard,
  mergeCards,
  shouldBypassIndexerCache,
  toIndexedCards,
} from './utils/cards';
import {
  getUnrevealedMints,
  patchOperation,
  type OperationPatch,
} from './utils/operations';
import { toPacks } from './utils/packs';
import { dedupe, mapWithConcurrency } from './utils/async';
import {
  getDefaultCollectorCryptState,
  type CollectorCryptState,
} from './state';

export interface CollectorCryptProviderOptions {
  getState: () => CollectorCryptState;
  updateState: (
    recipe: (state: Draft<CollectorCryptState>) => void | CollectorCryptState,
  ) => void;
  requestSnap: SnapRequestFn;
  api?: CollectorCryptApi;
  nftApi?: SolanaNftApi;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/** Errors that are part of the normal product flow: not sent to Sentry. */
const EXPECTED_ERROR_CODES: readonly CollectorCryptErrorCode[] = [
  'PACK_EXPIRED',
  'BUYBACK_UNAVAILABLE',
  'OFFER_CHANGED',
  'MACHINE_UNAVAILABLE',
  'OPEN_PENDING',
  'SALE_PENDING',
];

/** Statuses `recoverOperations` resumes: the payment may already be signed. */
const RECOVERABLE_STATUSES: readonly PackOperation['status'][] = [
  'signed',
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
 * @param message - Optional message.
 * @param retryable - Whether retrying may succeed.
 * @returns The error.
 */
const collectorCryptError = (
  code: CollectorCryptErrorCode,
  message?: string,
  retryable = false,
): CollectorCryptError =>
  createCollectorCryptError({ code, message, retryable });

/**
 * Whether an HTTP failure proves the request was refused (never processed).
 *
 * @param error - Error from the API.
 * @returns True for 4xx responses.
 */
const isClientError = (error: CollectorCryptError): boolean =>
  error.status !== undefined && error.status >= 400 && error.status < 500;

/** Outcome of one `openPack` call. */
type OpenAttempt = OpenPackResult | { status: 'unopenable' };

/**
 * Orchestrates CollectorCrypt pack purchases, openings, card reconciliation
 * and buybacks for Solana accounts. State is keyed by Solana address so
 * accounts never see each other's operations or cards.
 */
export class CollectorCryptProvider {
  readonly #getState: CollectorCryptProviderOptions['getState'];

  readonly #updateState: CollectorCryptProviderOptions['updateState'];

  readonly #api: CollectorCryptApi;

  readonly #nftApi: SolanaNftApi;

  readonly #now: () => number;

  readonly #sleep: (ms: number) => Promise<void>;

  readonly #requestSnap: SnapRequestFn;

  #walletGeneration = 0;

  readonly #packRuns = new Map<string, Promise<CollectorCryptCard>>();

  readonly #cardSyncs = new Map<string, Promise<CollectorCryptCard[]>>();

  readonly #sales = new Map<string, Promise<CollectorCryptSaleResult>>();

  readonly #saleChecks = new Map<
    string,
    Promise<CollectorCryptSaleResult | undefined>
  >();

  constructor({
    getState,
    updateState,
    requestSnap,
    api,
    nftApi,
    now = Date.now,
    sleep = defaultSleep,
  }: CollectorCryptProviderOptions) {
    this.#getState = getState;
    this.#updateState = updateState;
    this.#requestSnap = requestSnap;
    this.#api = api ?? createCollectorCryptApi();
    this.#nftApi = nftApi ?? createSolanaNftApi();
    this.#now = now;
    this.#sleep = sleep;
  }

  /** Current provider state, owned by GachaController. */
  get state(): CollectorCryptState {
    return this.#getState();
  }

  /**
   * Public packs that can be bought now.
   *
   * @returns The packs, sorted for display.
   */
  async getPacks(): Promise<CollectorCryptPack[]> {
    try {
      const [machines, status] = await Promise.all([
        this.#api.getMachines(),
        this.#api.getStatus(),
      ]);
      return toPacks(machines, status);
    } catch (error) {
      throw this.#report(error, 'getPacks');
    }
  }

  /**
   * Starts a purchase: asks CollectorCrypt for the payment transaction and
   * stores a `generated` operation. Nothing is signed yet.
   *
   * @param params - Parameters.
   * @param params.account - Selected Solana account.
   * @param params.pack - Pack to buy.
   * @returns The pack memo, used by `completePack`.
   */
  async generatePack({
    account,
    pack,
  }: {
    account: SolanaAccountRef;
    pack: CollectorCryptPackRef;
  }): Promise<string> {
    const assertCurrent = this.#captureWallet();
    try {
      const { memo, transaction } = await this.#api.generatePack({
        playerAddress: account.address,
        packType: pack.code,
      });
      assertCurrent();
      const now = this.#now();
      const operation: PackOperation = {
        memo,
        packCode: pack.code,
        packName: pack.name,
        price: pack.price,
        status: 'generated',
        createdAt: now,
        updatedAt: now,
        transaction,
      };
      this.#updateState((state) => {
        state.operations[account.address] ??= {};
        state.operations[account.address][memo] = operation;
      });
      return memo;
    } catch (error) {
      assertCurrent();
      throw this.#report(error, 'generatePack');
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
    account: SolanaAccountRef;
    memo: string;
  }): Promise<CollectorCryptCard> {
    return dedupe(this.#packRuns, `${account.address}:${memo}`, () =>
      this.#runPack(account, memo),
    );
  }

  /**
   * Removes an operation (reveal closed, expiry acknowledged). Operations whose
   * payment may be in flight (signed, submitted, paid) are kept for recovery.
   *
   * @param params - Parameters.
   * @param params.account - Account that owns the operation.
   * @param params.memo - Pack memo.
   */
  dismissOperation({
    account,
    memo,
  }: {
    account: SolanaAccountRef;
    memo: string;
  }): void {
    this.#updateState((state) => {
      const operations = state.operations[account.address];
      const operation = operations?.[memo];
      if (!operation || RECOVERABLE_STATUSES.includes(operation.status)) {
        return;
      }
      delete operations[memo];
      if (Object.keys(operations).length === 0) {
        delete state.operations[account.address];
      }
    });
  }

  /**
   * Resumes interrupted purchases whose payment may already be signed
   * (signed, submitted, paid) and expires stale unsigned ones. Never signs
   * and never throws.
   *
   * @param params - Parameters.
   * @param params.account - Selected Solana account.
   */
  async recoverOperations({
    account,
  }: {
    account: SolanaAccountRef;
  }): Promise<void> {
    try {
      const operations = Object.values(
        this.state.operations[account.address] ?? {},
      );
      operations
        .filter((operation) => this.#isStaleGenerated(account, operation))
        .forEach((operation) =>
          this.#transition(account.address, operation.memo, {
            status: 'expired',
            transaction: undefined,
          }),
        );
      await Promise.allSettled(
        operations
          .filter((operation) =>
            RECOVERABLE_STATUSES.includes(operation.status),
          )
          .map((operation) =>
            this.completePack({ account, memo: operation.memo }),
          ),
      );
    } catch (error) {
      this.#report(error, 'recoverOperations');
    }
  }

  /**
   * Reconciles local cards with the indexers (MetaMask NFT API, enriched by
   * the CollectorCrypt cards API), then refreshes stale buyback offers of
   * cards that can still be sold. The NFT API cache is bypassed when asked
   * (explicit refresh) or right after a local open or sale.
   * Concurrent calls for an address are shared.
   *
   * @param params - Parameters.
   * @param params.account - Selected Solana account.
   * @param params.bypassCache - Fetch fresh NFT API data (pull to refresh).
   * @returns The visible cards.
   */
  syncCards({
    account,
    bypassCache = false,
  }: {
    account: SolanaAccountRef;
    bypassCache?: boolean;
  }): Promise<CollectorCryptCard[]> {
    return dedupe(this.#cardSyncs, account.address, () =>
      this.#runSync(account, bypassCache),
    );
  }

  /**
   * Reconciles a pending sale without signing, or refreshes the buyback offer.
   *
   * @param params - Parameters.
   * @param params.account - Account that owns the card.
   * @param params.mint - Card mint.
   * @returns The buyback state.
   */
  async refreshBuyback({
    account,
    mint,
  }: {
    account: SolanaAccountRef;
    mint: string;
  }): Promise<CollectorCryptBuyback> {
    const assertCurrent = this.#captureWallet();
    try {
      const card = this.state.cards[account.address]?.[mint];
      if (card?.sale?.status === 'pending') {
        if (this.#sales.has(`${account.address}:${mint}`)) {
          throw collectorCryptError('SALE_PENDING', undefined, true);
        }
        const completed = await this.#resumeSale(
          account.address,
          mint,
          card.sale,
        );
        assertCurrent();
        if (completed) {
          return card.buyback;
        }
      }
      return await this.#checkBuyback(account.address, mint);
    } catch (error) {
      assertCurrent();
      throw this.#report(error, 'refreshBuyback');
    }
  }

  /**
   * Sells a card back to CollectorCrypt at the current instant buyback offer.
   * Nothing is signed when the refund is below the amount the user confirmed:
   * the call fails with `OFFER_CHANGED` and the card shows the new offer.
   * Concurrent calls for a mint are shared.
   *
   * @param params - Parameters.
   * @param params.account - Account that owns the card.
   * @param params.mint - Card mint.
   * @param params.expectedAmount - Refund shown to the user, USDC base units.
   * @returns The completed sale.
   */
  sellCard({
    account,
    mint,
    expectedAmount,
  }: {
    account: SolanaAccountRef;
    mint: string;
    expectedAmount: string;
  }): Promise<CollectorCryptSaleResult> {
    return dedupe(this.#sales, `${account.address}:${mint}`, () =>
      this.#runSale(account, mint, expectedAmount),
    );
  }

  /**
   * Resets the state (wallet reset).
   */
  clearState(): void {
    this.#walletGeneration += 1;
    this.#packRuns.clear();
    this.#cardSyncs.clear();
    this.#sales.clear();
    this.#saleChecks.clear();
    this.#updateState(() => getDefaultCollectorCryptState());
  }

  /** Stops an asynchronous flow before it can use state from a reset wallet. */
  #captureWallet(): () => void {
    const generation = this.#walletGeneration;
    return () => {
      if (generation !== this.#walletGeneration) {
        throw collectorCryptError(
          'NOT_FOUND',
          'CollectorCrypt wallet was reset',
        );
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Pack state machine

  async #runPack(
    account: SolanaAccountRef,
    memo: string,
  ): Promise<CollectorCryptCard> {
    const assertCurrent = this.#captureWallet();
    try {
      let operation = this.#requireOperation(account.address, memo);
      if (operation.status === 'generated') {
        operation = await this.#signPack(account, operation);
        assertCurrent();
      }
      if (operation.status === 'signed') {
        operation = await this.#submitPack(account.address, operation);
        assertCurrent();
      }
      if (operation.status === 'submitted' || operation.status === 'paid') {
        return await this.#openPack(account, operation);
      }
      return this.#getTerminalResult(account.address, operation);
    } catch (error) {
      assertCurrent();
      const packError = this.#report(error, 'completePack');
      this.#setOperationError(account.address, memo, packError);
      throw packError;
    }
  }

  async #signPack(
    account: SolanaAccountRef,
    operation: PackOperation,
  ): Promise<PackOperation> {
    const assertCurrent = this.#captureWallet();
    const { address } = account;
    const { memo, transaction } = operation;
    const age = this.#now() - operation.createdAt;
    if (!transaction || age > COLLECTOR_CRYPT_TIMINGS.GENERATED_TTL) {
      return this.#expire(address, memo);
    }
    const { signedTransaction, signature } =
      await signSolanaTransactionSilently(this.#requestSnap, {
        accountId: account.id,
        transaction,
      });
    assertCurrent();
    return this.#transition(address, memo, {
      status: 'signed',
      signedTransaction,
      signature,
      transaction: undefined,
    });
  }

  async #submitPack(
    address: string,
    operation: PackOperation,
  ): Promise<PackOperation> {
    const assertCurrent = this.#captureWallet();
    const { memo, signedTransaction } = operation;
    if (!signedTransaction) {
      return this.#recoverSubmit(
        address,
        operation,
        collectorCryptError('SUBMIT_FAILED', 'Missing signed transaction'),
      );
    }
    // Record the attempted submission before I/O: a lost response does not
    // prove that the payment was never broadcast.
    const submitted = this.#transition(address, memo, { status: 'submitted' });
    assertCurrent();
    let submission: SubmittedTransaction;
    try {
      submission = await this.#api.submitTransaction({
        signedTransaction,
      });
    } catch (error) {
      assertCurrent();
      return this.#recoverSubmit(address, submitted, error);
    }
    assertCurrent();
    const isPaid = submission.confirmationStatus !== 'submitted';
    return this.#transition(address, memo, {
      status: isPaid ? 'paid' : 'submitted',
      signature: submission.signature || operation.signature,
      ...(isPaid ? { signedTransaction: undefined } : {}),
    });
  }

  /**
   * After a failed submission, the payment may still have landed (the same
   * signed bytes can be sent by a previous attempt).
   *
   * @param address - Account address.
   * @param operation - Signed operation.
   * @param submitError - Submission error.
   * @returns The paid operation.
   */
  async #recoverSubmit(
    address: string,
    operation: PackOperation,
    submitError: unknown,
  ): Promise<PackOperation> {
    const assertCurrent = this.#captureWallet();
    const status = await this.#api
      .getPackStatus({ memo: operation.memo })
      .catch(() => undefined);
    assertCurrent();
    if (status?.isPaid) {
      return this.#transition(address, operation.memo, {
        status: 'paid',
        signedTransaction: undefined,
      });
    }
    throw toCollectorCryptError(submitError, 'SUBMIT_FAILED');
  }

  async #openPack(
    account: SolanaAccountRef,
    initial: PackOperation,
  ): Promise<CollectorCryptCard> {
    const assertCurrent = this.#captureWallet();
    const { OPEN_POLL_ATTEMPTS, OPEN_POLL_INTERVAL } = COLLECTOR_CRYPT_TIMINGS;
    let operation = initial;
    for (let attempt = 1; attempt <= OPEN_POLL_ATTEMPTS; attempt++) {
      const result = await this.#requestOpen(operation.memo);
      assertCurrent();
      if (result.status === 'awarded') {
        return this.#storeAward(account.address, operation, result);
      }
      if (result.status === 'unopenable') {
        return this.#resolveUnopenable(account.address, operation);
      }
      if (result.code === 'SEND_PENDING' && operation.status === 'submitted') {
        operation = this.#transition(account.address, operation.memo, {
          status: 'paid',
          signedTransaction: undefined,
        });
      }
      if (attempt < OPEN_POLL_ATTEMPTS) {
        await this.#sleep(OPEN_POLL_INTERVAL);
        assertCurrent();
      }
    }
    return this.#resolveStillPending(account.address, operation);
  }

  /**
   * Polling exhausted. A delayed payment webhook cannot prove non-payment,
   * even after the signed transaction's blockhash has expired.
   *
   * @param address - Account address.
   * @param operation - Operation being opened.
   * @returns Never; always throws.
   */
  async #resolveStillPending(
    address: string,
    operation: PackOperation,
  ): Promise<never> {
    const assertCurrent = this.#captureWallet();
    if (operation.status === 'submitted') {
      const status = await this.#api
        .getPackStatus({ memo: operation.memo })
        .catch(() => undefined);
      assertCurrent();
      if (status?.isPaid) {
        this.#transition(address, operation.memo, {
          status: 'paid',
          signedTransaction: undefined,
        });
      }
    }
    throw collectorCryptError('OPEN_PENDING', undefined, true);
  }

  async #requestOpen(memo: string): Promise<OpenAttempt> {
    try {
      return await this.#api.openPack({ memo });
    } catch (error) {
      const openError = toCollectorCryptError(error);
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
   * `openPack` answered 400. A delivered pack is opened from its status. Keep
   * unresolved or paid work until the provider confirms delivery or a refund.
   * An elapsed deadline and a missing webhook do not prove non-payment.
   *
   * @param address - Account address.
   * @param operation - Operation being opened.
   * @returns The delivered card; otherwise throws.
   */
  async #resolveUnopenable(
    address: string,
    operation: PackOperation,
  ): Promise<CollectorCryptCard> {
    const assertCurrent = this.#captureWallet();
    const { memo } = operation;
    const status = await this.#api.getPackStatus({ memo });
    assertCurrent();
    if (status.isDelivered && status.mint) {
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
      this.#transition(address, memo, {
        status: 'failed',
        signedTransaction: undefined,
      });
      throw collectorCryptError('PACK_FAILED');
    }
    if (status.isPaid && operation.status === 'submitted') {
      this.#transition(address, memo, {
        status: 'paid',
        signedTransaction: undefined,
      });
    }
    throw collectorCryptError('OPEN_PENDING', undefined, true);
  }

  #storeAward(
    address: string,
    operation: PackOperation,
    result: Extract<OpenPackResult, { status: 'awarded' }>,
  ): Promise<CollectorCryptCard> {
    return this.#storeOpenedCard(
      address,
      operation,
      cardFromOpenPack(result, operation, this.#now()),
    );
  }

  async #storeOpenedCard(
    address: string,
    operation: PackOperation,
    card: CollectorCryptCard,
  ): Promise<CollectorCryptCard> {
    const assertCurrent = this.#captureWallet();
    const now = this.#now();
    const storedCard = mergeAwardedCard(
      this.state.cards[address]?.[card.mint],
      card,
    );
    const current = this.state.operations[address]?.[operation.memo];
    const opened =
      current &&
      patchOperation(
        current,
        {
          status: 'opened',
          mint: card.mint,
          signedTransaction: undefined,
          transaction: undefined,
        },
        now,
      );
    this.#updateState((state) => {
      state.cards[address] ??= {};
      state.cards[address][card.mint] = storedCard;
      if (opened) {
        state.operations[address][operation.memo] = opened;
      }
    });
    try {
      await this.#checkBuyback(address, card.mint);
    } catch (error) {
      assertCurrent();
      this.#report(error, 'completePack');
    }
    assertCurrent();
    return this.state.cards[address]?.[card.mint] ?? card;
  }

  #getTerminalResult(
    address: string,
    operation: PackOperation,
  ): CollectorCryptCard {
    if (operation.status === 'expired') {
      throw collectorCryptError('PACK_EXPIRED');
    }
    if (operation.status === 'failed') {
      throw collectorCryptError('PACK_FAILED');
    }
    const card = operation.mint
      ? this.state.cards[address]?.[operation.mint]
      : undefined;
    if (!card) {
      throw collectorCryptError('NOT_FOUND', 'Opened card not found');
    }
    return card;
  }

  #isStaleGenerated(
    account: SolanaAccountRef,
    operation: PackOperation,
  ): boolean {
    return (
      operation.status === 'generated' &&
      !this.#packRuns.has(`${account.address}:${operation.memo}`) &&
      this.#now() - operation.createdAt > COLLECTOR_CRYPT_TIMINGS.GENERATED_TTL
    );
  }

  #requireOperation(address: string, memo: string): PackOperation {
    const operation = this.state.operations[address]?.[memo];
    if (!operation) {
      throw collectorCryptError('NOT_FOUND', 'Pack operation not found');
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
  ): PackOperation {
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
      signedTransaction: undefined,
    });
    throw collectorCryptError('PACK_EXPIRED');
  }

  #setOperationError(
    address: string,
    memo: string,
    error: CollectorCryptError,
  ): void {
    const current = this.state.operations[address]?.[memo];
    const errorState = toErrorState(error);
    if (
      !current ||
      (current.error?.code === errorState.code &&
        current.error.message === errorState.message)
    ) {
      return;
    }
    this.#updateState((state) => {
      state.operations[address][memo].error = errorState;
    });
  }

  // ---------------------------------------------------------------------------
  // Cards

  async #runSync(
    account: SolanaAccountRef,
    bypassCache: boolean,
  ): Promise<CollectorCryptCard[]> {
    const assertCurrent = this.#captureWallet();
    const { address } = account;
    try {
      await this.#reconcilePendingSales(address);
      assertCurrent();
      const [tokens, walletCards] = await Promise.allSettled([
        this.#nftApi.getTokens({
          address,
          bypassCache:
            bypassCache ||
            shouldBypassIndexerCache(this.state.cards[address], this.#now()),
          isRequired: (item) =>
            Boolean(this.state.cards[address]?.[item.token_address]) ||
            isCollectorCryptItemRef(item),
        }),
        this.#api.getWalletCards({ address }),
      ]);
      assertCurrent();
      // A failed source degrades reconciliation: keep it observable.
      if (tokens.status === 'rejected') {
        this.#report(tokens.reason, 'syncCards');
      }
      if (walletCards.status === 'rejected') {
        this.#report(walletCards.reason, 'syncCards');
      }
      if (tokens.status === 'rejected' && walletCards.status === 'rejected') {
        throw createCollectorCryptError({
          code: 'NETWORK_ERROR',
          message: 'Cards could not be loaded',
          retryable: true,
          cause: tokens.reason,
        });
      }
      const now = this.#now();
      const nftItems = tokens.status === 'fulfilled' ? tokens.value : undefined;
      const walletList =
        walletCards.status === 'fulfilled' ? walletCards.value : undefined;
      const local = this.state.cards[address] ?? {};
      const merged = mergeCards({
        local,
        indexed: toIndexedCards({ nftItems, walletCards: walletList }),
        now,
        isComplete: nftItems !== undefined,
        hasListings: walletList !== undefined,
        keptMints: getUnrevealedMints(this.state.operations[address]),
      });
      if (merged !== local) {
        this.#updateState((state) => {
          state.cards[address] = merged;
        });
      }
      await this.#refreshStaleBuybacks(
        address,
        Object.values(merged).filter((card) => isBuybackStale(card, now)),
      );
      assertCurrent();
      return getVisibleCards(this.state.cards[address]);
    } catch (error) {
      assertCurrent();
      throw this.#report(error, 'syncCards');
    }
  }

  async #refreshStaleBuybacks(
    address: string,
    cards: CollectorCryptCard[],
  ): Promise<void> {
    const assertCurrent = this.#captureWallet();
    const results = await mapWithConcurrency(
      cards,
      COLLECTOR_CRYPT_TIMINGS.BUYBACK_CHECK_CONCURRENCY,
      async (card) => {
        assertCurrent();
        try {
          const availability = await this.#api.getBuybackAvailability({
            mint: card.mint,
          });
          return {
            mint: card.mint,
            buyback: buybackFromAvailability(availability, this.#now()),
          };
        } catch (error) {
          this.#report(error, 'syncCards');
          return undefined;
        }
      },
    );
    assertCurrent();
    const updates = results.filter((result) => result !== undefined);
    if (updates.length === 0) {
      return;
    }
    this.#updateState((state) => {
      updates.forEach(({ mint, buyback }) => {
        const card = state.cards[address]?.[mint];
        if (card && !card.sale) {
          card.buyback = buyback;
        }
      });
    });
  }

  async #checkBuyback(
    address: string,
    mint: string,
  ): Promise<CollectorCryptBuyback> {
    const assertCurrent = this.#captureWallet();
    const availability = await this.#api.getBuybackAvailability({ mint });
    assertCurrent();
    const buyback = buybackFromAvailability(availability, this.#now());
    this.#setBuyback(address, mint, buyback);
    return buyback;
  }

  #setBuyback(
    address: string,
    mint: string,
    buyback: CollectorCryptBuyback,
  ): void {
    this.#updateState((state) => {
      const card = state.cards[address]?.[mint];
      if (card) {
        card.buyback = buyback;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Sales

  /** Checks interrupted sales without creating or signing another transaction. */
  async #reconcilePendingSales(address: string): Promise<void> {
    const assertCurrent = this.#captureWallet();
    await mapWithConcurrency(
      Object.values(this.state.cards[address] ?? {}),
      COLLECTOR_CRYPT_TIMINGS.BUYBACK_CHECK_CONCURRENCY,
      async (card) => {
        assertCurrent();
        const sale = card.sale;
        if (
          sale?.status !== 'pending' ||
          this.#sales.has(`${address}:${card.mint}`)
        ) {
          return;
        }
        try {
          await this.#resumeSale(address, card.mint, sale);
        } catch (error) {
          this.#report(error, 'syncCards');
        }
      },
    );
  }

  async #runSale(
    account: SolanaAccountRef,
    mint: string,
    expectedAmount: string,
  ): Promise<CollectorCryptSaleResult> {
    const assertCurrent = this.#captureWallet();
    try {
      const card = this.state.cards[account.address]?.[mint];
      if (!card || card.sale?.status === 'completed') {
        throw collectorCryptError('NOT_FOUND', 'Card not found');
      }
      if (card.sale?.status === 'pending') {
        const resumed = await this.#resumeSale(
          account.address,
          mint,
          card.sale,
        );
        assertCurrent();
        if (resumed) {
          return resumed;
        }
      }
      return await this.#startSale(account, mint, expectedAmount);
    } catch (error) {
      assertCurrent();
      throw this.#report(error, 'sellCard');
    }
  }

  /**
   * Abandon an interrupted preparation that was never submitted. A submission
   * with an uncertain outcome stays pending until the provider confirms it.
   *
   * @param address - Account address.
   * @param mint - Card mint.
   * @param sale - Pending sale.
   * @returns The completed sale, or undefined when a new sale can start.
   */
  #resumeSale(
    address: string,
    mint: string,
    sale: CollectorCryptSale,
  ): Promise<CollectorCryptSaleResult | undefined> {
    const assertCurrent = this.#captureWallet();
    return dedupe(this.#saleChecks, `${address}:${mint}`, async () => {
      if (sale.submissionAttempted === false) {
        this.#setSale(address, mint, undefined);
        return undefined;
      }
      const check = sale.memo
        ? await this.#api.checkBuyback({ memo: sale.memo }).catch((error) => {
            throw createCollectorCryptError({
              code: 'SALE_PENDING',
              retryable: true,
              cause: error,
            });
          })
        : undefined;
      assertCurrent();
      if (check?.isComplete) {
        return this.#completeSale(address, mint, {
          amount: check.amount ?? sale.amount,
          memo: sale.memo,
          signature: check.signature ?? sale.signature ?? '',
        });
      }
      throw collectorCryptError('SALE_PENDING', undefined, true);
    });
  }

  async #startSale(
    account: SolanaAccountRef,
    mint: string,
    expectedAmount: string,
  ): Promise<CollectorCryptSaleResult> {
    const assertCurrent = this.#captureWallet();
    const { address } = account;
    const offer = await this.#checkBuyback(address, mint);
    assertCurrent();
    if (offer.status !== 'available') {
      throw collectorCryptError('BUYBACK_UNAVAILABLE');
    }
    if (isBuybackBelow(offer.amount, expectedAmount)) {
      throw collectorCryptError('OFFER_CHANGED');
    }
    const buyback = await this.#api.createBuyback({
      playerAddress: address,
      mint,
    });
    assertCurrent();
    if (isBuybackBelow(buyback.amount, expectedAmount)) {
      // Show the refund CollectorCrypt actually offers before any new attempt.
      this.#setBuyback(
        address,
        mint,
        buybackFromAvailability(
          buyback.amount === '0'
            ? { available: false }
            : { available: true, amount: buyback.amount },
          this.#now(),
        ),
      );
      throw collectorCryptError('OFFER_CHANGED');
    }
    const pending: CollectorCryptSale = {
      status: 'pending',
      amount: buyback.amount,
      memo: buyback.memo,
      submissionAttempted: false,
      updatedAt: this.#now(),
    };
    this.#setSale(address, mint, pending);
    let signed: SignedSolanaTransaction;
    try {
      signed = await signSolanaTransactionSilently(this.#requestSnap, {
        accountId: account.id,
        transaction: buyback.transaction,
      });
    } catch (error) {
      assertCurrent();
      this.#setSale(address, mint, undefined);
      throw error;
    }
    assertCurrent();
    const signedSale = {
      ...pending,
      ...signed,
      submissionAttempted: true,
    };
    this.#setSale(address, mint, signedSale);
    assertCurrent();
    let submission: SubmittedTransaction;
    try {
      submission = await this.#api.submitTransaction({
        signedTransaction: signed.signedTransaction,
      });
    } catch (error) {
      assertCurrent();
      return this.#recoverSale(address, mint, signedSale, error);
    }
    assertCurrent();
    const signature = submission.signature || signed.signature;
    if (submission.confirmationStatus === 'submitted') {
      const submittedSale = { ...signedSale, signature };
      this.#setSale(address, mint, submittedSale);
      return this.#recoverSale(
        address,
        mint,
        submittedSale,
        collectorCryptError('SALE_PENDING', undefined, true),
      );
    }
    return this.#completeSale(address, mint, {
      amount: buyback.amount,
      memo: buyback.memo,
      signature,
    });
  }

  /**
   * After a failed buyback submission: complete it if CollectorCrypt saw it,
   * forget it if it was refused, otherwise keep it pending.
   *
   * @param address - Account address.
   * @param mint - Card mint.
   * @param sale - Signed pending sale.
   * @param submitError - Submission error.
   * @returns The completed sale.
   */
  async #recoverSale(
    address: string,
    mint: string,
    sale: CollectorCryptSale,
    submitError: unknown,
  ): Promise<CollectorCryptSaleResult> {
    const assertCurrent = this.#captureWallet();
    const check = sale.memo
      ? await this.#api.checkBuyback({ memo: sale.memo }).catch(() => undefined)
      : undefined;
    assertCurrent();
    if (check?.isComplete) {
      return this.#completeSale(address, mint, {
        amount: check.amount ?? sale.amount,
        memo: sale.memo,
        signature: check.signature ?? sale.signature ?? '',
      });
    }
    const error = toCollectorCryptError(submitError, 'SUBMIT_FAILED');
    if (isClientError(error)) {
      this.#setSale(address, mint, undefined);
      throw error;
    }
    throw createCollectorCryptError({
      code: 'SALE_PENDING',
      message: error.message,
      retryable: true,
      cause: error,
    });
  }

  #completeSale(
    address: string,
    mint: string,
    {
      amount,
      memo,
      signature,
    }: { amount: string; memo?: string; signature: string },
  ): CollectorCryptSaleResult {
    this.#setSale(address, mint, {
      status: 'completed',
      amount,
      signature,
      updatedAt: this.#now(),
      ...(memo ? { memo } : {}),
    });
    return { mint, amount, signature };
  }

  #setSale(
    address: string,
    mint: string,
    sale: CollectorCryptSale | undefined,
  ): void {
    this.#updateState((state) => {
      const card = state.cards[address]?.[mint];
      if (!card) {
        return;
      }
      if (sale) {
        card.sale = sale;
      } else {
        delete card.sale;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Errors

  /**
   * Normalizes an error and logs it when it is unexpected.
   *
   * @param error - Anything thrown.
   * @param method - Public method name.
   * @returns The normalized error.
   */
  #report(error: unknown, method: string): CollectorCryptError {
    const collectorError = toCollectorCryptError(error);
    if (
      collectorError.retryable ||
      EXPECTED_ERROR_CODES.includes(collectorError.code)
    ) {
      DevLogger.log('[CollectorCryptProvider]', method, collectorError);
    } else {
      Logger.error(collectorError, {
        tags: { feature: 'CollectorCrypt' },
        context: {
          name: 'CollectorCryptProvider',
          data: { method, code: collectorError.code },
        },
      });
    }
    return collectorError;
  }
}
